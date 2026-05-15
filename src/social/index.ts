// ============================================================
// social — 社交模拟系统
//
// SocialGraph          — 角色关系网络
// InteractionEvent     — NPC 互动事件
// RelationshipEngine   — 关系演化
// NPCScheduler         — NPC 自主互动调度
// SocialEventProcessor — 事件应用到图+角色
// NPCWorldTick         — 全局社交心跳
// ============================================================

export type {
  SocialGraph,
  SocialNode,
  SocialEdge,
} from './SocialGraph';
export {
  createSocialGraph,
  addSocialNode,
  removeSocialNode,
  getOrCreateEdge,
  updateEdge,
  getOutgoingEdges,
  getIncomingEdges,
  getRelationshipSummary,
  getGraphStats,
} from './SocialGraph';

export type {
  InteractionEvent,
  InteractionType,
  InteractionImpact,
} from './InteractionEvent';
export {
  createInteractionEvent,
  describeInteraction,
} from './InteractionEvent';

export { RelationshipEngine } from './RelationshipEngine';

export type { NPCSchedulerConfig } from './NPCScheduler';
export { NPCScheduler } from './NPCScheduler';

export { SocialEventProcessor } from './SocialEventProcessor';

export type { NPCTickResult } from './NPCWorldTick';
export { NPCWorldTick } from './NPCWorldTick';
