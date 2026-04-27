const CHIPS = ["Review Inbox", "Draft response", "Plan trip", "Find apartments"];

export default function IdleView() {
  return (
    <div style={{
      position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
      paddingBottom: 200,
    }}>
      <div style={{ textAlign: "center", maxWidth: 640, padding: "0 32px", animation: "lotusFloatIn 700ms var(--motion-float)" }}>
        <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.18em", color: "var(--muted)", fontFamily: "var(--font-mono)", marginBottom: 24 }}>
          good afternoon
        </div>
        <h1 style={{
          fontSize: 88, lineHeight: 0.95, fontWeight: 600,
          letterSpacing: "-0.04em", color: "var(--text)",
        }}>
          What's on<br/>your mind?
        </h1>
        <p style={{ marginTop: 28, fontSize: 15, lineHeight: 1.6, color: "var(--muted)" }}>
          Type an intention below. LOTUS will assemble the modules
          you need into a Space — no apps, no hunting.
        </p>
        <div style={{ marginTop: 40, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {CHIPS.map((s) => (
            <span key={s} style={{
              padding: "8px 16px", fontSize: 12, borderRadius: 999,
              background: "var(--chip-bg)", color: "var(--muted)", fontFamily: "var(--font-mono)",
            }}>{s}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
