// ============================================================
// NodeMetadata — 节点视觉元数据
//
// 为 Visual Workflow Editor 提供统一的外观定义。
// ============================================================

import type { NodeCategory } from "./NodeSpec";

export interface NodeMetadata {
  type: string;
  name: string;
  category: NodeCategory;
  icon: string;
  color: string;
  description: string;
  /** 节点尺寸（px） */
  size?: { width: number; height: number };
  /** 输入端口标签 */
  inputLabel?: string;
  /** 输出端口标签 */
  outputLabel?: string;
}

/** 内置节点元数据 */
export const BUILTIN_NODE_METADATA: Record<string, NodeMetadata> = {
  emotion: {
    type: "emotion",
    name: "情绪分析",
    category: "emotion",
    icon: "💭",
    color: "#E91E63",
    description: "分析用户消息对角色情绪的影响",
    size: { width: 200, height: 100 },
    inputLabel: "消息",
    outputLabel: "情绪 Δ",
  },
  memory: {
    type: "memory",
    name: "记忆检索",
    category: "memory",
    icon: "🧠",
    color: "#9C27B0",
    description: "检索角色相关的长期记忆",
    size: { width: 200, height: 100 },
    inputLabel: "查询",
    outputLabel: "记忆",
  },
  goal: {
    type: "goal",
    name: "目标管理",
    category: "memory",
    icon: "🎯",
    color: "#FF9800",
    description: "获取角色当前活跃目标",
    size: { width: 180, height: 90 },
    inputLabel: "—",
    outputLabel: "目标",
  },
  narrative: {
    type: "narrative",
    name: "剧情推进",
    category: "narrative",
    icon: "📖",
    color: "#4CAF50",
    description: "推进当前活跃的剧情线",
    size: { width: 200, height: 100 },
    inputLabel: "会话",
    outputLabel: "剧情状态",
  },
  worldbook: {
    type: "worldbook",
    name: "世界书",
    category: "world",
    icon: "📚",
    color: "#009688",
    description: "根据关键词匹配世界书条目",
    size: { width: 200, height: 100 },
    inputLabel: "关键词",
    outputLabel: "条目",
  },
  prompt: {
    type: "prompt",
    name: "Prompt 构建",
    category: "core",
    icon: "📝",
    color: "#2196F3",
    description: "组装并注入上下文到系统提示词",
    size: { width: 220, height: 100 },
    inputLabel: "上下文",
    outputLabel: "Prompt",
  },
  model: {
    type: "model",
    name: "模型调用",
    category: "generation",
    icon: "🤖",
    color: "#FFC107",
    description: "调用 DeepSeek 生成回复",
    size: { width: 200, height: 100 },
    inputLabel: "Prompt",
    outputLabel: "回复",
  },
};

/** 按节点类型获取元数据 */
export function getNodeMetadata(type: string): NodeMetadata | undefined {
  return BUILTIN_NODE_METADATA[type];
}

/** 获取所有节点元数据 */
export function getAllNodeMetadata(): NodeMetadata[] {
  return Object.values(BUILTIN_NODE_METADATA);
}

/** 按分类分组 */
export function getNodesByCategory(): Record<string, NodeMetadata[]> {
  const groups: Record<string, NodeMetadata[]> = {};
  for (const meta of Object.values(BUILTIN_NODE_METADATA)) {
    if (!groups[meta.category]) groups[meta.category] = [];
    groups[meta.category].push(meta);
  }
  return groups;
}

/** 颜色分类映射 */
export const CATEGORY_COLORS: Record<string, string> = {
  core: "#2196F3",
  emotion: "#E91E63",
  memory: "#9C27B0",
  narrative: "#4CAF50",
  world: "#009688",
  social: "#FF5722",
  generation: "#FFC107",
  plugin: "#607D8B",
};
