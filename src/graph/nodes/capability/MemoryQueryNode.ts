// ============================================================
// MemoryQueryNode — 记忆查询节点
//
// 从 session memory / history 中检索上下文。
//
// Config:
//   memoryType: 'summary' | 'history' | 'vector'
//   query: string       — 查询条件（支持 $input 引用）
//   maxResults: number  — 最大返回条目数
//
// Memory Types:
//   summary  — 对话摘要记忆
//   history  — 会话历史消息
//   vector   — 向量记忆（预留接口，返回占位符）
//
// Execution:
//   从 context.results 中查找已注入的记忆数据，
//   或从 session context 读取。
// ============================================================

import type { NodeSchema } from '../../NodeSchema';
import type {
  ExecutionNode,
  ExecutionContext,
  NodeExecutionResult,
} from '../../GraphTypes';

// ---- Schema ----

export const MEMORY_QUERY_NODE_SCHEMA: NodeSchema = {
  type: 'memory_query_node',
  category: 'capability',
  label: 'Memory Query',
  description: 'Retrieve context from session memory or history.',
  categoryColor: '#2ECC71',
  defaultSize: { width: 220, height: 140 },
  icon: '🧠',
  ports: [
    { id: 'input', label: 'Input', direction: 'input' },
    { id: 'output', label: 'Memory', direction: 'output' },
  ],
  configFields: [
    {
      key: 'memoryType',
      label: 'Memory Type',
      type: 'select',
      defaultValue: 'summary',
      options: [
        { label: 'Summary', value: 'summary' },
        { label: 'History', value: 'history' },
        { label: 'Vector', value: 'vector' },
      ],
    },
    {
      key: 'query',
      label: 'Query',
      type: 'string',
      defaultValue: '$input',
      description: 'Search query. Use $input for upstream output.',
    },
    {
      key: 'maxResults',
      label: 'Max Results',
      type: 'number',
      defaultValue: 5,
      min: 1,
      max: 50,
    },
  ],
};

// ---- Executor ----

export function memoryQueryNodeExecutor(
  node: ExecutionNode,
  context: ExecutionContext,
): NodeExecutionResult {
  const memoryType = (node.config.memoryType as string) || 'summary';
  const queryExpr = (node.config.query as string) || '$input';
  const maxResults = (node.config.maxResults as number) || 5;

  const query = queryExpr === '$input'
    ? (context.results.get(`${node.id}.input`) as string) || context.input
    : queryExpr;

  context.logs.push(`  → Memory Query: type=${memoryType} query="${query.slice(0, 40)}"`);

  let result: string;

  switch (memoryType) {
    case 'summary':
      result = querySummaryMemory(context, query, maxResults);
      break;
    case 'history':
      result = queryHistoryMemory(context, query, maxResults);
      break;
    case 'vector':
      result = queryVectorMemory(context, query, maxResults);
      break;
    default:
      result = `[Memory] Unknown type: ${memoryType}`;
  }

  // 注入记忆到 context
  context.results.set(`memory:${memoryType}`, result);

  return { output: result };
}

// ---- Memory Backends ----

function querySummaryMemory(
  context: ExecutionContext,
  _query: string,
  _maxResults: number,
): string {
  // 从 context.results 中查找已注入的摘要
  const existing = context.results.get('memory:summary');
  if (existing && typeof existing === 'string') {
    return `[Summary Memory]\n${existing}`;
  }

  // 从 session history 生成简单摘要
  const history = context.results.get('memory:history');
  if (history && typeof history === 'string') {
    const lines = history.split('\n').filter((l) => l.trim());
    const recent = lines.slice(-5);
    return `[Summary Memory] Recent context:\n${recent.join('\n')}`;
  }

  // 回退：使用 input 作为上下文
  return `[Summary Memory] Context: ${context.input.slice(0, 500)}`;
}

function queryHistoryMemory(
  context: ExecutionContext,
  _query: string,
  maxResults: number,
): string {
  // 尝试从 context.results 获取已存储的历史
  const stored = context.results.get('memory:history');
  if (stored && typeof stored === 'string') {
    const lines = stored.split('\n');
    return `[History Memory] ${lines.length} entries:\n${lines.slice(-maxResults).join('\n')}`;
  }

  // 回退：返回 input
  return `[History Memory]\n${context.input.slice(0, 1000)}`;
}

function queryVectorMemory(
  context: ExecutionContext,
  query: string,
  _maxResults: number,
): string {
  // 向量记忆预留接口
  const stored = context.results.get('memory:vector');
  if (stored) {
    return `[Vector Memory] ${JSON.stringify(stored).slice(0, 500)}`;
  }

  // 占位符
  return `[Vector Memory] Placeholder — query: "${query.slice(0, 60)}". Vector store not connected. To integrate: inject embeddings into context.results['memory:vector'].`;
}
