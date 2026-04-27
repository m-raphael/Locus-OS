import { useLocusStore } from "../../store";
import ModuleShell, { ModuleAction, ModuleProps } from "./ModuleShell";

export default function PredictiveModule(props: Omit<ModuleProps, "children" | "dashed">) {
  const { accent } = props;
  const suggestedNext = useLocusStore((s) => s.suggestedNext);

  const title = suggestedNext ?? "Draft a response\nto Naomi.";
  const body = suggestedNext
    ? `LOTUS suggests: "${suggestedNext}" — based on your current context and recent activity.`
    : "LOTUS sees the urgent flag, your free 3pm window, and the attached brief. It can draft something for you to edit.";

  return (
    <ModuleShell {...props} dashed>
      <div style={{ position: "relative", padding: "24px 28px", height: "100%", minHeight: 440, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.14em", color: accent, fontFamily: "var(--font-mono)" }}>
          <span style={{
            display: "inline-flex", height: 20, width: 20, alignItems: "center", justifyContent: "center",
            borderRadius: 6, background: `${accent}22`,
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2">
              <path d="M12 3l2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4z"/>
            </svg>
          </span>
          {suggestedNext ? "AI suggested" : "Predicted next"}
        </div>
        <h3 style={{ marginTop: 24, fontSize: 34, lineHeight: 1.05, fontWeight: 600, letterSpacing: "-0.025em", color: "var(--text)", whiteSpace: "pre-line" }}>
          {title}
        </h3>
        <p style={{ marginTop: 16, fontSize: 14, lineHeight: 1.55, color: "var(--muted)" }}>
          {body}
        </p>
        <div style={{ marginTop: "auto", paddingTop: 24, display: "flex", gap: 8 }}>
          <ModuleAction primary accent={accent}>Generate draft</ModuleAction>
          <ModuleAction accent={accent}>Skip</ModuleAction>
        </div>
        <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
          <div style={{ flex: 1, height: 1, background: "rgba(128,128,128,0.2)" }}/>
          confidence 0.82
          <div style={{ flex: 1, height: 1, background: "rgba(128,128,128,0.2)" }}/>
        </div>
      </div>
    </ModuleShell>
  );
}
