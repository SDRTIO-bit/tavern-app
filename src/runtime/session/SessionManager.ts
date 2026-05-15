// ============================================================
// SessionManager — 运行时 Session 管理器
//
// create / load / save / appendMessage / appendMemory
// ============================================================

import { v4 as uuidv4 } from "uuid";
import type { RuntimeSession, ChatMessage, MemoryEntry } from "./SessionTypes";
import { SessionMemory } from "./SessionMemory";
import { createDefaultEmotionState } from "@/character/EmotionState";

/** 创建新 Session */
export function createSession(options: {
  name?: string;
  characterId?: string;
  characterName?: string;
  workflowId?: string;
}): RuntimeSession {
  const now = Date.now();
  return {
    id: uuidv4(),
    name: options.name || `会话 ${new Date().toLocaleTimeString()}`,
    characterId: options.characterId || "maid",
    characterName: options.characterName || "Maid",
    createdAt: now,
    updatedAt: now,
    workflowId: options.workflowId || "lightweight-rp",
    messages: [],
    memories: [],
    emotion: createDefaultEmotionState(),
  };
}

/** 向 Session 添加用户消息（自动提取记忆） */
export function appendUserMessage(
  session: RuntimeSession,
  content: string,
): RuntimeSession {
  const msg: ChatMessage = {
    id: uuidv4(),
    role: "user",
    content,
    timestamp: Date.now(),
  };

  // 自动提取记忆
  const memory = SessionMemory.addUserMessage(content);

  return {
    ...session,
    messages: [...session.messages, msg],
    memories: SessionMemory.decay([...session.memories, memory]),
    updatedAt: Date.now(),
  };
}

/** 向 Session 添加 AI 回复（自动提取记忆） */
export function appendAssistantMessage(
  session: RuntimeSession,
  content: string,
): RuntimeSession {
  const msg: ChatMessage = {
    id: uuidv4(),
    role: "assistant",
    content,
    timestamp: Date.now(),
  };

  const memory = SessionMemory.addAssistantReply(content);

  return {
    ...session,
    messages: [...session.messages, msg],
    memories: SessionMemory.decay([...session.memories, memory]),
    updatedAt: Date.now(),
  };
}

/** 手动添加记忆 */
export function appendMemory(
  session: RuntimeSession,
  entry: MemoryEntry,
): RuntimeSession {
  return {
    ...session,
    memories: [...session.memories, entry],
    updatedAt: Date.now(),
  };
}

/** 从 Session 检索相关记忆 */
export function retrieveMemories(
  session: RuntimeSession,
  query: string,
  maxResults: number = 5,
): MemoryEntry[] {
  return SessionMemory.retrieve(session.memories, query, maxResults);
}

/** Session 摘要 */
export function summarizeSession(session: RuntimeSession): string {
  return [
    `[${session.name}]`,
    `角色: ${session.characterName}`,
    `消息: ${session.messages.length} 条`,
    `记忆: ${session.memories.length} 条`,
    `创建: ${new Date(session.createdAt).toLocaleString()}`,
  ].join(" · ");
}
