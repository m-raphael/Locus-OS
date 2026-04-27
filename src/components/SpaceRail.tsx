import { useLocusStore } from "../store";

const SPACES = ["Review Inbox", "Plan trip to Lisbon", "Draft response to Naomi", "Find apartments in Brooklyn"];

export default function SpaceRail() {
  const { activeSpaceLabel, accent } = useLocusStore();

  return (
    <div style={{
      position: "absolute", left: 24, top: "50%", transform: "translateY(-50%)", zIndex: 20,
      display: "flex", flexDirection: "column", gap: 6,
      padding: "14px 10px",
      borderRadius: "var(--rail-radius)",
      background: "var(--rail-bg)",
      backdropFilter: "blur(24px) saturate(1.3)",
      WebkitBackdropFilter: "blur(24px) saturate(1.3)",
      boxShadow: "var(--rail-shadow)",
    }}>
      <div style={{ padding: "8px 12px 4px", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
        Spaces
      </div>
      {SPACES.map((s) => {
        const active = s === activeSpaceLabel;
        return (
          <div key={s} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "8px 12px",
            borderRadius: 14,
            background: active ? "var(--dropdown-row-active)" : "transparent",
            color: active ? "var(--text)" : "var(--muted)",
            cursor: "default",
            transition: `all 300ms var(--motion-ui)`,
          }}>
            <span style={{
              height: 6, width: 6, borderRadius: "50%", flexShrink: 0,
              background: active ? accent : "rgba(128,128,128,0.3)",
              boxShadow: active ? `0 0 8px ${accent}` : "none",
              transition: `all 300ms var(--motion-ui)`,
            }}/>
            <span style={{ fontSize: 12, letterSpacing: "-0.005em", minWidth: 130 }}>{s}</span>
          </div>
        );
      })}
      <div style={{ marginTop: 8, padding: "4px 12px", fontSize: 10, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
        ⌘ + space — new flow
      </div>
    </div>
  );
}
