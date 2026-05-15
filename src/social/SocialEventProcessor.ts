// ============================================================
// SocialEventProcessor — 社交事件处理器
//
// 将互动事件应用到社交图和角色大脑：
//   1. 更新关系边
//   2. 更新双方情绪
//
// 不可变更新：返回新的 SocialGraph。
// ============================================================

import type { SocialGraph, SocialNode } from './SocialGraph';
import {
  getOrCreateEdge,
  updateEdge,
} from './SocialGraph';
import { RelationshipEngine } from './RelationshipEngine';
import type { InteractionEvent } from './InteractionEvent';
import { modifyEmotions } from '../character/EmotionState';

export class SocialEventProcessor {
  /**
   * 将互动事件应用到社交图。
   * 同时更新边关系和角色情绪。
   */
  static apply(
    graph: SocialGraph,
    event: InteractionEvent,
  ): SocialGraph {
    // ---- 1. 获取/创建边 ----
    const edgeKey = `${event.from}->${event.to}`;
    let { graph: g, edge } = getOrCreateEdge(graph, event.from, event.to);

    // ---- 2. 更新关系边 ----
    edge = RelationshipEngine.updateEdge(edge, event);
    g = updateEdge(g, edge);

    // ---- 3. 更新角色情绪 ----
    const fromNode = g.nodes[event.from];
    const toNode = g.nodes[event.to];

    if (fromNode && event.impact.fromEmotionShift) {
      g = {
        ...g,
        nodes: {
          ...g.nodes,
          [event.from]: {
            ...fromNode,
            brain: {
              ...fromNode.brain,
              emotion: modifyEmotions(
                fromNode.brain.emotion,
                event.impact.fromEmotionShift,
              ),
            },
          },
        },
      };
    }

    if (toNode && event.impact.toEmotionShift) {
      g = {
        ...g,
        nodes: {
          ...g.nodes,
          [event.to]: {
            ...toNode,
            brain: {
              ...toNode.brain,
              emotion: modifyEmotions(
                toNode.brain.emotion,
                event.impact.toEmotionShift,
              ),
            },
          },
        },
      };
    }

    return g;
  }

  /**
   * 批量应用多个事件。
   */
  static applyAll(
    graph: SocialGraph,
    events: InteractionEvent[],
  ): SocialGraph {
    let g = graph;
    for (const event of events) {
      g = this.apply(g, event);
    }
    return g;
  }

  /**
   * 对所有边应用关系衰减。
   */
  static decayAllEdges(graph: SocialGraph): SocialGraph {
    const newEdges: Record<string, typeof graph.edges[string]> = {};
    for (const [key, edge] of Object.entries(graph.edges)) {
      newEdges[key] = RelationshipEngine.decay(edge);
    }
    return { ...graph, edges: newEdges };
  }
}
