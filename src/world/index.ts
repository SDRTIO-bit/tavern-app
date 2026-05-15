// ============================================================
// world — 世界模拟系统
//
// WorldState       — 世界状态（时间/地点/势力/事件）
// WorldEvent       — 世界事件
// FactionState     — 势力管理
// TimeEngine       — 时间引擎
// WorldEngine      — 世界主引擎
// WorldTickSystem  — 世界心跳
// ============================================================

export type {
  WorldState,
  WorldTime,
  LocationState,
  FactionState,
} from './WorldState';
export {
  getTimeOfDay,
  createDefaultWorldState,
  formatWorldTime,
} from './WorldState';

export type {
  WorldEvent,
  WorldEventType,
  WorldEventStatus,
} from './WorldEvent';
export {
  createWorldEvent,
  resolveWorldEvent,
  expireWorldEvent,
  getEventEmotionImpact,
} from './WorldEvent';

export { FactionManager } from './FactionState';

export { TimeEngine } from './TimeEngine';

export { WorldEngine } from './WorldEngine';

export type { WorldTickCallback, WorldTickConfig } from './WorldTickSystem';
export { WorldTickSystem } from './WorldTickSystem';
