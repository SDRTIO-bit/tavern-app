// ============================================================
// StoryEvent — 剧情事件
//
// 比普通世界事件更高层：属于某条剧情线的一个叙事节点。
// 类型：foreshadow / trigger / escalation / climax / resolution
// ============================================================

import { v4 as uuidv4 } from 'uuid';

/** 剧情事件类型 */
export type StoryEventType =
  | 'foreshadow'   // 伏笔
  | 'trigger'      // 触发
  | 'escalation'   // 升级
  | 'climax'       // 高潮
  | 'resolution';  // 结局

/** 剧情事件影响力 */
export interface StoryEventImpact {
  /** 情绪影响 */
  emotion?: Record<string, number>;
  /** 世界状态影响 */
  worldState?: Record<string, unknown>;
  /** 关系影响 */
  relationship?: {
    trust?: number;
    affinity?: number;
    tension?: number;
  };
}

/** 剧情事件 */
export interface StoryEvent {
  /** 事件 ID */
  id: string;
  /** 所属剧情线 ID */
  arcId: string;
  /** 事件类型 */
  type: StoryEventType;
  /** 事件描述 */
  content: string;
  /** 影响力 */
  impact: StoryEventImpact;
  /** 时间戳（毫秒） */
  timestamp: number;
  /** 涉及的角色 */
  involvedCharacters: string[];
}

/** 创建剧情事件 */
export function createStoryEvent(
  arcId: string,
  type: StoryEventType,
  content: string,
  involvedCharacters: string[],
): StoryEvent {
  const impact = getDefaultStoryImpact(type);

  return {
    id: uuidv4(),
    arcId,
    type,
    content,
    impact,
    timestamp: Date.now(),
    involvedCharacters,
  };
}

/** 根据剧情事件类型获取默认影响力 */
function getDefaultStoryImpact(type: StoryEventType): StoryEventImpact {
  switch (type) {
    case 'foreshadow':
      return {
        emotion: { curiosity: 8, stress: 3 },
      };
    case 'trigger':
      return {
        emotion: { stress: 10, anger: 5 },
        relationship: { tension: 8, trust: -5 },
      };
    case 'escalation':
      return {
        emotion: { stress: 15, anger: 10, fear: 5 },
        relationship: { tension: 15, trust: -10 },
      };
    case 'climax':
      return {
        emotion: { stress: 20, anger: 12, happiness: -10 },
        relationship: { tension: 20, trust: -15, affinity: -10 },
      };
    case 'resolution':
      return {
        emotion: { happiness: 10, stress: -15, trust: 5 },
        relationship: { tension: -20, affinity: 10, trust: 8 },
      };
    default:
      return {};
  }
}

/** 事件描述 */
export function describeStoryEvent(event: StoryEvent): string {
  const icons: Record<StoryEventType, string> = {
    foreshadow: '🔮',
    trigger: '⚡',
    escalation: '📈',
    climax: '💥',
    resolution: '✨',
  };
  return `${icons[event.type]} [${event.type}] ${event.content}`;
}
