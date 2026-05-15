// ============================================================
// ExecutionSnapshot — 执行快照 & 恢复
//
// 用于：
//   - 崩溃恢复（crash recovery）
//   - 长时间运行工作流持久化
//   - 跨进程 / 跨重启执行
// ============================================================

import type { RuntimeExecution, ExecutionStatus } from './RuntimeExecution';

/** 可序列化的执行快照 */
export interface ExecutionSnapshot {
  /** 快照协议版本 */
  version: string;
  /** 快照时间戳 */
  timestamp: string;
  /** 执行的完整状态 */
  execution: {
    id: string;
    graphId: string;
    status: ExecutionStatus;
    currentNodeId?: string;
    visitedNodes: string[];
    skippedNodes: Array<{ nodeId: string; reason: string }>;
    waitingFor?: string;
    waitingMessage?: string;
    startedAt: string;
    updatedAt: string;
    state: Record<string, unknown>;
  };
  /** 执行上下文数据 */
  context: {
    input: string;
    results: Array<[string, unknown]>;
    logs: string[];
    executionState: {
      path: string[];
      skipped: Array<{ nodeId: string; reason: string }>;
      activeBranches: string[];
      routeResult?: string;
      visited: string[];
    };
  };
  /** 保留的图数据（用于恢复时重建 graph） */
  graph: {
    nodes: Array<{ id: string; type: string; config: Record<string, unknown> }>;
    edges: Array<{
      id: string;
      sourceNodeId: string;
      targetNodeId: string;
      sourcePortId?: string;
      targetPortId?: string;
      condition?: string;
      retry?: { maxAttempts: number; delayMs: number };
    }>;
  };
}

export const SNAPSHOT_VERSION = '1.0.0';

/**
 * 从 RuntimeExecution 和 ExecutionContext 创建快照。
 */
export function createSnapshot(params: {
  execution: RuntimeExecution;
  contextInput: string;
  contextResults: Map<string, unknown>;
  contextLogs: string[];
  executionStatePath: string[];
  executionStateSkipped: Array<{ nodeId: string; reason: string }>;
  executionStateActiveBranches: string[];
  executionStateRouteResult?: string;
  executionStateVisited: Set<string>;
  graphNodes: Array<{ id: string; type: string; config: Record<string, unknown> }>;
  graphEdges: Array<{
    id: string;
    sourceNodeId: string;
    targetNodeId: string;
    sourcePortId?: string;
    targetPortId?: string;
    condition?: string;
    retry?: { maxAttempts: number; delayMs: number };
  }>;
}): ExecutionSnapshot {
  return {
    version: SNAPSHOT_VERSION,
    timestamp: new Date().toISOString(),
    execution: {
      id: params.execution.id,
      graphId: params.execution.graphId,
      status: params.execution.status,
      currentNodeId: params.execution.currentNodeId,
      visitedNodes: [...params.execution.visitedNodes],
      skippedNodes: [...params.execution.skippedNodes],
      waitingFor: params.execution.waitingFor,
      waitingMessage: params.execution.waitingMessage,
      startedAt: params.execution.startedAt,
      updatedAt: params.execution.updatedAt,
      state: { ...params.execution.state },
    },
    context: {
      input: params.contextInput,
      results: Array.from(params.contextResults.entries()),
      logs: [...params.contextLogs],
      executionState: {
        path: [...params.executionStatePath],
        skipped: params.executionStateSkipped.map((s) => ({ ...s })),
        activeBranches: [...params.executionStateActiveBranches],
        routeResult: params.executionStateRouteResult,
        visited: Array.from(params.executionStateVisited),
      },
    },
    graph: {
      nodes: params.graphNodes.map((n) => ({ ...n, config: { ...n.config } })),
      edges: params.graphEdges.map((e) => ({ ...e })),
    },
  };
}

/**
 * 从快照还原 RuntimeExecution。
 */
export function restoreExecution(snapshot: ExecutionSnapshot): RuntimeExecution {
  return {
    id: snapshot.execution.id,
    graphId: snapshot.execution.graphId,
    status: snapshot.execution.status,
    currentNodeId: snapshot.execution.currentNodeId,
    visitedNodes: [...snapshot.execution.visitedNodes],
    skippedNodes: snapshot.execution.skippedNodes.map((s) => ({ ...s })),
    waitingFor: snapshot.execution.waitingFor,
    waitingMessage: snapshot.execution.waitingMessage,
    startedAt: snapshot.execution.startedAt,
    updatedAt: snapshot.execution.updatedAt,
    state: { ...snapshot.execution.state },
  };
}
