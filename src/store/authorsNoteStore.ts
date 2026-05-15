"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AuthorsNote } from "@/types/authorsNote";

interface ANState {
  note: AuthorsNote;

  setEnabled: (v: boolean) => void;
  setContent: (content: string) => void;
  setPosition: (pos: AuthorsNote["position"]) => void;
  setDepth: (depth: number) => void;
  setDepthStep: (step: number) => void;
  setDepthIncrease: (v: boolean) => void;
  /** 每次回复后自动增加 depth */
  tickDepth: () => void;
  resetDepth: () => void;
}

const DEFAULT_NOTE: AuthorsNote = {
  enabled: false,
  content: "",
  position: "depth",
  depth: 4,
  depthStep: 1,
  depthIncrease: false,
};

export const useANStore = create<ANState>()(
  persist(
    (set, get) => ({
      note: { ...DEFAULT_NOTE },

      setEnabled: (v) => set({ note: { ...get().note, enabled: v } }),
      setContent: (content) => set({ note: { ...get().note, content } }),
      setPosition: (position) => set({ note: { ...get().note, position } }),
      setDepth: (depth) => set({ note: { ...get().note, depth } }),
      setDepthStep: (depthStep) => set({ note: { ...get().note, depthStep } }),
      setDepthIncrease: (depthIncrease) => set({ note: { ...get().note, depthIncrease } }),

      tickDepth: () => {
        const { note } = get();
        if (note.depthIncrease) {
          set({ note: { ...note, depth: note.depth + note.depthStep } });
        }
      },

      resetDepth: () => {
        set({ note: { ...get().note, depth: DEFAULT_NOTE.depth } });
      },
    }),
    { name: "tavern-authors-note" }
  )
);
