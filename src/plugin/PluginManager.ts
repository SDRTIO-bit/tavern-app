// ============================================================
// PluginManager — 插件管理器
//
// 加载、管理、卸载插件。
// 提供批量加载、依赖检查、热重载能力。
// ============================================================

import type { Plugin, PluginManifest } from './PluginTypes';
import { SystemPluginContext } from './PluginContext';
import type { ExecutionGraph } from '@/graph/ExecutionGraph';
import type { RuntimeScheduler } from '@/runtime/scheduler/RuntimeScheduler';
import type { ToolRegistry } from '@/runtime/tools/ToolRegistry';
import type { WorldState } from '@/world/WorldState';

export class PluginManager {
  /** 已加载的插件 */
  private loaded: Map<string, Plugin> = new Map();
  /** 加载顺序 */
  private loadOrder: string[] = [];
  /** 系统插件上下文 */
  private ctx: SystemPluginContext;

  constructor() {
    this.ctx = new SystemPluginContext();
  }

  // ==========================================
  // 加载
  // ==========================================

  /**
   * 加载单个插件。
   */
  load(plugin: Plugin): boolean {
    if (this.loaded.has(plugin.id)) {
      console.warn(`[PluginManager] Plugin "${plugin.id}" already loaded`);
      return false;
    }

    // 依赖检查
    if (plugin.dependencies) {
      for (const depId of plugin.dependencies) {
        if (!this.loaded.has(depId)) {
          console.error(
            `[PluginManager] Plugin "${plugin.id}" requires "${depId}" which is not loaded`,
          );
          return false;
        }
      }
    }

    try {
      plugin.register(this.ctx);
      this.loaded.set(plugin.id, plugin);
      this.loadOrder.push(plugin.id);
      console.log(
        `[PluginManager] Loaded: ${plugin.name} v${plugin.version}`,
      );
      return true;
    } catch (err) {
      console.error(
        `[PluginManager] Failed to load "${plugin.id}":`,
        err,
      );
      return false;
    }
  }

  /**
   * 批量加载插件（按依赖顺序自动排序）。
   */
  loadAll(plugins: Plugin[]): { loaded: string[]; failed: string[] } {
    const loaded: string[] = [];
    const failed: string[] = [];

    // 拓扑排序（按依赖）
    const sorted = this.topologicalSort(plugins);

    for (const plugin of sorted) {
      if (this.load(plugin)) {
        loaded.push(plugin.id);
      } else {
        failed.push(plugin.id);
      }
    }

    return { loaded, failed };
  }

  // ==========================================
  // 卸载
  // ==========================================

  /**
   * 卸载单个插件。
   */
  unload(pluginId: string): boolean {
    const plugin = this.loaded.get(pluginId);
    if (!plugin) return false;

    // 检查是否有其他插件依赖它
    for (const [, p] of this.loaded) {
      if (p.dependencies?.includes(pluginId)) {
        console.warn(
          `[PluginManager] Cannot unload "${pluginId}": required by "${p.id}"`,
        );
        return false;
      }
    }

    try {
      if (plugin.unregister) {
        plugin.unregister(this.ctx);
      }
      this.loaded.delete(pluginId);
      this.loadOrder = this.loadOrder.filter((id) => id !== pluginId);
      console.log(`[PluginManager] Unloaded: ${plugin.name}`);
      return true;
    } catch (err) {
      console.error(`[PluginManager] Failed to unload "${pluginId}":`, err);
      return false;
    }
  }

  /**
   * 热重载插件（卸载 + 重新加载）。
   */
  reload(pluginId: string, newPlugin?: Plugin): boolean {
    const oldPlugin = this.loaded.get(pluginId);
    if (!oldPlugin && !newPlugin) return false;

    this.unload(pluginId);

    const toLoad = newPlugin ?? oldPlugin!;
    return this.load(toLoad);
  }

  // ==========================================
  // 系统绑定
  // ==========================================

  /** 绑定 Graph Runtime */
  bindGraphRuntime(graph: ExecutionGraph): void {
    this.ctx.setGraphRuntime(graph);
  }

  /** 绑定 Tool Registry */
  bindToolRegistry(registry: ToolRegistry): void {
    this.ctx.setToolRegistry(registry);
  }

  /** 绑定 Scheduler */
  bindScheduler(scheduler: RuntimeScheduler): void {
    this.ctx.setScheduler(scheduler);
  }

  /** 绑定 World State */
  bindWorld(world: WorldState): void {
    this.ctx.setWorld(world);
  }

  // ==========================================
  // 运行时钩子
  // ==========================================

  /** 应用所有世界规则到世界状态 */
  applyWorldRules(world: WorldState): WorldState {
    return this.ctx.applyWorldRules(world);
  }

  /** 触发叙事钩子 */
  triggerNarrative(
    event: 'onArcCreated' | 'onArcProgressed' | 'onArcResolved',
    arc: unknown,
  ): void {
    this.ctx.triggerNarrativeHooks(event, arc);
  }

  // ==========================================
  // 查询
  // ==========================================

  /** 获取插件上下文（供外部读取注册信息） */
  getContext(): SystemPluginContext {
    return this.ctx;
  }

  /** 获取已加载的插件列表 */
  getLoadedPlugins(): Plugin[] {
    return this.loadOrder
      .map((id) => this.loaded.get(id)!)
      .filter(Boolean);
  }

  /** 获取插件清单 */
  getManifests(): PluginManifest[] {
    return this.getLoadedPlugins().map((p) => ({
      id: p.id,
      name: p.name,
      version: p.version,
      description: p.description,
      author: p.author,
      dependencies: p.dependencies,
    }));
  }

  /** 检查插件是否已加载 */
  isLoaded(pluginId: string): boolean {
    return this.loaded.has(pluginId);
  }

  /** 已加载插件数量 */
  get count(): number {
    return this.loaded.size;
  }

  // ==========================================
  // 内部
  // ==========================================

  /** 按依赖拓扑排序插件 */
  private topologicalSort(plugins: Plugin[]): Plugin[] {
    const visited = new Set<string>();
    const sorted: Plugin[] = [];
    const map = new Map(plugins.map((p) => [p.id, p]));

    function visit(plugin: Plugin): void {
      if (visited.has(plugin.id)) return;
      visited.add(plugin.id);

      if (plugin.dependencies) {
        for (const depId of plugin.dependencies) {
          const dep = map.get(depId);
          if (dep) visit(dep);
        }
      }

      sorted.push(plugin);
    }

    for (const plugin of plugins) {
      visit(plugin);
    }

    return sorted;
  }
}
