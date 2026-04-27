import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Flow, Module, useLocusStore } from "../store";
import NoteModule from "./NoteModule";

interface Props {
  flow: Flow;
}

const ROW: React.CSSProperties = {
  display: "flex",
  flexDirection: "row",
  gap: 16,
  overflowX: "auto",
  scrollbarWidth: "none",
  paddingBottom: 4,
  WebkitMaskImage:
    "linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)",
  maskImage:
    "linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)",
};

const MODULE_RENDERERS: Record<
  string,
  (m: Module) => React.ReactElement
> = {
  NoteModule: (m) => <NoteModule key={m.id} module={m} />,
};

const EMPTY: React.CSSProperties = {
  fontSize: 12,
  color: "rgba(255,255,255,0.2)",
  padding: "16px 0",
  flexShrink: 0,
};

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
          return render ? render(m) : null;
        })
      )}
    </div>
  );
}
