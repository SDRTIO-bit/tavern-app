// ============================================================
// sessionStore — 持久化 Session 存储
//
// Zustand + localStorage 持久化。
// 后续可替换为文件/数据库。
// ============================================================

"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RuntimeSession, MemoryEntry } from "@/runtime/session/SessionTypes";
import type { Goal } from "@/agent/GoalTypes";
import {
  createSession,
  appendUserMessage,
  appendAssistantMessage,
  retrieveMemories,
} from "@/runtime/session/SessionManager";

interface SessionState {
  /** 所有会话 */
  sessions: RuntimeSession[];
  /** 当前活跃会话 ID */
  activeSessionId: string | null;
  /** store 是否已从 localStorage 恢复 */
  hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;

  /** 获取当前活跃会话 */
  getActive: () => RuntimeSession | undefined;

  /** 新建会话 */
  newSession: (opts?: { name?: string; characterId?: string; characterName?: string; workflowId?: string }) => RuntimeSession;
  /** 切换会话 */
  setActive: (id: string) => void;
  /** 删除会话 */
  removeSession: (id: string) => void;
  /** 重命名会话 */
  renameSession: (id: string, name: string) => void;

  /** 添加用户消息 */
  addUserMessage: (content: string) => void;
  /** 添加 AI 回复 */
  addAssistantMessage: (content: string) => void;

  /** 检索记忆 */
  getMemories: (query: string, maxResults?: number) => MemoryEntry[];
  /** 目标 */
  goals: Record<string, Goal[]>;
  setGoals: (sessionId: string, goals: Goal[]) => void;
  getGoals: (sessionId: string) => Goal[];

  /** 更新工作流 */
  setWorkflow: (workflowId: string) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,
      hasHydrated: false,
      setHasHydrated: (v) => set({ hasHydrated: v }),

      getActive: () => {
        const { sessions, activeSessionId } = get();
        return sessions.find((s) => s.id === activeSessionId);
      },

      newSession: (opts) => {
        const session = createSession({
          name: opts?.name,
          characterId: opts?.characterId || "maid",
          characterName: opts?.characterName || "Maid",
          workflowId: opts?.workflowId || "lightweight-rp",
        });
        set({
          sessions: [...get().sessions, session],
          activeSessionId: session.id,
        });
        return session;
      },

      setActive: (id) => set({ activeSessionId: id }),

      removeSession: (id) => {
        const filtered = get().sessions.filter((s) => s.id !== id);
        set({
          sessions: filtered,
          activeSessionId: get().activeSessionId === id
            ? (filtered[0]?.id ?? null)
            : get().activeSessionId,
        });
      },

      renameSession: (id, name) => {
        set({
          sessions: get().sessions.map((s) =>
            s.id === id ? { ...s, name } : s,
          ),
        });
      },

      addUserMessage: (content) => {
        const active = get().getActive();
        if (!active) return;
        const updated = appendUserMessage(active, content);
        set({
          sessions: get().sessions.map((s) =>
            s.id === active.id ? updated : s,
          ),
        });
      },

      addAssistantMessage: (content) => {
        const active = get().getActive();
        if (!active) return;
        const updated = appendAssistantMessage(active, content);
        set({
          sessions: get().sessions.map((s) =>
            s.id === active.id ? updated : s,
          ),
        });
      },

      getMemories: (query, maxResults) => {
        const active = get().getActive();
        if (!active) return [];
        return retrieveMemories(active, query, maxResults ?? 5);
      },

      goals: {},
      setGoals: (sessionId, goals) => set({
        goals: { ...get().goals, [sessionId]: goals },
      }),
      getGoals: (sessionId) => get().goals[sessionId] ?? [],

      setWorkflow: (workflowId) => {
        const active = get().getActive();
        if (!active) return;
        set({
          sessions: get().sessions.map((s) =>
            s.id === active.id ? { ...s, workflowId, updatedAt: Date.now() } : s,
          ),
        });
      },
    }),
    {
      name: "tavern-sessions",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
