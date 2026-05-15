// ============================================================
// ExecutionEvent — 事件系统
//
// 用于向 running/waiting 的 execution 发送事件，
// 以恢复暂停的 graph 执行。
// ============================================================

/** 执行事件 */
export interface ExecutionEvent {
  /** 事件类型 */
  type: string;
  /** 事件负载 */
  payload?: unknown;
}

/** 事件监听器 */
export type EventListener = (event: ExecutionEvent) => void;

/** 事件总线（单执行实例） */
export class ExecutionEventBus {
  private listeners: Map<string, EventListener[]> = new Map();

  /** 注册事件监听器 */
  on(eventType: string, listener: EventListener): void {
    const list = this.listeners.get(eventType);
    if (list) {
      list.push(listener);
    } else {
      this.listeners.set(eventType, [listener]);
    }
  }

  /** 移除监听器 */
  off(eventType: string, listener: EventListener): void {
    const list = this.listeners.get(eventType);
    if (!list) return;
    const idx = list.indexOf(listener);
    if (idx >= 0) list.splice(idx, 1);
  }

  /** 发送事件 */
  dispatch(event: ExecutionEvent): void {
    const list = this.listeners.get(event.type);
    if (!list) return;
    for (const listener of [...list]) {
      listener(event);
    }
  }

  /** 清除所有监听器 */
  clear(): void {
    this.listeners.clear();
  }
}
