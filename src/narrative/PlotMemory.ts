// ============================================================
// PlotMemory — 剧情记忆
//
// 已完成的剧情线留下的持久记忆。
// 影响角色长期行为、关系倾向、世界观。
// ============================================================

import { v4 as uuidv4 } from 'uuid';

/** 剧情记忆 */
export interface PlotMemory {
  /** 记忆 ID */
  id: string;
  /** 关联剧情线 ID */
  arcId: string;
  /** 弧标题 */
  arcTitle: string;
  /** 弧类型 */
  arcType: string;
  /** 摘要 */
  summary: string;
  /** 重要性 (0~100) */
  importance: number;
  /** 情感基调 */
  emotionalTone: 'positive' | 'negative' | 'neutral';
  /** 涉及角色 */
  participants: string[];
  /** 创建时间戳 */
  timestamp: number;
  /** 附加教训（角色从中学到的） */
  lessons?: string[];
}

/** 从 StoryArc 创建剧情记忆 */
export function createPlotMemoryFromArc(
  arc: { id: string; title: string; type: string; intensity: number; participants: string[]; memories: Array<{ summary: string; emotionalTone: 'positive' | 'negative' | 'neutral' }> },
): PlotMemory {
  // 合并所有篇章记忆为一条摘要
  const summaries = arc.memories.map((m) => m.summary);
  const dominantTone = getDominantTone(arc.memories.map((m) => m.emotionalTone));

  return {
    id: uuidv4(),
    arcId: arc.id,
    arcTitle: arc.title,
    arcType: arc.type,
    summary: summaries.join(' → '),
    importance: arc.intensity,
    emotionalTone: dominantTone,
    participants: [...arc.participants],
    timestamp: Date.now(),
    lessons: generateLessons(arc.type, dominantTone),
  };
}

/** 获取主导情感基调 */
function getDominantTone(
  tones: Array<'positive' | 'negative' | 'neutral'>,
): 'positive' | 'negative' | 'neutral' {
  let pos = 0, neg = 0;
  for (const t of tones) {
    if (t === 'positive') pos++;
    else if (t === 'negative') neg++;
  }
  if (pos > neg) return 'positive';
  if (neg > pos) return 'negative';
  return 'neutral';
}

/** 根据弧类型生成教训 */
function generateLessons(
  arcType: string,
  tone: 'positive' | 'negative' | 'neutral',
): string[] {
  const lessons: Record<string, string[]> = {
    conflict: ['Arguments leave scars.', 'Trust takes time to rebuild.'],
    friendship: ['True bonds grow through shared experience.'],
    betrayal: ['Trust is fragile.', 'Not everyone has good intentions.'],
    redemption: ['People can change.', 'Forgiveness heals both sides.'],
    discovery: ['Curiosity leads to growth.', 'The world holds many secrets.'],
    political: ['Power is a double-edged sword.', 'Alliances shift like sand.'],
    romance: ['Love requires vulnerability.', 'Connection is worth the risk.'],
    tragedy: ['Loss changes you forever.', 'Cherish what you have.'],
  };

  const candidates = lessons[arcType] ?? ['Every story teaches something.'];
  return candidates.slice(0, 2);
}

/** 剧情记忆摘要 */
export function summarizePlotMemory(memory: PlotMemory): string {
  const toneIcon =
    memory.emotionalTone === 'positive' ? '🟢' :
    memory.emotionalTone === 'negative' ? '🔴' : '⚪';

  return `${toneIcon} [${memory.arcType}] "${memory.arcTitle}" | importance=${memory.importance} | ${memory.participants.join(', ')} | ${memory.summary.slice(0, 80)}`;
}

/** 生成剧情历史文本（用于 prompt 注入） */
export function getNarrativeHistory(
  memories: PlotMemory[],
  maxItems: number = 5,
): string {
  if (memories.length === 0) return '';

  const sorted = [...memories]
    .sort((a, b) => b.importance - a.importance)
    .slice(0, maxItems);

  const lines = ['## Narrative History', ''];
  for (const m of sorted) {
    lines.push(
      `- ${m.emotionalTone === 'negative' ? '💔' : '💖'} "${m.arcTitle}" (${m.arcType}): ${m.summary.slice(0, 100)}`,
    );
  }

  return lines.join('\n');
}
