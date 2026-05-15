// ============================================================
// NodePlugin — 节点类型插件基类
//
// 简化新节点的创建过程。
// ============================================================

import type { Plugin, PluginContext, NodePluginRegistration } from './PluginTypes';
import type { NodeSchema } from '@/graph/NodeSchema';
import type { NodeExecutor } from '@/graph/GraphTypes';

/**
 * 便捷节点插件基类。
 *
 * 使用方式：
 *   class MyNode extends NodePlugin {
 *     config = { nodeType: 'my_node', ... }
 *     executor = (node, ctx) => ({ output: 'hello' })
 *   }
 */
export abstract class NodePlugin implements Plugin {
  abstract id: string;
  abstract name: string;
  abstract version: string;
  description?: string;
  author?: string;
  dependencies?: string[];

  /** 节点注册信息 */
  abstract registration: NodePluginRegistration;

  register(ctx: PluginContext): void {
    const { nodeType, schema, executor } = this.registration;
    ctx.registerNode(nodeType, schema, executor);
  }

  unregister?(_ctx: PluginContext): void;
}

/**
 * 快速创建节点插件的工厂函数。
 */
export function createNodePlugin(
  id: string,
  name: string,
  version: string,
  nodeType: string,
  schema: NodeSchema,
  executor: NodeExecutor,
): Plugin {
  return {
    id,
    name,
    version,
    register(ctx: PluginContext) {
      ctx.registerNode(nodeType, schema, executor);
    },
  };
}
