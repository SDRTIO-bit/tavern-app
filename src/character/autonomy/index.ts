// ============================================================
// autonomy — 角色自主性模块
//
// AutonomyPolicy           — 决策策略（分数计算 + 行动选择）
// AutonomyTick             — 心跳定时系统
// ActionPlanner            — 行动规划器（消息/工具/事件）
// CharacterAutonomyEngine  — 核心引擎 + 集成入口
// ============================================================

export type {
  AutonomyScore,
  AutonomyActionType,
  AutonomyPolicyConfig,
} from './AutonomyPolicy';
export { AutonomyPolicy, DEFAULT_AUTONOMY_CONFIG } from './AutonomyPolicy';

export type { TickCallback, TickConfig } from './AutonomyTick';
export { AutonomyTickSystem } from './AutonomyTick';

export type { AutonomyAction } from './ActionPlanner';
export { ActionPlanner } from './ActionPlanner';

export type {
  AutonomyContext,
  AutonomyTickResult,
} from './CharacterAutonomyEngine';
export {
  CharacterAutonomyEngine,
  runAutonomyAction,
} from './CharacterAutonomyEngine';
export { applyWorldImpact, globalWorldTick } from './WorldImpact';
