// ============================================================
// StoryArc — 剧情线
//
// 从随机事件中提炼的结构化叙事线：
//   setup → rising → climax → fallout → resolved
//
// 每条弧有参与者、伏笔、事件链、强度和篇章记忆。
// ============================================================

import { v4 as uuidv4 } from 'uuid';

/** 剧情阶段 */
export type ArcPhase = 'setup' | 'rising' | 'climax' | 'fallout' | 'resolved';

/** 剧情线类型 */
export type ArcType =
  | 'conflict'      // 冲突/对抗
  | 'friendship'    // 友谊发展
  | 'betrayal'      // 背叛
  | 'redemption'    // 救赎
  | 'discovery'     // 发现/探索
  | 'political'     // 政治阴谋
  | 'romance'       // 感情线
  | 'tragedy';      // 悲剧

/** 篇章记忆条目 */
export interface ArcMemory {
  /** 记忆 ID */
  id: string;
  /** 阶段 */
  phase: ArcPhase;
  /** 摘要 */
  summary: string;
  /** 重要性 (0~100) */
  importance: number;
  /** 情感基调 */
  emotionalTone: 'positive' | 'negative' | 'neutral';
  /** 时间戳 */
  timestamp: number;
}

/** 剧情线 */
export interface StoryArc {
  /** 弧 ID */
  id: string;

  /** 弧标题 */
  title: string;

  /** 弧类型 */
  type: ArcType;

  /** 当前阶段 */
  phase: ArcPhase;

  /** 强度 (0~100)，随推进递增 */
  intensity: number;

  /** 参与者角色 ID 列表 */
  participants: string[];

  /** 伏笔列表 */
  hooks: string[];

  /** 关联事件 ID 列表 */
  events: string[];

  /** 篇章记忆（每阶段一条） */
  memories: ArcMemory[];

  /** 开始时间戳（毫秒） */
  startedAt: number;

  /** 结束时间戳（毫秒） */
  resolvedAt?: number;

  /** 附加元数据 */
  metadata?: Record<string, unknown>;
}

/** 创建剧情线 */
export function createStoryArc(
  title: string,
  type: ArcType,
  participants: string[],
  hooks: string[] = [],
  events: string[] = [],
): StoryArc {
  return {
    id: uuidv4(),
    title,
    type,
    phase: 'setup',
    intensity: 20,
    participants,
    hooks,
    events,
    memories: [],
    startedAt: Date.now(),
  };
}

/** 推进剧情阶段 */
export function progressArc(arc: StoryArc): StoryArc {
  const phaseOrder: ArcPhase[] = [
    'setup',
    'rising',
    'climax',
    'fallout',
    'resolved',
  ];

  const currentIdx = phaseOrder.indexOf(arc.phase);
  if (currentIdx < 0 || currentIdx >= phaseOrder.length - 1) {
    // 已结束或未知状态
    return arc;
  }

  const nextPhase = phaseOrder[currentIdx + 1];
  const intensityGain = getIntensityGain(nextPhase);

  // 创建篇章记忆
  const memory: ArcMemory = {
    id: uuidv4(),
    phase: arc.phase,
    summary: getPhaseSummary(arc, arc.phase),
    importance: arc.intensity,
    emotionalTone: getPhaseTone(arc.phase),
    timestamp: Date.now(),
  };

  const updated: StoryArc = {
    ...arc,
    phase: nextPhase,
    intensity: Math.min(100, arc.intensity + intensityGain),
    memories: [...arc.memories, memory],
  };

  // 如果推进到 resolved
  if (nextPhase === 'resolved') {
    updated.resolvedAt = Date.now();
  }

  return updated;
}

/** 向弧添加事件 */
export function addEventToArc(arc: StoryArc, eventId: string): StoryArc {
  if (arc.events.includes(eventId)) return arc;
  return {
    ...arc,
    events: [...arc.events, eventId],
  };
}

/** 添加伏笔 */
export function addHookToArc(arc: StoryArc, hook: string): StoryArc {
  return {
    ...arc,
    hooks: [...arc.hooks, hook],
  };
}

/** 弧摘要 */
export function summarizeArc(arc: StoryArc): string {
  const participantStr = arc.participants.join(', ');
  const phaseIcon = getPhaseIcon(arc.phase);
  return `${phaseIcon} [${arc.phase}] "${arc.title}" (${arc.type}) | intensity=${arc.intensity} | ${arc.participants.length} participant(s): ${participantStr} | ${arc.events.length} event(s)`;
}

// ---- 内部辅助 ----

function getIntensityGain(phase: ArcPhase): number {
  switch (phase) {
    case 'rising': return 20;
    case 'climax': return 25;
    case 'fallout': return 10;
    case 'resolved': return 0;
    default: return 0;
  }
}

function getPhaseSummary(arc: StoryArc, phase: ArcPhase): string {
  const names = arc.participants.join(', ');
  switch (phase) {
    case 'setup': return `Tensions begin to rise between ${names}.`;
    case 'rising': return `The situation escalates for ${names}.`;
    case 'climax': return `A breaking point is reached among ${names}.`;
    case 'fallout': return `The aftermath settles between ${names}.`;
    case 'resolved': return `The story concludes for ${names}.`;
  }
}

function getPhaseTone(phase: ArcPhase): 'positive' | 'negative' | 'neutral' {
  switch (phase) {
    case 'climax': return 'negative';
    case 'fallout': return 'negative';
    case 'rising': return 'neutral';
    case 'resolved': return 'positive';
    case 'setup': return 'neutral';
  }
}

function getPhaseIcon(phase: ArcPhase): string {
  switch (phase) {
    case 'setup': return '🌱';
    case 'rising': return '📈';
    case 'climax': return '💥';
    case 'fallout': return '🌧️';
    case 'resolved': return '✅';
  }
}
