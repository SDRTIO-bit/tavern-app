// ============================================================
// EmotionState — 角色情绪状态
//
// 所有值范围 0~100，表示当前情绪强度。
// ============================================================

/** 情绪状态维度 */
export interface EmotionState {
  /** 幸福感 */
  happiness: number;
  /** 压力值 */
  stress: number;
  /** 信任感 */
  trust: number;
  /** 好感度 */
  affection: number;
  /** 愤怒值 */
  anger: number;
  /** 孤独感 */
  loneliness: number;
  /** 好奇心 */
  curiosity: number;
}

/** 情绪维度名称 */
export type EmotionDimension = keyof EmotionState;

export const EMOTION_DIMENSIONS: EmotionDimension[] = [
  'happiness',
  'stress',
  'trust',
  'affection',
  'anger',
  'loneliness',
  'curiosity',
];

/** 情绪值合法范围 */
export const EMOTION_MIN = 0;
export const EMOTION_MAX = 100;

/** 将情绪值限制在 0~100 范围内 */
export function clampEmotionValue(value: number): number {
  return Math.max(EMOTION_MIN, Math.min(EMOTION_MAX, Math.round(value)));
}

/** 创建默认情绪状态（所有值 = 50，中性） */
export function createDefaultEmotionState(): EmotionState {
  return {
    happiness: 50,
    stress: 50,
    trust: 50,
    affection: 50,
    anger: 50,
    loneliness: 50,
    curiosity: 50,
  };
}

/**
 * 对单个情绪维度施加 delta 变化（带 clamp）。
 * 返回新的 EmotionState（不可变）。
 */
export function modifyEmotion(
  emotion: EmotionState,
  dimension: EmotionDimension,
  delta: number,
): EmotionState {
  return {
    ...emotion,
    [dimension]: clampEmotionValue(emotion[dimension] + delta),
  };
}

/**
 * 批量修改情绪（多个维度同时 delta）。
 */
export function modifyEmotions(
  emotion: EmotionState,
  deltas: Partial<Record<EmotionDimension, number>>,
): EmotionState {
  let result = { ...emotion };
  for (const [dim, delta] of Object.entries(deltas)) {
    if (delta === undefined) continue;
    const d = dim as EmotionDimension;
    result = {
      ...result,
      [d]: clampEmotionValue(result[d] + delta),
    };
  }
  return result;
}

/**
 * 获取优势情绪（值最高的维度）。
 */
export function getDominantEmotion(emotion: EmotionState): {
  dimension: EmotionDimension;
  value: number;
} {
  let maxDim: EmotionDimension = 'happiness';
  let maxVal = emotion.happiness;
  for (const dim of EMOTION_DIMENSIONS) {
    if (emotion[dim] > maxVal) {
      maxVal = emotion[dim];
      maxDim = dim;
    }
  }
  return { dimension: maxDim, value: maxVal };
}
