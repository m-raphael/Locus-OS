import ModuleShell, { ModuleHeader, ModuleAction, ModuleProps } from "./ModuleShell";

const AVATARS = [
  { n: "NK", hue: 260 }, { n: "TS", hue: 220 }, { n: "RB", hue: 300 }, { n: "+2", placeholder: true },
];

export default function CalendarModule(props: Omit<ModuleProps, "children">) {
  return (
    <ModuleShell {...props}>
      <ModuleHeader kind="cal" source="Calendar · invite" time="Tomorrow" />
      <div style={{ padding: "28px 28px 24px" }}>
        <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
          Wed · 28 Apr · 10:30–11:15
        </div>
        <h3 style={{ marginTop: 8, fontSize: 34, lineHeight: 1.05, fontWeight: 600, letterSpacing: "-0.025em", color: "var(--text)" }}>
          Design crit:<br/>Locus v2 patterns
        </h3>
        <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 8 }}>
          {AVATARS.map((a, i) => (
            <div key={i} style={{
              height: 32, width: 32, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 500,
              background: a.placeholder ? "transparent" : `oklch(65% 0.08 ${a.hue})`,
              color: a.placeholder ? "var(--muted)" : "#fff",
              border: a.placeholder ? "1px dashed rgba(128,128,128,0.4)" : "none",
            }}>{a.n}</div>
          ))}
        </div>
        <div style={{
          marginTop: 20, borderRadius: 16, padding: "12px 16px",
          display: "flex", alignItems: "center", gap: 12, background: "var(--chip-bg)",
        }}>
          <span style={{ height: 6, width: 6, borderRadius: "50%", background: props.accent, boxShadow: `0 0 12px ${props.accent}`, flexShrink: 0 }}/>
          <span style={{ fontSize: 13, color: "var(--text)" }}>
            Conflicts with <em style={{ fontStyle: "normal", color: "var(--muted)" }}>"Heads-down"</em>
          </span>
        </div>
        <div style={{ marginTop: 24, display: "flex", gap: 8 }}>
          <ModuleAction primary accent={props.accent}>Accept</ModuleAction>
          <ModuleAction accent={props.accent}>Maybe</ModuleAction>
          <ModuleAction accent={props.accent}>Decline</ModuleAction>
        </div>
      </div>
    </ModuleShell>
  );
}
