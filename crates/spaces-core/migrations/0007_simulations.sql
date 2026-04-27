-- Simulations layer: personal scenario modeling (item 12 / N8)
CREATE TABLE IF NOT EXISTS simulations (
    id          TEXT    PRIMARY KEY,
    name        TEXT    NOT NULL,
    description TEXT,
    created_at  INTEGER NOT NULL,
    status      TEXT    NOT NULL DEFAULT "pending" -- pending | running | completed | failed
);

CREATE TABLE IF NOT EXISTS simulation_results (
    id              TEXT    PRIMARY KEY,
    simulation_id   TEXT    NOT NULL,
    outcome_name    TEXT    NOT NULL,
    probability     REAL    NOT NULL,
    confidence      REAL    NOT NULL,
    created_at      INTEGER NOT NULL,
    FOREIGN KEY (simulation_id) REFERENCES simulations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_simulations_status ON simulations (status);
CREATE INDEX IF NOT EXISTS idx_results_simulation ON simulation_results (simulation_id);
