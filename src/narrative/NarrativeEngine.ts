// ============================================================
// NarrativeEngine — 剧情引擎
//
// 核心叙事驱动：
//   1. 检测事件模式 → 生成 StoryArc
//   2. 推进已有弧的阶段
//   3. 注入剧情影响力到角色脑
//   4. 完成弧 → 沉淀为 PlotMemory
//
// 与 WorldEngine / SocialEngine 并行运行。
// ============================================================

import type { StoryArc } from './StoryArc';
import { progressArc, summarizeArc } from './StoryArc';
import type { StoryEvent } from './StoryEvent';
import { createStoryEvent } from './StoryEvent';
import type { PlotMemory } from './PlotMemory';
import { createPlotMemoryFromArc } from './PlotMemory';
import type { ArcTriggerEvent, ArcBuilder } from './ArcBuilder';

interface ArcBuilderType {
  detectArcs(allEvents: ArcTriggerEvent[], recent: ArcTriggerEvent[]): StoryArc[];
  resetDetectedPatterns(): void;
}

/** 剧情引擎配置 */
export interface NarrativeEngineConfig {
  /** 剧情推进间隔（多少 tick 推进一次弧） */
  arcProgressInterval: number;
  /** 最大同时活跃弧数 */
  maxActiveArcs: number;
}

const DEFAULT_CONFIG: NarrativeEngineConfig = {
  arcProgressInterval: 3,
  maxActiveArcs: 5,
};

export class NarrativeEngine {
  /** 活跃剧情线 */
  private activeArcs: StoryArc[] = [];
  /** 已完成的剧情记忆 */
  private plotMemories: PlotMemory[] = [];
  /** 配置 */
  private config: NarrativeEngineConfig;
  /** tick 计数器 */
  private tickCount = 0;
  /** ArcBuilder 引用 */
  private arcBuilder: ArcBuilderType;

  constructor(
    arcBuilder: ArcBuilderType,
    config?: Partial<NarrativeEngineConfig>,
  ) {
    this.arcBuilder = arcBuilder;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 执行一次叙事 tick。
   *
   * @param worldEvents 世界层的事件
   * @param socialEvents 社交层的事件
   * @returns 本 tick 产生/推进的弧 + 剧情事件
   */
  tick(
    worldEvents: ArcTriggerEvent[],
    socialEvents: ArcTriggerEvent[],
  ): {
    newArcs: StoryArc[];
    progressedArcs: StoryArc[];
    resolvedArcs: StoryArc[];
    storyEvents: StoryEvent[];
  } {
    this.tickCount++;

    const allEvents = [...worldEvents, ...socialEvents];
    const recentEvents = allEvents.filter(
      (e) => Date.now() - e.timestamp < 300000, // 最近 5 分钟的事件
    );

    const newArcs: StoryArc[] = [];
    const progressedArcs: StoryArc[] = [];
    const resolvedArcs: StoryArc[] = [];
    const storyEvents: StoryEvent[] = [];

    // ---- 1️⃣ 检测新弧 ----
    if (this.activeArcs.length < this.config.maxActiveArcs) {
      const detected = this.arcBuilder.detectArcs(allEvents, recentEvents);
      for (const arc of detected) {
        this.activeArcs.push(arc);
        newArcs.push(arc);

        // 生成剧情事件
        const se = createStoryEvent(
          arc.id,
          'trigger',
          `Story arc begins: ${arc.title}`,
          arc.participants,
        );
        storyEvents.push(se);
      }
    }

    // ---- 2️⃣ 推进已有弧 ----
    if (this.tickCount % this.config.arcProgressInterval === 0) {
      const remaining: StoryArc[] = [];

      for (const arc of this.activeArcs) {
        if (arc.phase === 'resolved') {
          // 已完成 → 沉淀为记忆
          const memory = createPlotMemoryFromArc(arc);
          this.plotMemories.push(memory);
          resolvedArcs.push(arc);
          continue;
        }

        const progressed = progressArc(arc);
        progressedArcs.push(progressed);

        // 生成对应的剧情事件
        const storyEventType = this.mapPhaseToStoryEventType(progressed.phase);
        if (storyEventType) {
          const se = createStoryEvent(
            progressed.id,
            storyEventType,
            `Arc "${progressed.title}" enters ${progressed.phase} phase (intensity: ${progressed.intensity})`,
            progressed.participants,
          );
          storyEvents.push(se);
        }

        if (progressed.phase !== 'resolved') {
          remaining.push(progressed);
        } else {
          const memory = createPlotMemoryFromArc(progressed);
          this.plotMemories.push(memory);
          resolvedArcs.push(progressed);
        }
      }

      this.activeArcs = remaining;
    }

    return { newArcs, progressedArcs, resolvedArcs, storyEvents };
  }

  /**
   * 将剧情注入角色大脑。
   *
   * @param emotion 当前情绪（引用，会被修改）
   * @param arcs 需要影响该角色的剧情线
   */
  static applyNarrativeToEmotion(
    emotion: Record<string, number>,
    arcs: StoryArc[],
  ): Record<string, number> {
    const result = { ...emotion };

    for (const arc of arcs) {
      switch (arc.phase) {
        case 'setup':
          result.curiosity = (result.curiosity ?? 50) + 3;
          break;
        case 'rising':
          result.stress = (result.stress ?? 50) + 5;
          result.curiosity = (result.curiosity ?? 50) + 5;
          break;
        case 'climax':
          result.stress = (result.stress ?? 50) + 15;
          result.anger = (result.anger ?? 50) + 5;
          result.curiosity = (result.curiosity ?? 50) + 10;
          break;
        case 'fallout':
          result.loneliness = (result.loneliness ?? 50) + 10;
          result.stress = (result.stress ?? 50) + 5;
          break;
        case 'resolved':
          result.happiness = (result.happiness ?? 50) + 5;
          result.stress = (result.stress ?? 50) - 10;
          break;
      }
    }

    return result;
  }

  /**
   * 获取活跃弧。
   */
  getActiveArcs(): StoryArc[] {
    return [...this.activeArcs];
  }

  /**
   * 获取剧情记忆。
   */
  getPlotMemories(): PlotMemory[] {
    return [...this.plotMemories];
  }

  /**
   * 获取剧情摘要（调试/UI 用）。
   */
  getSummary(): string {
    const lines: string[] = [
      `[Narrative Engine] tick=${this.tickCount}`,
      `  Active Arcs: ${this.activeArcs.length}`,
    ];

    for (const arc of this.activeArcs) {
      lines.push(`    ${summarizeArc(arc)}`);
    }

    lines.push(`  Plot Memories: ${this.plotMemories.length}`);
    for (const mem of this.plotMemories.slice(-3)) {
      lines.push(
        `    - "${mem.arcTitle}" (${mem.emotionalTone}, imp=${mem.importance})`,
      );
    }

    return lines.join('\n');
  }

  /** 重置 */
  reset(): void {
    this.activeArcs = [];
    this.plotMemories = [];
    this.tickCount = 0;
    this.arcBuilder.resetDetectedPatterns();
  }

  // 将弧阶段映射到剧情事件类型
  private mapPhaseToStoryEventType(
    phase: StoryArc['phase'],
  ): StoryEvent['type'] | null {
    switch (phase) {
      case 'rising': return 'escalation';
      case 'climax': return 'climax';
      case 'fallout': return 'resolution';
      case 'resolved': return 'resolution';
      default: return null;
    }
  }
}
