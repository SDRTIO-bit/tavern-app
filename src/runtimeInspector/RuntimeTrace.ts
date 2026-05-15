// ============================================================
// RuntimeTrace — 完整运行时执行追踪
//
// 每个节点执行后保存输入/输出/决策/Token/耗时快照。
// ============================================================

import type { GraphExecutionTrace } from "@/spec/WorkflowSpec";

/** 单节点执行快照 */
export interface RuntimeSnapshot {
  /** 节点 ID */
  nodeId: string;
  /** 节点类型 */
  nodeType: string;
  /** 节点名称 */
  nodeName: string;
  /** 时间戳 */
  timestamp: number;
  /** 执行状态 */
  status: "running" | "done" | "error" | "skipped";

  /** 输入摘要 */
  inputs: {
    messageCount: number;
    inputLength: number;
    hasMemory: boolean;
    memoryCount: number;
  };

  /** 输出摘要 */
  outputs: {
    outputLength: number;
    hasOutput: boolean;
    summary: string;
  };

  /** 情绪快照 */
  emotions?: {
    happiness?: number;
    stress?: number;
    affection?: number;
    anger?: number;
    dominant?: string;
    score?: number;
  };

  /** 记忆快照 */
  memories?: {
    total: number;
    retrieved: number;
    topMatches: string[];
  };

  /** 目标快照 */
  goals?: {
    active: number;
    summaries: string[];
  };

  /** 决策快照 */
  decision?: {
    edges: Array<{ target: string; score: number; reasoning: string }>;
    selected: string;
    confidence: number;
  };

  /** Token */
  tokens?: {
    prompt: number;
    output: number;
    total: number;
  };

  /** 耗时 */
  durationMs: number;
  /** 错误 */
  error?: string;
}

/** 完整运行时追踪 */
export interface RuntimeTrace {
  /** 追踪 ID */
  id: string;
  /** 工作流名称 */
  workflowName: string;
  /** 开始时间 */
  startedAt: number;
  /** 结束时间 */
  endedAt?: number;
  /** 总耗时 */
  totalDurationMs: number;
  /** 节点快照列表（按执行顺序） */
  snapshots: RuntimeSnapshot[];
  /** 图执行追踪 */
  graphTraces?: GraphExecutionTrace[];
  /** 执行路径（访问过的节点 ID 列表） */
  executionPath: string[];
}

/**
 * 从 GraphExecutor 的输出创建 RuntimeTrace。
 */
export function createRuntimeTrace(params: {
  workflowName: string;
  startedAt: number;
  snapshots: RuntimeSnapshot[];
  graphTraces?: GraphExecutionTrace[];
  totalDurationMs: number;
}): RuntimeTrace {
  return {
    id: `trace_${Date.now()}`,
    workflowName: params.workflowName,
    startedAt: params.startedAt,
    totalDurationMs: params.totalDurationMs,
    snapshots: params.snapshots,
    graphTraces: params.graphTraces,
    executionPath: params.snapshots
      .filter((s) => s.status === "done")
      .map((s) => s.nodeId),
  };
}

/**
 * 汇总 Token 消耗。
 */
export function summarizeTokens(snapshots: RuntimeSnapshot[]): {
  totalPrompt: number;
  totalOutput: number;
  total: number;
  breakdown: Array<{ nodeName: string; tokens: number }>;
} {
  let totalPrompt = 0;
  let totalOutput = 0;
  const breakdown: Array<{ nodeName: string; tokens: number }> = [];

  for (const snap of snapshots) {
    if (snap.tokens) {
      totalPrompt += snap.tokens.prompt;
      totalOutput += snap.tokens.output;
      breakdown.push({ nodeName: snap.nodeName, tokens: snap.tokens.total });
    }
  }

  return { totalPrompt, totalOutput, total: totalPrompt + totalOutput, breakdown };
}

/**
 * 汇总节点耗时。
 */
export function summarizeDurations(snapshots: RuntimeSnapshot[]): {
  total: number;
  slowest: { nodeName: string; durationMs: number } | null;
  breakdown: Array<{ nodeName: string; durationMs: number; pct: number }>;
} {
  if (snapshots.length === 0) return { total: 0, slowest: null, breakdown: [] };

  const total = snapshots.reduce((s, snap) => s + snap.durationMs, 0);
  let slowest: { nodeName: string; durationMs: number } | null = null;

  const breakdown = snapshots.map((snap) => {
    const pct = total > 0 ? Math.round((snap.durationMs / total) * 100) : 0;
    if (!slowest || snap.durationMs > slowest.durationMs) {
      slowest = { nodeName: snap.nodeName, durationMs: snap.durationMs };
    }
    return { nodeName: snap.nodeName, durationMs: snap.durationMs, pct };
  });

  return { total, slowest, breakdown };
}
