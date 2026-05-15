// ============================================================
// RuntimeEventBus — 工作流运行时事件总线
//
// 节点执行时 emit 事件，RuntimeConsole 订阅显示。
// ============================================================

import type { RuntimeEvent, RuntimeEventListener } from './types/WorkflowRuntimeTypes';

export class RuntimeEventBus {
  private listeners: Set<RuntimeEventListener> = new Set();
  private eventHistory: RuntimeEvent[] = [];
  private idCounter = 0;

  /** 注册监听器 */
  on(listener: RuntimeEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** 发送事件 */
  emit(
    type: RuntimeEvent['type'],
    message: string,
    opts?: {
      nodeType?: string;
      nodeName?: string;
      data?: Record<string, unknown>;
    },
  ): void {
    const event: RuntimeEvent = {
      type,
      message,
      nodeType: opts?.nodeType,
      nodeName: opts?.nodeName,
      data: opts?.data,
      timestamp: Date.now(),
    };
    this.eventHistory.push(event);
    this.idCounter++;

    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // 单个监听器崩溃不影响其他
      }
    }
  }

  /** 发送 node_start */
  nodeStart(nodeType: string, nodeName: string, message?: string): void {
    this.emit('node_start', message || `正在执行 ${nodeName}...`, {
      nodeType,
      nodeName,
    });
  }

  /** 发送 node_done */
  nodeDone(nodeType: string, nodeName: string, data?: Record<string, unknown>): void {
    this.emit('node_done', `${nodeName} 完成`, {
      nodeType,
      nodeName,
      data,
    });
  }

  /** 发送 node_error */
  nodeError(nodeType: string, nodeName: string, error: string): void {
    this.emit('node_error', `${nodeName} 失败: ${error}`, {
      nodeType,
      nodeName,
      data: { error },
    });
  }

  /** 获取事件历史 */
  getHistory(): RuntimeEvent[] {
    return [...this.eventHistory];
  }

  /** 清空历史 */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /** 移除所有监听器 */
  clear(): void {
    this.listeners.clear();
    this.eventHistory = [];
  }
}
