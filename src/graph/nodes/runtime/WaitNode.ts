// ============================================================
// WaitNode — 暂停执行直到事件或时间
//
// 支持三种等待模式：
//   duration   — 等待指定毫秒数
//   event      — 等待指定类型的事件
//   user_input — 等待用户输入
//
// Config:
//   waitType: 'duration' | 'event' | 'user_input'
//   durationMs?: number
//   eventType?: string
//   message?: string
//
// Execution:
//   返回 { output, wait: { type, ... } }。
//   RuntimeScheduler 检测到 wait 后暂停执行。
// ============================================================

import type { NodeSchema } from '../../NodeSchema';
import type { ExecutionNode, ExecutionContext, NodeExecutionResult } from '../../GraphTypes';

// ---- Schema ----

export const WAIT_NODE_SCHEMA: NodeSchema = {
  type: 'wait_node',
  category: 'runtime',
  label: 'Wait',
  description:
    'Pause execution until a condition is met — duration, event, or user input.',
  categoryColor: '#3498DB',
  defaultSize: { width: 200, height: 130 },
  icon: '⏸️',
  ports: [
    { id: 'input', label: 'Input', direction: 'input' },
    { id: 'output', label: 'Output', direction: 'output' },
  ],
  configFields: [
    {
      key: 'waitType',
      label: 'Wait Type',
      type: 'select',
      defaultValue: 'duration',
      description: 'What to wait for.',
      options: [
        { label: 'Duration (ms)', value: 'duration' },
        { label: 'Event', value: 'event' },
        { label: 'User Input', value: 'user_input' },
      ],
    },
    {
      key: 'durationMs',
      label: 'Duration (ms)',
      type: 'number',
      defaultValue: 1000,
      description: 'Milliseconds to wait (for duration mode).',
      min: 0,
    },
    {
      key: 'eventType',
      label: 'Event Type',
      type: 'string',
      defaultValue: '',
      description: 'Event type to wait for (for event mode).',
    },
    {
      key: 'message',
      label: 'Message',
      type: 'string',
      defaultValue: '',
      description: 'Message to show while waiting (for user_input mode).',
    },
  ],
};

// ---- Executor ----

export function waitNodeExecutor(
  node: ExecutionNode,
  context: ExecutionContext,
): NodeExecutionResult {
  const waitType = (node.config.waitType as string) || 'duration';
  const durationMs = (node.config.durationMs as number) || 1000;
  const eventType = (node.config.eventType as string) || '';
  const message = (node.config.message as string) || '';

  context.logs.push(
    `  → Wait: type=${waitType}${
      waitType === 'duration' ? ` duration=${durationMs}ms` : ''
    }${waitType === 'event' ? ` event="${eventType}"` : ''}`,
  );

  switch (waitType) {
    case 'duration':
      return {
        output: `[Wait] duration=${durationMs}ms`,
        wait: { type: 'duration', durationMs },
      };

    case 'event':
      return {
        output: `[Wait] event="${eventType}"`,
        wait: { type: 'event', eventType: eventType || 'default', message },
      };

    case 'user_input':
      return {
        output: `[Wait] user_input`,
        wait: {
          type: 'user_input',
          eventType: 'user_message',
          message: message || 'Waiting for user input...',
        },
      };

    default:
      return { output: `[Wait] unknown type: ${waitType}` };
  }
}
