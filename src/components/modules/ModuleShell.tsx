import React from "react";

export interface ModuleProps {
  idx: number;
  focused: boolean;
  anyFocused: boolean;
  accent: string;
  onFocus: (e: React.MouseEvent) => void;
  children?: React.ReactNode;
  dashed?: boolean;
}

export function ModuleHeader({ kind, source, time }: { kind: string; source: string; time: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 28px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, letterSpacing: "0.02em", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
        <span style={{
          display: "inline-flex", height: 20, width: 20, alignItems: "center", justifyContent: "center",
          borderRadius: 6, background: "var(--chip-bg)",
        }}>
          {kind === "mail" && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>}
          {kind === "cal" && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/></svg>}
          {kind === "live" && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="9"/></svg>}
          {kind === "doc" && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>}
          {kind === "ai" && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4z"/></svg>}
        </span>
        <span>{source}</span>
      </div>
      <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>{time}</span>
    </div>
  );
}

export function ModuleAction({ children, primary, accent, onClick }: { children: React.ReactNode; primary?: boolean; accent: string; onClick?: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      style={{
        padding: "8px 16px", fontSize: 13, fontWeight: 500, letterSpacing: "-0.005em",
        borderRadius: 999, border: "none", cursor: "pointer",
        background: primary ? accent : "var(--chip-bg)",
        color: primary ? "#fff" : "var(--text)",
        transition: `all 300ms var(--motion-ui)`,
      }}
    >{children}</button>
  );
}

export default function ModuleShell({ idx, focused, anyFocused, accent, onFocus, dashed, children }: ModuleProps) {
  const dimmed = anyFocused && !focused;

  if (dashed) {
    return (
      <div
        onClick={onFocus}
        style={{
          width: 360, minHeight: 440, borderRadius: "var(--module-radius)", flexShrink: 0,
          cursor: "pointer", position: "relative", overflow: "hidden",
          background: "var(--glass-bg)",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          border: `1.5px dashed rgba(128,128,128,0.25)`,
          opacity: dimmed ? 0.42 : 1,
          filter: dimmed ? "blur(2px)" : "none",
          transform: focused ? "translateY(-10px) scale(1.025)" : "translateY(0) scale(1)",
          transition: `opacity 500ms var(--motion-ui), filter 500ms var(--motion-ui), transform 500ms var(--motion-ui)`,
          animation: `lotusFloatIn 700ms var(--motion-float) ${idx * 90}ms backwards`,
        }}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      onClick={onFocus}
      style={{
        width: 360, minHeight: 440, borderRadius: "var(--module-radius)", flexShrink: 0,
        cursor: "pointer",
        background: focused ? "var(--glass-focused)" : "var(--glass-bg)",
        backdropFilter: "blur(28px) saturate(1.4)", WebkitBackdropFilter: "blur(28px) saturate(1.4)",
        boxShadow: focused ? `0 0 0 1px var(--glass-border-focused), 0 40px 100px -30px ${accent}55, 0 12px 32px -12px rgba(20,22,30,0.18)` : "var(--glass-shadow)",
        opacity: dimmed ? 0.42 : 1,
        filter: dimmed ? "blur(2px)" : "none",
        transform: focused ? "translateY(-10px) scale(1.025)" : "translateY(0) scale(1)",
        transition: `opacity 500ms var(--motion-ui), filter 500ms var(--motion-ui), transform 500ms var(--motion-ui), box-shadow 500ms var(--motion-ui), background 500ms var(--motion-ui)`,
        animation: `lotusFloatIn 700ms var(--motion-float) ${idx * 90}ms backwards`,
      }}
    >
      {children}
    </div>
  );
}
