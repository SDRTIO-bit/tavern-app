// ============================================================
// runtime — 角色运行时引擎
//
// EmotionTypes   — 核心类型
// EmotionRules   — 规则驱动的情绪评估
// EmotionEngine  — 情绪运行时（用户消息 / 事件 / 衰减）
// BehaviorEngine — 行为决策（tone / initiative / prompt 注入）
// ============================================================

export type {
  EmotionDelta,
  EmotionInfluenceContext,
  EmotionInfluenceType,
  CharacterTone,
  CharacterInitiative,
  BehaviorDecision,
} from './EmotionTypes';
export { getEmotionLabel } from './EmotionTypes';

export type { EmotionRule } from './EmotionRules';
export { EmotionRules } from './EmotionRules';

export { EmotionEngine } from './EmotionEngine';
export { BehaviorEngine } from './BehaviorEngine';
export {
  applyUserInteraction,
  applyEmotionDecay,
  buildCharacterPromptInjection,
} from './CharacterPipeline';
