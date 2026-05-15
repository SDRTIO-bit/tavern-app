// ============================================================
// WorkflowRegistry — 工作流节点注册表
//
// 注册和管理所有可用的工作流节点类型。
// 节点可在 workflow 定义中按 type 引用。
// ============================================================

import type { WorkflowNodeRegistration, WorkflowNodeExecutor } from './types/WorkflowRuntimeTypes';

export class WorkflowRegistry {
  private nodes: Map<string, WorkflowNodeRegistration> = new Map();

  /** 注册节点 */
  register(registration: WorkflowNodeRegistration): void {
    if (this.nodes.has(registration.type)) {
      console.warn(`[WorkflowRegistry] 节点 "${registration.type}" 已存在，覆盖`);
    }
    this.nodes.set(registration.type, registration);
  }

  /** 批量注册 */
  registerAll(registrations: WorkflowNodeRegistration[]): void {
    for (const reg of registrations) {
      this.register(reg);
    }
  }

  /** 获取节点执行器 */
  getExecutor(type: string): WorkflowNodeExecutor | undefined {
    return this.nodes.get(type)?.execute;
  }

  /** 获取节点注册信息 */
  getRegistration(type: string): WorkflowNodeRegistration | undefined {
    return this.nodes.get(type);
  }

  /** 获取所有注册节点 */
  getAll(): WorkflowNodeRegistration[] {
    return Array.from(this.nodes.values());
  }

  /** 检查节点是否已注册 */
  has(type: string): boolean {
    return this.nodes.has(type);
  }

  /** 移除节点 */
  remove(type: string): boolean {
    return this.nodes.delete(type);
  }

  /** 节点数量 */
  get count(): number {
    return this.nodes.size;
  }
}
