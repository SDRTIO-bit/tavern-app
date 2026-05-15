// ============================================================
// InteractionEvent — NPC 互动事件
//
// 角色之间的互动：对话、帮助、冲突、观察。
// 每个事件包含情感和关系的影响数据。
// ============================================================

import { v4 as uuidv4 } from 'uuid';

/** 互动类型 */
export type InteractionType =
  | 'talk'
  | 'help'
  | 'conflict'
  | 'observe'
  | 'gift'
  | 'ignore';

/** 互动事件 */
export interface InteractionEvent {
  /** 事件 ID */
  id: string;
  /** 发起方角色 ID */
  from: string;
  /** 目标方角色 ID */
  to: string;
  /** 互动类型 */
  type: InteractionType;
  /** 互动内容（消息文本） */
  content: string;
  /** 影响力数据 */
  impact: InteractionImpact;
  /** 时间戳（毫秒） */
  timestamp: number;
  /** 发生地点（可选） */
  location?: string;
}

/** 互动影响力 */
export interface InteractionImpact {
  /** 对发起方情绪的影响 */
  fromEmotionShift?: Record<string, number>;
  /** 对目标方情绪的影响 */
  toEmotionShift?: Record<string, number>;
  /** 关系变化量 */
  relationshipShift?: {
    trust?: number;
    affinity?: number;
    tension?: number;
  };
}

/** 创建互动事件 */
export function createInteractionEvent(
  from: string,
  to: string,
  type: InteractionType,
  content: string,
): InteractionEvent {
  const impact = getDefaultImpact(type);

  return {
    id: uuidv4(),
    from,
    to,
    type,
    content,
    impact,
    timestamp: Date.now(),
  };
}

/** 根据互动类型获取默认影响力 */
function getDefaultImpact(type: InteractionType): InteractionImpact {
  switch (type) {
    case 'talk':
      return {
        fromEmotionShift: { loneliness: -5, happiness: 2 },
        toEmotionShift: { curiosity: 3, loneliness: -3 },
        relationshipShift: { affinity: 3 },
      };
    case 'help':
      return {
        fromEmotionShift: { happiness: 3 },
        toEmotionShift: { trust: 5, affection: 4, stress: -5 },
        relationshipShift: { trust: 5, affinity: 5 },
      };
    case 'conflict':
      return {
        fromEmotionShift: { anger: 8, stress: 5 },
        toEmotionShift: { stress: 8, trust: -5, anger: 5 },
        relationshipShift: { trust: -10, tension: 10, affinity: -5 },
      };
    case 'observe':
      return {
        fromEmotionShift: { curiosity: 2 },
        toEmotionShift: {},
        relationshipShift: { affinity: 1 },
      };
    case 'gift':
      return {
        fromEmotionShift: { happiness: 3 },
        toEmotionShift: { happiness: 8, affection: 10 },
        relationshipShift: { affinity: 8, trust: 5 },
      };
    case 'ignore':
      return {
        fromEmotionShift: {},
        toEmotionShift: { loneliness: 5, trust: -3 },
        relationshipShift: { affinity: -5, tension: 3 },
      };
    default:
      return {};
  }
}

/** 获取互动类型的文本描述 */
export function describeInteraction(event: InteractionEvent): string {
  const actions: Record<InteractionType, string> = {
    talk: 'spoke to',
    help: 'helped',
    conflict: 'had a conflict with',
    observe: 'observed',
    gift: 'gave a gift to',
    ignore: 'ignored',
  };
  return `${event.from} ${actions[event.type]} ${event.to}: "${event.content}"`;
}
