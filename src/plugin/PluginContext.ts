// ============================================================
// PluginContext — 系统注册总线的具体实现
//
// 将插件注册操作桥接到实际 Runtime 组件。
// PluginManager 创建此实例并传给各插件的 register()。
// ============================================================

import type { NodeSchema } from '@/graph/NodeSchema';
import type { NodeExecutor, RuntimeTool } from '@/graph/GraphTypes';
import type { ExecutionGraph } from '@/graph/ExecutionGraph';
import type { RuntimeScheduler } from '@/runtime/scheduler/RuntimeScheduler';
import type { ToolRegistry } from '@/runtime/tools/ToolRegistry';
import type { WorldState } from '@/world/WorldState';
import type {
  PluginContext as IPluginContext,
  WorldRule,
  AgentPluginDefinition,
  NarrativeHook,
} from './PluginTypes';

export class SystemPluginContext implements IPluginContext {
  /** 注册的节点 */
  private nodes: Array<{ type: string; schema: NodeSchema; executor: NodeExecutor }> = [];
  /** 注册的工具 */
  private tools: RuntimeTool[] = [];
  /** 注册的世界规则 */
  private worldRules: WorldRule[] = [];
  /** 注册的 Agent */
  private agents: AgentPluginDefinition[] = [];
  /** 叙事钩子 */
  private narrativeHooks: NarrativeHook[] = [];

  // 系统引用
  private graphRuntime?: ExecutionGraph;
  private toolRegistry?: ToolRegistry;
  private scheduler?: RuntimeScheduler;
  private world?: WorldState;

  // ==========================================
  // 注册方法
  // ==========================================

  registerNode(
    nodeType: string,
    schema: NodeSchema,
    executor: NodeExecutor,
  ): void {
    this.nodes.push({ type: nodeType, schema, executor });

    // 自动注册到 Graph Runtime
    if (this.graphRuntime) {
      this.graphRuntime.registerSchema(schema);
      this.graphRuntime.registerExecutor(nodeType, executor);
    }
  }

  registerTool(tool: RuntimeTool): void {
    this.tools.push(tool);

    // 自动注册到 ToolRegistry
    if (this.toolRegistry) {
      this.toolRegistry.registerTool(tool);
    }
  }

  registerWorldRule(rule: WorldRule): void {
    this.worldRules.push(rule);
  }

  registerAgent(agent: AgentPluginDefinition): void {
    this.agents.push(agent);
  }

  registerNarrativeHook(hook: NarrativeHook): void {
    this.narrativeHooks.push(hook);
  }

  // ==========================================
  // 系统引用 Setter
  // ==========================================

  setGraphRuntime(graph: ExecutionGraph): void {
    this.graphRuntime = graph;
    // 应用已注册的节点
    for (const n of this.nodes) {
      graph.registerSchema(n.schema);
      graph.registerExecutor(n.type, n.executor);
    }
  }

  setToolRegistry(registry: ToolRegistry): void {
    this.toolRegistry = registry;
    // 应用已注册的工具
    for (const t of this.tools) {
      registry.registerTool(t);
    }
  }

  setScheduler(scheduler: RuntimeScheduler): void {
    this.scheduler = scheduler;
  }

  setWorld(world: WorldState): void {
    this.world = world;
  }

  // ==========================================
  // Getter
  // ==========================================

  getGraphRuntime(): ExecutionGraph {
    if (!this.graphRuntime) {
      throw new Error('GraphRuntime not set on PluginContext');
    }
    return this.graphRuntime;
  }

  getToolRegistry(): ToolRegistry {
    if (!this.toolRegistry) {
      throw new Error('ToolRegistry not set on PluginContext');
    }
    return this.toolRegistry;
  }

  getScheduler(): RuntimeScheduler | null {
    return this.scheduler ?? null;
  }

  getWorld(): WorldState | null {
    return this.world ?? null;
  }

  // ==========================================
  // Hook 调用
  // ==========================================

  /** 应用所有世界规则（before + tick + after） */
  applyWorldRules(world: WorldState): WorldState {
    let w = world;
    for (const rule of this.worldRules) {
      if (rule.beforeTick) w = rule.beforeTick(w);
      if (rule.tick) w = rule.tick(w);
      if (rule.afterTick) w = rule.afterTick(w);
    }
    return w;
  }

  /** 触发叙事钩子 */
  triggerNarrativeHooks(event: 'onArcCreated' | 'onArcProgressed' | 'onArcResolved', arc: unknown): void {
    for (const hook of this.narrativeHooks) {
      const fn = hook[event];
      if (fn) fn(arc);
    }
  }

  /** 获取所有注册的节点 */
  getRegisteredNodes(): Array<{ type: string; schema: NodeSchema; executor: NodeExecutor }> {
    return [...this.nodes];
  }

  /** 获取所有注册的工具 */
  getRegisteredTools(): RuntimeTool[] {
    return [...this.tools];
  }

  /** 获取所有世界规则 */
  getWorldRules(): WorldRule[] {
    return [...this.worldRules];
  }
}
