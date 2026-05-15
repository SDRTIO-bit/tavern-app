// ============================================================
// PluginTypes — 插件系统核心类型
//
// 定义所有插件接口和扩展点类型。
// ============================================================

import type { NodeSchema } from '@/graph/NodeSchema';
import type { NodeExecutor } from '@/graph/GraphTypes';
import type { RuntimeTool } from '@/graph/GraphTypes';
import type { WorldState } from '@/world/WorldState';
import type { ExecutionGraph } from '@/graph/ExecutionGraph';
import type { RuntimeScheduler } from '@/runtime/scheduler/RuntimeScheduler';
import type { ToolRegistry } from '@/runtime/tools/ToolRegistry';

// ---- 插件上下文 ----

/** 插件注册时获得的系统入口 */
export interface PluginContext {
  /** 注册节点类型 */
  registerNode(nodeType: string, schema: NodeSchema, executor: NodeExecutor): void;
  /** 注册工具 */
  registerTool(tool: RuntimeTool): void;
  /** 注册世界规则（tick hook） */
  registerWorldRule(rule: WorldRule): void;
  /** 注册 Agent 行为 */
  registerAgent(agent: AgentPluginDefinition): void;
  /** 注册 Narrative 钩子 */
  registerNarrativeHook(hook: NarrativeHook): void;
  /** 获取 Graph Runtime */
  getGraphRuntime(): ExecutionGraph;
  /** 获取 Tool Registry */
  getToolRegistry(): ToolRegistry;
  /** 获取 Scheduler */
  getScheduler(): RuntimeScheduler | null;
  /** 获取 World State */
  getWorld(): WorldState | null;
}

// ---- 插件基类 ----

/** 所有插件的基类接口 */
export interface Plugin {
  /** 插件唯一 ID */
  id: string;
  /** 插件名称 */
  name: string;
  /** 插件版本 */
  version: string;
  /** 插件描述 */
  description?: string;
  /** 作者 */
  author?: string;
  /** 依赖的插件 ID 列表 */
  dependencies?: string[];
  /** 注册回调 */
  register(ctx: PluginContext): void;
  /** 卸载回调（可选） */
  unregister?(ctx: PluginContext): void;
}

// ---- 扩展点类型 ----

/** 节点插件注册信息 */
export interface NodePluginRegistration {
  nodeType: string;
  schema: NodeSchema;
  executor: NodeExecutor;
}

/** 世界规则接口 */
export interface WorldRule {
  /** 规则名称 */
  name: string;
  /** 规则描述 */
  description?: string;
  /** 在世界 tick 之前调用 */
  beforeTick?(world: WorldState): WorldState;
  /** 在世界 tick 之后调用 */
  afterTick?(world: WorldState): WorldState;
  /** 自定义 tick 逻辑 */
  tick?(world: WorldState): WorldState;
}

/** Agent 插件定义 */
export interface AgentPluginDefinition {
  /** Agent 名称 */
  name: string;
  /** Agent 描述 */
  description?: string;
  /** 允许的工具列表 */
  allowedTools?: string[];
  /** 最大迭代次数 */
  maxIterations?: number;
  /** 自定义执行逻辑 */
  execute?(input: string, context: Record<string, unknown>): Promise<string>;
}

/** 叙事钩子 */
export interface NarrativeHook {
  /** 钩子名称 */
  name: string;
  /** 在叙事 arc 创建时调用 */
  onArcCreated?(arc: unknown): void;
  /** 在叙事 arc 推进时调用 */
  onArcProgressed?(arc: unknown): void;
  /** 在叙事 arc 完成时调用 */
  onArcResolved?(arc: unknown): void;
}

// ---- 插件清单 ----

/** 插件清单（用于序列化/发现） */
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  dependencies?: string[];
  /** 插件入口文件路径 */
  entry?: string;
}
