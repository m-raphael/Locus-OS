CREATE TABLE IF NOT EXISTS space_visits (
  id          TEXT    PRIMARY KEY,
  description TEXT    NOT NULL,
  visited_at  INTEGER NOT NULL,
  hour_of_day INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_visits_description ON space_visits (description);
CREATE INDEX IF NOT EXISTS idx_visits_time ON space_visits (visited_at DESC);
