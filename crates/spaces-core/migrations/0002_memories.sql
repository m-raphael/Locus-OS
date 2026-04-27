-- Context memory: FTS5 full-text index for intent recall (item 6 / N3)
CREATE VIRTUAL TABLE IF NOT EXISTS memories USING fts5(
    id        UNINDEXED,
    content,
    space_id  UNINDEXED,
    created_at UNINDEXED
);
