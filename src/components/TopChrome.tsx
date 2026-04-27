import { useLocusStore } from "../store";

export default function TopChrome() {
  const { activeSpaceLabel, accent, toggleTheme, isDark, backendLabel, uiDensity, setUiDensity } = useLocusStore();

  const densityIcon = {
    compact: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="7" height="7" rx="1"/><rect x="14" y="4" width="7" height="7" rx="1"/>
        <rect x="3" y="13" width="7" height="7" rx="1"/><rect x="14" y="13" width="7" height="7" rx="1"/>
      </svg>
    ),
    default: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="4" width="16" height="6" rx="1"/><rect x="4" y="14" width="16" height="6" rx="1"/>
      </svg>
    ),
    spacious: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="5" y="5" width="14" height="4" rx="1"/><rect x="5" y="11" width="14" height="4" rx="1"/><rect x="5" y="17" width="14" height="4" rx="1"/>
      </svg>
    ),
  };

  const backendColor: Record<string, string> = {
    NPU: "#34d399",  // emerald — local/fast
    NIM: accent,     // accent periwinkle — cloud AI
    KEY: "rgba(128,128,128,0.5)", // muted — keyword only
  };

  return (
    <div style={{
      position: "absolute", inset: "0 0 auto 0", zIndex: 20,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "24px 32px",
    }}>
      {/* Left: wordmark + space indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 3c0 4 3 7 7 7-4 0-7 3-7 7 0-4-3-7-7-7 4 0 7-3 7-7z" fill={accent} opacity="0.85"/>
          </svg>
          <span style={{ fontSize: 14, fontWeight: 500, letterSpacing: "-0.01em", color: "var(--text)" }}>LOTUS</span>
          <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--muted)", fontFamily: "var(--font-mono)", marginTop: 1 }}>
            os · 0.1
          </span>
        </div>
        <div style={{ marginLeft: 20, height: 16, width: 1, background: "rgba(128,128,128,0.15)" }}/>
        <div style={{ marginLeft: 8, display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
          <span style={{ height: 6, width: 6, borderRadius: "50%", background: accent, boxShadow: `0 0 8px ${accent}`, display: "inline-block" }}/>
          active space — {activeSpaceLabel || "none"}
        </div>
        {backendLabel && (
          <div style={{
            marginLeft: 12, display: "flex", alignItems: "center", gap: 6,
            padding: "3px 10px", borderRadius: 999,
            background: "var(--chip-bg)", fontSize: 10,
            fontFamily: "var(--font-mono)", letterSpacing: "0.12em",
            color: backendColor[backendLabel] ?? "var(--muted)",
          }}>
            <span style={{
              height: 5, width: 5, borderRadius: "50%",
              background: backendColor[backendLabel] ?? "var(--muted)",
              boxShadow: backendLabel !== "KEY" ? `0 0 6px ${backendColor[backendLabel]}` : "none",
            }}/>
            {backendLabel}
          </div>
        )}
      </div>

      {/* Right: clock + theme toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
          {new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
        </span>
        <button
          onClick={() => setUiDensity(uiDensity === "default" ? "compact" : uiDensity === "compact" ? "spacious" : "default")}
          title={`Density: ${uiDensity}`}
          style={{
            height: 36, width: 36, borderRadius: "50%", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "var(--glass-bg)", backdropFilter: "blur(20px)",
            color: "var(--text)", boxShadow: "0 0 0 1px var(--glass-border)",
            transition: `all 300ms var(--motion-ui)`,
          }}
        >
          {densityIcon[uiDensity]}
        </button>
        <button
          onClick={toggleTheme}
          style={{
            height: 36, width: 36, borderRadius: "50%", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "var(--glass-bg)", backdropFilter: "blur(20px)",
            color: "var(--text)", boxShadow: "0 0 0 1px var(--glass-border)",
            transition: `all 300ms var(--motion-ui)`,
          }}
        >
          {isDark ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
