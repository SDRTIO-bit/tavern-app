// ============================================================
// TavernResponseFormatter — SillyTavern 响应格式化器
//
// 将内部 Runtime 输出格式化为 SillyTavern 兼容的响应。
// ============================================================

import type { CharacterBrain } from '@/character/CharacterBrain';

/** SillyTavern 兼容的聊天响应 */
export interface TavernChatResponse {
  /** 角色回复 */
  role: 'assistant';
  /** 回复内容 */
  content: string;
  /** 扩展元数据（Tavern 前端可读取） */
  metadata: TavernResponseMetadata;
}

/** 响应元数据 */
export interface TavernResponseMetadata {
  /** 当前世界事件 */
  worldEvents?: string[];
  /** 角色情绪快照 */
  emotion?: {
    happiness: number;
    stress: number;
    trust: number;
    affection: number;
    anger: number;
    loneliness: number;
    curiosity: number;
  };
  /** 活跃剧情线 */
  arcs?: string[];
  /** 行为决策 */
  behavior?: {
    tone: string;
    initiative: string;
    summary: string;
  };
  /** 调试追踪 */
  trace?: {
    totalTokens: number;
    durationMs: number;
  };
  /** 世界时间 */
  worldTime?: string;
}

/** 内部 Runtime 输出 */
export interface RuntimeOutput {
  reply: string;
  characterState?: {
    brain?: CharacterBrain;
  };
  worldEvents?: Array<{ type: string; description: string }>;
  arcs?: Array<{ title: string; phase: string }>;
  trace?: {
    totalTokens: number;
    durationMs: number;
  };
  worldTime?: string;
}

export class TavernResponseFormatter {
  /**
   * 将 Runtime 输出格式化为 Tavern 兼容响应。
   */
  static format(output: RuntimeOutput): TavernChatResponse {
    const brain = output.characterState?.brain;
    const behavior = brain?.metadata?.behavior as
      | { tone: string; initiative: string; summary: string }
      | undefined;

    return {
      role: 'assistant',
      content: output.reply,
      metadata: {
        worldEvents: output.worldEvents?.map(
          (e) => `[${e.type}] ${e.description}`,
        ),
        emotion: brain
          ? {
              happiness: brain.emotion.happiness,
              stress: brain.emotion.stress,
              trust: brain.emotion.trust,
              affection: brain.emotion.affection,
              anger: brain.emotion.anger,
              loneliness: brain.emotion.loneliness,
              curiosity: brain.emotion.curiosity,
            }
          : undefined,
        arcs: output.arcs?.map(
          (a) => `${a.title} (${a.phase})`,
        ),
        behavior: behavior
          ? {
              tone: behavior.tone,
              initiative: behavior.initiative,
              summary: behavior.summary,
            }
          : undefined,
        trace: output.trace,
        worldTime: output.worldTime,
      },
    };
  }

  /**
   * 将 TavernChatResponse 序列化为 JSON 字符串。
   */
  static serialize(response: TavernChatResponse): string {
    return JSON.stringify(response);
  }

  /**
   * 创建 SSE 流式响应事件。
   */
  static toSSEEvent(content: string, done = false): string {
    if (done) return 'data: [DONE]\n\n';
    return `data: ${content}\n\n`;
  }
}
