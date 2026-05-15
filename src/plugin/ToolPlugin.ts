// ============================================================
// ToolPlugin — 工具插件基类
//
// 简化工具类型插件的创建。
// ============================================================

import type { Plugin, PluginContext } from './PluginTypes';
import type { RuntimeTool } from '@/graph/GraphTypes';
import type { ExecutionContext } from '@/graph/GraphTypes';

/**
 * 便捷工具插件基类。
 */
export abstract class ToolPlugin implements Plugin {
  abstract id: string;
  abstract name: string;
  abstract version: string;
  description?: string;
  author?: string;
  dependencies?: string[];

  /** 工具定义 */
  abstract tool: RuntimeTool;

  register(ctx: PluginContext): void {
    ctx.registerTool(this.tool);
  }

  unregister?(_ctx: PluginContext): void;
}

/**
 * 快速创建工具插件的工厂函数。
 */
export function createToolPlugin(
  id: string,
  name: string,
  version: string,
  tool: RuntimeTool,
): Plugin {
  return {
    id,
    name,
    version,
    register(ctx: PluginContext) {
      ctx.registerTool(tool);
    },
  };
}
