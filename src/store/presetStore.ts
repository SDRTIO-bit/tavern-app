"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuid } from "uuid";
import { Preset } from "@/types/preset";

/** 默认 Preset（对齐 SillyTavern 风格） */
const DEFAULT_PRESETS: Preset[] = [
  {
    id: "default-rp",
    name: "默认角色扮演",
    systemPrompt: "你是一个角色扮演助手。自然地写出符合角色的回复，始终保持在角色中。",
    userPrefix: "用户",
    assistantPrefix: "助手",
    contextTemplate: "",
    temperature: 0.8,
    stopSequences: [],
    category: 'rp',
  },
  {
    id: "creative",
    name: "创意写作",
    systemPrompt: "你是一个创意写作助手。写出生动、详细、引人入胜的叙述，自然地使用文学手法。",
    userPrefix: "用户",
    assistantPrefix: "助手",
    contextTemplate: "",
    temperature: 0.95,
    stopSequences: [],
    category: 'chat',
  },
  {
    id: "precise",
    name: "精准模式",
    systemPrompt: "你是一个精准简洁的助手。直接、如实地回答，避免不必要的赘述。",
    userPrefix: "用户",
    assistantPrefix: "助手",
    contextTemplate: "",
    temperature: 0.3,
    stopSequences: [],
    category: 'instruct',
  },
];

interface PresetState {
  presets: Preset[];
  activePresetId: string;

  /** 获取当前活跃 preset */
  getActivePreset: () => Preset;
  /** 切换 preset */
  setActivePreset: (id: string) => void;
  /** 添加自定义 preset */
  addPreset: (preset: Omit<Preset, "id">) => void;
  /** 更新 preset */
  updatePreset: (id: string, data: Partial<Preset>) => void;
  /** 删除 preset */
  removePreset: (id: string) => void;
  /** 重置为默认 */
  resetToDefaults: () => void;
}

export const usePresetStore = create<PresetState>()(
  persist(
    (set, get) => ({
      presets: DEFAULT_PRESETS,
      activePresetId: DEFAULT_PRESETS[0].id,

      getActivePreset: () => {
        const { presets, activePresetId } = get();
        return presets.find((p) => p.id === activePresetId) ?? presets[0];
      },

      setActivePreset: (id: string) => {
        set({ activePresetId: id });
      },

      addPreset: (data) => {
        const preset: Preset = { id: uuid(), ...data };
        set({ presets: [...get().presets, preset], activePresetId: preset.id });
      },

      updatePreset: (id, data) => {
        set({
          presets: get().presets.map((p) => (p.id === id ? { ...p, ...data } : p)),
        });
      },

      removePreset: (id) => {
        const filtered = get().presets.filter((p) => p.id !== id);
        set({
          presets: filtered,
          activePresetId:
            id === get().activePresetId ? filtered[0]?.id ?? "" : get().activePresetId,
        });
      },

      resetToDefaults: () => {
        set({ presets: DEFAULT_PRESETS, activePresetId: DEFAULT_PRESETS[0].id });
      },
    }),
    { name: "tavern-presets" }
  )
);
