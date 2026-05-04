import ModuleShell, { ModuleHeader, ModuleAction, ModuleProps } from "./ModuleShell";

export default function MusicModule(props: Omit<ModuleProps, "children">) {
  return (
    <ModuleShell {...props}>
      <ModuleHeader kind="music" source="Music · Spotify" time="Now" />

      <div style={{ padding: "0 28px 24px" }}>
        {/* Album art */}
        <div style={{
          aspectRatio: "1", borderRadius: 16, overflow: "hidden", position: "relative",
          background: "linear-gradient(135deg, oklch(40% 0.1 320), oklch(30% 0.08 280))",
        }}>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", padding: 20 }}>
            <div style={{
              fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em",
              color: "rgba(255,255,255,0.7)", fontFamily: "var(--font-mono)",
            }}>
              Album art
            </div>
          </div>
        </div>

        {/* Track info */}
        <div style={{ marginTop: 20 }}>
          <div style={{
            fontSize: 22, fontWeight: 600, letterSpacing: "-0.015em", color: "var(--text)",
          }}>
            Four Seasons
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>
            Single by <span style={{ color: "var(--text)" }}>Taeyeon</span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
          <ModuleAction primary accent={props.accent}>Play</ModuleAction>
          <ModuleAction accent={props.accent}>Save</ModuleAction>
        </div>

        {/* Track list */}
        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            [1, "Blue"],
            [2, "Four Seasons"],
          ].map(([n, label]) => (
            <div key={n} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: "var(--text)" }}>
              <span style={{
                fontSize: 11, width: 12, color: "var(--muted)", fontFamily: "var(--font-mono)",
              }}>{n}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </ModuleShell>
  );
}
