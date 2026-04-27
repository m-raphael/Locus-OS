-- Marketplace: installed plugin registry (item 9)
CREATE TABLE IF NOT EXISTS plugins (
    id           TEXT    PRIMARY KEY,
    name         TEXT    NOT NULL,
    version      TEXT    NOT NULL,
    manifest_json TEXT   NOT NULL,
    installed_at INTEGER NOT NULL,
    enabled      INTEGER NOT NULL DEFAULT 1
);

-- Governance: policy rules (N15 / G5)
CREATE TABLE IF NOT EXISTS policies (
    id          TEXT    PRIMARY KEY,
    name        TEXT    NOT NULL UNIQUE,
    rule_json   TEXT    NOT NULL,
    created_at  INTEGER NOT NULL,
    enabled     INTEGER NOT NULL DEFAULT 1
);
