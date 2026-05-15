// ============================================================
// RelationshipState — 角色与目标的关系状态
//
// targetId 可以是用户 ID 或 NPC ID。
// 数值范围 0~100。
// ============================================================

/** 关系状态 */
export interface RelationshipState {
  /** 关系目标 ID（用户/NPC） */
  targetId: string;
  /** 信任度 */
  trust: number;
  /** 好感度 */
  affection: number;
  /** 恐惧度 */
  fear: number;
  /** 尊敬度 */
  respect: number;
  /** 最后交互时间（ISO 8601） */
  lastInteractionAt?: string;
  /** 关系笔记 */
  notes?: string[];
}

/** 关系维度名称 */
export type RelationshipDimension = 'trust' | 'affection' | 'fear' | 'respect';

export const RELATIONSHIP_DIMENSIONS: RelationshipDimension[] = [
  'trust',
  'affection',
  'fear',
  'respect',
];

export const RELATIONSHIP_MIN = 0;
export const RELATIONSHIP_MAX = 100;

/** 创建默认关系状态 */
export function createRelationshipState(targetId: string): RelationshipState {
  return {
    targetId,
    trust: 50,
    affection: 50,
    fear: 50,
    respect: 50,
  };
}

/** Clamp 关系值 */
export function clampRelationshipValue(value: number): number {
  return Math.max(RELATIONSHIP_MIN, Math.min(RELATIONSHIP_MAX, Math.round(value)));
}

/**
 * 更新关系的某个维度。
 * 返回新的 RelationshipState（不可变）。
 */
export function updateRelationship(
  rel: RelationshipState,
  dimension: RelationshipDimension,
  delta: number,
): RelationshipState {
  return {
    ...rel,
    [dimension]: clampRelationshipValue(rel[dimension] + delta),
    lastInteractionAt: new Date().toISOString(),
  };
}

/**
 * 批量更新关系维度。
 */
export function updateRelationships(
  rel: RelationshipState,
  deltas: Partial<Record<RelationshipDimension, number>>,
): RelationshipState {
  let result = { ...rel };
  for (const [dim, delta] of Object.entries(deltas)) {
    if (delta === undefined) continue;
    const d = dim as RelationshipDimension;
    result = {
      ...result,
      [d]: clampRelationshipValue(result[d] + delta),
    };
  }
  result.lastInteractionAt = new Date().toISOString();
  return result;
}

/** 添加关系笔记 */
export function addRelationshipNote(
  rel: RelationshipState,
  note: string,
): RelationshipState {
  return {
    ...rel,
    notes: [...(rel.notes ?? []), note],
    lastInteractionAt: new Date().toISOString(),
  };
}

/** 获取关系摘要 */
export function getRelationshipSummary(rel: RelationshipState): string {
  return [
    `[Relationship] target=${rel.targetId}`,
    `  trust=${rel.trust} affection=${rel.affection} fear=${rel.fear} respect=${rel.respect}`,
    rel.lastInteractionAt
      ? `  lastInteraction=${rel.lastInteractionAt}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');
}
