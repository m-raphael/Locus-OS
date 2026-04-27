-- Audit logs layer (item 16 / N16)
CREATE TABLE IF NOT EXISTS audit_logs (
    id          TEXT    PRIMARY KEY,
    event_type  TEXT    NOT NULL,
    actor       TEXT,
    resource_id TEXT,
    details     TEXT,
    created_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_type   ON audit_logs (event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_time   ON audit_logs (created_at);
