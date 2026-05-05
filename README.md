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
- Node + `npm`
- `cargo install tauri-cli@^2` — once
- **One** of the following for Neo4j:
  - [Neo4j Desktop](https://neo4j.com/download/) — GUI, no terminal needed
  - [Homebrew Neo4j](https://formulae.brew.sh/formula/neo4j) — `brew install neo4j`
  - [Docker Desktop](https://www.docker.com/products/docker-desktop/) — containerised

### 2 · Configure environment

```bash
cp .env.example .env
```

Then open `.env` and set at minimum:

```
NEO4J_PASSWORD=<choose-something-real>
```

The app **refuses to start** if `NEO4J_PASSWORD` is unset, `neo4j`, or `changeme`.

---

## Option A — Local (Neo4j Desktop or Homebrew)

**No Docker required.** Use this if you have Neo4j Desktop or `brew install neo4j`.

### Start Neo4j

**Neo4j Desktop:** open the app and click **Start** on your DBMS.

**Homebrew:**
```bash
npm run db:up       # brew services start neo4j

# First time only — set password to match your .env:
cypher-shell -u neo4j -p neo4j \
  "ALTER CURRENT USER SET PASSWORD FROM 'neo4j' TO '<your NEO4J_PASSWORD>'"
```

### Launch the app

```bash
npm install         # first time only
npm start           # waits for Neo4j on :7687, then starts Vite + Tauri
```

`npm start` polls port 7687 until Neo4j is ready — it works regardless of
how you started Neo4j (Desktop, brew, or Docker).

### Stop

```bash
npm run db:down     # brew services stop neo4j
```

---

## Option B — Docker

**Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/) running.**

Docker runs three containers: **frontend** (Vite), **backend** (GraphQL API), and **neo4j**.
The Tauri native shell is not containerised — use Option A for the full desktop experience.

> **Note:** Docker Neo4j binds to ports **7475** and **7688** to avoid conflicts with a
> locally running Neo4j Desktop instance (which uses 7474/7687).

### First-time setup

```bash
docker compose up --build
```

This builds all three images (~25 min first time, cached on subsequent runs) and starts the stack.

### What you should see

```
backend-1   | [env] no .env file — using process environment
backend-1   | [db] Neo4j connected at bolt://neo4j:7687
backend-1   | [api] GraphQL ready: http://0.0.0.0:4000/graphql
frontend-1  |   VITE v5.x  ready in ~2s
frontend-1  |   ➜  Local: http://localhost:1420/
```

| Service | URL | Purpose |
|---|---|---|
| Frontend | http://127.0.0.1:1420 | Vite dev server |
| Backend | http://127.0.0.1:4000/graphql | GraphQL API |
| Neo4j Browser | http://127.0.0.1:7475 | DB admin UI |
| Neo4j Bolt | bolt://127.0.0.1:7688 | (used internally by backend) |

### Relaunch after first build

**Via command line** (fastest):
```bash
docker compose up          # no --build needed, uses cached images
docker compose down        # stop all containers, keep data
```

**Via Docker Desktop GUI:**
1. Open Docker Desktop → **Containers**
2. Find `locus-os` — click ▶ to start or ■ to stop the whole stack

### With Storybook

```bash
docker compose --profile storybook up    # adds Storybook at http://127.0.0.1:6006
```

### Useful Docker commands

| command | what it does |
|---|---|
| `docker compose up --build` | Rebuild images and start stack |
| `docker compose up` | Start stack with cached images |
| `docker compose down` | Stop stack, keep volumes |
| `docker compose down -v` | Stop stack and wipe Neo4j data |
| `docker compose logs -f backend` | Tail backend logs |
| `docker compose logs -f neo4j` | Tail Neo4j logs |
| `docker compose --profile storybook up` | Start stack + Storybook |

---

## What you should see on startup (local)

```
[env] loaded /…/.env
[db] Neo4j connected at bolt://127.0.0.1:7687
[api] GraphQL ready: http://127.0.0.1:4000/graphql  ·  Playground: http://127.0.0.1:4000/graphiql
```

| URL | Purpose |
|---|---|
| http://127.0.0.1:4000/graphql | GraphQL endpoint |
| http://127.0.0.1:4000/graphiql | GraphiQL playground (debug builds only) |
| http://127.0.0.1:7474 | Neo4j Browser UI (Neo4j Desktop / brew) |

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
npm run db:logs                    # tail Neo4j logs (local/brew)
npm run docker:logs                # tail Neo4j logs (Docker)
```
