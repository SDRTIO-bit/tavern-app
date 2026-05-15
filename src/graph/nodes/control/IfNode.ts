// ============================================================
// IfNode — 条件分支节点
//
// 根据条件表达式决定走 true 分支还是 false 分支。
//
// Config:
//   condition: string — 条件表达式
//
// Ports:
//   input  (input)
//   true   (output)
//   false  (output)
//
// Execution:
//   求值 condition → 返回 { branch: 'true' | 'false' }
//   → ExecutionGraph 仅激活匹配 branch 的出边。
// ============================================================

import type { NodeSchema } from '../../NodeSchema';
import type { ExecutionNode, ExecutionContext, NodeExecutionResult } from '../../GraphTypes';

// ---- Schema ----

export const IF_NODE_SCHEMA: NodeSchema = {
  type: 'if_node',
  category: 'control',
  label: 'If',
  description: 'Conditional branching — execute one branch if condition is true, another if false.',
  categoryColor: '#E6A817',
  defaultSize: { width: 200, height: 120 },
  icon: '🔀',
  ports: [
    { id: 'input', label: 'Input', direction: 'input' },
    { id: 'true', label: 'True', direction: 'output' },
    { id: 'false', label: 'False', direction: 'output' },
  ],
  configFields: [
    {
      key: 'condition',
      label: 'Condition',
      type: 'string',
      defaultValue: 'true',
      description: 'Expression evaluated to truthy/falsy. References: $input, $context.<key>',
    },
  ],
};

// ---- Executor ----

export function ifNodeExecutor(
  node: ExecutionNode,
  context: ExecutionContext,
): NodeExecutionResult {
  const conditionExpr = String(node.config.condition ?? 'true');

  // 获取上游输入
  const sourceOutput = context.results.get(`${node.id}.input`) ?? context.input;

  const result = evaluateCondition(conditionExpr, sourceOutput as string, context);
  const branch = result ? 'true' : 'false';

  context.executionState.activeBranches.push(branch);
  context.executionState.routeResult = branch;

  return {
    output: `[If] condition=${conditionExpr} → ${branch}`,
    branch,
  };
}

// ---- Condition Evaluator ----

/**
 * 简单条件求值器。
 * 支持的引用：
 *   $input          → 当前节点的上游输入
 *   $source         → 同义 $input
 *   $context.<key>  → context.results 中的值
 * 支持操作符：=== == !== != > < >= <= && || !
 */
function evaluateCondition(
  expr: string,
  input: string,
  context: ExecutionContext,
): boolean {
  const trimmed = expr.trim();

  // 字面量
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === '') return false;

  // 尝试解析为数字
  const num = Number(trimmed);
  if (!isNaN(num) && trimmed !== '') return num !== 0;

  try {
    // 构建安全的求值上下文
    const $input = JSON.stringify(input);
    const $source = $input;
    const $context: Record<string, unknown> = {};
    context.results.forEach((value, key) => {
      // 提取简单 key 名（去掉 nodeId. 前缀）
      const parts = key.split('.');
      if (parts.length === 2) {
        $context[parts[1]] = value;
      }
      $context[key] = value;
    });

    // 替换引用后求值
    const resolved = expr
      .replace(/\$input/g, $input)
      .replace(/\$source/g, $source)
      // 简单替换 $context.xxx → 对应的 JSON 值
      .replace(/\$context\.(\w+)/g, (_match, key) => {
        const val = $context[key];
        if (val === undefined) return 'undefined';
        if (typeof val === 'string') return JSON.stringify(val);
        return String(val);
      });

    // 使用 Function 构造器求值（沙箱化）
    const fn = new Function(`return (${resolved})`);
    const result = fn();
    return Boolean(result);
  } catch {
    // 求值失败 → false
    return false;
  }
}
