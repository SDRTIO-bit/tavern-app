// ============================================================
// RuntimeProfile — 运行时能力配置
//
// Profile = 能力组合 + 预算控制
// ============================================================

/** 运行时能力配置 */
export interface RuntimeProfile {
  id: string;
  name: string;
  description: string;
  icon: string;

  /** 基础工作流 */
  baseWorkflow: "lightweight-rp";

  /** 启用的能力 */
  capabilities: string[];

  /** 功能开关 */
  features: {
    emotion: boolean;
    memory: boolean;
    narrative: boolean;
    goal: boolean;
    world: boolean;
  };

  /** 预算 */
  budget: RuntimeBudget;
}

/** 运行时预算 */
export interface RuntimeBudget {
  /** 最大执行时间 (ms) */
  maxExecutionTime: number;
  /** 最大节点执行数 */
  maxNodeExecutions: number;
  /** 最大记忆检索数 */
  maxMemoryRetrieval: number;
  /** 最大 Prompt Token */
  maxPromptTokens: number;
  /** 最大推理深度 */
  maxReasoningDepth: number;
}

/** 预算使用情况 */
export interface BudgetUsage {
  executionTime: number;
  nodeExecutions: number;
  memoryRetrieval: number;
  promptTokens: number;
  reasoningDepth: number;
}

/** 检查是否超出预算 */
export function isOverBudget(usage: BudgetUsage, budget: RuntimeBudget): {
  over: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  if (usage.executionTime > budget.maxExecutionTime) reasons.push("执行超时");
  if (usage.nodeExecutions > budget.maxNodeExecutions) reasons.push("节点过多");
  if (usage.memoryRetrieval > budget.maxMemoryRetrieval) reasons.push("记忆超量");
  if (usage.promptTokens > budget.maxPromptTokens) reasons.push("Token超标");
  if (usage.reasoningDepth > budget.maxReasoningDepth) reasons.push("推理过深");
  return { over: reasons.length > 0, reasons };
}

/** 格式化预算（Console 显示） */
export function formatBudget(usage: BudgetUsage, budget: RuntimeBudget): string[] {
  const pct = (used: number, max: number) =>
    Math.min(Math.round((used / max) * 100), 100);

  return [
    `节点: ${usage.nodeExecutions}/${budget.maxNodeExecutions} (${pct(usage.nodeExecutions, budget.maxNodeExecutions)}%)`,
    `记忆: ${usage.memoryRetrieval}/${budget.maxMemoryRetrieval} (${pct(usage.memoryRetrieval, budget.maxMemoryRetrieval)}%)`,
    `Token: ${usage.promptTokens}/${budget.maxPromptTokens} (${pct(usage.promptTokens, budget.maxPromptTokens)}%)`,
    `推理: ${usage.reasoningDepth}/${budget.maxReasoningDepth} (${pct(usage.reasoningDepth, budget.maxReasoningDepth)}%)`,
  ];
}
