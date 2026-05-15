// ============================================================
// MergeNode — 分支合并节点
//
// 等待所有活跃入边执行完毕后，合并多个分支的输出。
//
// Config:
//   strategy: 'concat' | 'first' | 'last' | 'join'
//
// Ports:
//   input:<n> (input, 运行时动态匹配入边)
//   output    (output)
//
// Execution:
//   收集所有上游输出 → 按策略合并 → 返回合并结果。
// ============================================================

import type { NodeSchema } from '../../NodeSchema';
import type { ExecutionNode, ExecutionContext, NodeExecutionResult } from '../../GraphTypes';

// ---- Schema ----

export const MERGE_NODE_SCHEMA: NodeSchema = {
  type: 'merge_node',
  category: 'control',
  label: 'Merge',
  description: 'Merge outputs from multiple branches into one.',
  categoryColor: '#27AE60',
  defaultSize: { width: 180, height: 100 },
  icon: '🔗',
  ports: [
    { id: 'output', label: 'Output', direction: 'output' },
  ],
  configFields: [
    {
      key: 'strategy',
      label: 'Merge Strategy',
      type: 'select',
      defaultValue: 'concat',
      description: 'How to combine multiple inputs.',
      options: [
        { label: 'Concatenate', value: 'concat' },
        { label: 'First (non-empty)', value: 'first' },
        { label: 'Last (non-empty)', value: 'last' },
        { label: 'Join with newline', value: 'join' },
        { label: 'Join with comma', value: 'comma' },
      ],
    },
  ],
};

// ---- Executor ----

export function mergeNodeExecutor(
  node: ExecutionNode,
  context: ExecutionContext,
): NodeExecutionResult {
  const strategy = (node.config.strategy as string) || 'concat';

  // 收集所有上游输出
  // 查找 context.results 中以 "<nodeId>.output" 格式存储的来源于入边的输出
  const upstreamOutputs: string[] = [];
  const prefix = `${node.id}.input:`;
  const outputPrefix = `${node.id}.input`;

  // 从 context.results 中收集输入
  context.results.forEach((value, key) => {
    if (key.startsWith(prefix) || key === outputPrefix) {
      const str = String(value ?? '');
      if (str) upstreamOutputs.push(str);
    }
  });

  // 如果 results 中还没有（首次到达），直接从所有入边源节点收集
  if (upstreamOutputs.length === 0) {
    context.results.forEach((value, key) => {
      if (key.endsWith('.output') && !key.startsWith(node.id)) {
        const str = String(value ?? '');
        if (str && !str.startsWith('[If]') && !str.startsWith('[Switch]')) {
          upstreamOutputs.push(str);
        }
      }
    });
  }

  const merged = applyMergeStrategy(strategy, upstreamOutputs);

  context.logs.push(`  → Merge (${strategy}): ${upstreamOutputs.length} input(s) → ${merged.length} chars`);

  return { output: merged };
}

// ---- Merge Strategies ----

function applyMergeStrategy(strategy: string, inputs: string[]): string {
  if (inputs.length === 0) return '';

  switch (strategy) {
    case 'first': {
      // 第一个非空
      const found = inputs.find((s) => s.trim().length > 0);
      return found ?? '';
    }
    case 'last': {
      // 最后一个非空
      const found = [...inputs].reverse().find((s) => s.trim().length > 0);
      return found ?? '';
    }
    case 'join':
      return inputs.filter((s) => s.trim()).join('\n');
    case 'comma':
      return inputs.filter((s) => s.trim()).join(', ');
    case 'concat':
    default:
      return inputs.join('');
  }
}
