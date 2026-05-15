// ============================================================
// GraphTypes — 执行图核心类型
//
// 定义 ExecutionGraph 内部使用的节点和连线类型。
// 与 WorkflowDefinition 解耦：execution 不包含 UI 元数据。
// ============================================================

import type { NodeSchema } from './NodeSchema';

/** 执行图中的节点（运行时实例） */
export interface ExecutionNode {
  /** 节点 ID */
  id: string;

  /** 节点类型（对应 NodeSchema.type） */
  type: string;

  /** 节点配置（实际值） */
  config: Record<string, unknown>;

  /** 关联的 schema 引用 */
  schema?: NodeSchema;
}

/** 执行图中的连线（数据流向） */
export interface ExecutionEdge {
  /** 连线 ID */
  id: string;

  /** 源节点 ID */
  sourceNodeId: string;
  /** 源端口 ID */
  sourcePortId?: string;

  /** 目标节点 ID */
  targetNodeId: string;
  /** 目标端口 ID */
  targetPortId?: string;

  /**
   * 条件表达式（可选）。
   * 仅当表达式求值为 truthy 时，此连线才被激活。
   * 支持简单表达式：
   *   - 字面量: "true" / "false"
   *   - 上下文引用: "$source === 'success'"
   *   - 比较: "$context.charCount > 100"
   */
  condition?: string;

  /** 重试策略（目标节点执行失败时） */
  retry?: RetryPolicy;
}

/** 执行状态（控制流追踪） */
export interface ExecutionState {
  /** 按执行顺序排列的节点 ID 列表（执行路径） */
  path: string[];
  /** 被跳过的节点及原因 */
  skipped: Array<{ nodeId: string; reason: string }>;
  /** 当前活跃的分支标识 */
  activeBranches: string[];
  /** 最近一次路由决策的结果 */
  routeResult?: string;
  /** 已访问节点集合 */
  visited: Set<string>;
}

/** 创建默认执行状态 */
export function createExecutionState(): ExecutionState {
  return {
    path: [],
    skipped: [],
    activeBranches: [],
    visited: new Set(),
  };
}

/** 运行时工具接口 */
export interface RuntimeTool {
  /** 工具名称 */
  name: string;
  /** 工具描述 */
  description?: string;
  /** 输入 schema（JSON Schema 格式） */
  schema?: Record<string, unknown>;
  /** 执行工具 */
  execute(input: unknown, context: ExecutionContext): Promise<unknown>;
}

/** Agent 状态 */
export interface AgentState {
  /** 草稿本（思考 + 观察记录） */
  scratchpad: string[];
  /** 当前计划（来自 PlannerNode） */
  currentPlan?: unknown;
  /** 已迭代次数 */
  iteration: number;
}

/** 执行上下文（在 graph 执行期间传递） */
export interface ExecutionContext {
  /** 输入数据 */
  input: string;
  /** 中间结果缓存（key = nodeId.portId） */
  results: Map<string, unknown>;
  /** 执行日志 */
  logs: string[];
  /** 控制流执行状态 */
  executionState: ExecutionState;
  /** 工具注册表（Agent/Tool 节点使用）*/
  tools?: RuntimeTool[];
  /** Agent 运行时状态 */
  agentState?: AgentState;
}

/** 重试策略 */
export interface RetryPolicy {
  /** 最大重试次数 */
  maxAttempts: number;
  /** 重试间隔（毫秒） */
  delayMs: number;
}

/** 节点执行结果 */
export interface NodeExecutionResult {
  /** 输出内容 */
  output: string;
  /** 分支决策（如 if_node 返回 'true' | 'false'） */
  branch?: string;
  /** 路由键（如 switch_node 返回匹配的 case key） */
  route?: string;
  /** 等待指令（如 WaitNode 产生的暂停请求） */
  wait?: {
    type: 'duration' | 'event' | 'user_input';
    durationMs?: number;
    eventType?: string;
    message?: string;
  };
}

/** 节点执行函数 */
export type NodeExecutor = (
  node: ExecutionNode,
  context: ExecutionContext,
) => Promise<NodeExecutionResult> | NodeExecutionResult;
