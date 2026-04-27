-- Focus goals: named focus modes that override governance policy (item 11 / N7)
CREATE TABLE IF NOT EXISTS focus_goals (
    id          TEXT    PRIMARY KEY,
    name        TEXT    NOT NULL,
    description TEXT,
    created_at  INTEGER NOT NULL,
    active      INTEGER NOT NULL DEFAULT 0
);

-- Only one goal can be active at a time; enforce via partial index
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_focus_goal ON focus_goals (active) WHERE active = 1;
CREATE INDEX IF NOT EXISTS idx_focus_goals_name ON focus_goals (name);
