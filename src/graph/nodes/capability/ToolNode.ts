// ============================================================
// ToolNode — 外部工具执行节点
//
// 在 graph 中执行一个注册的 RuntimeTool。
//
// Config:
//   toolName: string — 工具名
//   input: string     — 工具输入（支持 $input 引用）
//   timeoutMs?: number
//
// Execution:
//   从 context.tools 查找工具 → 执行 → 注入结果到上下文。
// ============================================================

import type { NodeSchema } from '../../NodeSchema';
import type {
  ExecutionNode,
  ExecutionContext,
  NodeExecutionResult,
  RuntimeTool,
} from '../../GraphTypes';

// ---- Schema ----

export const TOOL_NODE_SCHEMA: NodeSchema = {
  type: 'tool_node',
  category: 'capability',
  label: 'Tool',
  description: 'Execute an external tool in the graph pipeline.',
  categoryColor: '#E67E22',
  defaultSize: { width: 220, height: 140 },
  icon: '🔧',
  ports: [
    { id: 'input', label: 'Input', direction: 'input' },
    { id: 'output', label: 'Result', direction: 'output' },
    { id: 'error', label: 'Error', direction: 'output' },
  ],
  configFields: [
    {
      key: 'toolName',
      label: 'Tool Name',
      type: 'string',
      defaultValue: '',
      description: 'Name of the registered tool to execute.',
    },
    {
      key: 'toolInput',
      label: 'Tool Input',
      type: 'string',
      defaultValue: '$input',
      description: 'Input passed to the tool. Use $input to reference upstream output.',
    },
    {
      key: 'timeoutMs',
      label: 'Timeout (ms)',
      type: 'number',
      defaultValue: 30000,
      description: 'Timeout in milliseconds. 0 = no timeout.',
      min: 0,
    },
  ],
};

// ---- Executor ----

export async function toolNodeExecutor(
  node: ExecutionNode,
  context: ExecutionContext,
): Promise<NodeExecutionResult> {
  const toolName = (node.config.toolName as string) || '';
  const toolInputExpr = (node.config.toolInput as string) || '$input';
  const timeoutMs = (node.config.timeoutMs as number) || 30000;

  if (!toolName) {
    context.logs.push('  → ERROR: no toolName configured');
    return { output: '[Error] No tool name configured', branch: 'error' };
  }

  // 查找工具
  const tool = findTool(toolName, context);
  if (!tool) {
    context.logs.push(`  → ERROR: tool "${toolName}" not found`);
    return { output: `[Error] Tool not found: ${toolName}`, branch: 'error' };
  }

  // 解析输入
  const input = resolveToolInput(toolInputExpr, context);

  context.logs.push(`  → Tool: ${toolName}(${JSON.stringify(input).slice(0, 60)})`);

  try {
    // 执行工具（可选超时）
    let result: unknown;
    if (timeoutMs > 0) {
      result = await Promise.race([
        tool.execute(input, context),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Tool timeout: ${timeoutMs}ms`)), timeoutMs),
        ),
      ]);
    } else {
      result = await tool.execute(input, context);
    }

    const resultStr = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
    context.logs.push(`  → Result: ${resultStr.slice(0, 80)}`);

    // 注入结果到 context
    context.results.set(`tool:${toolName}`, result);

    return { output: resultStr };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    context.logs.push(`  → Tool ERROR: ${msg}`);
    context.results.set(`tool:${toolName}:error`, msg);
    return { output: `[Error] ${msg}`, branch: 'error' };
  }
}

// ---- Helpers ----

function findTool(
  name: string,
  context: ExecutionContext,
): RuntimeTool | undefined {
  const tools = context.tools;
  if (!tools) return undefined;
  return tools.find((t) => t.name === name);
}

function resolveToolInput(
  expr: string,
  context: ExecutionContext,
): unknown {
  if (!expr || expr === '$input') return context.input;

  // 尝试解析为 JSON
  try {
    return JSON.parse(expr);
  } catch {
    // 替换引用后作为字符串
    return expr.replace(/\$input/g, context.input);
  }
}
