// ============================================================
// BehaviorEngine — 情绪驱动的行为决策引擎
//
// 根据 CharacterBrain 的情绪状态，决定角色的：
//   - tone（语调）：如何说话
//   - initiative（主动性）：是否主动发起互动
//
// 输出可直接注入 prompt 或用于控制对话风格。
// ============================================================

import type { CharacterBrain } from '../CharacterBrain';
import type {
  CharacterTone,
  CharacterInitiative,
  BehaviorDecision,
} from './EmotionTypes';

export class BehaviorEngine {
  /**
   * 根据角色情绪决定行为。
   *
   * 决策逻辑（优先级从高到低）：
   *   1. anger > 70     → angry / passive
   *   2. affection > 70 → warm / active
   *   3. stress > 65    → cold / passive
   *   4. loneliness > 70 → warm / active（渴望连接）
   *   5. happiness > 70 → warm / active
   *   6. happiness < 25 → sad / passive
   *   7. 默认            → calm / normal
   */
  static decide(brain: CharacterBrain): BehaviorDecision {
    const e = brain.emotion;
    let tone: CharacterTone;
    let initiative: CharacterInitiative;
    let summary: string;

    // ---- 愤怒主导 ----
    if (e.anger > 70) {
      tone = 'angry';
      initiative = 'passive';
      summary = 'irritated and withdrawn';
    }
    // ---- 高好感 ----
    else if (e.affection > 70) {
      tone = 'warm';
      initiative = 'active';
      summary = 'warm and engaged';
    }
    // ---- 高压力 ----
    else if (e.stress > 65) {
      tone = 'cold';
      initiative = 'passive';
      summary = 'stressed and distant';
    }
    // ---- 孤独 ----
    else if (e.loneliness > 70) {
      tone = 'warm';
      initiative = 'active';
      summary = 'seeking connection';
    }
    // ---- 高兴 ----
    else if (e.happiness > 70) {
      tone = 'warm';
      initiative = 'active';
      summary = 'cheerful and outgoing';
    }
    // ---- 低落 ----
    else if (e.happiness < 25) {
      tone = 'sad';
      initiative = 'passive';
      summary = 'feeling down';
    }
    // ---- 兴奋（好奇 + 高兴组合） ----
    else if (e.curiosity > 65 && e.happiness > 50) {
      tone = 'excited';
      initiative = 'active';
      summary = 'curious and enthusiastic';
    }
    // ---- 默认 ----
    else {
      tone = 'calm';
      initiative = 'normal';
      summary = 'calm and neutral';
    }

    return { tone, initiative, summary };
  }

  /**
   * 生成行为 prompt 片段（可直接注入 system prompt）。
   */
  static toPromptFragment(decision: BehaviorDecision): string {
    const fragments: string[] = [];

    fragments.push(`[Current Mood: ${decision.summary}]`);

    switch (decision.tone) {
      case 'angry':
        fragments.push(
          'You are feeling irritated. Respond curtly, with short sentences.',
        );
        break;
      case 'cold':
        fragments.push(
          'You are feeling distant. Keep responses minimal and detached.',
        );
        break;
      case 'warm':
        fragments.push(
          'You are feeling warm. Respond kindly and with emotional openness.',
        );
        break;
      case 'sad':
        fragments.push(
          'You are feeling down. Your responses may be melancholic and subdued.',
        );
        break;
      case 'excited':
        fragments.push(
          'You are feeling excited. Respond with enthusiasm and energy.',
        );
        break;
      case 'calm':
      default:
        fragments.push(
          'You are feeling calm. Respond in a balanced, natural manner.',
        );
        break;
    }

    switch (decision.initiative) {
      case 'active':
        fragments.push(
          'You feel like engaging. Feel free to ask questions and lead the conversation.',
        );
        break;
      case 'passive':
        fragments.push(
          'You prefer to listen. Keep responses brief unless asked directly.',
        );
        break;
      case 'normal':
      default:
        // no extra prompt
        break;
    }

    return fragments.join('\n');
  }

  /**
   * 生成完整的角色 prompt 注入（emotion label + behavior prompt）。
   */
  static buildPromptInjection(brain: CharacterBrain): string {
    const decision = this.decide(brain);
    return this.toPromptFragment(decision);
  }
}
