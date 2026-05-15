// ============================================================
// ArcBuilder — 剧情生成器
//
// 从世界事件和社交事件中检测模式，自动生成 StoryArc。
//
// 触发条件：
//   - 连续冲突 (3+)
//   - 持续友好互动 (5+)
//   - 单一角色多次参与同一类型事件
//   - 高强度事件 (>70)
// ============================================================

import type { StoryArc, ArcType } from './StoryArc';
import { createStoryArc } from './StoryArc';

/** 可被 ArcBuilder 处理的事件 */
export interface ArcTriggerEvent {
  id: string;
  type: string;
  from?: string;
  to?: string;
  intensity?: number;
  timestamp: number;
}

/** Arc 模板 */
interface ArcTemplate {
  type: ArcType;
  titleTemplate: string;
  detect: (events: ArcTriggerEvent[], recentEvents: ArcTriggerEvent[]) => boolean;
}

export class ArcBuilder {
  /** 已检测过的弧（避免重复生成） */
  private static detectedPatterns: Set<string> = new Set();

  private static templates: ArcTemplate[] = [
    {
      type: 'conflict',
      titleTemplate: 'Rising Tensions',
      detect: (events, recent) => {
        const conflicts = recent.filter((e) => e.type === 'conflict');
        return conflicts.length >= 3;
      },
    },
    {
      type: 'friendship',
      titleTemplate: 'A Growing Bond',
      detect: (events, recent) => {
        const positive = recent.filter(
          (e) => e.type === 'help' || e.type === 'talk' || e.type === 'gift',
        );
        return positive.length >= 5;
      },
    },
    {
      type: 'betrayal',
      titleTemplate: 'A Trust Broken',
      detect: (events, recent) => {
        const betrayals = recent.filter(
          (e) =>
            e.type === 'conflict' &&
            recent.filter(
              (e2) =>
                e2.type === 'help' || e2.type === 'gift',
            ).length >= 2,
        );
        return betrayals.length >= 1;
      },
    },
    {
      type: 'discovery',
      titleTemplate: 'Worlds Unveiled',
      detect: (_events, recent) => {
        const discoveries = recent.filter(
          (e) =>
            e.type === 'discovery' || e.type === 'observe',
        );
        return discoveries.length >= 2;
      },
    },
    {
      type: 'tragedy',
      titleTemplate: 'A Dark Turn',
      detect: (_events, recent) => {
        return recent.some(
          (e) => e.type === 'disaster' && (e.intensity ?? 0) > 70,
        );
      },
    },
    {
      type: 'political',
      titleTemplate: 'Shifting Alliances',
      detect: (_events, recent) => {
        const political = recent.filter(
          (e) => e.type === 'political' || e.type === 'conflict',
        );
        return political.length >= 4;
      },
    },
    {
      type: 'romance',
      titleTemplate: 'Blossoming Feelings',
      detect: (_events, recent) => {
        const warm = recent.filter(
          (e) => e.type === 'gift' || e.type === 'talk',
        );
        return warm.length >= 4 && recent.some((e) => e.type === 'help');
      },
    },
    {
      type: 'redemption',
      titleTemplate: 'A Path to Forgiveness',
      detect: (_events, recent) => {
        const conflicts = recent.filter((e) => e.type === 'conflict');
        const helps = recent.filter((e) => e.type === 'help' || e.type === 'gift');
        return conflicts.length >= 1 && helps.length >= 2;
      },
    },
  ];

  /**
   * 检测是否需要生成新剧情线。
   */
  static detectArcs(
    allEvents: ArcTriggerEvent[],
    recentEvents: ArcTriggerEvent[],
  ): StoryArc[] {
    const arcs: StoryArc[] = [];

    for (const template of this.templates) {
      if (template.detect(allEvents, recentEvents)) {
        // 提取参与者
        const participants = this.extractParticipants(recentEvents);

        // 去重检查
        const patternKey = `${template.type}:${participants.sort().join(',')}`;
        if (this.detectedPatterns.has(patternKey)) continue;

        this.detectedPatterns.add(patternKey);

        // 提取事件 ID 和伏笔
        const eventIds = recentEvents.map((e) => e.id);
        const hooks = this.extractHooks(recentEvents);

        const arc = createStoryArc(
          template.titleTemplate,
          template.type,
          participants,
          hooks,
          eventIds,
        );

        arcs.push(arc);
      }
    }

    return arcs;
  }

  /**
   * 提取参与者 ID。
   */
  static extractParticipants(events: ArcTriggerEvent[]): string[] {
    const participants = new Set<string>();
    for (const e of events) {
      if (e.from) participants.add(e.from);
      if (e.to) participants.add(e.to);
    }
    return Array.from(participants);
  }

  /**
   * 提取伏笔。
   */
  static extractHooks(events: ArcTriggerEvent[]): string[] {
    const hooks: string[] = [];
    for (const e of events) {
      if (e.type === 'conflict') {
        hooks.push(`A conflict between ${e.from} and ${e.to}`);
      }
      if (e.type === 'help') {
        hooks.push(`${e.from} showed kindness to ${e.to}`);
      }
      if (e.type === 'disaster') {
        hooks.push(`A disaster reshaped the world`);
      }
    }
    return hooks.slice(0, 5);
  }

  /**
   * 清空检测记录（用于重置世界）。
   */
  static resetDetectedPatterns(): void {
    this.detectedPatterns.clear();
  }
}
