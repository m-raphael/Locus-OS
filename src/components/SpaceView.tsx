import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Flow, SpaceSummary, useLocusStore } from "../store";
import FlowRow from "./FlowRow";

const CONTAINER: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  gap: 32,
  padding: "48px 48px 120px",
  overflowY: "auto",
  scrollbarWidth: "none",
};

const SPACE_CARD: React.CSSProperties = {
  background: "var(--fog-bg)",
  backdropFilter: "var(--fog-blur)",
  WebkitBackdropFilter: "var(--fog-blur)",
  border: "var(--fog-border)",
  borderRadius: "var(--fog-radius-module)",
  boxShadow: "var(--fog-shadow)",
  padding: "24px 28px",
  transition: `all var(--motion-duration) var(--motion-ease)`,
};

const HEADER: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  marginBottom: 16,
};

const LABEL: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  color: "rgba(255,255,255,0.35)",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  marginBottom: 4,
};

const TITLE: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 600,
  color: "rgba(255,255,255,0.9)",
  letterSpacing: "-0.01em",
};

const MODE_PILL: React.CSSProperties = {
  padding: "3px 10px",
  borderRadius: 99,
  fontSize: 11,
  fontWeight: 500,
  background: "rgba(255,255,255,0.08)",
  color: "rgba(255,255,255,0.45)",
  letterSpacing: "0.04em",
  marginTop: 8,
  display: "inline-block",
};

const DISMISS_BTN: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "rgba(255,255,255,0.25)",
  fontSize: 18,
  lineHeight: 1,
  padding: 4,
  transition: `color var(--motion-duration) var(--motion-ease)`,
};

function SpaceCard({ space }: { space: SpaceSummary }) {
  const { activeSpaceId, flows, setFlows, removeSpace } = useLocusStore();
  const spaceFlows = flows[space.id] ?? [];

  useEffect(() => {
    invoke<Flow[]>("list_flows", { spaceId: space.id }).then((f) =>
      setFlows(space.id, f)
    );
  }, [space.id, setFlows]);

  const handleDismiss = async () => {
    if (space.is_ephemeral) {
      await invoke("dismiss_space", { spaceId: space.id });
    }
    removeSpace(space.id);
  };

  return (
    <div
      style={{
        ...SPACE_CARD,
        outline:
          space.id === activeSpaceId
            ? "1.5px solid rgba(255,255,255,0.18)"
            : "none",
      }}
    >
      <div style={HEADER}>
        <div>
          <p style={LABEL}>Space</p>
          <p style={TITLE}>{space.description}</p>
          <span style={MODE_PILL}>{space.attention_mode}</span>
        </div>
        <button
          style={DISMISS_BTN}
          onClick={handleDismiss}
          title="Dismiss space"
        >
          ×
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {spaceFlows.map((flow) => (
          <FlowRow key={flow.id} flow={flow} />
        ))}
      </div>
    </div>
  );
}

export default function SpaceView() {
  const { spaces } = useLocusStore();

  if (spaces.length === 0) {
    return (
      <div
        style={{
          ...CONTAINER,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p
          style={{
            color: "rgba(255,255,255,0.2)",
            fontSize: 15,
            letterSpacing: "0.02em",
          }}
        >
          Press ⌘K to begin
        </p>
      </div>
    );
  }

  return (
    <div style={CONTAINER}>
      {spaces.map((space) => (
        <SpaceCard key={space.id} space={space} />
      ))}
    </div>
  );
}
