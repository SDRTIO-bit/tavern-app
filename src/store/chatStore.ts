"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuid } from "uuid";
import { Message } from "@/types/message";
import { Character } from "@/types/character";
import { runtime } from "@/core/runtime";
import { characters as builtInCharacters, getCharacterById as getBuiltInById } from "@/core/characterLoader";
import { parseCharacterFile } from "@/core/characterCardParser";
import { useWorldBookStore } from "./worldbookStore";
import { usePresetStore } from "./presetStore";
import { useANStore } from "./authorsNoteStore";
import { useRegexStore } from "./regexStore";

/** 获取所有角色（内置 + 自定义） */
function getAllCharacters(custom: Character[]): Character[] {
  return [...builtInCharacters, ...custom];
}

/** 通过 ID 查找角色（内置 + 自定义） */
function findCharacter(id: string, custom: Character[]): Character | undefined {
  return getBuiltInById(id) ?? custom.find((c) => c.id === id);
}

export type ProcessStatus = 'idle' | 'connecting' | 'thinking' | 'streaming' | 'done' | 'error';

interface ChatState {
  sessions: Record<string, Message[]>;
  activeCharacterId: string;
  isLoading: boolean;
  customCharacters: Character[];
  /** 进程状态 */
  status: ProcessStatus;
  /** 最近一次错误消息 */
  lastError: string | null;
  /** 清除错误 */
  clearError: () => void;
  /** 生成 token 计数 */
  tokenCount: number;

  currentMessages: () => Message[];
  sendMessage: (text: string) => Promise<void>;
  setCharacter: (id: string) => void;
  /** 导入角色卡文件 */
  importCharacter: (file: File) => Promise<Character>;
  /** 删除自定义角色 */
  removeCharacter: (id: string) => void;
  /** 重新生成最后一条 AI 回复 */
  regenerate: () => Promise<void>;
}

function buildGreetingMessages(char: Character): Message[] {
  return [
    {
      id: uuid(),
      role: "assistant",
      content: char.greeting || `你好，我是${char.name}。`,
      timestamp: Date.now(),
    },
  ];
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      sessions: {},
      activeCharacterId: builtInCharacters[0]?.id ?? "",
      isLoading: false,
      customCharacters: [],
      status: 'idle',
      lastError: null,
      tokenCount: 0,

      clearError: () => set({ lastError: null }),

      currentMessages: () => {
        const { sessions, activeCharacterId } = get();
        return sessions[activeCharacterId] ?? [];
      },

      setCharacter: (id: string) => {
        const char = findCharacter(id, get().customCharacters);
        if (!char) return;

        const { sessions } = get();
        const updatedSessions = { ...sessions };

        if (!updatedSessions[id]) {
          updatedSessions[id] = buildGreetingMessages(char);
        }

        runtime.configure({
          characterName: char.name,
          systemPrompt: char.systemPrompt,
        });

        set({ activeCharacterId: id, sessions: updatedSessions });
      },

      importCharacter: async (file: File) => {
        const char = await parseCharacterFile(file);
        const { customCharacters } = get();

        // 避免重复导入同名角色
        const exists = customCharacters.some((c) => c.name === char.name);
        if (exists) {
          throw new Error(`角色 "${char.name}" 已存在`);
        }

        const updated = [...customCharacters, char];

        // 自动选中新导入的角色
        set({
          customCharacters: updated,
          activeCharacterId: char.id,
          sessions: {
            ...get().sessions,
            [char.id]: buildGreetingMessages(char),
          },
        });

        runtime.configure({
          characterName: char.name,
          systemPrompt: char.systemPrompt,
        });

        return char;
      },

      removeCharacter: (id: string) => {
        const { customCharacters, sessions } = get();
        const filtered = customCharacters.filter((c) => c.id !== id);
        const newSessions = { ...sessions };
        delete newSessions[id];

        set({
          customCharacters: filtered,
          sessions: newSessions,
          // 如果删除的是当前角色，切回第一个内置角色
          activeCharacterId:
            id === get().activeCharacterId
              ? builtInCharacters[0]?.id ?? ""
              : get().activeCharacterId,
        });
      },

      regenerate: async () => {
        const { sessions, activeCharacterId, customCharacters } = get();
        const msgs = sessions[activeCharacterId];
        if (!msgs || msgs.length === 0) return;

        // 找最后一条 assistant 消息
        let lastAIIndex = -1;
        for (let i = msgs.length - 1; i >= 0; i--) {
          if (msgs[i].role === "assistant") {
            lastAIIndex = i;
            break;
          }
        }
        if (lastAIIndex === -1) return;

        // 删除最后一条 AI 回复
        const historyMsgs = msgs.slice(0, lastAIIndex);

        set({
          sessions: { ...sessions, [activeCharacterId]: historyMsgs },
          isLoading: true,
          status: 'connecting',
          lastError: null,
        });

        // 重新请求
        try {
          const char = findCharacter(activeCharacterId, customCharacters);
          if (!char) return;

          // 同步 WorldBook
          const wbState = useWorldBookStore.getState();
          runtime.worldBookEnabled = wbState.enabled;
          runtime.worldBookEntries = wbState.books.flatMap((b) => b.enabled ? b.entries : []);
          const anState = useANStore.getState();
          runtime.authorsNote = anState.note;
          const regexState = useRegexStore.getState();
          runtime.regexScripts = regexState.scripts;
          runtime.regexEnabled = regexState.enabled;

          const sendMessages = historyMsgs
            .filter((m) => m.content)
            .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

          const newAiId = uuid();
          set({
            sessions: {
              ...get().sessions,
              [activeCharacterId]: [...historyMsgs, { id: newAiId, role: "assistant" as const, content: "", timestamp: Date.now() }],
            },
            status: 'thinking',
          });

          let isFirstChunk = true;
          const fullContent = await runtime.sendMessage(sendMessages, usePresetStore.getState().getActivePreset(), (chunk) => {
            if (isFirstChunk) {
              isFirstChunk = false;
              set({ status: 'streaming' });
            }
            const cur = get().sessions[activeCharacterId] ?? [];
            set({
              sessions: {
                ...get().sessions,
                [activeCharacterId]: cur.map((m) =>
                  m.id === newAiId ? { ...m, content: m.content + chunk } : m
                ),
              },
            });
          });

          const final = get().sessions[activeCharacterId] ?? [];
          set({
            sessions: {
              ...get().sessions,
              [activeCharacterId]: final.map((m) =>
                m.id === newAiId ? { ...m, content: fullContent } : m
              ),
            },
            isLoading: false,
            status: 'done',
            tokenCount: Math.ceil(fullContent.length / 4),
          });
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : "请求失败";
          const failed = get().sessions[activeCharacterId] ?? [];
          set({
            sessions: {
              ...get().sessions,
              [activeCharacterId]: failed.map((m) =>
                m.content === "" ? { ...m, content: `[错误] ${errorMsg}` } : m
              ),
            },
            isLoading: false,
            status: 'error',
            lastError: errorMsg,
          });
        }
      },

      sendMessage: async (text: string) => {
        const { sessions, activeCharacterId, customCharacters } = get();
        const char = findCharacter(activeCharacterId, customCharacters);
        if (!char) return;

        const userMessage: Message = {
          id: uuid(),
          role: "user",
          content: text,
          timestamp: Date.now(),
        };

        const aiMessageId = uuid();

        const currentMsgs = sessions[activeCharacterId] ?? [];
        const updatedMsgs = [
          ...currentMsgs,
          userMessage,
          { id: aiMessageId, role: "assistant" as const, content: "", timestamp: Date.now() },
        ];

        set({ sessions: { ...sessions, [activeCharacterId]: updatedMsgs }, isLoading: true, status: 'connecting', lastError: null });

        try {
          const historyMessages = updatedMsgs
            .filter((m) => m.id !== aiMessageId && m.content)
            .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
          const anState = useANStore.getState();
          runtime.authorsNote = anState.note;
          const regexState = useRegexStore.getState();
          runtime.regexScripts = regexState.scripts;
          runtime.regexEnabled = regexState.enabled;

          // 同步 WorldBook 到 runtime
          const wbState = useWorldBookStore.getState();
          runtime.worldBookEnabled = wbState.enabled;
          runtime.worldBookEntries = wbState.books.flatMap((b) => b.enabled ? b.entries : []);

          let isFirstChunk = true;
          const fullContent = await runtime.sendMessage(historyMessages, usePresetStore.getState().getActivePreset(), (chunk) => {
            if (isFirstChunk) {
              isFirstChunk = false;
              set({ status: 'streaming' });
            }
            const cur = get().sessions[activeCharacterId] ?? [];
            set({
              sessions: {
                ...get().sessions,
                [activeCharacterId]: cur.map((m) =>
                  m.id === aiMessageId ? { ...m, content: m.content + chunk } : m
                ),
              },
            });
          });

          const final = get().sessions[activeCharacterId] ?? [];
          set({
            sessions: {
              ...get().sessions,
              [activeCharacterId]: final.map((m) =>
                m.id === aiMessageId ? { ...m, content: fullContent } : m
              ),
            },
            isLoading: false,
            status: 'done',
            tokenCount: Math.ceil(fullContent.length / 4),
          });
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : "请求失败";
          const failed = get().sessions[activeCharacterId] ?? [];
          set({
            sessions: {
              ...get().sessions,
              [activeCharacterId]: failed.map((m) =>
                m.id === aiMessageId ? { ...m, content: `[错误] ${errorMsg}` } : m
              ),
            },
            isLoading: false,
            status: 'error',
            lastError: errorMsg,
          });
        }
      },
    }),
    {
      name: "tavern-chat-storage",
      partialize: (state) => ({
        sessions: state.sessions,
        activeCharacterId: state.activeCharacterId,
        customCharacters: state.customCharacters,
      }),
      onRehydrateStorage: () => {
        return (state) => {
          if (state) {
            const char = findCharacter(state.activeCharacterId, state.customCharacters ?? []);
            if (char) {
              runtime.configure({
                characterName: char.name,
                systemPrompt: char.systemPrompt,
              });
            }
          }
        };
      },
    }
  )
);
