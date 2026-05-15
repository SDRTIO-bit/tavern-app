// ============================================================
// worldbook — LoreBook 关键词匹配 + 注入引擎
//
// 发送消息时扫描用户输入和最近历史，
// 命中关键词则自动将 lore 内容注入到消息列表头部。
// ============================================================

import { WorldBookEntry } from "@/types/worldbook";

export interface MatchResult {
  /** 命中的条目 */
  entries: WorldBookEntry[];
  /** 注入用的 system message 文本 */
  systemText: string;
}

/**
 * 对文本进行关键词匹配。
 *
 * @param entries  所有启用的 lore 条目
 * @param texts    待匹配的文本列表（用户输入 + 最近历史）
 * @returns 匹配结果
 */
export function matchWorldBook(
  entries: WorldBookEntry[],
  texts: string[]
): MatchResult {
  const active = entries.filter((e) => e.enabled);
  if (active.length === 0 || texts.length === 0) {
    return { entries: [], systemText: "" };
  }

  const matched: WorldBookEntry[] = [];

  for (const entry of active) {
    const hit = entry.keys.some((key) => {
      if (!key) return false;
      return texts.some((t) => t.toLowerCase().includes(key.toLowerCase()));
    });
    if (hit) {
      matched.push(entry);
    }
  }

  if (matched.length === 0) {
    return { entries: [], systemText: "" };
  }

  const systemText =
    "[WorldBook]\n" +
    matched.map((e) => `[${e.id}]\n${e.content}`).join("\n\n");

  return { entries: matched, systemText };
}

/**
 * 将 worldbook 内容注入到消息列表头部（作为 system message）。
 *
 * @param messages  原始消息列表
 * @param entries   已匹配的条目
 * @returns         注入后的消息列表
 */
export function injectWorldBook(
  messages: Array<{ role: string; content: string }>,
  systemText: string
): Array<{ role: string; content: string }> {
  if (!systemText) return messages;
  return [{ role: "system", content: systemText }, ...messages];
}
