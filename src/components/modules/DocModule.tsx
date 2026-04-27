import ModuleShell, { ModuleHeader, ModuleProps } from "./ModuleShell";

const LINE_WIDTHS = [100, 92, 76, 100, 88, 64, 100, 70];

export default function DocModule(props: Omit<ModuleProps, "children">) {
  return (
    <ModuleShell {...props}>
      <ModuleHeader kind="doc" source="Doc · attached" time="2.4 MB" />
      <div style={{ padding: "28px 28px 24px" }}>
        <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
          Q3-positioning-v4.md
        </div>
        <h3 style={{ marginTop: 8, fontSize: 28, lineHeight: 1.1, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text)" }}>
          The quiet shift in how teams ship.
        </h3>
        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 10 }}>
          {LINE_WIDTHS.map((w, i) => (
            <div key={i} style={{
              height: 8, borderRadius: 999,
              width: `${w}%`,
              background: i % 3 === 0 ? "rgba(128,128,128,0.18)" : "rgba(128,128,128,0.1)",
            }}/>
          ))}
        </div>
        <div style={{ marginTop: 28, display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
          <span>2 open comments</span>
          <span>last edit 4m ago</span>
        </div>
      </div>
    </ModuleShell>
  );
}
