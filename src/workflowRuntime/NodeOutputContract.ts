// ============================================================
// NodeOutputContract — 节点输出契约
//
// 每个节点声明其输出结构，供 Graph 表达式引用。
// 例如 edge.condition 中 "memory.count" 从这里读取。
// ============================================================

/** 节点输出字段定义 */
export interface OutputField {
  key: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  label: string;
  description?: string;
}

/** 节点输出契约 */
export interface NodeOutputContract {
  nodeType: string;
  /** 输出字段列表 */
  fields: OutputField[];
  /** 示例值 */
  example?: Record<string, unknown>;
}

/**
 * 内置节点输出契约。
 * 后续每个 rpNode 注册时自动带上。
 */
export const BUILTIN_OUTPUT_CONTRACTS: Record<string, NodeOutputContract> = {
  emotion: {
    nodeType: "emotion",
    fields: [
      { key: "happiness", type: "number", label: "幸福", description: "幸福感变化" },
      { key: "stress", type: "number", label: "压力" },
      { key: "affection", type: "number", label: "好感" },
      { key: "anger", type: "number", label: "愤怒" },
      { key: "curiosity", type: "number", label: "好奇" },
      { key: "dominant", type: "string", label: "优势情绪" },
      { key: "score", type: "number", label: "情绪强度" },
    ],
    example: { happiness: 5, stress: -3, affection: 8, score: 0.72, dominant: "affection" },
  },
  memory: {
    nodeType: "memory",
    fields: [
      { key: "count", type: "number", label: "检索数量" },
      { key: "total", type: "number", label: "记忆总数" },
      { key: "topMatch", type: "string", label: "最佳匹配" },
      { key: "results", type: "array", label: "记忆列表" },
    ],
    example: { count: 5, total: 47, topMatch: "用户喜欢雨天" },
  },
  narrative: {
    nodeType: "narrative",
    fields: [
      { key: "phase", type: "string", label: "剧情阶段" },
      { key: "arcCount", type: "number", label: "活跃弧数" },
      { key: "arcTitle", type: "string", label: "当前弧标题" },
    ],
    example: { phase: "rising", arcCount: 2, arcTitle: "渐生情愫" },
  },
  prompt: {
    nodeType: "prompt",
    fields: [
      { key: "tokens", type: "number", label: "Token 数" },
      { key: "systemLength", type: "number", label: "System 长度" },
      { key: "messageCount", type: "number", label: "消息数" },
    ],
    example: { tokens: 850, systemLength: 1200, messageCount: 5 },
  },
  model: {
    nodeType: "model",
    fields: [
      { key: "content", type: "string", label: "回复内容" },
      { key: "length", type: "number", label: "回复长度" },
      { key: "tokens", type: "number", label: "输出 Token" },
    ],
    example: { length: 240, tokens: 60 },
  },
};

/** 获取节点输出契约 */
export function getOutputContract(nodeType: string): NodeOutputContract | undefined {
  return BUILTIN_OUTPUT_CONTRACTS[nodeType];
}

/** 从节点执行结果提取输出数据 */
export function extractOutputData(
  nodeType: string,
  result: { output?: string; data?: Record<string, unknown>; emotionDeltas?: Record<string, number>; memories?: Array<{ content: string; importance: number }> },
): Record<string, unknown> {
  const data: Record<string, unknown> = { ...result.data };

  switch (nodeType) {
    case "emotion": {
      if (result.emotionDeltas) {
        Object.assign(data, result.emotionDeltas);
        const values = Object.values(result.emotionDeltas).filter((v) => v !== 0);
        data.score = values.length > 0
          ? Math.abs(values.reduce((s, v) => s + Math.abs(v), 0)) / values.length / 50
          : 0;
        const maxKey = Object.entries(result.emotionDeltas)
          .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))[0];
        data.dominant = maxKey?.[0] ?? "neutral";
      }
      break;
    }
    case "memory": {
      data.count = result.memories?.length ?? 0;
      data.results = result.memories;
      break;
    }
    case "model": {
      if (result.output) {
        data.content = result.output;
        data.length = result.output.length;
        data.tokens = Math.ceil(result.output.length / 4);
      }
      break;
    }
    case "prompt": {
      if (result.data?.totalTokens !== undefined) {
        data.tokens = result.data.totalTokens;
      }
      break;
    }
  }

  return data;
}
