// ============================================================
// WorldPlugin — 世界规则插件基类
//
// 简化世界规则插件的创建。
// ============================================================

import type { Plugin, PluginContext, WorldRule } from './PluginTypes';

/**
 * 便捷世界规则插件基类。
 */
export abstract class WorldPlugin implements Plugin {
  abstract id: string;
  abstract name: string;
  abstract version: string;
  description?: string;
  author?: string;
  dependencies?: string[];

  /** 世界规则定义 */
  abstract rule: WorldRule;

  register(ctx: PluginContext): void {
    ctx.registerWorldRule(this.rule);
  }

  unregister?(_ctx: PluginContext): void;
}

/**
 * 快速创建世界规则插件的工厂函数。
 */
export function createWorldPlugin(
  id: string,
  name: string,
  version: string,
  rule: WorldRule,
): Plugin {
  return {
    id,
    name,
    version,
    register(ctx: PluginContext) {
      ctx.registerWorldRule(rule);
    },
  };
}
