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

export const INTENT_LIBRARY = [
  { verb: "Review", nouns: ["Inbox", "Pull Requests", "Q3 brief", "Design crit notes"] },
  { verb: "Draft",  nouns: ["Response to Naomi", "Standup update", "Launch memo"] },
  { verb: "Plan",   nouns: ["Trip to Lisbon", "Q3 launch", "Sprint 14"] },
  { verb: "Find",   nouns: ["Apartments in Brooklyn", "Flights to NYC", "Open issues"] },
  { verb: "Call",   nouns: ["Tomás", "Mom", "the dentist"] },
  { verb: "Watch",  nouns: ["the stand-up recording", "Severance S2"] },
  { verb: "Send",   nouns: ["wire to landlord", "thank-you note to Rae"] },
];

export interface Suggestion {
  verb: string;
  noun: string;
  match: "verb" | "noun" | "fuzzy";
}

export function buildSuggestions(query: string): Suggestion[] {
  const q = (query || "").trim().toLowerCase();
  if (!q) return [];
  const out: Suggestion[] = [];
  for (const { verb, nouns } of INTENT_LIBRARY) {
    const v = verb.toLowerCase();
    if (v.startsWith(q)) {
      for (const noun of nouns) out.push({ verb, noun, match: "verb" });
    } else if (q.startsWith(v + " ")) {
      const rest = q.slice(v.length + 1);
      for (const noun of nouns) {
        if (noun.toLowerCase().includes(rest)) out.push({ verb, noun, match: "noun" });
      }
    } else {
      for (const noun of nouns) {
        if (noun.toLowerCase().includes(q)) out.push({ verb, noun, match: "fuzzy" });
      }
    }
  }
  return out.slice(0, 6);
}

export type ModuleKind = "mail" | "calendar" | "live" | "doc" | "predictive" | "marketplace" | "simulation" | "audit";

export function modulesForSpace(label: string): ModuleKind[] {
  const l = label.toLowerCase();
  if (l.includes("marketplace") || l.includes("plugin")) return ["marketplace"];
  if (l.includes("review") || l.includes("inbox")) return ["mail", "calendar", "live", "doc", "predictive", "simulation", "audit"];
  if (l.includes("plan"))  return ["mail", "doc", "live", "predictive", "simulation", "audit"];
  if (l.includes("draft")) return ["mail", "doc", "predictive", "simulation", "audit"];
  if (l.includes("find"))  return ["doc", "live", "predictive", "simulation", "audit"];
  return ["mail", "doc", "predictive", "simulation", "audit"];
}

interface LocusStore {
  spaces: SpaceSummary[];
  activeSpaceId: string | null;
  activeSpaceLabel: string | null;
  suggestedNext: string | null;
  legacyAppContext: { name: string; path: string } | null;
  isBarFocused: boolean;
  flows: Record<string, Flow[]>;
  modules: Record<string, Module[]>;
  isDark: boolean;
  accent: string;
  backendLabel: "NPU" | "NIM" | "KEY" | null;
  installedPluginIds: Set<string>;
  focusGoal: { id: string; name: string; description?: string } | null;
  uiDensity: "compact" | "default" | "spacious";

  setSpaces: (spaces: SpaceSummary[]) => void;
  setActiveSpace: (id: string | null, label: string | null) => void;
  setSuggestedNext: (s: string | null) => void;
  setLegacyAppContext: (ctx: { name: string; path: string } | null) => void;
  setBarFocused: (v: boolean) => void;
  updateSpaceMode: (id: string, mode: AttentionMode) => void;
  removeSpace: (id: string) => void;
  setFlows: (spaceId: string, flows: Flow[]) => void;
  setModules: (flowId: string, modules: Module[]) => void;
  toggleTheme: () => void;
  setBackendLabel: (label: "NPU" | "NIM" | "KEY" | null) => void;
  setInstalledPluginIds: (ids: Set<string>) => void;
  setFocusGoal: (goal: { id: string; name: string; description?: string } | null) => void;
  setUiDensity: (d: "compact" | "default" | "spacious") => void;
}

export const useLocusStore = create<LocusStore>((set) => ({
  spaces: [],
  activeSpaceId: null,
  activeSpaceLabel: null,
  suggestedNext: null,
  legacyAppContext: null,
  isBarFocused: false,
  flows: {},
  modules: {},
  isDark: false,
  accent: "#7c7cf2",
  backendLabel: null,
  installedPluginIds: new Set(),
  focusGoal: null,
  uiDensity: (typeof window !== "undefined" && localStorage.getItem("locus-density") as "compact" | "default" | "spacious") || "default",

  setSpaces: (spaces) => set({ spaces }),
  setActiveSpace: (id, label) => set({ activeSpaceId: id, activeSpaceLabel: label }),
  setSuggestedNext: (s) => set({ suggestedNext: s }),
  setLegacyAppContext: (ctx) => set({ legacyAppContext: ctx }),
  setBarFocused: (v) => set({ isBarFocused: v }),
  updateSpaceMode: (id, mode) =>
    set((s) => ({
      spaces: s.spaces.map((sp) => sp.id === id ? { ...sp, attention_mode: mode } : sp),
    })),
  removeSpace: (id) =>
    set((s) => ({
      spaces: s.spaces.filter((sp) => sp.id !== id),
      activeSpaceId: s.activeSpaceId === id ? null : s.activeSpaceId,
      activeSpaceLabel: s.activeSpaceId === id ? null : s.activeSpaceLabel,
    })),
  setFlows: (spaceId, flows) =>
    set((s) => ({ flows: { ...s.flows, [spaceId]: flows } })),
  setModules: (flowId, modules) =>
    set((s) => ({ modules: { ...s.modules, [flowId]: modules } })),
  toggleTheme: () => set((s) => ({ isDark: !s.isDark })),
  setBackendLabel: (label) => set({ backendLabel: label }),
  setInstalledPluginIds: (ids) => set({ installedPluginIds: ids }),
  setFocusGoal: (goal) => set({ focusGoal: goal }),
  setUiDensity: (d) => {
    if (typeof window !== "undefined") localStorage.setItem("locus-density", d);
    set({ uiDensity: d });
  },
}));
