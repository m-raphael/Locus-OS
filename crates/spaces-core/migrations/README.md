# spaces-core migrations (Neo4j)

Locus-OS uses **Neo4j** as its sole persistence layer — there is no SQL.

The application bootstraps its schema at startup inside
`spaces_core::Db::connect` by issuing idempotent `CREATE CONSTRAINT IF NOT
EXISTS` statements. The `.cypher` files in this directory mirror those
statements so they can also be applied manually with `cypher-shell` against
a fresh database:

```bash
cypher-shell -u neo4j -p "$NEO4J_PASSWORD" \
  -f crates/spaces-core/migrations/0001_init.cypher
```

## Conventions

- One file per logical change, numbered `NNNN_description.cypher`.
- Every statement must be idempotent (`IF NOT EXISTS`, `MERGE`, etc.) so
  re-running the file against an existing graph is safe.
- Mirror — never replace — the inline bootstrap in `Db::connect`. If the
  application changes the schema at startup, update the matching `.cypher`
  file in the same commit.

The historical SQLite migrations were removed when spaces-core moved to
Neo4j (see commit history for `crates/spaces-core/Cargo.toml`).
