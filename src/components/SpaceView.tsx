import { useLocusStore } from "../store";

const CONTAINER: React.CSSProperties = {
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

const LABEL: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: "rgba(255,255,255,0.5)",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: 8,
};

const TITLE: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 600,
  color: "rgba(255,255,255,0.9)",
  letterSpacing: "-0.01em",
};

const MODE_PILL: React.CSSProperties = {
  display: "inline-block",
  marginTop: 12,
  padding: "3px 10px",
  borderRadius: 99,
  fontSize: 11,
  fontWeight: 500,
  background: "rgba(255,255,255,0.08)",
  color: "rgba(255,255,255,0.5)",
  letterSpacing: "0.04em",
};

export default function SpaceView() {
  const { spaces, activeSpaceId } = useLocusStore();

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
        <div
          key={space.id}
          style={{
            ...SPACE_CARD,
            outline:
              space.id === activeSpaceId
                ? "1.5px solid rgba(255,255,255,0.18)"
                : "none",
          }}
        >
          <p style={LABEL}>Space</p>
          <p style={TITLE}>{space.description}</p>
          <span style={MODE_PILL}>{space.attention_mode}</span>
        </div>
      ))}
    </div>
  );
}
