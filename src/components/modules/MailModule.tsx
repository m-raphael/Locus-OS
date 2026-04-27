import ModuleShell, { ModuleHeader, ModuleAction, ModuleProps } from "./ModuleShell";

export default function MailModule(props: Omit<ModuleProps, "children">) {
  return (
    <ModuleShell {...props}>
      <ModuleHeader kind="mail" source="Mail · from Naomi K." time="14:02" />
      <div style={{ padding: "28px 28px 24px" }}>
        <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>Naomi Kessler</div>
        <h3 style={{ marginTop: 8, fontSize: 34, lineHeight: 1.05, fontWeight: 600, letterSpacing: "-0.025em", color: "var(--text)" }}>
          Final review on the Q3<br/>positioning brief
        </h3>
        <p style={{ marginTop: 20, fontSize: 14, lineHeight: 1.55, color: "var(--muted)" }}>
          Hey — pulled together the edits we discussed Friday. Two open
          questions on the metric framing, otherwise ready to ship. Mind
          looking before EOD?{" "}
          <span style={{ color: "var(--text)" }}>Marking this urgent.</span>
        </p>
        <div style={{ marginTop: 28, display: "flex", gap: 8 }}>
          <ModuleAction primary accent={props.accent}>Reply</ModuleAction>
          <ModuleAction accent={props.accent}>Forward</ModuleAction>
          <ModuleAction accent={props.accent}>Archive</ModuleAction>
        </div>
        <div style={{ marginTop: 20, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
          ⌘ More actions
        </div>
      </div>
    </ModuleShell>
  );
}
