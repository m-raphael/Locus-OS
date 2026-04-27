import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useLocusStore } from "../../store";
import ModuleShell from "./ModuleShell";

interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  module_type: string;
  permissions: string[];
  homepage: string | null;
}

// Risk level by permission key
function permRisk(p: string): "high" | "med" | "low" {
  if (p === "file_system" || p === "clipboard") return "high";
  if (p === "network" || p === "native_app") return "med";
  return "low";
}

// Inline SVG icons per module_type
function PluginIcon({ type, accent }: { type: string; accent: string }) {
  const s = { width: 14, height: 14, flexShrink: 0 as const };
  if (type === "WeatherModule")
    return <svg {...s} viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>;
  if (type === "GithubModule")
    return <svg {...s} viewBox="0 0 24 24" fill={accent}><path d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.49.5.09.66-.22.66-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.56 9.56 0 0 1 12 6.8c.85 0 1.71.12 2.51.34 1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.16.58.67.48A10.01 10.01 0 0 0 22 12C22 6.48 17.52 2 12 2z"/></svg>;
  if (type === "NotesModule")
    return <svg {...s} viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>;
  if (type === "ClipboardAiModule")
    return <svg {...s} viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M12 11l1.6 4.4L18 12l-4.4 1.6L12 9l-1.6 4.4L6 12l4.4 1.6z"/></svg>;
  // Linear / default
  return <svg {...s} viewBox="0 0 24 24" fill={accent}><path d="M5.93 17.25L2 13.32l1.06-1.06 2.87 2.87L17.25 3.5 18.32 4.56z" opacity=".3"/><path d="M22 3.5L12 13.5l-3.5-3.5L22 3.5z"/></svg>;
}

interface Props {
  idx: number;
  accent: string;
  focused: boolean;
  anyFocused: boolean;
  onFocus: (e: React.MouseEvent) => void;
}

export default function MarketplaceModule({ idx, accent, focused, anyFocused, onFocus }: Props) {
  const { installedPluginIds, setInstalledPluginIds } = useLocusStore();
  const [catalog, setCatalog] = useState<PluginManifest[]>([]);
  const [justInstalled, setJustInstalled] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function loadCatalog() {
    const [all, installed] = await Promise.all([
      invoke<PluginManifest[]>("list_marketplace"),
      invoke<{ id: string }[]>("list_installed_plugins").catch(() => [] as { id: string }[]),
    ]);
    setCatalog(all);
    setInstalledPluginIds(new Set(installed.map((p) => p.id)));
  }

  useEffect(() => { loadCatalog(); }, []);

  async function toggle(id: string) {
    setBusy(id);
    try {
      if (installedPluginIds.has(id)) {
        await invoke("uninstall_plugin", { id });
        setInstalledPluginIds(new Set([...installedPluginIds].filter((x) => x !== id)));
      } else {
        await invoke("install_plugin", { id });
        setInstalledPluginIds(new Set([...installedPluginIds, id]));
        setJustInstalled(id);
        setTimeout(() => setJustInstalled(null), 1200);
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <ModuleShell idx={idx} accent={accent} focused={focused} anyFocused={anyFocused} onFocus={onFocus}>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 440 }}>

        {/* Header */}
        <div style={{
          padding: "22px 24px 14px",
          borderBottom: "1px solid var(--border)",
          background: `linear-gradient(135deg, ${accent}10 0%, transparent 60%)`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              display: "inline-flex", width: 24, height: 24, borderRadius: 8,
              background: `${accent}22`, alignItems: "center", justifyContent: "center",
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.2">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                <line x1="7" y1="7" x2="7.01" y2="7"/>
              </svg>
            </span>
            <div>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>Marketplace</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", letterSpacing: "-0.01em" }}>Plugins</div>
            </div>
            <span style={{
              marginLeft: "auto", fontSize: 10, fontFamily: "var(--font-mono)",
              color: accent, background: `${accent}18`, borderRadius: 999,
              padding: "2px 8px", border: `1px solid ${accent}33`,
            }}>
              {installedPluginIds.size}/{catalog.length}
            </span>
          </div>
        </div>

        {/* Plugin list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
          {catalog.map((plugin, i) => {
            const isInstalled = installedPluginIds.has(plugin.id);
            const isBusy = busy === plugin.id;
            const isNew = justInstalled === plugin.id;
            return (
              <div
                key={plugin.id}
                style={{
                  padding: "12px 24px",
                  borderBottom: i < catalog.length - 1 ? "1px solid var(--border)" : "none",
                  animation: isNew ? "lotusInstall 400ms var(--motion-float)" : undefined,
                  transition: "opacity 180ms",
                  opacity: isBusy ? 0.5 : 1,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  {/* Icon */}
                  <span style={{
                    display: "inline-flex", width: 28, height: 28, borderRadius: 9,
                    background: isInstalled ? `${accent}18` : "var(--chip-bg)",
                    alignItems: "center", justifyContent: "center", flexShrink: 0,
                    transition: "background 300ms var(--motion-ui)",
                    border: isInstalled ? `1px solid ${accent}33` : "1px solid transparent",
                  }}>
                    <PluginIcon type={plugin.module_type} accent={isInstalled ? accent : "var(--muted)"} />
                  </span>

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", letterSpacing: "-0.01em" }}>{plugin.name}</span>
                      <span style={{ fontSize: 9, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>v{plugin.version}</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.42, marginBottom: 7 }}>{plugin.description}</div>

                    {/* Permission badges */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {plugin.permissions.map((p) => {
                        const risk = permRisk(p);
                        const color = risk === "high" ? "#e05c5c" : risk === "med" ? "#d4924a" : "#5cb87a";
                        return (
                          <span key={p} style={{
                            fontSize: 9, fontFamily: "var(--font-mono)",
                            textTransform: "uppercase", letterSpacing: "0.07em",
                            padding: "2px 5px", borderRadius: 4,
                            background: color + "18",
                            color,
                            border: `1px solid ${color}30`,
                          }}>
                            {p.replace(/_/g, " ")}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Install / Remove */}
                  <button
                    onClick={(e) => { e.stopPropagation(); if (!isBusy) toggle(plugin.id); }}
                    style={{
                      flexShrink: 0, alignSelf: "center",
                      fontSize: 11, fontFamily: "var(--font-mono)",
                      padding: "5px 11px", borderRadius: 999,
                      border: isInstalled ? "1px solid var(--border)" : `1px solid ${accent}55`,
                      background: isInstalled ? "transparent" : `${accent}18`,
                      color: isInstalled ? "var(--muted)" : accent,
                      cursor: isBusy ? "wait" : "pointer",
                      transition: "all 200ms var(--motion-ui)",
                    }}
                  >
                    {isBusy ? "…" : isInstalled ? "Remove" : "Install"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: "10px 24px",
          borderTop: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          fontSize: 10, color: "var(--muted)", fontFamily: "var(--font-mono)",
        }}>
          <span>LOTUS plugins · built-in catalog</span>
          <span style={{ color: accent }}>{installedPluginIds.size} active</span>
        </div>
      </div>
    </ModuleShell>
  );
}
