// ============================================================
// WorldEngine — 世界主引擎
//
// 每次 tick 执行：
//   1. 时间推进（TimeEngine）
//   2. 事件生成（随机 + 条件触发）
//   3. 事件处理（影响势力/角色）
//   4. 过期事件清理
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import type { WorldState } from './WorldState';
import { formatWorldTime } from './WorldState';
import { TimeEngine } from './TimeEngine';
import type { WorldEvent } from './WorldEvent';
import { createWorldEvent, resolveWorldEvent, expireWorldEvent } from './WorldEvent';
import type { FactionState } from './WorldState';

/** 事件模板 */
interface EventTemplate {
  type: WorldEvent['type'];
  description: string;
  intensity: number;
  probability: number; // 0~1
  condition?: (world: WorldState) => boolean;
}

export class WorldEngine {
  private static eventTemplates: EventTemplate[] = [
    {
      type: 'disaster',
      description: 'A strange energy fluctuation pulses through the town.',
      intensity: 70,
      probability: 0.08,
    },
    {
      type: 'celebration',
      description: 'The town square erupts in celebration — a festival begins!',
      intensity: 40,
      probability: 0.05,
      condition: (w) => {
        const h = w.time.hour;
        return h >= 12 && h < 20;
      },
    },
    {
      type: 'discovery',
      description: 'Travelers report finding ancient ruins in the forest.',
      intensity: 30,
      probability: 0.10,
    },
    {
      type: 'battle',
      description: 'Tensions rise — a skirmish breaks out near the border.',
      intensity: 80,
      probability: 0.04,
      condition: (w) => {
        const globalMood = w.factions.global?.mood ?? 50;
        return globalMood < 40;
      },
    },
    {
      type: 'political',
      description: 'A council meeting is called — important decisions are being made.',
      intensity: 25,
      probability: 0.07,
      condition: (w) => w.time.day % 3 === 0,
    },
    {
      type: 'dialogue',
      description: 'Whispers spread through the tavern — a new rumor is born.',
      intensity: 15,
      probability: 0.12,
      condition: (w) => {
        const h = w.time.hour;
        return h >= 18 || h < 6;
      },
    },
  ];

  /**
   * 世界主 tick。
   */
  static tick(world: WorldState): WorldState {
    // 1️⃣ 时间推进
    let next = TimeEngine.tick(world);

    // 2️⃣ 事件生成
    next = this.generateEvents(next);

    // 3️⃣ 事件处理
    next = this.processEvents(next);

    // 4️⃣ 清理过期事件
    next = this.cleanupEvents(next);

    return next;
  }

  /**
   * 生成随机世界事件。
   */
  static generateEvents(world: WorldState): WorldState {
    const newEvents: WorldEvent[] = [];

    for (const template of this.eventTemplates) {
      // 检查条件
      if (template.condition && !template.condition(world)) continue;

      // 概率判定
      if (Math.random() >= template.probability) continue;

      const event = createWorldEvent(
        template.type,
        template.description,
        template.intensity,
      );

      newEvents.push(event);
    }

    return {
      ...world,
      activeEvents: [...world.activeEvents, ...newEvents],
    };
  }

  /**
   * 处理活跃事件（影响势力等）。
   */
  static processEvents(world: WorldState): WorldState {
    const updatedEvents: WorldEvent[] = [];
    let factions = { ...world.factions };

    for (const event of world.activeEvents) {
      const elapsed = Date.now() - new Date(event.startedAt).getTime();

      // 事件过期（超过 10 个 tick ≈ 2.5 分钟现实时间）
      if (elapsed > 150000) {
        updatedEvents.push(expireWorldEvent(event));
        continue;
      }

      // 事件影响力处理
      if (event.type === 'disaster' || event.type === 'battle') {
        factions = this.applyFactionImpact(factions, event);
      }

      if (event.type === 'celebration') {
        factions = this.applyFactionImpact(factions, event);
      }

      updatedEvents.push(event);
    }

    return {
      ...world,
      activeEvents: updatedEvents,
      factions,
    };
  }

  /**
   * 清理事件：将已解决/过期事件移入历史。
   */
  static cleanupEvents(world: WorldState): WorldState {
    const active: WorldEvent[] = [];
    const history: WorldEvent[] = [...world.eventHistory];

    for (const event of world.activeEvents) {
      if (event.status === 'resolved' || event.status === 'expired') {
        history.push(event);
      } else {
        active.push(event);
      }
    }

    // 只保留最近 50 条历史
    const trimmedHistory = history.slice(-50);

    return {
      ...world,
      activeEvents: active,
      eventHistory: trimmedHistory,
    };
  }

  /**
   * 事件影响力处理。
   */
  private static applyFactionImpact(
    factions: Record<string, FactionState>,
    event: WorldEvent,
  ): Record<string, FactionState> {
    const result = { ...factions };
    const global = result.global;
    if (!global) return result;

    const i = event.intensity / 100;

    switch (event.type) {
      case 'disaster':
        result.global = {
          ...global,
          mood: Math.max(0, global.mood - 8 * i),
        };
        break;
      case 'battle':
        result.global = {
          ...global,
          power: Math.max(0, global.power - 5 * i),
          mood: Math.max(0, global.mood - 10 * i),
        };
        break;
      case 'celebration':
        result.global = {
          ...global,
          mood: Math.min(100, global.mood + 10 * i),
        };
        break;
      case 'political':
        result.global = {
          ...global,
          mood: Math.max(0, Math.min(100, global.mood - 3 * i)),
        };
        break;
    }

    return result;
  }

  /**
   * 注册自定义事件模板。
   */
  static registerEventTemplate(template: EventTemplate): void {
    this.eventTemplates.push(template);
  }

  /**
   * 清空自定义模板。
   */
  static clearCustomTemplates(): void {
    this.eventTemplates = this.eventTemplates.slice(0, 6); // 保留内置 6 个
  }

  /**
   * 生成世界状态摘要。
   */
  static summarize(world: WorldState): string {
    const timeStr = formatWorldTime(world.time);
    const activeCount = world.activeEvents.length;
    const factionCount = Object.keys(world.factions).length;

    const lines = [
      `[World] ${timeStr}`,
      `  Factions: ${factionCount}`,
      `  Active Events: ${activeCount}`,
    ];

    if (activeCount > 0) {
      for (const event of world.activeEvents.slice(0, 3)) {
        lines.push(`    - [${event.type}] ${event.description}`);
      }
    }

    return lines.join('\n');
  }
}
