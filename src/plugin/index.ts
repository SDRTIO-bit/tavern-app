// ============================================================
// plugin — 插件生态系统
//
// PluginTypes    — 核心接口 + 扩展点类型
// PluginContext  — 系统注册总线实现
// PluginManager  — 插件管理器（加载/卸载/热重载/依赖排序）
// NodePlugin     — 节点插件基类 + 工厂
// ToolPlugin     — 工具插件基类 + 工厂
// WorldPlugin    — 世界规则插件基类 + 工厂
// AgentPlugin    — Agent 插件基类 + 工厂
// ============================================================

// Core
export type {
  Plugin,
  PluginContext,
  PluginManifest,
  WorldRule,
  AgentPluginDefinition,
  NarrativeHook,
  NodePluginRegistration,
} from './PluginTypes';

// Manager & Context
export { SystemPluginContext } from './PluginContext';
export { PluginManager } from './PluginManager';

// Plugin base classes
export { NodePlugin, createNodePlugin } from './NodePlugin';
export { ToolPlugin, createToolPlugin } from './ToolPlugin';
export { WorldPlugin, createWorldPlugin } from './WorldPlugin';
export { AgentPlugin, createAgentPlugin } from './AgentPlugin';
