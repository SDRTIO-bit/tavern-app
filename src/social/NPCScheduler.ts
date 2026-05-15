// ============================================================
// NPCScheduler — NPC 自主互动调度器
//
// 每个 tick，NPC 根据其情绪和关系决定：
//   - 找谁互动
//   - 互动类型（talk/help/conflict/gift/ignore/observe）
//
// 返回生成的 InteractionEvent 列表。
// ============================================================

import type { SocialGraph, SocialEdge, SocialNode } from './SocialGraph';
import { getOutgoingEdges } from './SocialGraph';
import type { InteractionType, InteractionEvent } from './InteractionEvent';
import { createInteractionEvent } from './InteractionEvent';
import type { CharacterBrain } from '../character/CharacterBrain';

/** 调度配置 */
export interface NPCSchedulerConfig {
  /** 每个 tick 每个 NPC 生成事件的基础概率 */
  baseInteractionChance: number;
  /** 最大每个 tick 事件数 */
  maxEventsPerTick: number;
}

const DEFAULT_CONFIG: NPCSchedulerConfig = {
  baseInteractionChance: 0.35,
  maxEventsPerTick: 20,
};

export class NPCScheduler {
  private config: NPCSchedulerConfig;

  constructor(config?: Partial<NPCSchedulerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 执行一个社交 tick，生成互动事件。
   */
  tick(graph: SocialGraph): InteractionEvent[] {
    const events: InteractionEvent[] = [];
    const nodeIds = Object.keys(graph.nodes);

    // 随机打乱顺序，避免同一角色总在前
    const shuffled = [...nodeIds].sort(() => Math.random() - 0.5);

    for (const fromId of shuffled) {
      if (events.length >= this.config.maxEventsPerTick) break;

      const fromNode = graph.nodes[fromId];
      if (!fromNode) continue;

      // 基础概率判定
      if (Math.random() > this.config.baseInteractionChance) continue;

      // 情绪驱动的概率调整
      const chance = this.getEmotionAdjustedChance(fromNode.brain);
      if (Math.random() > chance) continue;

      // 找目标
      const target = this.pickTarget(graph, fromId, fromNode);
      if (!target) continue;

      // 决定互动类型
      const interactionType = this.decideInteractionType(
        graph,
        fromNode,
        target.node,
      );

      // 生成内容
      const content = this.generateContent(
        interactionType,
        fromNode,
        target.node,
      );

      // 创建事件
      const event = createInteractionEvent(
        fromId,
        target.node.id,
        interactionType,
        content,
      );

      events.push(event);
    }

    return events;
  }

  /**
   * 根据角色情绪调整互动概率。
   */
  private getEmotionAdjustedChance(brain: CharacterBrain): number {
    const e = brain.emotion;
    let chance = this.config.baseInteractionChance;

    // 孤独 → 更想互动
    if (e.loneliness > 70) chance += 0.25;
    if (e.loneliness > 85) chance += 0.15;

    // 愤怒 → 更想冲突
    if (e.anger > 70) chance += 0.15;

    // 压力 → 降低互动意愿
    if (e.stress > 70) chance -= 0.2;

    // 好奇心 → 更想互动
    if (e.curiosity > 65) chance += 0.15;

    return Math.max(0.05, Math.min(0.95, chance));
  }

  /**
   * 选择互动目标。
   */
  private pickTarget(
    graph: SocialGraph,
    fromId: string,
    fromNode: SocialNode,
  ): { node: SocialNode; edge?: SocialEdge } | null {
    const edges = getOutgoingEdges(graph, fromId);

    // 如果已有关系边，优先从已有关系中选择
    if (edges.length > 0 && Math.random() < 0.7) {
      // 按亲和度加权随机
      const totalAffinity = edges.reduce((s, e) => s + e.affinity, 0) + 1;
      let rand = Math.random() * totalAffinity;

      for (const edge of edges) {
        rand -= edge.affinity + 1;
        if (rand <= 0) {
          const target = graph.nodes[edge.to];
          if (target) return { node: target, edge };
        }
      }
    }

    // 随机选择其他角色
    const otherIds = Object.keys(graph.nodes).filter((id) => id !== fromId);
    if (otherIds.length === 0) return null;

    const randomId = otherIds[Math.floor(Math.random() * otherIds.length)];
    const target = graph.nodes[randomId];
    if (!target) return null;

    return { node: target };
  }

  /**
   * 决定互动类型（基于双方情绪和关系）。
   */
  private decideInteractionType(
    graph: SocialGraph,
    fromNode: SocialNode,
    toNode: SocialNode,
  ): InteractionType {
    const fromBrain = fromNode.brain;
    const toBrain = toNode.brain;

    const edge = graph.edges[`${fromNode.id}->${toNode.id}`];

    // 高愤怒 + 高 tension → 冲突
    if (
      fromBrain.emotion.anger > 65 &&
      (edge?.tension ?? 50) > 50
    ) {
      if (Math.random() < 0.5) return 'conflict';
    }

    // 低愤怒 + 高 affinity → 帮助/赠礼
    if (
      fromBrain.emotion.anger < 35 &&
      (edge?.affinity ?? 50) > 65
    ) {
      const roll = Math.random();
      if (roll < 0.3) return 'gift';
      if (roll < 0.6) return 'help';
    }

    // 高好奇心 → 观察
    if (fromBrain.emotion.curiosity > 70 && Math.random() < 0.3) {
      return 'observe';
    }

    // 高压力 → 忽略
    if (fromBrain.emotion.stress > 75 && Math.random() < 0.4) {
      return 'ignore';
    }

    // 默认 → 对话
    return 'talk';
  }

  /**
   * 生成互动内容。
   */
  private generateContent(
    type: InteractionType,
    fromNode: SocialNode,
    toNode: SocialNode,
  ): string {
    const toLabel = toNode.label || toNode.id;

    switch (type) {
      case 'talk':
        return `Hey ${toLabel}, how have you been?`;
      case 'help':
        return `Let me help you with that, ${toLabel}.`;
      case 'conflict':
        return `Your recent behavior has been bothering me.`;
      case 'gift':
        return `I got something for you. Hope you like it!`;
      case 'observe':
        return `(watching from a distance)`;
      case 'ignore':
        return `(looks away)`;
      default:
        return `...`;
    }
  }

  /**
   * 更新配置。
   */
  updateConfig(config: Partial<NPCSchedulerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
