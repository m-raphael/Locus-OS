import ModuleShell, { ModuleHeader, ModuleAction, ModuleProps } from "./ModuleShell";

const PEOPLE = [
  { n: "TS", x: "20%", y: "30%", hue: 200, delay: "0s" },
  { n: "RB", x: "55%", y: "55%", hue: 30,  delay: "0.4s" },
  { n: "DM", x: "78%", y: "25%", hue: 140, delay: "0.8s" },
];

export default function LiveModule(props: Omit<ModuleProps, "children">) {
  return (
    <ModuleShell {...props}>
      <ModuleHeader kind="live" source="Live · collaboration" time="now" />
      <div style={{ padding: "24px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
          <span style={{ position: "relative", display: "inline-flex", height: 8, width: 8 }}>
            <span style={{
              position: "absolute", inset: 0, borderRadius: "50%", background: "#22c55e",
              animation: "lotusLivePing 1.5s ease-in-out infinite",
            }}/>
            <span style={{ position: "relative", height: 8, width: 8, borderRadius: "50%", background: "#22c55e" }}/>
          </span>
          3 collaborators present
        </div>
        <div style={{
          marginTop: 20, position: "relative", height: 180, borderRadius: 16, overflow: "hidden",
          background: `linear-gradient(135deg, ${props.accent}30, ${props.accent}05 60%, transparent), var(--chip-bg)`,
        }}>
          {PEOPLE.map((p, i) => (
            <div key={i} style={{
              position: "absolute", left: p.x, top: p.y,
              transform: "translate(-50%, -50%)",
              animation: `lotusBob 3s ease-in-out ${p.delay} infinite`,
            }}>
              <div style={{
                height: 48, width: 48, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 500, color: "#fff",
                background: `oklch(70% 0.09 ${p.hue})`,
                boxShadow: `0 0 0 3px var(--glass-focused), 0 8px 24px rgba(0,0,0,0.15)`,
              }}>{p.n}</div>
            </div>
          ))}
        </div>
        <h3 style={{ marginTop: 20, fontSize: 26, lineHeight: 1.1, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text)" }}>
          Tomás is editing the brief.
        </h3>
        <p style={{ marginTop: 8, fontSize: 14, lineHeight: 1.55, color: "var(--muted)" }}>
          They left a cursor near the metric framing. Want to jump in?
        </p>
        <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
          <ModuleAction primary accent={props.accent}>Join</ModuleAction>
          <ModuleAction accent={props.accent}>Watch</ModuleAction>
        </div>
      </div>
    </ModuleShell>
  );
}
