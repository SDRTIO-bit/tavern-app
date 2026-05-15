// ============================================================
// CharacterMemory — 角色主观记忆
//
// 角色视角下的记忆，带情感标记和重要性。
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import type { EmotionState } from './EmotionState';

/** 角色记忆 */
export interface CharacterMemory {
  /** 记忆 ID */
  id: string;
  /** 记忆内容 */
  content: string;
  /** 重要性（0~100，越高越重要） */
  importance: number;
  /** 该记忆对情绪的影响（delta） */
  emotionImpact?: Partial<EmotionState>;
  /** 创建时间（ISO 8601） */
  createdAt: string;
  /** 标签 */
  tags?: string[];
}

/** 创建角色记忆 */
export function createCharacterMemory(
  content: string,
  importance: number = 50,
  emotionImpact?: Partial<EmotionState>,
  tags?: string[],
): CharacterMemory {
  return {
    id: uuidv4(),
    content,
    importance: Math.max(0, Math.min(100, Math.round(importance))),
    emotionImpact,
    createdAt: new Date().toISOString(),
    tags,
  };
}

/** 按重要性降序排序 */
export function sortMemoriesByImportance(
  memories: CharacterMemory[],
): CharacterMemory[] {
  return [...memories].sort((a, b) => b.importance - a.importance);
}

/** 按时间倒序排序（最新的在前） */
export function sortMemoriesByTime(
  memories: CharacterMemory[],
): CharacterMemory[] {
  return [...memories].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/** 获取重要性最高的 N 条记忆 */
export function getTopMemories(
  memories: CharacterMemory[],
  n: number,
): CharacterMemory[] {
  return sortMemoriesByImportance(memories).slice(0, n);
}

/** 按标签过滤记忆 */
export function filterMemoriesByTag(
  memories: CharacterMemory[],
  tag: string,
): CharacterMemory[] {
  return memories.filter((m) => m.tags?.includes(tag));
}

/** 按内容关键词搜索 */
export function searchMemories(
  memories: CharacterMemory[],
  keyword: string,
): CharacterMemory[] {
  const lower = keyword.toLowerCase();
  return memories.filter((m) => m.content.toLowerCase().includes(lower));
}

/** 计算所有记忆的情绪影响总和 */
export function aggregateEmotionImpact(
  memories: CharacterMemory[],
): Partial<EmotionState> {
  const impact: Record<string, number> = {};
  for (const memory of memories) {
    if (!memory.emotionImpact) continue;
    for (const [key, value] of Object.entries(memory.emotionImpact)) {
      if (value === undefined) continue;
      impact[key] = (impact[key] ?? 0) + value;
    }
  }
  return impact as Partial<EmotionState>;
}
