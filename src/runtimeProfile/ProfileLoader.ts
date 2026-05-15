// ============================================================
// ProfileLoader — 预设 Profile 定义
// ============================================================

import type { RuntimeProfile } from "./RuntimeProfile";

export const BUILTIN_PROFILES: RuntimeProfile[] = [
  {
    id: "bare-minimum",
    name: "极简模式",
    description: "仅 Prompt+模型，零额外消耗",
    icon: "⚡",
    baseWorkflow: "lightweight-rp",
    capabilities: [],
    features: { emotion: false, memory: false, narrative: false, goal: false, world: false },
    budget: {
      maxExecutionTime: 3000,
      maxNodeExecutions: 3,
      maxMemoryRetrieval: 0,
      maxPromptTokens: 800,
      maxReasoningDepth: 0,
    },
  },
  {
    id: "emotional-rp",
    name: "情感对话",
    description: "情绪分析 + 记忆辅助",
    icon: "💕",
    baseWorkflow: "lightweight-rp",
    capabilities: ["emotion-pack", "memory-pack"],
    features: { emotion: true, memory: true, narrative: false, goal: false, world: false },
    budget: {
      maxExecutionTime: 5000,
      maxNodeExecutions: 5,
      maxMemoryRetrieval: 5,
      maxPromptTokens: 1200,
      maxReasoningDepth: 0,
    },
  },
  {
    id: "full-immersion",
    name: "完全沉浸",
    description: "全系统：情绪+记忆+叙事+目标+世界",
    icon: "🌌",
    baseWorkflow: "lightweight-rp",
    capabilities: ["emotion-pack", "memory-pack", "narrative-pack", "goal-pack", "world-pack"],
    features: { emotion: true, memory: true, narrative: true, goal: true, world: true },
    budget: {
      maxExecutionTime: 15000,
      maxNodeExecutions: 10,
      maxMemoryRetrieval: 10,
      maxPromptTokens: 3000,
      maxReasoningDepth: 3,
    },
  },
  {
    id: "story-focused",
    name: "故事专注",
    description: "叙事引擎 + 目标驱动",
    icon: "📖",
    baseWorkflow: "lightweight-rp",
    capabilities: ["emotion-pack", "memory-pack", "narrative-pack", "goal-pack"],
    features: { emotion: true, memory: true, narrative: true, goal: true, world: false },
    budget: {
      maxExecutionTime: 10000,
      maxNodeExecutions: 7,
      maxMemoryRetrieval: 8,
      maxPromptTokens: 2000,
      maxReasoningDepth: 2,
    },
  },
  {
    id: "custom",
    name: "自定义",
    description: "自由组合能力包",
    icon: "🔧",
    baseWorkflow: "lightweight-rp",
    capabilities: [],
    features: { emotion: false, memory: false, narrative: false, goal: false, world: false },
    budget: {
      maxExecutionTime: 20000,
      maxNodeExecutions: 15,
      maxMemoryRetrieval: 15,
      maxPromptTokens: 5000,
      maxReasoningDepth: 5,
    },
  },
];
