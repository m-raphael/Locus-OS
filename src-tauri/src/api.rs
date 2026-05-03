//! Embedded GraphQL HTTP server.
//!
//! Mounts a single GraphQL endpoint at POST /graphql plus a GraphiQL playground
//! at GET /graphiql (debug builds only). The legacy REST surface and Swagger UI
//! have been removed — all external access is GraphQL over Neo4j.
//!
//! Security posture:
//!   - Binds to loopback by default; refuses non-loopback unless LOCUS_ALLOW_REMOTE=1.
//!   - Rejects requests whose Host header is not 127.0.0.1/localhost (DNS-rebinding guard).
//!   - Disables GraphQL introspection and the GraphiQL playground in release builds.

use async_graphql::http::{playground_source, GraphQLPlaygroundConfig};
use async_graphql_axum::{GraphQLRequest, GraphQLResponse};
use axum::{
    extract::State,
    http::{header, Request, StatusCode},
    middleware::{self, Next},
    response::{Html, IntoResponse, Response},
    routing::{get, post},
    Router,
};

use crate::gql::{build_schema, LocusSchema};

pub async fn serve(db: spaces_core::Db, graph: Option<spaces_core::GraphDb>) {
    let schema = build_schema(db, graph);

    let mut app = Router::new()
        .route("/graphql", post(graphql_handler))
        .route("/", get(index));

    // GraphiQL playground only in debug builds — disclosing the schema in
    // release ships the full mutation surface to anyone who reaches the port.
    #[cfg(debug_assertions)]
    {
        app = app.route("/graphiql", get(graphiql));
    }

    let app = app
        .with_state(schema)
        .layer(middleware::from_fn(host_guard));

    let addr_str = std::env::var("LOCUS_HTTP_ADDR").unwrap_or_else(|_| "127.0.0.1:4000".into());
    let addr: std::net::SocketAddr = match addr_str.parse() {
        Ok(a) => a,
        Err(e) => { eprintln!("[api] invalid LOCUS_HTTP_ADDR '{addr_str}': {e}"); return; }
    };

    if !addr.ip().is_loopback() && std::env::var("LOCUS_ALLOW_REMOTE").ok().as_deref() != Some("1") {
        eprintln!("[api] refusing non-loopback bind {addr} — set LOCUS_ALLOW_REMOTE=1 to override");
        return;
    }

    let Ok(listener) = tokio::net::TcpListener::bind(addr).await else {
        eprintln!("[api] could not bind {addr} — GraphQL disabled");
        return;
    };
    #[cfg(debug_assertions)]
    eprintln!("[api] GraphQL ready: http://{addr}/graphql  ·  Playground: http://{addr}/graphiql");
    #[cfg(not(debug_assertions))]
    eprintln!("[api] GraphQL ready: http://{addr}/graphql (introspection disabled)");

    if let Err(e) = axum::serve(listener, app).await {
        eprintln!("[api] server error: {e}");
    }
}

/// Reject requests whose Host header isn't loopback. Defends against
/// DNS-rebinding attacks where a malicious site resolves a domain to 127.0.0.1
/// and then issues mutations through the user's browser.
async fn host_guard(req: Request<axum::body::Body>, next: Next) -> Response {
    let host_ok = req
        .headers()
        .get(header::HOST)
        .and_then(|v| v.to_str().ok())
        .map(|h| {
            let hostpart = h.split(':').next().unwrap_or("");
            matches!(hostpart, "127.0.0.1" | "localhost" | "[::1]" | "::1")
        })
        .unwrap_or(false);

    if !host_ok {
        return (StatusCode::FORBIDDEN, "host not allowed").into_response();
    }
    next.run(req).await
}

async fn graphql_handler(
    State(schema): State<LocusSchema>,
    req: GraphQLRequest,
) -> GraphQLResponse {
    schema.execute(req.into_inner()).await.into()
}

#[cfg(debug_assertions)]
async fn graphiql() -> impl IntoResponse {
    Html(playground_source(GraphQLPlaygroundConfig::new("/graphql")))
}

async fn index() -> impl IntoResponse {
    Html(r#"<!doctype html><html><head><meta charset="utf-8"><title>Locus API</title>
<style>body{font-family:system-ui,sans-serif;background:#0b0b10;color:#eaeaea;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.card{padding:32px 40px;border:1px solid #ffffff14;border-radius:14px;background:#ffffff05;max-width:520px}
h1{margin:0 0 8px;font-size:18px;letter-spacing:.04em;text-transform:uppercase}
p{color:#a4a4ad;margin:6px 0}
a{color:#9ad}
code{background:#ffffff10;padding:2px 6px;border-radius:4px}</style></head>
<body><div class="card">
<h1>Locus · Neo4j + GraphQL</h1>
<p>POST queries to <code>/graphql</code></p>
<p>Open the <a href="/graphiql">GraphiQL playground</a> (debug builds only).</p>
</div></body></html>"#)
}
