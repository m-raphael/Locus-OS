import ModuleShell, { ModuleHeader, ModuleAction, ModuleProps } from "./ModuleShell";

export default function AlarmModule(props: Omit<ModuleProps, "children">) {
  return (
    <ModuleShell {...props}>
      <ModuleHeader kind="alarm" source="Alarm · smart" time="8:30 AM" />

      <div style={{ padding: "0 28px 24px" }}>
        {/* Prompt */}
        <div style={{
          fontSize: 12, color: "var(--muted)", fontFamily: "var(--font-mono)",
        }}>
          Wake me up in 6 hours if it stops snowing
        </div>

        {/* Alarm title */}
        <h3 style={{
          marginTop: 16, fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text)",
        }}>
          Alarm set for{" "}
          <span style={{ borderBottom: `2px solid ${props.accent}` }}>8:30 AM</span>
        </h3>

        {/* Conditions chip */}
        <div style={{
          marginTop: 24, borderRadius: 16, padding: "16px",
          background: "var(--chip-bg)",
        }}>
          <div style={{
            fontSize: 12, textTransform: "uppercase", letterSpacing: "0.14em",
            color: "var(--muted)", fontFamily: "var(--font-mono)",
          }}>
            Conditions
          </div>
          <div style={{ marginTop: 12, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 14, color: "var(--text)" }}>
                If snowing at 8:29 AM, cancel alarm
              </div>
              <div style={{
                marginTop: 4, fontSize: 12, color: "var(--muted)", fontFamily: "var(--font-mono)",
              }}>
                −2°C · Chance of snow: 50%
              </div>
            </div>
            <button style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 16, color: "var(--muted)", padding: 0,
            }}>×</button>
          </div>
        </div>

        {/* Actions */}
        <div style={{ marginTop: 20, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <ModuleAction accent={props.accent}>See all alarms</ModuleAction>
          <ModuleAction accent={props.accent}>Show weather</ModuleAction>
        </div>

        {/* Hint */}
        <div style={{
          marginTop: 16, fontSize: 12, color: "var(--muted)", fontFamily: "var(--font-mono)",
        }}>
          More actions
        </div>
      </div>
    </ModuleShell>
  );
}
