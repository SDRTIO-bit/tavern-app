// ============================================================
// EmotionTypes — 情绪引擎核心类型
//
// EmotionDelta: 情绪变化量（所有字段可选，只传变化的维度）
// EmotionInfluenceContext: 情绪影响的来源上下文
// ============================================================

import type { EmotionState } from '../EmotionState';

/** 情绪增量（只传变化的维度，undefined = 不变） */
export interface EmotionDelta {
  happiness?: number;
  stress?: number;
  trust?: number;
  affection?: number;
  anger?: number;
  loneliness?: number;
  curiosity?: number;
}

/** 情绪影响来源 */
export type EmotionInfluenceType =
  | 'user_message'
  | 'event'
  | 'memory'
  | 'time_pass';

/** 情绪影响上下文 */
export interface EmotionInfluenceContext {
  /** 影响来源类型 */
  type: EmotionInfluenceType;
  /** 文本内容（user_message / event 时） */
  content?: string;
  /** 强度倍率（0~2，1 = 正常） */
  intensity?: number;
  /** 附加数据 */
  metadata?: Record<string, unknown>;
}

/** 角色语调 */
export type CharacterTone = 'calm' | 'cold' | 'warm' | 'angry' | 'sad' | 'excited';

/** 角色主动性 */
export type CharacterInitiative = 'passive' | 'normal' | 'active';

/** 行为决策结果 */
export interface BehaviorDecision {
  /** 语调 */
  tone: CharacterTone;
  /** 主动性 */
  initiative: CharacterInitiative;
  /** 决策摘要 */
  summary: string;
}

/** 将 EmotionState 转为易读标签 */
export function getEmotionLabel(emotion: EmotionState): string {
  const dominant = getDominantLabel(emotion);
  const intensity = getEmotionIntensity(emotion);
  return `${intensity} ${dominant}`;
}

/** 优势情绪标签 */
function getDominantLabel(e: EmotionState): string {
  const map: Array<[number, string]> = [
    [e.anger, 'angry'],
    [e.stress, 'tense'],
    [e.loneliness, 'lonely'],
    [e.affection, 'affectionate'],
    [e.trust, 'trusting'],
    [e.curiosity, 'curious'],
    [e.happiness, 'happy'],
  ];
  map.sort((a, b) => b[0] - a[0]);
  return map[0][1];
}

/** 情绪总强度（所有维度的均值） */
function getEmotionIntensity(e: EmotionState): string {
  const avg =
    (e.happiness +
      e.stress +
      e.trust +
      e.affection +
      e.anger +
      e.loneliness +
      e.curiosity) /
    7;
  if (avg > 70) return 'very';
  if (avg > 55) return 'moderately';
  return 'slightly';
}
