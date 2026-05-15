// ============================================================
// AgentNode — ReAct 风格 Agent 循环节点
//
// 实现 Think → Act → Observe 循环。
//
// Config:
//   maxIterations: number (default 5)
//   systemPrompt: string
//   allowedTools: string[]
//   planSteps: PlanStep[]  (optional, from PlannerNode)
//
// Execution:
//   1. 从 config.planSteps 或 agentState.currentPlan 获取计划
//   2. 循环执行每个 step:
//      Think  → 记录到 scratchpad
//      Act    → 调用 tool
//      Observe → 记录结果
//   3. 产生 final answer
// ============================================================

import type { NodeSchema } from '../../NodeSchema';
import type {
  ExecutionNode,
  ExecutionContext,
  NodeExecutionResult,
} from '../../GraphTypes';

// ---- Types ----

export interface PlanStep {
  id: string;
  action: string; // tool name | 'think' | 'answer'
  input?: string;
  description: string;
  expectedOutput?: string;
}

// ---- Schema ----

export const AGENT_NODE_SCHEMA: NodeSchema = {
  type: 'agent_node',
  category: 'capability',
  label: 'Agent',
  description: 'ReAct-style agent loop: Think → Act → Observe → Answer.',
  categoryColor: '#9B59B6',
  defaultSize: { width: 240, height: 160 },
  icon: '🤖',
  ports: [
    { id: 'input', label: 'Input', direction: 'input' },
    { id: 'output', label: 'Answer', direction: 'output' },
    { id: 'error', label: 'Error', direction: 'output' },
  ],
  configFields: [
    {
      key: 'maxIterations',
      label: 'Max Iterations',
      type: 'number',
      defaultValue: 5,
      min: 1,
      max: 50,
      description: 'Maximum number of Think-Act-Observe cycles.',
    },
    {
      key: 'systemPrompt',
      label: 'System Prompt',
      type: 'textarea',
      defaultValue: 'You are a helpful agent. Analyze the input, use tools if needed, and produce a final answer.',
    },
    {
      key: 'allowedTools',
      label: 'Allowed Tools',
      type: 'string',
      defaultValue: '',
      description: 'Comma-separated tool names (empty = all tools available).',
    },
    {
      key: 'planSteps',
      label: 'Plan Steps (JSON)',
      type: 'code',
      defaultValue: '[]',
      description:
        'JSON array of { id, action, input?, description }. Overrides PlannerNode output.',
    },
  ],
};

// ---- Executor ----

export function agentNodeExecutor(
  node: ExecutionNode,
  context: ExecutionContext,
): NodeExecutionResult {
  const maxIterations = (node.config.maxIterations as number) || 5;
  const allowedToolsStr = (node.config.allowedTools as string) || '';
  const planStepsJson = (node.config.planSteps as string) || '[]';

  // 初始化 agentState
  if (!context.agentState) {
    context.agentState = {
      scratchpad: [],
      iteration: 0,
    };
  }

  const scratchpad = context.agentState.scratchpad;
  const tools = context.tools ?? [];

  // 解析允许的工具列表
  const allowedTools = allowedToolsStr
    ? allowedToolsStr.split(',').map((t) => t.trim()).filter(Boolean)
    : tools.map((t) => t.name);

  // 获取计划步骤
  let planSteps: PlanStep[] = [];
  try {
    const parsed = typeof planStepsJson === 'string'
      ? JSON.parse(planStepsJson)
      : planStepsJson;
    planSteps = Array.isArray(parsed) ? parsed : [];
  } catch {
    // 使用 agentState.currentPlan
    if (context.agentState.currentPlan && Array.isArray(context.agentState.currentPlan)) {
      planSteps = context.agentState.currentPlan as PlanStep[];
    }
  }

  if (planSteps.length === 0) {
    scratchpad.push(`[Think] No plan steps defined. Processing input directly.`);
    scratchpad.push(`[Answer] Received: ${context.input.slice(0, 200)}`);

    context.logs.push('  → Agent: no plan, direct answer');
    return {
      output: formatAgentOutput(scratchpad),
    };
  }

  // ---- ReAct Loop ----
  const toolMap = new Map(tools.map((t) => [t.name, t]));
  let finalAnswer = '';

  for (
    let iter = 0;
    iter < Math.min(planSteps.length, maxIterations);
    iter++
  ) {
    const step = planSteps[iter];
    context.agentState.iteration = iter + 1;

    context.logs.push(`  → Agent: step ${iter + 1}/${planSteps.length} — ${step.action}`);

    // ---- Think ----
    scratchpad.push(
      `[Think] Step ${iter + 1}: ${step.description}${
        step.input ? ` (input: ${step.input})` : ''
      }`,
    );

    // ---- Act ----
    if (step.action === 'think') {
      scratchpad.push(`[Think] ${step.description}`);
      continue;
    }

    if (step.action === 'answer') {
      finalAnswer = step.description;
      scratchpad.push(`[Answer] ${finalAnswer}`);
      break;
    }

    // Tool action
    if (!allowedTools.includes(step.action)) {
      scratchpad.push(`[Observe] ERROR: tool "${step.action}" not allowed`);
      continue;
    }

    const tool = toolMap.get(step.action);
    if (!tool) {
      scratchpad.push(`[Observe] ERROR: tool "${step.action}" not registered`);
      continue;
    }

    try {
      const toolInput = step.input ?? context.input;
      const result = tool.execute(toolInput, context);
      const resultStr =
        result instanceof Promise
          ? '[async tool - result pending]'
          : typeof result === 'string'
            ? result
            : JSON.stringify(result);

      // ---- Observe ----
      scratchpad.push(`[Observe] ${step.action}: ${resultStr.slice(0, 120)}`);
      context.results.set(`agent:${step.action}:result`, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      scratchpad.push(`[Observe] ERROR in ${step.action}: ${msg}`);
    }
  }

  // 如果没有从 plan 中获得 final answer，自动生成
  if (!finalAnswer) {
    finalAnswer = `Executed ${Math.min(planSteps.length, maxIterations)} step(s).`;
    scratchpad.push(`[Answer] ${finalAnswer}`);
  }

  context.logs.push(
    `  → Agent: completed ${scratchpad.length} scratchpad entries`,
  );

  return { output: formatAgentOutput(scratchpad) };
}

// ---- Helpers ----

function formatAgentOutput(scratchpad: string[]): string {
  return [
    '======== AGENT EXECUTION ========',
    ...scratchpad,
    '==================================',
  ].join('\n');
}
