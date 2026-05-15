// ============================================================
// WorkflowContextSpec — 统一节点执行上下文
//
// 所有节点 execute(ctx) 使用此上下文。
// ============================================================

import type { RuntimeSession } from "./SessionSpec";
import type { WorkflowDefinition } from "./WorkflowSpec";
import type { EmotionState } from "@/character/EmotionState";

/** 生成配置 */
export interface WorkflowGenerationConfig {
  temperature: number;
  maxTokens?: number;
  stopSequences: string[];
}

/** 运行时状态 */
export interface RuntimeState {
  startedAt: number;
  workflowName?: string;
  nodeCount: number;
  currentNodeIndex?: number;
  lastError?: string;
}

/** 统一工作流执行上下文 */
export interface WorkflowExecutionContext {
  /** 持久化会话 */
  session: RuntimeSession;

  /** 当前工作流 */
  workflow: WorkflowDefinition;

  /** 用户输入 */
  userInput: string;

  /** 角色系统提示词 */
  systemPrompt: string;

  /** 角色名 */
  characterName: string;

  /** 情绪状态 */
  emotion: EmotionState;

  /** 生成配置 */
  generation: WorkflowGenerationConfig;

  /** 节点间动态变量 */
  variables: Record<string, unknown>;

  /** 运行时状态 */
  runtime: RuntimeState;

  /** 扩展元数据 */
  metadata?: Record<string, unknown>;
}
