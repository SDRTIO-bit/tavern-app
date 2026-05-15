// ============================================================
// NodeSpec — 统一工作流节点协议
//
// 所有节点：EmotionNode / MemoryNode / NarrativeNode / PromptNode / ModelNode
// 都实现 RuntimeNode<I, O>。
// ============================================================

import type { WorkflowExecutionContext } from "./WorkflowContextSpec";

/** 节点分类 */
export type NodeCategory =
  | "core"         // 核心：prompt, model
  | "emotion"      // 情绪
  | "memory"       // 记忆
  | "narrative"    // 叙事
  | "world"        // 世界
  | "social"       // 社交
  | "generation"   // 生成
  | "plugin";      // 插件

/** 节点 I/O Schema */
export interface NodeIOSchema {
  input?: Record<string, "string" | "number" | "boolean" | "object" | "string[]">;
  output?: Record<string, "string" | "number" | "boolean" | "object" | "string[]">;
}

/** 节点执行耗时 */
export interface NodeTiming {
  nodeType: string;
  nodeName: string;
  startedAt: number;
  endedAt?: number;
  durationMs?: number;
}

/** 统一运行时节点 */
export interface RuntimeNode<I = unknown, O = unknown> {
  /** 节点唯一标识 */
  id: string;

  /** 节点类型 */
  type: string;

  /** 节点名称 */
  name: string;

  /** 节点版本 */
  version?: string;

  /** 节点描述 */
  description?: string;

  /** 节点分类 */
  category?: NodeCategory;

  /** 图标 */
  icon?: string;

  /** 输入 Schema */
  inputSchema?: NodeIOSchema;

  /** 输出 Schema */
  outputSchema?: NodeIOSchema;

  /** 执行节点 */
  execute(ctx: WorkflowExecutionContext, input?: I): Promise<O>;
}

/** 节点注册信息 */
export interface NodeRegistration {
  type: string;
  name: string;
  description: string;
  icon: string;
  category?: NodeCategory;
  schema?: NodeIOSchema;
  execute: (ctx: WorkflowExecutionContext) => Promise<{ output?: string; data?: Record<string, unknown> }>;
}

/** 节点执行结果 */
export interface NodeExecutionResult {
  nodeType: string;
  output?: string;
  data?: Record<string, unknown>;
  timing?: NodeTiming;
}
