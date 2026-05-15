// ============================================================
// ProfileMetadata — Profile 元数据 + 引导系统
// ============================================================

/** 难度等级 */
export type ProfileDifficulty = "beginner" | "advanced" | "experimental";

/** Profile 元数据 */
export interface ProfileMetadata {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  tags: string[];
  difficulty: ProfileDifficulty;
  /** 推荐场景 */
  recommendedFor: string[];
  /** 预估 Token 消耗等级 (1-5) */
  estimatedTokenCost: number;
  /** 推荐模型 */
  recommendedModel?: string;
  /** 推荐上下文长度 */
  recommendedContextLength?: number;
  /** 依赖的能力包 */
  capabilities: string[];
  /** 兼容的 Runtime 版本 */
  runtimeVersion?: string;
  createdAt: string;
}

/** 能力包说明 */
export interface CapabilityGuide {
  id: string;
  name: string;
  icon: string;
  /** 作用说明 */
  purpose: string;
  /** 带来的提升 */
  benefit: string;
  /** Token 消耗说明 */
  tokenCost: string;
  /** 推荐场景 */
  bestFor: string[];
  /** 注意事项 */
  caveats?: string[];
}

/** 内建 Profile 元数据 */
export const BUILTIN_PROFILE_META: Record<string, ProfileMetadata> = {
  "bare-minimum": {
    id: "bare-minimum",
    name: "极简模式",
    description: "仅 Prompt + 模型，零额外消耗。适合快速测试和低延迟场景。",
    author: "Tavern",
    version: "1.0",
    tags: ["快速", "低延迟", "入门"],
    difficulty: "beginner",
    recommendedFor: ["快速对话", "API 测试", "低 Token 预算"],
    estimatedTokenCost: 1,
    recommendedModel: "deepseek-chat",
    recommendedContextLength: 4096,
    capabilities: [],
    runtimeVersion: "a10",
    createdAt: "2025-01-01",
  },
  "emotional-rp": {
    id: "emotional-rp",
    name: "情感对话",
    description: "情绪分析 + 记忆辅助。角色会感知你的情绪并记住对话。",
    author: "Tavern",
    version: "1.0",
    tags: ["情感", "角色扮演", "推荐"],
    difficulty: "beginner",
    recommendedFor: ["日常角色扮演", "情感交流", "个性化对话"],
    estimatedTokenCost: 2,
    recommendedModel: "deepseek-chat",
    recommendedContextLength: 8192,
    capabilities: ["emotion-pack", "memory-pack"],
    runtimeVersion: "a10",
    createdAt: "2025-01-01",
  },
  "full-immersion": {
    id: "full-immersion",
    name: "完全沉浸",
    description: "全系统激活：情绪+记忆+叙事+目标+世界。最完整的角色扮演体验。",
    author: "Tavern",
    version: "1.0",
    tags: ["沉浸", "完整", "高级"],
    difficulty: "advanced",
    recommendedFor: ["深度角色扮演", "长篇故事", "世界探索"],
    estimatedTokenCost: 5,
    recommendedModel: "deepseek-reasoner",
    recommendedContextLength: 16384,
    capabilities: ["emotion-pack", "memory-pack", "narrative-pack", "goal-pack", "world-pack"],
    runtimeVersion: "a10",
    createdAt: "2025-01-01",
  },
  "story-focused": {
    id: "story-focused",
    name: "故事专注",
    description: "叙事引擎 + 目标驱动。角色会主动推进剧情。",
    author: "Tavern",
    version: "1.0",
    tags: ["叙事", "剧情", "目标驱动"],
    difficulty: "advanced",
    recommendedFor: ["剧情推进", "长篇叙事", "角色成长"],
    estimatedTokenCost: 4,
    recommendedModel: "deepseek-chat",
    recommendedContextLength: 12288,
    capabilities: ["emotion-pack", "memory-pack", "narrative-pack", "goal-pack"],
    runtimeVersion: "a10",
    createdAt: "2025-01-01",
  },
};

/** 能力包引导 */
export const CAPABILITY_GUIDES: Record<string, CapabilityGuide> = {
  "emotion-pack": {
    id: "emotion-pack",
    name: "情绪系统",
    icon: "💭",
    purpose: "分析每条用户消息对角色情绪的影响（幸福/压力/信任/好感/愤怒/孤独/好奇），角色回复的语气和内容会随情绪变化。",
    benefit: "角色情绪一致性——不会出现上一秒生气下一秒开心的断裂感。",
    tokenCost: "每轮约 +50~100 tokens（注入情绪状态到 Prompt）",
    bestFor: ["情感类角色扮演", "需要情绪连贯性的场景"],
    caveats: ["情绪强度受关键词规则影响，非 LLM 分析"],
  },
  "memory-pack": {
    id: "memory-pack",
    name: "记忆系统",
    icon: "🧠",
    purpose: "自动从对话中提取关键信息存入长期记忆，后续对话时检索相关记忆注入 Prompt。",
    benefit: "跨轮次记忆——角色能记住你喜欢雨天、上次吵架的地点等细节。",
    tokenCost: "每轮约 +200~400 tokens（检索记忆 + 注入上下文）",
    bestFor: ["长期角色扮演", "需要角色记住过去的场景"],
    caveats: ["基于关键词匹配，非语义搜索。记忆随时间衰减。"],
  },
  "narrative-pack": {
    id: "narrative-pack",
    name: "叙事引擎",
    icon: "📖",
    purpose: "从对话事件中自动检测叙事线（冲突/友谊/背叛/救赎等），推进剧情阶段（铺垫→上升→高潮→余波→结束）。",
    benefit: "角色主动推进故事——不只是被动回复，会引导剧情发展。",
    tokenCost: "每轮约 +300~500 tokens（叙事状态 + 剧情上下文）",
    bestFor: ["长篇故事", "剧情驱动角色扮演"],
    caveats: ["需要足够对话轮次才能激活叙事线"],
  },
  "goal-pack": {
    id: "goal-pack",
    name: "目标系统",
    icon: "🎯",
    purpose: "角色拥有长期目标（建立信任/推进剧情/保持冷静/守护秘密），行为受目标优先级和进度驱动。",
    benefit: "角色行为一致性——有几轮甚至几十轮对话的行为连贯性。",
    tokenCost: "每轮约 +150~250 tokens（目标状态 + 进度条）",
    bestFor: ["深度角色", "需要长期行为一致性的场景"],
    caveats: ["目标由模板自动生成，非 AI 动态创建"],
  },
  "world-pack": {
    id: "world-pack",
    name: "世界模拟",
    icon: "🌍",
    purpose: "管理世界时间、地点、势力状态和随机事件，世界状态影响角色感知。",
    benefit: "世界沉浸感——时间流逝、随机事件让世界感觉「活着」。",
    tokenCost: "每轮约 +200~300 tokens（世界状态 + 事件信息）",
    bestFor: ["开放世界探索", "沙盒模拟"],
    caveats: ["世界事件为随机生成，非 LLM 驱动"],
  },
};
