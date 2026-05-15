// ============================================================
// SessionSpec — 持久化运行时会话标准结构
// ============================================================

import type { MemoryEntry } from "./MemorySpec";
import type { EmotionState } from "@/character/EmotionState";

/** 聊天消息 */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

/** 叙事状态 */
export interface NarrativeState {
  activeArcs?: Array<{
    id: string;
    title: string;
    phase: string;
    intensity: number;
  }>;
  recentEvents?: Array<{
    description: string;
    timestamp: number;
  }>;
}

/** 运行时会话 */
export interface RuntimeSession {
  id: string;
  name: string;
  characterId: string;
  characterName: string;

  createdAt: number;
  updatedAt: number;

  workflowId?: string;

  /** 聊天历史 */
  messages: ChatMessage[];

  /** 长期记忆 */
  memories: MemoryEntry[];

  /** 角色情绪 */
  emotion: EmotionState;

  /** 叙事状态 */
  narrative?: NarrativeState;

  /** 扩展元数据 */
  metadata?: Record<string, unknown>;
}
