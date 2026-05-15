// ============================================================
// WorldState — 世界状态核心
//
// 全局世界状态，包含时间、地点、势力、事件等。
// 完全 JSON 可序列化。
// ============================================================

import type { WorldEvent } from './WorldEvent';

/** 世界时间 */
export interface WorldTime {
  /** 天数（从第 1 天开始） */
  day: number;
  /** 小时（0~23） */
  hour: number;
  /** 分钟（0~59） */
  minute: number;
}

/** 地点状态 */
export interface LocationState {
  /** 地点名称 */
  name: string;
  /** 地点描述 */
  description?: string;
  /** 当前在此地点的角色 ID 列表 */
  charactersPresent: string[];
  /** 地点状态标记 */
  flags: Record<string, unknown>;
}

/** 世界状态 */
export interface WorldState {
  /** 世界时间 */
  time: WorldTime;

  /** 所有地点 */
  locations: Record<string, LocationState>;

  /** 所有势力 */
  factions: Record<string, FactionState>;

  /** 全局标记 */
  globalFlags: Record<string, boolean>;

  /** 当前活跃事件 */
  activeEvents: WorldEvent[];

  /** 已解决/过期事件（保留最近 N 条） */
  eventHistory: WorldEvent[];

  /** 世界元数据 */
  metadata?: Record<string, unknown>;
}

/** 势力状态 */
export interface FactionState {
  /** 势力名称 */
  name: string;
  /** 势力强度 (0~100) */
  power: number;
  /** 势力情绪 (0~100) */
  mood: number;
  /** 势力财富 */
  wealth: number;
  /** 势力关系（targetId → score） */
  relations: Record<string, number>;
  /** 势力描述 */
  description?: string;
}

/** 时间段 */
export function getTimeOfDay(hour: number): string {
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 14) return 'noon';
  if (hour >= 14 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 21) return 'evening';
  if (hour >= 21 || hour < 5) return 'night';
  return 'unknown';
}

/** 创建默认世界状态 */
export function createDefaultWorldState(): WorldState {
  return {
    time: { day: 1, hour: 8, minute: 0 },
    locations: {
      town_square: {
        name: 'Town Square',
        description: 'The bustling heart of the town.',
        charactersPresent: [],
        flags: { safe: true },
      },
      tavern: {
        name: 'The Rusty Tavern',
        description: 'A warm place where travelers gather.',
        charactersPresent: [],
        flags: { open: true },
      },
      forest: {
        name: 'Whispering Forest',
        description: 'An ancient forest with secrets.',
        charactersPresent: [],
        flags: { dangerous: false },
      },
    },
    factions: {
      global: {
        name: 'Global',
        power: 50,
        mood: 50,
        wealth: 100,
        relations: {},
      },
    },
    globalFlags: {},
    activeEvents: [],
    eventHistory: [],
  };
}

/** 获取时间字符串 */
export function formatWorldTime(time: WorldTime): string {
  const period = getTimeOfDay(time.hour);
  const h = String(time.hour).padStart(2, '0');
  const m = String(time.minute).padStart(2, '0');
  return `Day ${time.day} ${h}:${m} (${period})`;
}
