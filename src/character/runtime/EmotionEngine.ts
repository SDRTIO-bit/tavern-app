// ============================================================
// EmotionEngine — 情绪运行时引擎
//
// 核心职责：
//   1. applyUserMessage  — 用户输入 → 情绪变化
//   2. applyEvent        — 事件 → 情绪变化
//   3. applyMemoryRecall — 记忆回想 → 情绪变化
//   4. decayOverTime     — 情绪自然衰减
//
// 所有方法返回新的 CharacterBrain（不可变）。
// ============================================================

import type { CharacterBrain } from '../CharacterBrain';
import { clampEmotionValue } from '../EmotionState';
import { EmotionRules } from './EmotionRules';
import type { EmotionDelta, EmotionInfluenceContext } from './EmotionTypes';
import type { EmotionState } from '../EmotionState';

export class EmotionEngine {
  /**
   * 处理用户消息，更新角色情绪。
   */
  static applyUserMessage(
    brain: CharacterBrain,
    userText: string,
  ): CharacterBrain {
    const delta = EmotionRules.evaluateUserMessage(userText);
    const newEmotion = applyDelta(brain.emotion, delta);
    return { ...brain, emotion: newEmotion };
  }

  /**
   * 处理事件影响。
   */
  static applyEvent(
    brain: CharacterBrain,
    ctx: EmotionInfluenceContext,
  ): CharacterBrain {
    const intensity = ctx.intensity ?? 1;
    const text = ctx.content ?? '';
    const delta = EmotionRules.evaluate(text, intensity);
    const newEmotion = applyDelta(brain.emotion, delta);
    return { ...brain, emotion: newEmotion };
  }

  /**
   * 根据记忆回想影响情绪。
   */
  static applyMemoryRecall(
    brain: CharacterBrain,
    emotionImpact: Partial<EmotionState>,
  ): CharacterBrain {
    const delta: EmotionDelta = {};
    for (const [key, value] of Object.entries(emotionImpact)) {
      if (value === undefined) continue;
      (delta as Record<string, number>)[key] = value;
    }
    const newEmotion = applyDelta(brain.emotion, delta);
    return { ...brain, emotion: newEmotion };
  }

  /**
   * 情绪自然衰减（随时间向中性 50 回归）。
   * 每次调用代表一个时间步长。
   *
   * 衰减规则：
   *   - 极端情绪（偏离 50 很远）衰减更快
   *   - 向 50 方向衰减
   */
  static decayOverTime(brain: CharacterBrain): CharacterBrain {
    const e = brain.emotion;
    const neutral = 50;
    const decayRate = 0.05; // 每步 5% 向中性回归

    const decayed: EmotionState = {
      happiness: decayToward(e.happiness, neutral, decayRate),
      stress: decayToward(e.stress, neutral, decayRate),
      trust: decayToward(e.trust, neutral, decayRate * 0.3), // 信任衰减慢
      affection: decayToward(e.affection, neutral, decayRate * 0.3),
      anger: decayToward(e.anger, 0, decayRate * 0.8), // 愤怒向 0 快速衰减
      loneliness: decayToward(e.loneliness, neutral, decayRate),
      curiosity: decayToward(e.curiosity, neutral, decayRate),
    };

    return { ...brain, emotion: decayed };
  }

  /**
   * 获取当前情绪的文本描述。
   */
  static describeEmotion(brain: CharacterBrain): string {
    const e = brain.emotion;
    const parts: string[] = [];

    if (e.anger > 70) parts.push('angry');
    else if (e.anger > 55) parts.push('irritated');

    if (e.happiness > 70) parts.push('happy');
    else if (e.happiness < 30) parts.push('unhappy');

    if (e.stress > 70) parts.push('stressed');
    if (e.loneliness > 70) parts.push('lonely');
    if (e.affection > 70) parts.push('affectionate');
    if (e.trust < 30) parts.push('distrustful');
    if (e.curiosity > 70) parts.push('curious');

    return parts.length > 0 ? parts.join(', ') : 'neutral';
  }
}

// ---- 内部辅助 ----

/** 将 delta 应用到 EmotionState */
function applyDelta(emotion: EmotionState, delta: EmotionDelta): EmotionState {
  const result = { ...emotion };
  for (const key of Object.keys(delta) as (keyof EmotionDelta)[]) {
    const value = delta[key];
    if (value === undefined) continue;
    (result as Record<string, number>)[key] = clampEmotionValue(
      (result as Record<string, number>)[key] + value,
    );
  }
  return result;
}

/** 向目标值衰减 */
function decayToward(
  current: number,
  target: number,
  rate: number,
): number {
  const diff = target - current;
  const step = diff * rate;
  // 保留至少 1 位小数精度
  const result = current + step;
  return Math.round(result * 10) / 10;
}
