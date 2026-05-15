// ============================================================
// AgentPlugin — Agent 行为插件基类
//
// 简化 Agent 行为扩展的创建。
// ============================================================

import type { Plugin, PluginContext, AgentPluginDefinition } from './PluginTypes';

/**
 * 便捷 Agent 插件基类。
 */
export abstract class AgentPlugin implements Plugin {
  abstract id: string;
  abstract name: string;
  abstract version: string;
  description?: string;
  author?: string;
  dependencies?: string[];

  /** Agent 定义 */
  abstract agent: AgentPluginDefinition;

  register(ctx: PluginContext): void {
    ctx.registerAgent(this.agent);
  }

  unregister?(_ctx: PluginContext): void;
}

/**
 * 快速创建 Agent 插件的工厂函数。
 */
export function createAgentPlugin(
  id: string,
  name: string,
  version: string,
  agent: AgentPluginDefinition,
): Plugin {
  return {
    id,
    name,
    version,
    register(ctx: PluginContext) {
      ctx.registerAgent(agent);
    },
  };
}
