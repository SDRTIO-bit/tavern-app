// ============================================================
// WorkflowSpec — 工作流定义标准
//
// 兼容：线性执行 / Graph Runtime / Subgraph / Loop / Branch / Parallel
// ============================================================

/** 工作流定义 */
export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  /** 节点类型列表（线性执行） */
  nodes: string[];
  tags?: string[];
  version?: string;

  /** 元数据 */
  metadata?: {
    author?: string;
    createdAt?: string;
    expectedLatency?: "fast" | "normal" | "slow";
    tokenBudget?: "low" | "medium" | "high";
  };
}

/** 工作流节点定义（未来的 Graph 节点） */
export interface WorkflowNodeDefinition {
  id: string;
  type: string;
  label?: string;
  config?: Record<string, unknown>;
  /** 输入端口 */
  inputs?: WorkflowPort[];
  /** 输出端口 */
  outputs?: WorkflowPort[];
}

/** 端口定义 */
export interface WorkflowPort {
  id: string;
  label: string;
  direction: "input" | "output";
  dataType?: "string" | "number" | "boolean" | "object" | "any";
}

/** 工作流连线定义（Graph 用） */
export interface WorkflowEdgeDefinition {
  id: string;
  source: string;
  sourcePort?: string;
  target: string;
  targetPort?: string;
  condition?: string;
  retry?: {
    maxAttempts: number;
    delayMs: number;
  };
}

/** 工作流执行结果 */
export interface WorkflowExecutionResult {
  output: string;
  nodeCount: number;
  durationMs: number;
  errors?: Array<{ nodeId: string; message: string }>;
}

// ============================================================
// Graph Workflow（A8 图执行）
// ============================================================

/** 图节点 */
export interface GraphNode {
  id: string;
  type: string;
  data?: Record<string, unknown>;
}

/** 图连线 */
export interface GraphEdge {
  id: string;
  source: string;          // 源节点 ID
  target: string;          // 目标节点 ID
  condition?: string;      // 分支条件表达式
  label?: string;
}

/** 图工作流定义 */
export interface GraphWorkflowDefinition {
  id: string;
  name: string;
  description: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  tags?: string[];
  metadata?: WorkflowDefinition['metadata'];
}

/** 节点执行状态 */
export type NodeExecutionStatus = 'pending' | 'running' | 'done' | 'error' | 'skipped';

/** 图执行追踪 */
export interface GraphExecutionTrace {
  nodeId: string;
  nodeType: string;
  status: NodeExecutionStatus;
  startedAt?: number;
  endedAt?: number;
  durationMs?: number;
  output?: string;
  error?: string;
}
