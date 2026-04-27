PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS intents (
    id          TEXT    PRIMARY KEY,
    description TEXT    NOT NULL,
    created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS spaces (
    id              TEXT    PRIMARY KEY,
    intent_id       TEXT    NOT NULL REFERENCES intents(id),
    attention_mode  TEXT    NOT NULL DEFAULT 'open',
    is_ephemeral    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS flows (
    id          TEXT    PRIMARY KEY,
    space_id    TEXT    NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS modules (
    id              TEXT    PRIMARY KEY,
    flow_id         TEXT    NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
    component_type  TEXT    NOT NULL,
    props_json      TEXT    NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_flows_space    ON flows(space_id, order_index);
CREATE INDEX IF NOT EXISTS idx_modules_flow   ON modules(flow_id);
