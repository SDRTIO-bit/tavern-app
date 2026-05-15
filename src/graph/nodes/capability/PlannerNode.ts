// ============================================================
// PlannerNode — 计划生成节点
//
// 根据用户输入生成执行计划（JSON task list）。
// 不做自动 graph 修改，仅输出结构化计划。
//
// Config:
//   planningStrategy: 'sequential' | 'tool_chain' | 'custom'
//   customPrompt?: string
//
// Output:
//   JSON array of PlanStep: [{ id, action, input?, description }]
//
// 计划结果存储在 context.agentState.currentPlan 中。
// ============================================================

import type { NodeSchema } from '../../NodeSchema';
import type {
  ExecutionNode,
  ExecutionContext,
  NodeExecutionResult,
} from '../../GraphTypes';
import type { PlanStep } from './AgentNode';

// ---- Schema ----

export const PLANNER_NODE_SCHEMA: NodeSchema = {
  type: 'planner_node',
  category: 'capability',
  label: 'Planner',
  description: 'Generate a task plan from user input (JSON output).',
  categoryColor: '#1ABC9C',
  defaultSize: { width: 220, height: 130 },
  icon: '📋',
  ports: [
    { id: 'input', label: 'Input', direction: 'input' },
    { id: 'output', label: 'Plan', direction: 'output' },
  ],
  configFields: [
    {
      key: 'planningStrategy',
      label: 'Strategy',
      type: 'select',
      defaultValue: 'sequential',
      options: [
        { label: 'Sequential (split by newline)', value: 'sequential' },
        { label: 'Tool Chain (chain tool calls)', value: 'tool_chain' },
        { label: 'Custom (use prompt)', value: 'custom' },
      ],
    },
    {
      key: 'customPrompt',
      label: 'Custom Prompt',
      type: 'textarea',
      defaultValue: '',
      description: 'Custom planning instructions (for "custom" strategy).',
    },
    {
      key: 'toolNames',
      label: 'Tool Names',
      type: 'string',
      defaultValue: '',
      description: 'Comma-separated tool names available for planning.',
    },
  ],
};

// ---- Executor ----

export function plannerNodeExecutor(
  node: ExecutionNode,
  context: ExecutionContext,
): NodeExecutionResult {
  const strategy = (node.config.planningStrategy as string) || 'sequential';
  const toolNamesStr = (node.config.toolNames as string) || '';
  const customPrompt = (node.config.customPrompt as string) || '';

  const input = (context.results.get(`${node.id}.input`) as string) || context.input;
  const availableTools = toolNamesStr
    ? toolNamesStr.split(',').map((t) => t.trim()).filter(Boolean)
    : (context.tools ?? []).map((t) => t.name);

  let plan: PlanStep[];

  switch (strategy) {
    case 'tool_chain':
      plan = generateToolChainPlan(input, availableTools);
      break;
    case 'custom':
      plan = generateCustomPlan(input, customPrompt);
      break;
    case 'sequential':
    default:
      plan = generateSequentialPlan(input);
      break;
  }

  // 存储计划到 agentState
  if (!context.agentState) {
    context.agentState = { scratchpad: [], iteration: 0 };
  }
  context.agentState.currentPlan = plan;

  const planJson = JSON.stringify(plan, null, 2);
  context.logs.push(`  → Plan: ${plan.length} step(s) — ${strategy}`);

  return { output: planJson };
}

// ---- Plan Generators ----

function generateSequentialPlan(input: string): PlanStep[] {
  const lines = input
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length <= 1) {
    return [
      {
        id: 'step_1',
        action: 'think',
        description: `Analyze: ${input.slice(0, 80)}`,
      },
      {
        id: 'step_2',
        action: 'answer',
        description: `Process the input and respond.`,
      },
    ];
  }

  return lines.map((line, i) => ({
    id: `step_${i + 1}`,
    action: 'think',
    input: line,
    description: line.slice(0, 100),
  }));
}

function generateToolChainPlan(
  input: string,
  tools: string[],
): PlanStep[] {
  const steps: PlanStep[] = [
    {
      id: 'step_1',
      action: 'think',
      description: `Analyze input: ${input.slice(0, 60)}`,
    },
  ];

  for (let i = 0; i < tools.length; i++) {
    steps.push({
      id: `step_${i + 2}`,
      action: tools[i],
      input: i === 0 ? '$input' : `$step_${i + 1}_result`,
      description: `Execute tool: ${tools[i]}`,
    });
  }

  steps.push({
    id: `step_${tools.length + 2}`,
    action: 'answer',
    description: 'Synthesize results and produce final answer.',
  });

  return steps;
}

function generateCustomPlan(
  input: string,
  _prompt: string,
): PlanStep[] {
  // 自定义策略：尝试解析输入中的 JSON 计划
  try {
    const parsed = JSON.parse(input);
    if (Array.isArray(parsed)) {
      return parsed.map((item: Record<string, unknown>, i: number) => ({
        id: item.id as string || `step_${i + 1}`,
        action: item.action as string || 'think',
        input: item.input as string | undefined,
        description: item.description as string || '',
      }));
    }
  } catch {
    // fall through
  }

  // 回退到 sequential
  return generateSequentialPlan(input);
}
