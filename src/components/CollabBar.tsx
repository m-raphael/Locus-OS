/// Collaboration room bar — shown when a Live collab session is active.
/// Renders below the Space header when useCollab state is "connecting" or "connected".
import { useState } from "react";
import { useCollab, CollabState } from "../hooks/useCollab";
import { useLocusStore } from "../store";

const STATE_COLOR: Record<CollabState, string> = {
  idle: "rgba(128,128,128,0.4)",
  connecting: "#f59e0b",
  connected: "#22c55e",
  error: "#ef4444",
};

export function useCollabSession() {
  return useCollab({
    onData: (msg) => {
      try {
        const { type, payload } = JSON.parse(msg);
        if (type === "space_change" && payload?.label) {
          useLocusStore.getState().setActiveSpace(payload.id, payload.label);
        }
      } catch {}
    },
  });
}

interface Props {
  session: ReturnType<typeof useCollabSession>;
}

export default function CollabBar({ session }: Props) {
  const { state, roomCode, cleanup, send } = session;
  const { activeSpaceId, activeSpaceLabel, accent } = useLocusStore();

  if (state === "idle") return null;

  const broadcastSpace = () => {
    if (activeSpaceId && activeSpaceLabel) {
      send(JSON.stringify({ type: "space_change", payload: { id: activeSpaceId, label: activeSpaceLabel } }));
    }
  };

  return (
    <div style={{
      position: "fixed", top: 72, left: "50%", transform: "translateX(-50%)",
      zIndex: 25, display: "flex", alignItems: "center", gap: 12,
      padding: "8px 16px", borderRadius: 999,
      background: "var(--locus-bg)",
      backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
      boxShadow: "var(--locus-shadow)",
      fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--muted)",
    }}>
      <span style={{ height: 7, width: 7, borderRadius: "50%", background: STATE_COLOR[state], boxShadow: state === "connected" ? `0 0 8px ${STATE_COLOR[state]}` : "none" }}/>
      {state === "connecting" && <span>Connecting · room <strong style={{ color: "var(--text)" }}>{roomCode}</strong></span>}
      {state === "connected" && (
        <>
          <span>Live · <strong style={{ color: accent }}>{roomCode}</strong></span>
          <button onClick={broadcastSpace} style={{ background: accent, color: "#fff", border: "none", cursor: "pointer", borderRadius: 999, padding: "3px 10px", fontSize: 11, fontFamily: "var(--font-mono)" }}>
            Share space
          </button>
          <button onClick={cleanup} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 14 }}>×</button>
        </>
      )}
    </div>
  );
}

/// Collab action buttons used inside LiveModule
export function CollabActions({ session }: Props) {
  const { state, createRoom, joinRoom, cleanup } = session;
  const [joinInput, setJoinInput] = useState("");
  const [showJoin, setShowJoin] = useState(false);
  const { accent } = useLocusStore();

  if (state !== "idle") {
    return (
      <button onClick={cleanup} style={{ padding: "8px 16px", fontSize: 13, borderRadius: 999, border: "none", cursor: "pointer", background: "var(--chip-bg)", color: "var(--muted)" }}>
        Leave
      </button>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => createRoom()} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 500, borderRadius: 999, border: "none", cursor: "pointer", background: accent, color: "#fff" }}>
          Start room
        </button>
        <button onClick={() => setShowJoin(v => !v)} style={{ padding: "8px 16px", fontSize: 13, borderRadius: 999, border: "none", cursor: "pointer", background: "var(--chip-bg)", color: "var(--text)" }}>
          Join
        </button>
      </div>
      {showJoin && (
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={joinInput}
            onChange={e => setJoinInput(e.target.value.toUpperCase())}
            placeholder="ROOM CODE"
            maxLength={6}
            style={{ flex: 1, background: "var(--chip-bg)", border: "none", borderRadius: 999, padding: "6px 12px", fontSize: 13, fontFamily: "var(--font-mono)", color: "var(--text)", outline: "none", letterSpacing: "0.1em" }}
          />
          <button onClick={() => { if (joinInput.length === 6) { joinRoom(joinInput); setShowJoin(false); } }} style={{ padding: "6px 14px", fontSize: 13, borderRadius: 999, border: "none", cursor: "pointer", background: accent, color: "#fff" }}>
            →
          </button>
        </div>
      )}
    </div>
  );
}
