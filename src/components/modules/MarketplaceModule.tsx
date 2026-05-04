import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useLocusStore } from "../../store";
import ModuleShell from "./ModuleShell";
import { MarketplaceBoard, type Plugin as DSPlugin } from "../../design";

interface BackendPluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  module_type: string;
  permissions: string[];
  homepage: string | null;
}
interface BackendInstalledPlugin {
  id: string;
  enabled: boolean;
}

// Inline SVG icons per module_type — kept in app layer (DS shouldn't know module type strings)
function PluginIcon({ type }: { type: string }) {
  const s = { width: 14, height: 14, flexShrink: 0 as const };
  if (type === "WeatherModule")
    return <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>;
  if (type === "GithubModule")
    return <svg {...s} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.49.5.09.66-.22.66-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.56 9.56 0 0 1 12 6.8c.85 0 1.71.12 2.51.34 1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.16.58.67.48A10.01 10.01 0 0 0 22 12C22 6.48 17.52 2 12 2z"/></svg>;
  if (type === "NotesModule")
    return <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>;
  if (type === "ClipboardAiModule")
    return <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M12 11l1.6 4.4L18 12l-4.4 1.6L12 9l-1.6 4.4L6 12l4.4 1.6z"/></svg>;
  return <svg {...s} viewBox="0 0 24 24" fill="currentColor"><path d="M5.93 17.25L2 13.32l1.06-1.06 2.87 2.87L17.25 3.5 18.32 4.56z" opacity=".3"/><path d="M22 3.5L12 13.5l-3.5-3.5L22 3.5z"/></svg>;
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
  const [catalog, setCatalog] = useState<BackendPluginManifest[]>([]);
  const [enabledIds, setEnabledIds] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [justInstalledId, setJustInstalledId] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    const [all, installed] = await Promise.all([
      invoke<BackendPluginManifest[]>("list_marketplace"),
      invoke<BackendInstalledPlugin[]>("list_installed_plugins").catch(() => [] as BackendInstalledPlugin[]),
    ]);
    setCatalog(all);
    setInstalledPluginIds(new Set(installed.map((p) => p.id)));
    setEnabledIds(new Set(installed.filter((p) => p.enabled).map((p) => p.id)));
  }, [setInstalledPluginIds]);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  const plugins: DSPlugin[] = catalog.map((p) => ({
    id: p.id,
    name: p.name,
    version: p.version,
    description: p.description,
    author: p.author,
    moduleType: p.module_type,
    permissions: p.permissions,
    homepage: p.homepage,
    isInstalled: installedPluginIds.has(p.id),
    isEnabled: enabledIds.has(p.id),
  }));

  async function handleInstall(plugin: DSPlugin) {
    setBusyId(plugin.id);
    try {
      await invoke("install_plugin", { id: plugin.id });
      setInstalledPluginIds(new Set([...installedPluginIds, plugin.id]));
      setEnabledIds((prev) => new Set([...prev, plugin.id]));
      setJustInstalledId(plugin.id);
      setTimeout(() => setJustInstalledId(null), 1000);
    } catch (e) {
      console.error("install_plugin failed:", e);
    } finally {
      setBusyId(null);
    }
  }

  async function handleUninstall(plugin: DSPlugin) {
    setBusyId(plugin.id);
    try {
      await invoke("uninstall_plugin", { id: plugin.id });
      setInstalledPluginIds(new Set([...installedPluginIds].filter((x) => x !== plugin.id)));
      setEnabledIds((prev) => {
        const next = new Set(prev);
        next.delete(plugin.id);
        return next;
      });
    } catch (e) {
      console.error("uninstall_plugin failed:", e);
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleEnabled(plugin: DSPlugin) {
    setBusyId(plugin.id);
    try {
      const next = !enabledIds.has(plugin.id);
      await invoke("set_plugin_enabled", { id: plugin.id, enabled: next });
      setEnabledIds((prev) => {
        const ns = new Set(prev);
        if (next) ns.add(plugin.id); else ns.delete(plugin.id);
        return ns;
      });
    } catch (e) {
      console.error("set_plugin_enabled failed:", e);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ModuleShell idx={idx} accent={accent} focused={focused} anyFocused={anyFocused} onFocus={onFocus}>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 440, padding: "20px 24px 18px" }}>
        <MarketplaceBoard
          plugins={plugins}
          iconFor={(p) => <PluginIcon type={p.moduleType ?? ""} />}
          busyId={busyId}
          justInstalledId={justInstalledId}
          onInstall={handleInstall}
          onUninstall={handleUninstall}
          onToggleEnabled={handleToggleEnabled}
        />
      </div>
    </ModuleShell>
  );
}
