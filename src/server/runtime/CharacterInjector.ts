// ============================================================
// CharacterInjector — 角色大脑注入器
//
// 将 CharacterBrain 的状态转换为 prompt 片段，
// 注入到 LLM 调用的 system prompt 中。
// ============================================================

import type { CharacterBrain } from '@/character/CharacterBrain';
import { EmotionEngine } from '@/character/runtime/EmotionEngine';
import { BehaviorEngine } from '@/character/runtime/BehaviorEngine';
import { getDominantEmotion } from '@/character/EmotionState';
import { getTopMemories } from '@/character/CharacterMemory';
import { getActiveGoals } from '@/character/CharacterGoal';
import type { TavernSession } from '../session/SessionService';

/** 注入结果 */
export interface CharacterInjection {
  /** 系统提示词片段 */
  systemPrompt: string;
  /** 角色名称 */
  characterName: string;
  /** 优势情绪 */
  dominantEmotion: string;
  /** 行为决策 */
  behavior: {
    tone: string;
    initiative: string;
    summary: string;
  };
}

export class CharacterInjector {
  /**
   * 从 Tavern 会话注入角色状态到 prompt。
   */
  static inject(session: TavernSession, characterName?: string): CharacterInjection {
    const brain = session.characterBrain;
    const name = characterName || brain.characterId;

    // 情绪
    const dominant = getDominantEmotion(brain.emotion);
    const emotionDesc = EmotionEngine.describeEmotion(brain);

    // 行为
    const behavior = BehaviorEngine.decide(brain);

    // 记忆
    const topMemories = getTopMemories(brain.memories, 5);
    const memoryHints = topMemories
      .map((m) => `- ${m.content.slice(0, 100)}`)
      .join('\n');

    // 目标
    const activeGoals = getActiveGoals(brain.goals);
    const goalHints = activeGoals
      .slice(0, 3)
      .map((g) => `- [priority=${g.priority}] ${g.content}`)
      .join('\n');

    // 关系（对用户的）
    const userRel = brain.relationships.find((r) => r.targetId === 'user');
    const relationshipHint = userRel
      ? `trust=${userRel.trust} affection=${userRel.affection}`
      : 'neutral';

    // 世界感知
    const worldPerception = brain.metadata?.worldPerception as
      | { time?: string; activeEvents?: number; globalMood?: number }
      | undefined;

    // 构建 System Prompt
    const parts: string[] = [
      `You are ${name}.`,
      '',
      `## Current Emotional State`,
      `Mood: ${emotionDesc}`,
      `Dominant emotion: ${dominant.dimension} (${dominant.value}/100)`,
      `Tone: ${behavior.tone} | Initiative: ${behavior.initiative}`,
      '',
    ];

    if (relationshipHint !== 'neutral') {
      parts.push(`## Relationship with User`);
      parts.push(`${relationshipHint}`);
      parts.push('');
    }

    if (goalHints) {
      parts.push(`## Active Goals`);
      parts.push(goalHints);
      parts.push('');
    }

    if (memoryHints) {
      parts.push(`## Recent Memories`);
      parts.push(memoryHints);
      parts.push('');
    }

    if (worldPerception) {
      parts.push(`## World Context`);
      parts.push(`Time: ${worldPerception.time || 'unknown'}`);
      if (worldPerception.activeEvents) {
        parts.push(`Active events: ${worldPerception.activeEvents}`);
      }
      parts.push('');
    }

    // 行为 prompt
    const behaviorPrompt = BehaviorEngine.buildPromptInjection(brain);
    parts.push(behaviorPrompt);

    return {
      systemPrompt: parts.join('\n'),
      characterName: name,
      dominantEmotion: `${dominant.dimension} (${dominant.value})`,
      behavior: {
        tone: behavior.tone,
        initiative: behavior.initiative,
        summary: behavior.summary,
      },
    };
  }
}
