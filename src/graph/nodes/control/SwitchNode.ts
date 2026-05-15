// ============================================================
// SwitchNode — 多路路由节点
//
// 根据表达式求值结果，路由到匹配的 case 分支。
//
// Config:
//   expression: string — 路由表达式
//   cases: Record<string, string> — case 映射 { caseName: "label" }
//   defaultCase: string — 默认路由（可选）
//
// Ports:
//   input            (input)
//   case:<caseName>  (output, 每个 case 一个)
//   default          (output, 兜底)
//
// Execution:
//   求值 expression → 匹配 cases → 返回 { route: caseKey }
//   → ExecutionGraph 仅激活匹配 route 的出边。
// ============================================================

import type { NodeSchema, NodePortSchema } from '../../NodeSchema';
import type { ExecutionNode, ExecutionContext, NodeExecutionResult } from '../../GraphTypes';

// ---- Schema Builder ----

export function buildSwitchNodeSchema(cases: Record<string, string> = {}): NodeSchema {
  const ports: NodePortSchema[] = [
    { id: 'input', label: 'Input', direction: 'input' },
  ];

  for (const [caseKey, caseLabel] of Object.entries(cases)) {
    ports.push({
      id: `case:${caseKey}`,
      label: caseLabel || caseKey,
      direction: 'output',
    });
  }

  ports.push({
    id: 'default',
    label: 'Default',
    direction: 'output',
  });

  return {
    type: 'switch_node',
    category: 'control',
    label: 'Switch',
    description: 'Multi-way routing — route to a branch based on expression value.',
    categoryColor: '#8E44AD',
    defaultSize: { width: 220, height: 140 },
    icon: '🔀',
    ports,
    configFields: [
      {
        key: 'expression',
        label: 'Expression',
        type: 'string',
        defaultValue: '',
        description: 'Value to route on. References: $input, $context.<key>',
      },
      {
        key: 'defaultCase',
        label: 'Default Case',
        type: 'string',
        defaultValue: '',
        description: 'Fallback case key when no match is found.',
      },
    ],
  };
}

/** 默认 Switch schema（无预定义 case，由 config 动态生成端口） */
export const SWITCH_NODE_SCHEMA: NodeSchema = buildSwitchNodeSchema({});

// ---- Executor ----

export function switchNodeExecutor(
  node: ExecutionNode,
  context: ExecutionContext,
): NodeExecutionResult {
  const expression = String(node.config.expression ?? '');
  const defaultCase = (node.config.defaultCase as string) || '';
  const cases = (node.config.cases as Record<string, string>) || {};

  // 获取上游输入
  const sourceOutput = context.results.get(`${node.id}.input`) ?? context.input;

  // 求值表达式
  const routeValue = resolveExpression(expression, sourceOutput as string, context);
  context.logs.push(`  → Switch: expression="${expression}" → value="${routeValue}"`);

  // 匹配 case
  let matchedCase: string | null = null;

  // 精确匹配
  for (const caseKey of Object.keys(cases)) {
    if (String(routeValue) === caseKey) {
      matchedCase = caseKey;
      break;
    }
  }

  // 兜底
  const route = matchedCase ?? (defaultCase || 'default');

  context.executionState.routeResult = route;
  context.executionState.activeBranches.push(route);

  return {
    output: `[Switch] route=${route}`,
    route,
  };
}

// ---- Helpers ----

function resolveExpression(
  expr: string,
  input: string,
  context: ExecutionContext,
): string {
  if (!expr) return input;

  // 替换引用
  const $input = input;

  const resolved = expr
    .replace(/\$input/g, $input)
    .replace(/\$context\.(\w+)/g, (_match, key) => {
      const val = context.results.get(key);
      return val !== undefined ? String(val) : '';
    });

  // 尝试作为 JS 表达式求值
  try {
    const fn = new Function('$input', `return (${resolved})`);
    const result = fn(input);
    return String(result);
  } catch {
    // 直接作为字符串返回
    return resolved;
  }
}
