// ============================================================
// SessionMemory — 记忆引擎
//
// 检索：关键词 + 重要性加权
// 写入：重要性衰减 + 标签 + 情绪影响
// ============================================================

import { v4 as uuidv4 } from "uuid";
import type { MemoryEntry } from "./SessionTypes";

/** 从文本提取关键词（简单分词） */
function extractKeywords(text: string): string[] {
  // 中文按常见标点分割，英文按空格
  const cleaned = text.replace(/[，。！？、；：""''（）\n\r]/g, " ");
  const words = cleaned
    .split(/\s+/)
    .filter((w) => w.length >= 2)
    .map((w) => w.toLowerCase());
  // 去重
  return [...new Set(words)];
}

/** 计算两条文本的匹配分数 */
function matchScore(query: string, memoryContent: string): number {
  const queryWords = extractKeywords(query);
  const memWords = extractKeywords(memoryContent);

  if (queryWords.length === 0 || memWords.length === 0) return 0;

  let hits = 0;
  for (const qw of queryWords) {
    if (memWords.some((mw) => mw.includes(qw) || qw.includes(mw))) {
      hits++;
    }
  }

  return hits / Math.max(queryWords.length, 1);
}

export class SessionMemory {
  /**
   * 检索相关记忆。
   *
   * @param memories 所有记忆
   * @param query 用户输入
   * @param maxResults 最大返回数
   * @param minImportance 最低重要性
   */
  static retrieve(
    memories: MemoryEntry[],
    query: string,
    maxResults: number = 5,
    minImportance: number = 10,
  ): MemoryEntry[] {
    if (!query.trim() || memories.length === 0) {
      // 无查询 → 返回重要性最高的
      return [...memories]
        .sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0))
        .slice(0, maxResults);
    }

    // 计算每条记忆的加权分数
    const scored = memories.map((m) => {
      const relevance = matchScore(query, m.content);
      const recency = Math.max(0, 1 - (Date.now() - m.timestamp) / (24 * 60 * 60 * 1000)); // 24h 衰减
      const score = relevance * 0.6 + ((m.importance ?? 50) / 100) * 0.25 + recency * 0.15;
      return { memory: m, score };
    });

    return scored
      .filter((s) => (s.memory.importance ?? 0) >= minImportance)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map((s) => s.memory);
  }

  /**
   * 添加新记忆。
   * 自动生成标签和情绪影响。
   */
  static addMemory(
    content: string,
    importance: number = 50,
    tags?: string[],
    emotionImpact?: Record<string, number>,
  ): MemoryEntry {
    const autoTags = extractKeywords(content).slice(0, 5);

    return {
      id: uuidv4(),
      timestamp: Date.now(),
      content,
      importance: Math.max(0, Math.min(100, Math.round(importance))),
      tags: tags ?? autoTags,
      emotionImpact,
    };
  }

  /**
   * 合并用户消息到记忆（自动提取关键信息）。
   */
  static addUserMessage(content: string): MemoryEntry {
    // 长消息或含关键词的消息重要性更高
    const hasQuestion = /[？?]/.test(content);
    const hasEmotion = /[难过|开心|生气|害怕|担心|喜欢|讨厌|爱|恨]/.test(content);
    const lengthBonus = Math.min(content.length / 10, 20);

    let importance = 30 + lengthBonus;
    if (hasQuestion) importance += 15;
    if (hasEmotion) importance += 20;

    return this.addMemory(content, importance, undefined, { curiosity: 5 });
  }

  /**
   * 合并 AI 回复到记忆。
   */
  static addAssistantReply(content: string): MemoryEntry {
    return this.addMemory(content, 25, undefined, { trust: 2 });
  }

  /**
   * 记忆衰减：重要性随时间缓慢降低。
   */
  static decay(memories: MemoryEntry[]): MemoryEntry[] {
    const now = Date.now();
    const decayRate = 0.01; // 每小时降低 1%

    return memories.map((m) => {
      const hoursSince = (now - m.timestamp) / (60 * 60 * 1000);
      const decay = hoursSince * decayRate;
      return {
        ...m,
        importance: Math.max(5, Math.round((m.importance ?? 50) - decay)),
      };
    });
  }

  /**
   * 格式化记忆列表（供 Prompt 注入 / 控制台显示）。
   */
  static formatForPrompt(memories: MemoryEntry[], maxChars: number = 500): string {
    if (memories.length === 0) return "";

    let total = 0;
    const lines: string[] = [];

    for (const m of memories) {
      const line = `- ${m.content.slice(0, 80)}`;
      total += line.length;
      if (total > maxChars) break;
      lines.push(line);
    }

    return lines.join("\n");
  }

  /**
   * 格式化记忆（供控制台显示）。
   */
  static formatForConsole(memories: MemoryEntry[]): string[] {
    return memories.map(
      (m) => `${m.content.slice(0, 80)} [imp=${m.importance}]`,
    );
  }
}
