// ============================================================
// CapabilityPack — 能力包
//
// 每个系统（emotion/narrative/goal）封装为一个 pack。
// 注册节点 + scorer + hooks + prompt injector。
// ============================================================

import type { NodeRegistration } from "@/spec/NodeSpec";

/** 能力包 */
export interface CapabilityPack {
  id: string;
  name: string;
  description: string;
  icon: string;

  /** 注册的节点 */
  nodes: NodeRegistration[];

  /** 注入 Prompt 的文本片段 */
  promptInjection?: string;

  /** 对 Budget 的消耗 */
  budgetCost: Partial<{
    nodeExecutions: number;
    memoryRetrieval: number;
    promptTokens: number;
    reasoningDepth: number;
  }>;
}

/** 内置能力包 */
export const BUILTIN_CAPABILITY_PACKS: Record<string, CapabilityPack> = {
  "emotion-pack": {
    id: "emotion-pack",
    name: "情绪系统",
    description: "分析用户消息对角色情绪的影响",
    icon: "💭",
    nodes: [],
    promptInjection: "\n[情绪系统已激活]\n根据用户消息调整情绪反应。",
    budgetCost: { nodeExecutions: 1, promptTokens: 50 },
  },
  "memory-pack": {
    id: "memory-pack",
    name: "记忆系统",
    description: "检索角色长期记忆",
    icon: "🧠",
    nodes: [],
    budgetCost: { nodeExecutions: 1, memoryRetrieval: 5, promptTokens: 200 },
  },
  "narrative-pack": {
    id: "narrative-pack",
    name: "叙事引擎",
    description: "推进剧情线和叙事弧",
    icon: "📖",
    nodes: [],
    promptInjection: "\n[叙事引擎已激活]\n当前处于剧情模式，关注故事推进。",
    budgetCost: { nodeExecutions: 2, promptTokens: 300, reasoningDepth: 1 },
  },
  "goal-pack": {
    id: "goal-pack",
    name: "目标系统",
    description: "角色长期目标驱动行为",
    icon: "🎯",
    nodes: [],
    promptInjection: "\n[目标系统已激活]\n角色有内在目标，行为受长期意图驱动。",
    budgetCost: { nodeExecutions: 1, reasoningDepth: 1, promptTokens: 150 },
  },
  "world-pack": {
    id: "world-pack",
    name: "世界模拟",
    description: "世界状态和事件影响角色",
    icon: "🌍",
    nodes: [],
    promptInjection: "\n[世界模拟已激活]\n世界时间和事件会影响角色感知。",
    budgetCost: { nodeExecutions: 1, promptTokens: 200 },
  },
};

/** 获取能力包 */
export function getCapabilityPack(id: string): CapabilityPack | undefined {
  return BUILTIN_CAPABILITY_PACKS[id];
}

/** 获取所有能力包 */
export function getAllCapabilityPacks(): CapabilityPack[] {
  return Object.values(BUILTIN_CAPABILITY_PACKS);
}
