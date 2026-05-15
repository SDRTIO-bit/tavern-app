// ============================================================
// RuntimeConsoleBridge — 桥接 RuntimeEventBus 到控制台 LogEntry
//
// 将 workflow 运行时事件转换为 LogEntry 格式，
// 供 RuntimeConsole 组件实时显示。
// ============================================================

import type { RuntimeEvent } from './types/WorkflowRuntimeTypes';
import type { LogEntry, LogCategory } from '@/core/runtime';
import { RuntimeEventBus } from './RuntimeEventBus';

/** 事件到日志类别的映射 */
function eventToCategory(event: RuntimeEvent): LogCategory {
  switch (event.nodeType) {
    case 'emotion':   return 'emotion';
    case 'memory':    return 'memory';
    case 'goal':      return 'goal';
    case 'narrative': return 'prompt';  // 复用 prompt 的图标
    case 'worldbook': return 'worldbook';
    case 'prompt':    return 'prompt';
    case 'model':     return 'model';
    default:
      if (event.type === 'workflow_start') return 'system';
      if (event.type === 'workflow_done')  return 'done';
      if (event.type === 'node_error')     return 'error';
      return 'system';
  }
}

export type ConsoleLogListener = (entry: LogEntry) => void;

/**
 * 桥接类：监听 RuntimeEventBus，将事件转为 LogEntry 并通过回调传出。
 *
 * 使用方式：
 *   const bridge = new RuntimeConsoleBridge(eventBus);
 *   bridge.connect((entry) => { /* 更新 React state * / });
 */
export class RuntimeConsoleBridge {
  private eventBus: RuntimeEventBus;
  private unsubscribes: Array<() => void> = [];

  constructor(eventBus: RuntimeEventBus) {
    this.eventBus = eventBus;
  }

  /** 连接：注册监听，自动转换事件为 LogEntry */
  connect(listener: ConsoleLogListener): void {
    const unsub = this.eventBus.on((event) => {
      const entry = this.toLogEntry(event);
      if (entry) listener(entry);
    });
    this.unsubscribes.push(unsub);
  }

  /** 断开所有监听 */
  disconnect(): void {
    for (const unsub of this.unsubscribes) {
      unsub();
    }
    this.unsubscribes = [];
  }

  /** 将 RuntimeEvent 转换为 LogEntry */
  private toLogEntry(event: RuntimeEvent): LogEntry | null {
    const category = eventToCategory(event);

    const entry: LogEntry = {
      id: event.timestamp,
      category,
      message: event.message,
      timestamp: event.timestamp,
    };

    // 附加数据
    if (event.data) {
      const children: string[] = [];

      if (event.data.durationMs !== undefined) {
        children.push(`耗时: ${event.data.durationMs}ms`);
      }
      if (event.data.outputLength !== undefined) {
        children.push(`输出: ${event.data.outputLength} 字符`);
      }
      if (typeof event.data.memoryCount === 'number' && event.data.memoryCount > 0) {
        children.push(`记忆: ${event.data.memoryCount} 条`);
      }
      if (event.data.stepCount !== undefined) {
        children.push(`步骤: ${event.data.stepCount} 个`);
      }
      if (event.data.nodeCount !== undefined) {
        children.push(`节点: ${event.data.nodeCount} 个`);
      }
      if (event.data.error) {
        children.push(`错误: ${event.data.error}`);
      }

      if (children.length > 0) {
        entry.children = children;
      }

      // 情绪 delta
      if (event.data.emotionDeltas) {
        const deltas = event.data.emotionDeltas as Record<string, number>;
        const labels: Record<string, string> = {
          happiness: '幸福', stress: '压力', trust: '信任',
          affection: '好感', anger: '愤怒', loneliness: '孤独', curiosity: '好奇',
        };
        entry.deltas = Object.entries(deltas)
          .filter(([, v]) => v !== 0)
          .map(([k, v]) => ({ label: labels[k] || k, value: v }));
      }
    }

    return entry;
  }
}
