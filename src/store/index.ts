import { create } from "zustand";

export type AttentionMode = "open" | "focus" | "recovery" | "mirror";

export interface SpaceSummary {
  id: string;
  description: string;
  attention_mode: AttentionMode;
  is_ephemeral: boolean;
}

interface LocusStore {
  spaces: SpaceSummary[];
  activeSpaceId: string | null;
  isBarFocused: boolean;
  setSpaces: (spaces: SpaceSummary[]) => void;
  setActiveSpace: (id: string | null) => void;
  setBarFocused: (focused: boolean) => void;
  updateSpaceMode: (id: string, mode: AttentionMode) => void;
}

export const useLocusStore = create<LocusStore>((set) => ({
  spaces: [],
  activeSpaceId: null,
  isBarFocused: false,
  setSpaces: (spaces) => set({ spaces }),
  setActiveSpace: (id) => set({ activeSpaceId: id }),
  setBarFocused: (focused) => set({ isBarFocused: focused }),
  updateSpaceMode: (id, mode) =>
    set((state) => ({
      spaces: state.spaces.map((s) =>
        s.id === id ? { ...s, attention_mode: mode } : s
      ),
    })),
}));
