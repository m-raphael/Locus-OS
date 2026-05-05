use locus_api::api;

#[tokio::main]
async fn main() {
    match dotenvy::dotenv() {
        Ok(path) => eprintln!("[env] loaded {}", path.display()),
        Err(_) => eprintln!("[env] no .env file — using process environment"),
    }

    let neo4j_uri = std::env::var("NEO4J_URI").unwrap_or_else(|_| "bolt://127.0.0.1:7687".into());
    let neo4j_user = std::env::var("NEO4J_USER").unwrap_or_else(|_| "neo4j".into());
    let neo4j_pass = std::env::var("NEO4J_PASSWORD").expect("NEO4J_PASSWORD is required");

    if neo4j_pass == "neo4j" || neo4j_pass == "changeme" {
        eprintln!("[error] NEO4J_PASSWORD must not be a default placeholder");
        std::process::exit(1);
    }

    let db = spaces_core::Db::connect(&neo4j_uri, &neo4j_user, &neo4j_pass)
        .await
        .unwrap_or_else(|e| { eprintln!("[db] failed to connect: {e}"); std::process::exit(1) });
    eprintln!("[db] Neo4j connected at {neo4j_uri}");

    let graph = spaces_core::GraphDb::try_connect(&neo4j_uri, &neo4j_user, &neo4j_pass)
        .await
        .ok();

    let nlp = locus_nlp::pipeline();

    api::serve(db, graph, nlp).await;
}
