// ============================================================
// character — 角色运行时状态模块
//
// EmotionState      — 情绪状态
// RelationshipState — 关系状态
// CharacterGoal     — 角色目标
// CharacterMemory   — 角色记忆
// CharacterBrain    — 角色大脑（整合所有状态）
// ============================================================

export type {
  EmotionState,
  EmotionDimension,
} from './EmotionState';
export {
  EMOTION_DIMENSIONS,
  EMOTION_MIN,
  EMOTION_MAX,
  clampEmotionValue,
  createDefaultEmotionState,
  modifyEmotion,
  modifyEmotions,
  getDominantEmotion,
} from './EmotionState';

export type {
  RelationshipState,
  RelationshipDimension,
} from './RelationshipState';
export {
  RELATIONSHIP_DIMENSIONS,
  RELATIONSHIP_MIN,
  RELATIONSHIP_MAX,
  createRelationshipState,
  clampRelationshipValue,
  updateRelationship,
  updateRelationships,
  addRelationshipNote,
  getRelationshipSummary,
} from './RelationshipState';

export type {
  CharacterGoal,
  GoalStatus,
} from './CharacterGoal';
export {
  createGoal,
  completeGoal,
  failGoal,
  sortGoalsByPriority,
  getActiveGoals,
  getGoalSummary,
} from './CharacterGoal';

export type { CharacterMemory } from './CharacterMemory';
export {
  createCharacterMemory,
  sortMemoriesByImportance,
  sortMemoriesByTime,
  getTopMemories,
  filterMemoriesByTag,
  searchMemories,
  aggregateEmotionImpact,
} from './CharacterMemory';

export type {
  CharacterBrain,
  CharacterCurrentState,
} from './CharacterBrain';
export {
  createCharacterBrain,
  serializeCharacterBrain,
  deserializeCharacterBrain,
  summarizeCharacterBrain,
} from './CharacterBrain';

// Runtime Engines
export type {
  EmotionDelta,
  EmotionInfluenceContext,
  EmotionInfluenceType,
  CharacterTone,
  CharacterInitiative,
  BehaviorDecision,
} from './runtime/EmotionTypes';
export { getEmotionLabel } from './runtime/EmotionTypes';
export type { EmotionRule } from './runtime/EmotionRules';
export { EmotionRules } from './runtime/EmotionRules';
export { EmotionEngine } from './runtime/EmotionEngine';
export { BehaviorEngine } from './runtime/BehaviorEngine';
export {
  applyUserInteraction,
  applyEmotionDecay,
  buildCharacterPromptInjection,
} from './runtime/CharacterPipeline';

// Autonomy
export type {
  AutonomyScore,
  AutonomyActionType,
  AutonomyPolicyConfig,
} from './autonomy/AutonomyPolicy';
export { AutonomyPolicy, DEFAULT_AUTONOMY_CONFIG } from './autonomy/AutonomyPolicy';
export type { TickCallback, TickConfig } from './autonomy/AutonomyTick';
export { AutonomyTickSystem } from './autonomy/AutonomyTick';
export type { AutonomyAction } from './autonomy/ActionPlanner';
export { ActionPlanner } from './autonomy/ActionPlanner';
export type {
  AutonomyContext,
  AutonomyTickResult,
} from './autonomy/CharacterAutonomyEngine';
export {
  CharacterAutonomyEngine,
  runAutonomyAction,
} from './autonomy/CharacterAutonomyEngine';
export { applyWorldImpact, globalWorldTick } from './autonomy/WorldImpact';
