// ============================================================
// SocialGraph — 角色社交关系网络
//
// 核心数据结构：节点 = 角色，边 = 角色间关系。
// 支持查询、遍历、导出。
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import type { CharacterBrain } from '../character/CharacterBrain';

/** 社交网络节点（一个角色在社交网络中的表示） */
export interface SocialNode {
  /** 节点 ID（= characterId） */
  id: string;
  /** 角色大脑引用 */
  brain: CharacterBrain;
  /** 节点标签 */
  label?: string;
  /** 加入网络的时间（ISO 8601） */
  joinedAt: string;
}

/** 关系边 */
export interface SocialEdge {
  /** 边 ID */
  id: string;
  /** 源节点 */
  from: string;
  /** 目标节点 */
  to: string;
  /** 信任度 (0~100) */
  trust: number;
  /** 亲和度 (0~100) */
  affinity: number;
  /** 紧张度 (0~100) */
  tension: number;
  /** 最后交互时间戳（毫秒） */
  lastInteractionAt?: number;
  /** 交互计数 */
  interactionCount: number;
}

/** 社交网络 */
export interface SocialGraph {
  /** 所有节点 */
  nodes: Record<string, SocialNode>;
  /** 所有边（key = "fromId->toId"） */
  edges: Record<string, SocialEdge>;
}

/** Clamp 值到 0~100 */
function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

/** 创建空社交网络 */
export function createSocialGraph(): SocialGraph {
  return { nodes: {}, edges: {} };
}

/** 添加节点 */
export function addSocialNode(
  graph: SocialGraph,
  brain: CharacterBrain,
  label?: string,
): SocialGraph {
  return {
    ...graph,
    nodes: {
      ...graph.nodes,
      [brain.characterId]: {
        id: brain.characterId,
        brain,
        label,
        joinedAt: new Date().toISOString(),
      },
    },
  };
}

/** 移除节点（及其所有关联的边） */
export function removeSocialNode(
  graph: SocialGraph,
  characterId: string,
): SocialGraph {
  const newNodes = { ...graph.nodes };
  delete newNodes[characterId];

  const newEdges: Record<string, SocialEdge> = {};
  for (const [key, edge] of Object.entries(graph.edges)) {
    if (edge.from !== characterId && edge.to !== characterId) {
      newEdges[key] = edge;
    }
  }

  return { nodes: newNodes, edges: newEdges };
}

/** 添加/获取边 */
export function getOrCreateEdge(
  graph: SocialGraph,
  fromId: string,
  toId: string,
): { graph: SocialGraph; edge: SocialEdge } {
  const key = `${fromId}->${toId}`;

  if (graph.edges[key]) {
    return { graph, edge: graph.edges[key] };
  }

  const edge: SocialEdge = {
    id: uuidv4(),
    from: fromId,
    to: toId,
    trust: 50,
    affinity: 50,
    tension: 50,
    interactionCount: 0,
  };

  return {
    graph: {
      ...graph,
      edges: { ...graph.edges, [key]: edge },
    },
    edge,
  };
}

/** 更新边 */
export function updateEdge(
  graph: SocialGraph,
  edge: SocialEdge,
): SocialGraph {
  const key = `${edge.from}->${edge.to}`;
  return {
    ...graph,
    edges: {
      ...graph.edges,
      [key]: {
        ...edge,
        trust: clamp(edge.trust),
        affinity: clamp(edge.affinity),
        tension: clamp(edge.tension),
      },
    },
  };
}

/** 获取某角色所有出边 */
export function getOutgoingEdges(
  graph: SocialGraph,
  fromId: string,
): SocialEdge[] {
  return Object.values(graph.edges).filter((e) => e.from === fromId);
}

/** 获取某角色所有入边 */
export function getIncomingEdges(
  graph: SocialGraph,
  fromId: string,
): SocialEdge[] {
  return Object.values(graph.edges).filter((e) => e.to === fromId);
}

/** 获取两角色之间的双向关系摘要 */
export function getRelationshipSummary(
  graph: SocialGraph,
  aId: string,
  bId: string,
): string {
  const ab = graph.edges[`${aId}->${bId}`];
  const ba = graph.edges[`${bId}->${aId}`];

  const lines: string[] = [];
  if (ab) {
    lines.push(
      `${aId} → ${bId}: trust=${ab.trust} affinity=${ab.affinity} tension=${ab.tension} (${ab.interactionCount} interactions)`,
    );
  }
  if (ba) {
    lines.push(
      `${bId} → ${aId}: trust=${ba.trust} affinity=${ba.affinity} tension=${ba.tension} (${ba.interactionCount} interactions)`,
    );
  }
  if (!ab && !ba) {
    lines.push(`${aId} ↔ ${bId}: no relationship`);
  }

  return lines.join('\n');
}

/** 网络统计 */
export function getGraphStats(graph: SocialGraph): {
  nodeCount: number;
  edgeCount: number;
  avgTrust: number;
  avgTension: number;
} {
  const edges = Object.values(graph.edges);
  const nodeCount = Object.keys(graph.nodes).length;
  const edgeCount = edges.length;

  let totalTrust = 0;
  let totalTension = 0;

  for (const e of edges) {
    totalTrust += e.trust;
    totalTension += e.tension;
  }

  return {
    nodeCount,
    edgeCount,
    avgTrust: edgeCount > 0 ? Math.round(totalTrust / edgeCount) : 0,
    avgTension: edgeCount > 0 ? Math.round(totalTension / edgeCount) : 0,
  };
}
