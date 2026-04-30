import { useEffect, useCallback, KeyboardEvent as ReactKeyboardEvent } from "react";
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

const PLUS_BUBBLE: React.CSSProperties = {
  flexShrink: 0,
  width: 40, height: 40, borderRadius: "50%",
  display: "flex", alignItems: "center", justifyContent: "center",
  background: "var(--dropdown-bg)",
  backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(128,128,128,0.15)",
  cursor: "pointer",
  alignSelf: "center",
  color: "var(--muted)",
  fontSize: 18, lineHeight: 1,
  transition: "all 400ms cubic-bezier(0.22, 0.9, 0.32, 1)",
  animation: "lotusModuleAppear 400ms cubic-bezier(0.22, 0.9, 0.32, 1) backwards",
};

const DRAFT_VERBS = ["Draft", "Find", "Review", "Plan", "Call", "Send"];

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

function DraftModule({ module }: { module: Module }) {
  const p = props(module);
  const verb = String(p.verb ?? "Draft");
  const noun = String(p.noun ?? "New");
  return (
    <div key={module.id} style={{ ...CARD, border: "1px dashed rgba(128,128,128,0.2)" }}>
      <p style={LABEL}>Draft</p>
      <p style={{ ...CONTENT, fontSize: 15, fontWeight: 500 }}>
        <span style={{ color: "var(--accent)" }}>{verb}</span>
        <span style={{ color: "var(--muted)", marginLeft: 8 }}>{noun || "…"}</span>
      </p>
      <p style={{ fontSize: 10, color: "rgba(255,255,255,0.18)", marginTop: 8, fontFamily: "var(--font-mono)" }}>
        Click Locus bar to set intent
      </p>
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
  draft: (m) => <DraftModule module={m} />,
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
  const { modules, setModules, prependModule, accent } = useLocusStore();
  const flowModules = modules[flow.id] ?? [];

  useEffect(() => {
    invoke<Module[]>("list_modules", { flowId: flow.id }).then((mods) =>
      setModules(flow.id, mods)
    );
  }, [flow.id, setModules]);

  const createModule = useCallback(async () => {
    const verb = DRAFT_VERBS[Math.floor(Math.random() * DRAFT_VERBS.length)];
    const template = JSON.stringify({ verb, noun: "", modifier: null });
    try {
      const id = await invoke<string>("create_module", {
        flowId: flow.id,
        componentType: "draft",
        propsJson: template,
      });
      prependModule(flow.id, { id, flow_id: flow.id, component_type: "draft", props_json: template });
    } catch {
      // silently fail — backend may be unavailable in dev
    }
  }, [flow.id, prependModule]);

  const onKeyDown = useCallback((e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      createModule();
    }
  }, [createModule]);

  return (
    <div style={ROW} onKeyDown={onKeyDown}>
      {flowModules.length === 0 ? (
        <span style={EMPTY}>No modules yet</span>
      ) : (
        flowModules.map((m) => {
          const render = MODULE_RENDERERS[m.component_type];
          return render ? render(m) : <ModuleCard key={m.id} module={m} label={m.component_type} body="—" />;
        })
      )}
      <div
        role="button"
        tabIndex={0}
        aria-label="Add module"
        style={{ ...PLUS_BUBBLE, color: accent, borderColor: `${accent}44` }}
        onClick={createModule}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); createModule(); } }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = `${accent}18`;
          e.currentTarget.style.borderColor = `${accent}66`;
          e.currentTarget.style.transform = "scale(1.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--dropdown-bg)";
          e.currentTarget.style.borderColor = `${accent}44`;
          e.currentTarget.style.transform = "scale(1)";
        }}
        title="Add module (Tab)"
      >+</div>
    </div>
  );
}
