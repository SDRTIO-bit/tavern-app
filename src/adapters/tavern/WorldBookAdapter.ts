// ============================================================
// WorldBookAdapter — 世界书适配器
//
// 将 SillyTavern 的 world_info 条目注入 Runtime 的 WorldBook 系统。
// 支持关键词触发和常量条目。
// ============================================================

import type { TavernWorldBookEntry } from './TavernRequestParser';
import type { WorldBookEntry } from '@/types/worldbook';

/** WorldBook 注入目标接口 */
export interface WorldBookInjectable {
  /** 设置世界书条目 */
  worldBookEntries: WorldBookEntry[];
  /** 是否启用世界书 */
  worldBookEnabled: boolean;
}

/** 将 Tavern position 映射到内部 position */
function mapPosition(
  pos?: string,
): WorldBookEntry['position'] {
  switch (pos) {
    case 'before_char': return 'before';
    case 'after_char': return 'after';
    default: return undefined;
  }
}

export class WorldBookAdapter {
  /**
   * 将 Tavern 世界书条目转换为内部格式并注入。
   *
   * @param entries Tavern 世界书条目
   * @param target 注入目标（Runtime / PromptBuilder）
   */
  static inject(
    entries: TavernWorldBookEntry[],
    target: WorldBookInjectable,
  ): void {
    if (!entries || entries.length === 0) return;

    const converted: WorldBookEntry[] = [];

    for (const entry of entries) {
      // 跳过没有 key 或 content 的条目
      if (!entry.keys || entry.keys.length === 0) continue;
      if (!entry.content) continue;

      const position = mapPosition(entry.position);

      const worldBookEntry: WorldBookEntry = {
        id: String(entry.id ?? Date.now()),
        keys: entry.keys,
        content: entry.content,
        enabled: true,
        selective: entry.selective ?? false,
        priority: entry.priority ?? 0,
        position,
      };

      converted.push(worldBookEntry);
    }

    // 排序：priority 高 → 前
    converted.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    target.worldBookEntries = converted;
    target.worldBookEnabled = true;
  }

  /**
   * 将单个世界书条目注入（用于动态 worldbook 更新）。
   */
  static injectSingle(
    entry: TavernWorldBookEntry,
    existing: WorldBookEntry[],
  ): WorldBookEntry[] {
    const position = mapPosition(entry.position);

    const converted: WorldBookEntry = {
      id: String(entry.id ?? Date.now()),
      keys: entry.keys,
      content: entry.content,
      enabled: true,
      selective: entry.selective ?? false,
      priority: entry.priority ?? 0,
      position,
    };

    const filtered = existing.filter(
      (e) => e.id !== converted.id,
    );

    return [...filtered, converted].sort(
      (a, b) => (b.priority ?? 0) - (a.priority ?? 0),
    );
  }

  /**
   * 根据用户输入匹配世界书条目。
   * 返回匹配的条目列表（selective=true 时）。
   */
  static matchEntries(
    userInput: string,
    entries: TavernWorldBookEntry[],
  ): TavernWorldBookEntry[] {
    const matched: TavernWorldBookEntry[] = [];
    const lowerInput = userInput.toLowerCase();

    for (const entry of entries) {
      // 常量条目始终激活
      if (entry.constant) {
        matched.push(entry);
        continue;
      }

      // 检查关键词匹配
      const keyMatched = entry.keys.some((key) =>
        lowerInput.includes(key.toLowerCase()),
      );

      if (keyMatched) {
        matched.push(entry);
      }
    }

    return matched;
  }
}
