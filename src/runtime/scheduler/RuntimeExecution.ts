// ============================================================
// RuntimeExecution — 长时间运行执行的状态机
//
// 追踪单次 graph 执行的完整生命周期：
//   idle → running → paused / waiting → running → completed
//                   → failed
// ============================================================

/** 执行生命周期状态 */
export type ExecutionStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'waiting'
  | 'completed'
  | 'failed';

/** 单次运行时执行实例 */
export interface RuntimeExecution {
  /** 执行唯一标识 */
  id: string;

  /** 关联的 graph ID */
  graphId: string;

  /** 当前状态 */
  status: ExecutionStatus;

  /** 当前正在执行的节点 ID（暂停/恢复时使用） */
  currentNodeId?: string;

  /** 已访问（已执行）的节点 ID 列表 */
  visitedNodes: string[];

  /** 被跳过的节点及原因 */
  skippedNodes: Array<{ nodeId: string; reason: string }>;

  /** 正在等待的事件类型（status=waiting 时） */
  waitingFor?: string;

  /** 等待消息（用于 user_input） */
  waitingMessage?: string;

  /** 执行开始时间（ISO 8601） */
  startedAt: string;

  /** 最后更新时间（ISO 8601） */
  updatedAt: string;

  /** 用户自定义状态数据 */
  state: Record<string, unknown>;
}

/** 创建空的执行实例 */
export function createRuntimeExecution(
  id: string,
  graphId: string,
): RuntimeExecution {
  const now = new Date().toISOString();
  return {
    id,
    graphId,
    status: 'idle',
    visitedNodes: [],
    skippedNodes: [],
    startedAt: now,
    updatedAt: now,
    state: {},
  };
}
