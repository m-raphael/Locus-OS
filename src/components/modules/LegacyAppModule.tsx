import { invoke } from "@tauri-apps/api/core";
import ModuleShell, { ModuleAction, ModuleProps } from "./ModuleShell";

interface Props extends Omit<ModuleProps, "children"> {
  appName: string;
  appPath: string;
  bundleId: string;
}

// Deterministic colour from app name for the letter avatar
function nameColor(name: string): string {
  const hues = [210, 260, 30, 140, 340, 180, 50, 290];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
  return `oklch(62% 0.13 ${hues[hash % hues.length]})`;
}

export default function LegacyAppModule({ appName, appPath, bundleId, ...props }: Props) {
  const { accent } = props;
  const color = nameColor(appName);
  const initial = appName.charAt(0).toUpperCase();

  const launch = () => invoke("launch_legacy_app", { path: appPath }).catch(() => null);
  const quit = () => invoke("quit_legacy_app", { bundleId }).catch(() => null);

  return (
    <ModuleShell {...props}>
      <div style={{ padding: "28px 28px 24px" }}>
        {/* App avatar */}
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: color, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28, fontWeight: 700, color: "#fff",
          boxShadow: `0 8px 24px ${color}55`,
          marginBottom: 20,
        }}>{initial}</div>

        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--muted)", fontFamily: "var(--font-mono)", marginBottom: 8 }}>
          Legacy app
        </div>
        <h3 style={{ fontSize: 34, lineHeight: 1.05, fontWeight: 600, letterSpacing: "-0.025em", color: "var(--text)" }}>
          {appName}
        </h3>
        <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.55, color: "var(--muted)" }}>
          Runs in its own window outside Locus. Use the controls below to manage it from this Space.
        </p>

        {/* Status chip */}
        <div style={{
          marginTop: 20, display: "inline-flex", alignItems: "center", gap: 8,
          padding: "6px 14px", borderRadius: 999, background: "var(--chip-bg)",
          fontSize: 12, color: "var(--muted)", fontFamily: "var(--font-mono)",
        }}>
          <span style={{ height: 6, width: 6, borderRadius: "50%", background: accent, boxShadow: `0 0 8px ${accent}` }}/>
          sandboxed · macOS window
        </div>

        <div style={{ marginTop: 24, display: "flex", gap: 8 }}>
          <ModuleAction primary accent={accent} onClick={launch}>Activate</ModuleAction>
          <ModuleAction accent={accent} onClick={launch}>Re-launch</ModuleAction>
          <ModuleAction accent={accent} onClick={quit}>Quit</ModuleAction>
        </div>

        <div style={{ marginTop: 16, fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>
          {appPath.split("/").slice(-2).join("/")}
        </div>
      </div>
    </ModuleShell>
  );
}
