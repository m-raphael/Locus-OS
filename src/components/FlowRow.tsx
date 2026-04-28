import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Flow, Module, useLocusStore } from "../store";

const CARD: React.CSSProperties = {
  minWidth: 200, maxWidth: 300, flexShrink: 0,
  background: "var(--fog-bg)", backdropFilter: "var(--fog-blur)",
  WebkitBackdropFilter: "var(--fog-blur)", border: "var(--fog-border)",
  borderRadius: "var(--fog-radius-module)", boxShadow: "var(--fog-shadow)",
  padding: "14px 18px",
};

const LABEL: React.CSSProperties = {
  fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.28)",
  letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6,
  fontFamily: "var(--font-mono)",
};

const CONTENT: React.CSSProperties = {
  fontSize: 13, color: "rgba(255,255,255,0.72)", lineHeight: 1.45,
};

function props(module: Module): Record<string, unknown> {
  try { return JSON.parse(module.props_json) as Record<string, unknown>; }
  catch { return {}; }
}

function ModuleCard({ module, label, body }: { module: Module; label: string; body: string }) {
  return (
    <div key={module.id} style={CARD}>
      <p style={LABEL}>{label}</p>
      <p style={CONTENT}>{body}</p>
    </div>
  );
}

const MODULE_RENDERERS: Record<string, (m: Module) => React.ReactElement> = {
  NoteModule: (m) => {
    const p = props(m);
    return <ModuleCard module={m} label="Note" body={String(p.content ?? "Empty note")} />;
  },
  mail: (m) => {
    const p = props(m);
    return <ModuleCard module={m} label="Mail" body={String(p.subject ?? "No subject")} />;
  },
  calendar: (m) => {
    const p = props(m);
    return <ModuleCard module={m} label="Calendar" body={String(p.title ?? "Untitled event")} />;
  },
  live: (m) => {
    const p = props(m);
    return <ModuleCard module={m} label="Live" body={String(p.room ?? "No room")} />;
  },
  doc: (m) => {
    const p = props(m);
    return <ModuleCard module={m} label="Doc" body={String(p.title ?? "Untitled doc")} />;
  },
  predictive: (m) => {
    const p = props(m);
    return <ModuleCard module={m} label="Predictive" body={String(p.summary ?? "No predictions")} />;
  },
  marketplace: (m) => {
    const p = props(m);
    return <ModuleCard module={m} label="Marketplace" body={String(p.plugin ?? "No plugin")} />;
  },
  simulation: (m) => {
    const p = props(m);
    return <ModuleCard module={m} label="Simulation" body={String(p.name ?? "Untitled simulation")} />;
  },
  audit: (m) => {
    const p = props(m);
    return <ModuleCard module={m} label="Audit Log" body={String(p.event_type ?? "No events")} />;
  },
};

const ROW: React.CSSProperties = {
  display: "flex", flexDirection: "row", gap: 16, overflowX: "auto",
  scrollbarWidth: "none", paddingBottom: 4,
  WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)",
  maskImage: "linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)",
};

const EMPTY: React.CSSProperties = {
  fontSize: 12, color: "rgba(255,255,255,0.2)", padding: "16px 0", flexShrink: 0,
};

interface Props { flow: Flow; }

export default function FlowRow({ flow }: Props) {
  const { modules, setModules } = useLocusStore();
  const flowModules = modules[flow.id] ?? [];

  useEffect(() => {
    invoke<Module[]>("list_modules", { flowId: flow.id }).then((mods) =>
      setModules(flow.id, mods)
    );
  }, [flow.id, setModules]);

  return (
    <div style={ROW}>
      {flowModules.length === 0 ? (
        <span style={EMPTY}>No modules yet</span>
      ) : (
        flowModules.map((m) => {
          const render = MODULE_RENDERERS[m.component_type];
          return render ? render(m) : <ModuleCard key={m.id} module={m} label={m.component_type} body="—" />;
        })
      )}
    </div>
  );
}
