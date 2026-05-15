// ============================================================
// WorkflowRuntimeTypes v2 — A7 增强版
//
// 新增：
//   - WorkflowExecutionContext（完整运行时上下文）
//   - NodeIOSchema（节点输入输出约束）
//   - NodeTiming（节点耗时追踪）
//   - TimelineEvent（时间线事件）
//   - WorkflowProfile（预设模式）
// ============================================================

import type { EmotionState } from "@/character/EmotionState";

// ---- 消息 ----
export interface RuntimeMessage {
  role: "system" | "user" | "assistant";
  content: string;
  timestamp?: number;
  name?: string;
}

// ---- 节点 I/O Schema ----
export interface NodeIOSchema {
  /** 输入字段定义 */
  input?: Record<string, "string" | "number" | "boolean" | "object" | "string[]">;
  /** 输出字段定义 */
  output?: Record<string, "string" | "number" | "boolean" | "object" | "string[]">;
}

// ---- 节点耗时 ----
export interface NodeTiming {
  nodeType: string;
  nodeName: string;
  startedAt: number;
  endedAt?: number;
  durationMs?: number;
}

// ---- Timeline 事件 ----
export interface TimelineEvent {
  id: string;
  timestamp: number;
  type: "node_start" | "node_done" | "node_error" | "workflow_start" | "workflow_done" | "chunk_arrived" | "graph_start" | "node_enter" | "node_exit" | "edge_traverse" | "graph_complete";
  nodeType?: string;
  nodeName?: string;
  message: string;
  detail?: Record<string, unknown>;
  timing?: { durationMs: number };
}

// ---- 工作流运行时完整上下文 ----
export interface WorkflowExecutionContext {
  /** 会话 ID */
  sessionId: string;
  /** 工作流 ID */
  workflowId: string;
  /** 角色名称 */
  characterName: string;
  /** 角色系统提示词 */
  systemPrompt: string;

  /** 消息历史 */
  messages: RuntimeMessage[];
  /** 当前用户输入 */
  userInput: string;

  /** 角色情绪状态 */
  emotion?: EmotionState;
  /** 角色记忆 */
  memories?: Array<{ id: string; content: string; importance: number; tags?: string[] }>;
  /** 角色目标 */
  goals?: Array<{ id: string; content: string; priority: number; status: string }>;

  /** 叙事状态 */
  narrative?: {
    activeArcs?: Array<{ id: string; title: string; phase: string; intensity: number }>;
  };

  /** 世界状态 */
  world?: {
    time?: { day: number; hour: number; minute: number };
    activeEvents?: number;
  };

  /** 生成配置 */
  generation: {
    temperature: number;
    maxTokens?: number;
    stopSequences: string[];
  };

  /** 动态变量（节点间传递） */
  variables: Record<string, unknown>;
  /** 节点输出缓存（nodeType → StepResult） */
  stepResults: Map<string, WorkflowStepResult>;

  /** 运行时元数据 */
  runtime: {
    startedAt: number;
    workflowName?: string;
    nodeCount: number;
  };
}

// ---- 工作流步骤结果 ----
export interface WorkflowStepResult {
  nodeType: string;
  output?: string;
  emotionDeltas?: Record<string, number>;
  memories?: Array<{ content: string; importance: number }>;
  data?: Record<string, unknown>;
  timing?: NodeTiming;
}

// ---- 工作流节点注册 ----
export interface WorkflowNodeRegistration {
  type: string;
  name: string;
  description: string;
  icon: string;
  /** I/O 约束 */
  schema?: NodeIOSchema;
  /** 节点分类 */
  category?: "core" | "emotion" | "memory" | "narrative" | "world" | "generation";
  execute: WorkflowNodeExecutor;
}

export type WorkflowNodeExecutor = (
  ctx: WorkflowExecutionContext,
) => Promise<WorkflowStepResult> | WorkflowStepResult;

// ---- 工作流定义 ----
export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  nodes: string[];
  tags?: string[];
  /** 预期耗时等级 */
  expectedLatency?: "fast" | "normal" | "slow";
  /** 预期 Token 消耗等级 */
  tokenBudget?: "low" | "medium" | "high";
}

// ---- 工作流 Profile（预设模式） ----
export interface WorkflowProfile {
  id: string;
  name: string;
  description: string;
  icon: string;
  /** 适用的场景 */
  useCase: string;
  /** 包含的工作流 ID */
  workflowId: string;
  /** 推荐设置 */
  settings?: {
    temperature?: number;
    maxTokens?: number;
  };
}

// ---- 运行时事件 ----
export interface RuntimeEvent {
  type: "node_start" | "node_done" | "node_error" | "workflow_start" | "workflow_done" | "chunk";
  nodeType?: string;
  nodeName?: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

export type RuntimeEventListener = (event: RuntimeEvent) => void;

// ---- 向下兼容的旧类型别名 ----
/** @deprecated 使用 WorkflowExecutionContext */
export type WorkflowContext = WorkflowExecutionContext;
