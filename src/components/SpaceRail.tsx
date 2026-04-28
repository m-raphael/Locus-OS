import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useLocusStore } from "../store";

export default function SpaceRail() {
  const { activeSpaceId, accent, spaces, setActiveSpace, removeSpace } = useLocusStore();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const dismiss = (e: React.MouseEvent, spaceId: string) => {
    e.stopPropagation();
    invoke("dismiss_space", { spaceId }).catch(() => {});
    removeSpace(spaceId);
  };

  return (
    <div style={{
      position: "absolute", left: 24, top: "50%", transform: "translateY(-50%)", zIndex: 20,
      display: "flex", flexDirection: "column", gap: 6,
      padding: "14px 10px",
      borderRadius: "var(--rail-radius)",
      background: "var(--rail-bg)",
      backdropFilter: "blur(24px) saturate(1.3)",
      WebkitBackdropFilter: "blur(24px) saturate(1.3)",
      boxShadow: "var(--rail-shadow)",
    }}>
      <div style={{ padding: "8px 12px 4px", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
        Spaces
      </div>
      {spaces.map((s) => {
        const active = s.id === activeSpaceId;
        const hovered = hoveredId === s.id;
        return (
          <div
            key={s.id}
            onClick={() => setActiveSpace(s.id, s.description)}
            onMouseEnter={() => setHoveredId(s.id)}
            onMouseLeave={() => setHoveredId(null)}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "8px 12px",
              borderRadius: 14,
              background: active ? "var(--dropdown-row-active)" : hovered ? "var(--chip-bg)" : "transparent",
              color: active ? "var(--text)" : "var(--muted)",
              cursor: "pointer",
              transition: `all 300ms var(--motion-ui)`,
            }}
          >
            <span style={{
              height: 6, width: 6, borderRadius: "50%", flexShrink: 0,
              background: active ? accent : s.is_ephemeral ? "rgba(128,128,128,0.15)" : "rgba(128,128,128,0.3)",
              boxShadow: active ? `0 0 8px ${accent}` : "none",
              border: s.is_ephemeral ? "1.5px dashed rgba(128,128,128,0.4)" : "none",
              transition: `all 300ms var(--motion-ui)`,
            }}/>
            <span style={{ fontSize: 12, letterSpacing: "-0.005em", minWidth: 120, opacity: s.is_ephemeral ? 0.7 : 1 }}>
              {s.description}
            </span>
            <button
              onClick={(e) => dismiss(e, s.id)}
              title="Dismiss space"
              style={{
                marginLeft: "auto", background: "none", border: "none",
                cursor: "pointer", color: "var(--muted)", fontSize: 14,
                padding: "0 2px", lineHeight: 1, flexShrink: 0,
                opacity: hovered ? 1 : 0,
                transition: "opacity 150ms",
              }}
            >×</button>
          </div>
        );
      })}
      <div style={{ marginTop: 8, padding: "4px 12px", fontSize: 10, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
        ⌘ + space — new flow
      </div>
    </div>
  );
}
