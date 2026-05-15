// ============================================================
// narrative — 剧情引擎
//
// StoryArc          — 剧情线（setup → rising → climax → fallout → resolved）
// StoryEvent        — 剧情事件（foreshadow/trigger/escalation/climax/resolution）
// PlotMemory        — 剧情记忆（持久化的已完成弧）
// ArcBuilder        — 事件模式检测 → 自动生成弧
// NarrativeEngine   — 主引擎（tick: 检测 + 推进 + 注入角色 + 沉淀记忆）
// ============================================================

export type {
  StoryArc,
  ArcPhase,
  ArcType,
  ArcMemory,
} from './StoryArc';
export {
  createStoryArc,
  progressArc,
  addEventToArc,
  addHookToArc,
  summarizeArc,
} from './StoryArc';

export type {
  StoryEvent,
  StoryEventType,
  StoryEventImpact,
} from './StoryEvent';
export {
  createStoryEvent,
  describeStoryEvent,
} from './StoryEvent';

export type { PlotMemory } from './PlotMemory';
export {
  createPlotMemoryFromArc,
  summarizePlotMemory,
  getNarrativeHistory,
} from './PlotMemory';

export type { ArcTriggerEvent } from './ArcBuilder';
export { ArcBuilder } from './ArcBuilder';

export type { NarrativeEngineConfig } from './NarrativeEngine';
export { NarrativeEngine } from './NarrativeEngine';
