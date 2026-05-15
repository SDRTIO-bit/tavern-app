// ============================================================
// WorkflowLoader — 工作流加载器
//
// 从 src/workflows/*.json 加载工作流定义。
// ============================================================

import type { WorkflowDefinition } from './types/WorkflowRuntimeTypes';
import { WorkflowRegistry } from './WorkflowRegistry';

export class WorkflowLoader {
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private registry: WorkflowRegistry;

  constructor(registry: WorkflowRegistry) {
    this.registry = registry;
  }

  /** 注册工作流定义 */
  register(definition: WorkflowDefinition): void {
    // 校验所有节点都已注册
    const missing = definition.nodes.filter((n) => !this.registry.has(n));
    if (missing.length > 0) {
      console.warn(
        `[WorkflowLoader] "${definition.name}" 引用了未注册的节点: ${missing.join(', ')}`,
      );
    }
    this.workflows.set(definition.id, definition);
  }

  /** 批量注册 */
  registerAll(definitions: WorkflowDefinition[]): void {
    for (const def of definitions) {
      this.register(def);
    }
  }

  /** 获取工作流 */
  get(id: string): WorkflowDefinition | undefined {
    return this.workflows.get(id);
  }

  /** 获取所有工作流 */
  getAll(): WorkflowDefinition[] {
    return Array.from(this.workflows.values());
  }

  /** 获取工作流摘要列表 */
  getSummaries(): Array<{ id: string; name: string; description: string; nodeCount: number }> {
    return this.getAll().map((wf) => ({
      id: wf.id,
      name: wf.name,
      description: wf.description,
      nodeCount: wf.nodes.length,
    }));
  }
}
