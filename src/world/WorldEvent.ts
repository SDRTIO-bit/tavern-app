// ============================================================
// WorldEvent — 世界事件
//
// 可被世界生成、角色感知、影响 CharacterBrain 的事件。
// ============================================================

/** 事件类型 */
export type WorldEventType =
  | 'battle'
  | 'dialogue'
  | 'disaster'
  | 'celebration'
  | 'discovery'
  | 'political'
  | 'idle';

/** 事件状态 */
export type WorldEventStatus = 'active' | 'resolved' | 'expired';

/** 世界事件 */
export interface WorldEvent {
  /** 事件 ID */
  id: string;

  /** 事件类型 */
  type: WorldEventType;

  /** 事件描述 */
  description: string;

  /** 强度 (0~100)，影响角色情绪的程度 */
  intensity: number;

  /** 受影响的角色 ID 列表 */
  affectedCharacters: string[];

  /** 发生地点（可选） */
  location?: string;

  /** 开始时间（ISO 8601） */
  startedAt: string;

  /** 结束时间（ISO 8601） */
  resolvedAt?: string;

  /** 事件状态 */
  status: WorldEventStatus;

  /** 附加数据 */
  payload?: Record<string, unknown>;
}

/** 创建世界事件 */
export function createWorldEvent(
  type: WorldEventType,
  description: string,
  intensity: number,
): WorldEvent {
  return {
    id: `event_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    description,
    intensity: Math.max(0, Math.min(100, intensity)),
    affectedCharacters: [],
    startedAt: new Date().toISOString(),
    status: 'active',
  };
}

/** 标记事件为已解决 */
export function resolveWorldEvent(event: WorldEvent): WorldEvent {
  return {
    ...event,
    status: 'resolved',
    resolvedAt: new Date().toISOString(),
  };
}

/** 标记事件为过期 */
export function expireWorldEvent(event: WorldEvent): WorldEvent {
  return {
    ...event,
    status: 'expired',
    resolvedAt: new Date().toISOString(),
  };
}

/** 根据事件强度获取对情绪的影响因子 */
export function getEventEmotionImpact(event: WorldEvent): {
  stress: number;
  fear: number;
  happiness: number;
} {
  const i = event.intensity / 100; // 0~1

  switch (event.type) {
    case 'disaster':
      return { stress: 15 * i, fear: 10 * i, happiness: -10 * i };
    case 'battle':
      return { stress: 20 * i, fear: 15 * i, happiness: -5 * i };
    case 'celebration':
      return { stress: -5 * i, fear: 0, happiness: 15 * i };
    case 'discovery':
      return { stress: 0, fear: 0, happiness: 5 * i };
    case 'dialogue':
      return { stress: -3 * i, fear: 0, happiness: 3 * i };
    case 'political':
      return { stress: 8 * i, fear: 2 * i, happiness: -3 * i };
    case 'idle':
    default:
      return { stress: 0, fear: 0, happiness: 0 };
  }
}
