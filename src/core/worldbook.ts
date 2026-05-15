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
  let totalLength = 0;
  const MAX_WORLDBOOK_CHARS = 12000; // 约 3000 tokens 预算

  for (const entry of active) {
    // 常量条目始终激活（不需要关键词）
    if (entry.constant) {
      // 预算检查：如果已经很大了，跳过低优先级常量条目
      if (totalLength + entry.content.length > MAX_WORLDBOOK_CHARS && (entry.priority ?? 0) > 100) {
        continue;
      }
      matched.push(entry);
      totalLength += entry.content.length;
      continue;
    }

    // 空关键词且非常量 → 跳过
    if (!entry.keys?.length) {
      continue;
    }

    const hit = entry.keys.some((key) => {
      if (!key) return false;
      return texts.some((t) => t.toLowerCase().includes(key.toLowerCase()));
    });
    if (hit) {
      // 关键词触发的条目更精确，始终加入（但仍有总预算）
      if (totalLength + entry.content.length > MAX_WORLDBOOK_CHARS * 1.5) {
        continue;
      }
      matched.push(entry);
      totalLength += entry.content.length;
    }
  }

  if (matched.length === 0) {
    return { entries: [], systemText: "" };
  }

  // 按 priority 排序，priority 越小的在前面（插入顺序）
  matched.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

  const systemText =
    "[WorldBook]\n" +
    matched.map((e) => `[${e.comment || e.id}]\n${e.content}`).join("\n\n");

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
