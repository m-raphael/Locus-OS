-- WebRTC signaling relay — stores offer/answer/ICE candidates per room (item 8)
CREATE TABLE IF NOT EXISTS collab_signals (
    id         TEXT    PRIMARY KEY,
    room_id    TEXT    NOT NULL,
    peer_id    TEXT    NOT NULL,
    kind       TEXT    NOT NULL,   -- 'offer' | 'answer' | 'candidate'
    payload    TEXT    NOT NULL,   -- JSON SDP or ICE candidate
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_signals_room ON collab_signals(room_id, created_at);
