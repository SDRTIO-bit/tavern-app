// ============================================================
// ToolRegistry — 运行时工具注册表
//
// 管理 RuntimeTool 实例，供 ToolNode / AgentNode 调用。
// ============================================================

import type { RuntimeTool, ExecutionContext } from '../../graph/GraphTypes';

export type { RuntimeTool } from '../../graph/GraphTypes';

export class ToolRegistry {
  private tools: Map<string, RuntimeTool> = new Map();

  /** 注册工具 */
  registerTool(tool: RuntimeTool): void {
    this.tools.set(tool.name, tool);
  }

  /** 批量注册 */
  registerTools(tools: RuntimeTool[]): void {
    for (const tool of tools) {
      this.tools.set(tool.name, tool);
    }
  }

  /** 获取工具 */
  getTool(name: string): RuntimeTool | undefined {
    return this.tools.get(name);
  }

  /** 执行工具 */
  async executeTool(
    name: string,
    input: unknown,
    context: ExecutionContext,
  ): Promise<unknown> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }
    return tool.execute(input, context);
  }

  /** 列出所有工具 */
  listTools(): RuntimeTool[] {
    return Array.from(this.tools.values());
  }

  /** 获取工具描述列表（供 prompt 使用） */
  getToolDescriptions(): string {
    return this.listTools()
      .map((t) => `- ${t.name}: ${t.description ?? '(no description)'}`)
      .join('\n');
  }

  /** 移除工具 */
  removeTool(name: string): boolean {
    return this.tools.delete(name);
  }

  /** 清空 */
  clear(): void {
    this.tools.clear();
  }

  /** 工具数量 */
  get count(): number {
    return this.tools.size;
  }
}
