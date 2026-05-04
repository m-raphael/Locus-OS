import ModuleShell, { ModuleHeader, ModuleAction, ModuleProps } from "./ModuleShell";

export default function MapModule(props: Omit<ModuleProps, "children">) {
  return (
    <ModuleShell {...props}>
      <ModuleHeader kind="map" source="Map · location" time="0.4 mi" />

      <div style={{ padding: "0 28px 24px" }}>
        {/* Map area */}
        <div style={{
          height: 200, borderRadius: 16, position: "relative", overflow: "hidden",
          background: "linear-gradient(135deg, oklch(94% 0.02 80), oklch(88% 0.03 60))",
        }}>
          {/* Placeholder blocks */}
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{
              position: "absolute",
              left: `${10 + i * 22}%`,
              top: `${20 + (i % 2) * 30}%`,
              width: 60, height: 24, borderRadius: 6,
              background: "rgba(20,22,30,0.06)",
            }} />
          ))}
          {/* Accent pin */}
          <div style={{ position: "absolute", left: "55%", top: "55%", transform: "translate(-50%, -50%)" }}>
            <div style={{
              width: 12, height: 12, borderRadius: "50%",
              background: props.accent,
              boxShadow: `0 0 0 6px ${props.accent}33, 0 0 0 14px ${props.accent}11`,
            }} />
          </div>
        </div>

        {/* Location info */}
        <div style={{ marginTop: 20 }}>
          <div style={{
            fontSize: 20, fontWeight: 600, letterSpacing: "-0.015em", color: "var(--text)",
          }}>
            Philz Coffee
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>
            Custom-blended java in a casual setting
          </div>
          <div style={{
            marginTop: 4, fontSize: 12, color: "var(--muted)", fontFamily: "var(--font-mono)",
          }}>
            3101 Steiner St · 0.4 mi
          </div>
        </div>

        {/* Actions */}
        <div style={{ marginTop: 20, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <ModuleAction primary accent={props.accent}>Get directions</ModuleAction>
          <ModuleAction accent={props.accent}>See details</ModuleAction>
        </div>
      </div>
    </ModuleShell>
  );
}
