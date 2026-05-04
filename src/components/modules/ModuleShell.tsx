import React from "react";
import { motion } from "motion/react";

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
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--density-header-pad)" }}>
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
          {kind === "music" && <svg width="11" height="11" viewBox="0 0 24 24" fill="#1DB954"><circle cx="12" cy="12" r="10"/></svg>}
          {kind === "alarm" && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
          {kind === "map" && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>}
        </span>
        <span>{source}</span>
      </div>
      <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>{time}</span>
    </div>
  );
}

export function ModuleAction({ children, primary, accent, onClick }: { children: React.ReactNode; primary?: boolean; accent: string; onClick?: () => void }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      style={{
        padding: "8px 16px", fontSize: 13, fontWeight: 500, letterSpacing: "-0.005em",
        borderRadius: 999, border: "none", cursor: "pointer",
        background: primary ? accent : "var(--chip-bg)",
        color: primary ? "#fff" : "var(--text)",
      }}
    >{children}</motion.button>
  );
}

export default function ModuleShell({ idx, focused, anyFocused, accent, onFocus, dashed, children }: ModuleProps) {
  const dimmed = anyFocused && !focused;

  const baseStyle: React.CSSProperties = {
    width: "var(--density-module-width)",
    minHeight: "var(--density-module-minh)",
    borderRadius: "var(--module-radius)",
    flexShrink: 0,
    cursor: "pointer",
    opacity: dimmed ? 0.42 : 1,
    filter: dimmed ? "blur(2px)" : "none",
  };

  if (dashed) {
    return (
      <motion.div
        onClick={onFocus}
        initial={{ opacity: 0, y: 24 }}
        animate={{
          opacity: dimmed ? 0.42 : 1,
          y: focused ? -10 : 0,
          scale: focused ? 1.025 : 1,
          filter: dimmed ? "blur(2px)" : "blur(0px)",
        }}
        transition={{ type: "spring", stiffness: 300, damping: 24, delay: idx * 0.07 }}
        style={{
          ...baseStyle,
          background: "var(--glass-bg)",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          border: "1.5px dashed rgba(128,128,128,0.25)",
        }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      onClick={onFocus}
      initial={{ opacity: 0, y: 24 }}
      animate={{
        opacity: dimmed ? 0.42 : 1,
        y: focused ? -10 : 0,
        scale: focused ? 1.025 : 1,
        filter: dimmed ? "blur(2px)" : "blur(0px)",
        backgroundColor: focused ? "var(--glass-focused)" : "var(--glass-bg)",
        borderColor: focused ? "var(--glass-border-focused)" : "var(--glass-border)",
        boxShadow: focused
          ? `0 40px 100px -30px ${accent}55, 0 12px 32px -12px rgba(20,22,30,0.18)`
          : "var(--glass-shadow)",
      }}
      transition={{ type: "spring", stiffness: 300, damping: 24, delay: idx * 0.07 }}
      style={{
        ...baseStyle,
        backdropFilter: "blur(28px) saturate(1.4)", WebkitBackdropFilter: "blur(28px) saturate(1.4)",
        border: "1px solid var(--glass-border)",
        boxShadow: "var(--glass-shadow)",
      }}
    >
      {children}
    </motion.div>
  );
}
