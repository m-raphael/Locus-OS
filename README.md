# Locus-OS

A macOS-first, local-first companion shell that turns freeform intents into
**Spaces → Flows → Modules**, backed by Neo4j and a local agent layer.

- **Shell:** Tauri v2 (Rust + Sycamore/WASM UI)
- **Storage:** Neo4j (via [`neo4rs`](https://crates.io/crates/neo4rs))
- **API surface:** embedded axum server exposing GraphQL (debug builds also serve a GraphiQL playground)
- **Agent:** `locus-agent` orchestrator with optional NVIDIA NIM backend
- **License:** Apache-2.0

---

## Quick start

### 1 · Prerequisites

- macOS 13+
- [Rust toolchain](https://rustup.rs/) (pinned via `rust-toolchain.toml`)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or any
  Compose-v2-compatible engine) — for the Neo4j service
- Node + `npm` — for the Vite/Sycamore dev server
- `cargo install tauri-cli@^2` — once

### 2 · Configure environment

```bash
cp .env.example .env
```

Then open `.env` and set at minimum:

```
NEO4J_PASSWORD=<choose-something-real>
```

The app **refuses to start** if `NEO4J_PASSWORD` is unset, `neo4j`, or
`changeme`. Optional knobs (NVIDIA NIM key, alternate HTTP bind) are
documented inline in `.env.example`.

### 3 · Launch Neo4j with Docker

```bash
docker compose up -d
```

This runs `neo4j:5.26-community` (with APOC core) bound to `127.0.0.1`
only. It picks up `NEO4J_USER` / `NEO4J_PASSWORD` from your `.env`.

Verify it's up:

| Endpoint | Purpose |
|----------|---------|
| http://127.0.0.1:7474 | Neo4j Browser UI (login: `neo4j` / `$NEO4J_PASSWORD`) |
| `bolt://127.0.0.1:7687` | Bolt protocol — what the desktop app connects to |

The schema (constraints on `:Intent`, `:Space`, `:Flow`, `:Module`, …) is
created automatically by `spaces_core::Db::connect` on first launch. If you
prefer to apply it manually:

```bash
docker compose exec neo4j cypher-shell -u neo4j -p "$NEO4J_PASSWORD" \
  -f /migrations/0001_init.cypher
```

### 4 · Run the app

```bash
npm install            # first time only
cargo tauri dev
```

On startup you should see:

```
[env] loaded /…/.env
[db] Neo4j connected at bolt://127.0.0.1:7687
[api] GraphQL ready: http://127.0.0.1:4000/graphql  ·  Playground: http://127.0.0.1:4000/graphiql
```

### 5 · Stop services

```bash
docker compose down            # stop, keep data
docker compose down -v         # stop + wipe the Neo4j volume
```

---

## Project layout

```
crates/
  locus-parser/      intent → typed structs
  spaces-core/       Neo4j data model (Db, GraphDb)
  locus-agent/       orchestrator + governance + NIM client
src-tauri/
  src/lib.rs         Tauri entry, env loading, command registry
  src/api.rs         axum GraphQL server (loopback-only by default)
  src/gql.rs         async-graphql schema (queries + mutations)
  src/commands.rs    #[tauri::command] surface for the UI
src/                 Sycamore/Vite frontend
docs/plans/          Forward-looking design docs (e.g. NLP stack)
```

---

## Security notes

- The HTTP server binds to `127.0.0.1:4000` and refuses non-loopback binds
  unless `LOCUS_ALLOW_REMOTE=1` is explicitly set.
- A Host-header guard rejects requests whose `Host` isn't a loopback name
  (defends against DNS-rebinding from the user's browser).
- GraphiQL playground and GraphQL introspection are compiled out of release
  builds.
- Bolt is unencrypted; the docker-compose binds Bolt and HTTP to loopback
  only. For a non-local Neo4j, switch `NEO4J_URI` to `bolt+s://…` (TLS).

---

## Useful commands

```bash
cargo check --workspace            # fast typecheck
cargo build --workspace            # full build
cargo tauri dev                    # run the app (dev)
cargo tauri build                  # produce a .app bundle
docker compose logs -f neo4j       # tail Neo4j logs
```
