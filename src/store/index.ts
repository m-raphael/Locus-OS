import { create } from "zustand";

export type AttentionMode = "open" | "focus" | "recovery" | "mirror";

export interface SpaceSummary {
  id: string;
  description: string;
  attention_mode: AttentionMode;
  is_ephemeral: boolean;
}

export interface Flow {
  id: string;
  space_id: string;
  order_index: number;
}

export interface Module {
  id: string;
  flow_id: string;
  component_type: string;
  props_json: string;
}

interface LocusStore {
  spaces: SpaceSummary[];
  activeSpaceId: string | null;
  isBarFocused: boolean;
  flows: Record<string, Flow[]>;
  modules: Record<string, Module[]>;

  setSpaces: (spaces: SpaceSummary[]) => void;
  setActiveSpace: (id: string | null) => void;
  setBarFocused: (focused: boolean) => void;
  updateSpaceMode: (id: string, mode: AttentionMode) => void;
  removeSpace: (id: string) => void;
  setFlows: (spaceId: string, flows: Flow[]) => void;
  setModules: (flowId: string, modules: Module[]) => void;
}

export const useLocusStore = create<LocusStore>((set) => ({
  spaces: [],
  activeSpaceId: null,
  isBarFocused: false,
  flows: {},
  modules: {},

  setSpaces: (spaces) => set({ spaces }),
  setActiveSpace: (id) => set({ activeSpaceId: id }),
  setBarFocused: (focused) => set({ isBarFocused: focused }),

  updateSpaceMode: (id, mode) =>
    set((s) => ({
      spaces: s.spaces.map((sp) =>
        sp.id === id ? { ...sp, attention_mode: mode } : sp
      ),
    })),

  removeSpace: (id) =>
    set((s) => ({
      spaces: s.spaces.filter((sp) => sp.id !== id),
      activeSpaceId: s.activeSpaceId === id ? null : s.activeSpaceId,
    })),

  setFlows: (spaceId, flows) =>
    set((s) => ({ flows: { ...s.flows, [spaceId]: flows } })),

  setModules: (flowId, modules) =>
    set((s) => ({ modules: { ...s.modules, [flowId]: modules } })),
}));
