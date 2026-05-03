// Locus-OS · Neo4j schema bootstrap (mirror of Db::connect)
//
// These statements are also issued at startup by `spaces_core::Db::connect`
// (see `crates/spaces-core/src/lib.rs`). They live here as documentation and
// for operators who want to apply the schema manually with cypher-shell:
//
//   cypher-shell -u neo4j -p "$NEO4J_PASSWORD" -f 0001_init.cypher
//
// All constraints are idempotent — safe to re-run.

CREATE CONSTRAINT IF NOT EXISTS FOR (n:Intent)      REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:Space)       REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:Flow)        REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:Module)      REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:Memory)      REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:Plugin)      REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:FocusGoal)   REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:Simulation)  REQUIRE n.id IS UNIQUE;
