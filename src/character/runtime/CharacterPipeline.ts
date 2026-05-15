// ============================================================
// CharacterPipeline — 角色运行时 Pipeline Hook
//
// 整合 EmotionEngine + BehaviorEngine，提供单一入口：
//   applyUserInteraction(brain, userText) → CharacterBrain
//
// 用于在 runtime hooks 中接入 CharacterBrain：
//   afterBuild(ctx) {
//     ctx.session.characterBrain =
//       applyUserInteraction(ctx.session.characterBrain, ctx.userInput)
//   }
// ============================================================

import type { CharacterBrain } from '../CharacterBrain';
import { EmotionEngine } from './EmotionEngine';
import { BehaviorEngine } from './BehaviorEngine';

/**
 * 应用用户交互 Pipeline：
 *   1. 用户输入 → EmotionEngine 更新情绪
 *   2. 新情绪 → BehaviorEngine 决定行为
 *   3. 行为写入 brain.metadata.behavior
 *
 * 返回新的 CharacterBrain（不可变）。
 */
export function applyUserInteraction(
  brain: CharacterBrain,
  userText: string,
): CharacterBrain {
  // 1️⃣ 更新情绪
  const updated = EmotionEngine.applyUserMessage(brain, userText);

  // 2️⃣ 更新行为倾向（写入 metadata）
  const behavior = BehaviorEngine.decide(updated);

  return {
    ...updated,
    metadata: {
      ...updated.metadata,
      behavior,
    },
  };
}

/**
 * 情绪衰减 Pipeline（用于定时触发）。
 */
export function applyEmotionDecay(brain: CharacterBrain): CharacterBrain {
  const decayed = EmotionEngine.decayOverTime(brain);

  // 衰减后重新评估行为
  const behavior = BehaviorEngine.decide(decayed);

  return {
    ...decayed,
    metadata: {
      ...decayed.metadata,
      behavior,
    },
  };
}

/**
 * 生成完整的 prompt 注入片段。
 * 整合情绪描述 + 行为 prompt。
 */
export function buildCharacterPromptInjection(
  brain: CharacterBrain,
): string {
  const emotionDesc = EmotionEngine.describeEmotion(brain);
  const behaviorPrompt = BehaviorEngine.buildPromptInjection(brain);

  const behavior = brain.metadata?.behavior as
    | { tone: string; initiative: string; summary: string }
    | undefined;

  return [
    `/* CHARACTER STATE */`,
    `Mood: ${emotionDesc}`,
    behavior?.summary ? `Behavior: ${behavior.summary}` : '',
    '',
    behaviorPrompt,
  ]
    .filter(Boolean)
    .join('\n');
}
