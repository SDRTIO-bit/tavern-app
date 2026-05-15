// ============================================================
// graph — 图执行引擎
//
// 模块结构：
//   NodeSchema.ts    — 节点类型 schema 定义
//   GraphTypes.ts    — 执行图核心类型
//   ExecutionGraph.ts — 执行图引擎
//   workflow/        — 可视化工作流数据协议
// ============================================================

export type { NodeSchema, NodePortSchema, ConfigField, PortDirection, PortDataType } from './NodeSchema';
export type {
  ExecutionNode,
  ExecutionEdge,
  ExecutionContext,
  ExecutionState,
  NodeExecutor,
  NodeExecutionResult,
  RetryPolicy,
  RuntimeTool,
  AgentState,
} from './GraphTypes';
export { createExecutionState } from './GraphTypes';
export { ExecutionGraph } from './ExecutionGraph';

// Workflow 协议
export type {
  WorkflowDefinition,
  WorkflowMetadata,
  WorkflowNode,
  WorkflowNodeUI,
  WorkflowPort,
  WorkflowEdge,
  WorkflowEdgeStyle,
  WorkflowViewport,
} from './workflow';
export {
  DEFAULT_VIEWPORT,
  WORKFLOW_PROTOCOL_VERSION,
} from './workflow';
