"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuid } from "uuid";
import { RegexScript } from "@/types/regex";

interface RegexState {
  scripts: RegexScript[];
  /** 全局开关 */
  enabled: boolean;

  addScript: (data: Omit<RegexScript, "id">) => void;
  updateScript: (id: string, data: Partial<RegexScript>) => void;
  removeScript: (id: string) => void;
  toggleScript: (id: string) => void;
  setEnabled: (v: boolean) => void;
  /** 导入脚本集 */
  importScripts: (scripts: RegexScript[]) => void;
}

export const useRegexStore = create<RegexState>()(
  persist(
    (set, get) => ({
      scripts: [],
      enabled: true,

      addScript: (data) => {
        set({ scripts: [...get().scripts, { id: uuid(), ...data }] });
      },

      updateScript: (id, data) => {
        set({
          scripts: get().scripts.map((s) => (s.id === id ? { ...s, ...data } : s)),
        });
      },

      removeScript: (id) => {
        set({ scripts: get().scripts.filter((s) => s.id !== id) });
      },

      toggleScript: (id) => {
        set({
          scripts: get().scripts.map((s) =>
            s.id === id ? { ...s, enabled: !s.enabled } : s
          ),
        });
      },

      setEnabled: (v) => set({ enabled: v }),

      importScripts: (scripts) => {
        set({ scripts: [...get().scripts, ...scripts.map((s) => ({ ...s, id: uuid() }))] });
      },
    }),
    { name: "tavern-regex" }
  )
);
