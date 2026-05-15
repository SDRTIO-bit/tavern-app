// ============================================================
// ActionPlanner — 自主行动规划器
//
// 将 AutonomyAction 转换为可执行的具象行动。
// 生成消息文案、工具参数、事件数据等。
// ============================================================

import type { CharacterBrain } from '../CharacterBrain';
import type { AutonomyActionType } from './AutonomyPolicy';

/** 自主行动（决策结果） */
export interface AutonomyAction {
  /** 行动类型 */
  type: AutonomyActionType;
  /** 消息内容（type=message 时） */
  content?: string;
  /** 工具名（type=tool 时） */
  toolName?: string;
  /** 工具/事件负载 */
  payload?: Record<string, unknown>;
  /** 行动元数据 */
  metadata?: Record<string, unknown>;
}

/** 消息模板 */
interface MessageTemplate {
  condition: (brain: CharacterBrain) => boolean;
  messages: string[];
}

export class ActionPlanner {
  private static messageTemplates: MessageTemplate[] = [
    {
      condition: (b) => b.emotion.loneliness > 75,
      messages: [
        '你在吗？我感觉好久没听到你的声音了...',
        '有点想你了...你现在在做什么？',
        '这里好安静，你在想什么？',
        '我刚刚在想我们上次聊的事情，还想再聊聊。',
      ],
    },
    {
      condition: (b) => b.emotion.curiosity > 70,
      messages: [
        '我注意到一些有趣的事，你想听听吗？',
        '我有个问题一直想问你...',
        '你知道吗，我突然想到一件事。',
        '最近有什么新鲜事吗？跟我说说！',
      ],
    },
    {
      condition: (b) => b.emotion.affection > 70,
      messages: [
        '我只是想说，有你真好。',
        '想给你一个拥抱。今天过得怎么样？',
        '我一直在想你呢。',
        '和你聊天是我最期待的事。',
      ],
    },
    {
      condition: (b) => b.emotion.stress > 65,
      messages: [
        '我有点烦...你能陪我聊聊吗？',
        '最近压力好大，想找人说说话。',
        '我需要一点安慰...你在吗？',
      ],
    },
    {
      // 默认模板
      condition: () => true,
      messages: [
        '在做什么呢？',
        '嗨，我在。',
        '天气真好，不是吗？',
        '你最近怎么样？',
      ],
    },
  ];

  /**
   * 规划具体行动。
   */
  static plan(
    brain: CharacterBrain,
    actionType: AutonomyActionType,
  ): AutonomyAction {
    switch (actionType) {
      case 'none':
        return { type: 'none' };

      case 'message':
        return this.planMessage(brain);

      case 'tool':
        return this.planTool(brain);

      case 'event':
        return this.planEvent(brain);

      case 'wait':
        return { type: 'wait' };

      default:
        return { type: 'none' };
    }
  }

  /** 规划主动消息 */
  static planMessage(brain: CharacterBrain): AutonomyAction {
    const content = this.pickMessage(brain);
    return {
      type: 'message',
      content,
      metadata: {
        generated: true,
        triggeredBy: this.getMessageTrigger(brain),
      },
    };
  }

  /** 规划工具调用 */
  static planTool(brain: CharacterBrain): AutonomyAction {
    const tools = [
      { name: 'world_inspect', condition: () => true },
      { name: 'memory_recall', condition: (b: CharacterBrain) => b.emotion.loneliness > 50 },
      { name: 'check_news', condition: (b: CharacterBrain) => b.emotion.curiosity > 80 },
    ];

    const eligible = tools.filter((t) => t.condition(brain));
    const tool = eligible[Math.floor(Math.random() * eligible.length)] || tools[0];

    return {
      type: 'tool',
      toolName: tool.name,
      payload: { triggered: 'autonomy' },
      metadata: { generated: true },
    };
  }

  /** 规划事件触发 */
  static planEvent(_brain: CharacterBrain): AutonomyAction {
    return {
      type: 'event',
      payload: { eventType: 'character_idle_action' },
      metadata: { generated: true },
    };
  }

  /** 获取消息触发原因 */
  private static getMessageTrigger(brain: CharacterBrain): string {
    if (brain.emotion.loneliness > 75) return 'loneliness';
    if (brain.emotion.curiosity > 70) return 'curiosity';
    if (brain.emotion.affection > 70) return 'affection';
    if (brain.emotion.stress > 65) return 'stress';
    return 'default';
  }

  /** 从模板中选择消息 */
  private static pickMessage(brain: CharacterBrain): string {
    for (const template of this.messageTemplates) {
      if (template.condition(brain)) {
        return template.messages[
          Math.floor(Math.random() * template.messages.length)
        ];
      }
    }
    return '在做什么呢？';
  }
}
