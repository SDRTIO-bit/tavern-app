// ============================================================
// CharacterBrain — 角色运行时大脑
//
// 整合所有角色运行时状态：
//   - 情绪（EmotionState）
//   - 关系（RelationshipState[]）
//   - 目标（CharacterGoal[]）
//   - 记忆（CharacterMemory[]）
//   - 当前状态（位置、活动等）
//
// 完全 JSON 可序列化，无循环引用。
// ============================================================

import type { EmotionState } from './EmotionState';
import {
  createDefaultEmotionState,
} from './EmotionState';
import type { RelationshipState } from './RelationshipState';
import type { CharacterGoal } from './CharacterGoal';
import type { CharacterMemory } from './CharacterMemory';

/** 角色当前状态 */
export interface CharacterCurrentState {
  /** 当前位置 */
  location?: string;
  /** 当前活动 */
  activity?: string;
  /** 自定义状态标记 */
  status?: string;
}

/** 角色大脑（完整运行时状态） */
export interface CharacterBrain {
  /** 角色 ID */
  characterId: string;
  /** 情绪状态 */
  emotion: EmotionState;
  /** 所有关系 */
  relationships: RelationshipState[];
  /** 长期目标 */
  goals: CharacterGoal[];
  /** 主观记忆 */
  memories: CharacterMemory[];
  /** 当前状态 */
  currentState?: CharacterCurrentState;
  /** 附加元数据 */
  metadata?: Record<string, unknown>;
}

/** 创建空的角色大脑 */
export function createCharacterBrain(characterId: string): CharacterBrain {
  return {
    characterId,
    emotion: createDefaultEmotionState(),
    relationships: [],
    goals: [],
    memories: [],
  };
}

/** 序列化 CharacterBrain 为 JSON 字符串 */
export function serializeCharacterBrain(brain: CharacterBrain): string {
  return JSON.stringify(brain, null, 2);
}

/** 从 JSON 字符串反序列化 CharacterBrain */
export function deserializeCharacterBrain(json: string): CharacterBrain {
  const parsed = JSON.parse(json);

  // 基础校验
  if (!parsed.characterId || typeof parsed.characterId !== 'string') {
    throw new Error('Invalid CharacterBrain JSON: missing characterId');
  }
  if (!parsed.emotion || typeof parsed.emotion !== 'object') {
    throw new Error('Invalid CharacterBrain JSON: missing emotion');
  }
  if (!Array.isArray(parsed.relationships)) {
    throw new Error('Invalid CharacterBrain JSON: relationships must be array');
  }
  if (!Array.isArray(parsed.goals)) {
    throw new Error('Invalid CharacterBrain JSON: goals must be array');
  }
  if (!Array.isArray(parsed.memories)) {
    throw new Error('Invalid CharacterBrain JSON: memories must be array');
  }

  return parsed as CharacterBrain;
}

/** 生成 CharacterBrain 的文本摘要（用于 prompt 注入等） */
export function summarizeCharacterBrain(brain: CharacterBrain): string {
  const lines: string[] = [
    `[CharacterBrain] ${brain.characterId}`,
    '',
    '## Current State',
  ];

  if (brain.currentState) {
    if (brain.currentState.location) {
      lines.push(`  Location: ${brain.currentState.location}`);
    }
    if (brain.currentState.activity) {
      lines.push(`  Activity: ${brain.currentState.activity}`);
    }
    if (brain.currentState.status) {
      lines.push(`  Status: ${brain.currentState.status}`);
    }
  }

  lines.push('');
  lines.push('## Emotion');
  lines.push(
    `  happiness=${brain.emotion.happiness} stress=${brain.emotion.stress} trust=${brain.emotion.trust}`,
  );
  lines.push(
    `  affection=${brain.emotion.affection} anger=${brain.emotion.anger} loneliness=${brain.emotion.loneliness} curiosity=${brain.emotion.curiosity}`,
  );

  if (brain.relationships.length > 0) {
    lines.push('');
    lines.push(`## Relationships (${brain.relationships.length})`);
    for (const rel of brain.relationships) {
      lines.push(
        `  ${rel.targetId}: trust=${rel.trust} affection=${rel.affection} fear=${rel.fear} respect=${rel.respect}`,
      );
    }
  }

  const activeGoals = brain.goals.filter((g) => g.status === 'active');
  if (activeGoals.length > 0) {
    lines.push('');
    lines.push(`## Active Goals (${activeGoals.length})`);
    for (const goal of activeGoals) {
      lines.push(`  [p=${goal.priority}] ${goal.content}`);
    }
  }

  if (brain.memories.length > 0) {
    lines.push('');
    lines.push(`## Memories (${brain.memories.length} total)`);
    const top = [...brain.memories]
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 5);
    for (const mem of top) {
      lines.push(`  [imp=${mem.importance}] ${mem.content.slice(0, 80)}`);
    }
  }

  return lines.join('\n');
}
