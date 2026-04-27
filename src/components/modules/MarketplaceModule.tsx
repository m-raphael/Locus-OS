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

const RISK_COLOR: Record<string, string> = {
  HIGH: "#e05c5c",
  MEDIUM: "#e0a84a",
  LOW: "#6bcb77",
};

const HIGH_RISK_PERMS = new Set(["file_system", "clipboard"]);
const MED_RISK_PERMS = new Set(["network", "native_app"]);

function permRisk(p: string): "HIGH" | "MEDIUM" | "LOW" {
  if (HIGH_RISK_PERMS.has(p)) return "HIGH";
  if (MED_RISK_PERMS.has(p)) return "MEDIUM";
  return "LOW";
}

function permLabel(p: string): string {
  return p.replace(/_/g, " ");
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
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <ModuleShell idx={idx} accent={accent} focused={focused} anyFocused={anyFocused} onFocus={onFocus}>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 0 }}>
        {/* Header */}
        <div style={{ padding: "20px 20px 12px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--muted)", fontFamily: "var(--font-mono)", marginBottom: 4 }}>Marketplace</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>Plugins</div>
        </div>

        {/* Plugin list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {catalog.map((plugin) => {
            const isInstalled = installedPluginIds.has(plugin.id);
            const isBusy = busy === plugin.id;
            return (
              <div
                key={plugin.id}
                style={{
                  padding: "14px 20px",
                  borderBottom: "1px solid var(--border)",
                  opacity: isBusy ? 0.5 : 1,
                  transition: "opacity 150ms ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{plugin.name}</span>
                      <span style={{ fontSize: 10, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>v{plugin.version}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.45, marginBottom: 8 }}>{plugin.description}</div>
                    {/* Permission badges */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {plugin.permissions.map((p) => {
                        const risk = permRisk(p);
                        return (
                          <span
                            key={p}
                            style={{
                              fontSize: 9,
                              fontFamily: "var(--font-mono)",
                              textTransform: "uppercase",
                              letterSpacing: "0.08em",
                              padding: "2px 6px",
                              borderRadius: 4,
                              background: RISK_COLOR[risk] + "22",
                              color: RISK_COLOR[risk],
                              border: `1px solid ${RISK_COLOR[risk]}44`,
                            }}
                          >
                            {permLabel(p)}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Install / Remove button */}
                  <button
                    onClick={() => !isBusy && toggle(plugin.id)}
                    style={{
                      flexShrink: 0,
                      fontSize: 11,
                      fontFamily: "var(--font-mono)",
                      padding: "5px 12px",
                      borderRadius: 8,
                      border: isInstalled ? `1px solid var(--border)` : `1px solid ${accent}`,
                      background: isInstalled ? "transparent" : accent + "22",
                      color: isInstalled ? "var(--muted)" : accent,
                      cursor: isBusy ? "wait" : "pointer",
                      transition: "all 150ms ease",
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
        <div style={{ padding: "10px 20px", borderTop: "1px solid var(--border)", fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
          {installedPluginIds.size} of {catalog.length} installed
        </div>
      </div>
    </ModuleShell>
  );
}
