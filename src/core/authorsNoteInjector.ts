// ============================================================
// authorsNoteInjector — Author's Note（酒馆助手）注入引擎
//
// 将 AN 文本作为一条 system message 插入到消息列表的指定位置。
// 对齐 SillyTavern 行为：
//   - top    = 消息列表最前面（system 之后，第一条对话前）
//   - bottom = 消息列表最后面（最后一条对话后）
//   - depth  = 从末尾数第 N 条消息之前插入
// ============================================================

import { AuthorsNote } from "@/types/authorsNote";

export interface InjectANResult {
  system: string;
  messages: Array<{ role: string; content: string }>;
}

/**
 * 将 Author's Note 注入到消息列表中。
 * 三种模式均注入为一条独立的 system message。
 */
export function injectAuthorsNote(
  an: AuthorsNote,
  originalSystem: string,
  messages: Array<{ role: string; content: string }>
): InjectANResult {
  if (!an.enabled || !an.content.trim()) {
    return { system: originalSystem, messages };
  }

  const noteContent = `[Author's Note]\n${an.content.trim()}`;
  const noteMsg = { role: 'system' as const, content: noteContent };

  switch (an.position) {
    case 'top': {
      // 插入到消息列表最前面（system 之后，第一条对话之前）
      return {
        system: originalSystem,
        messages: [noteMsg, ...messages],
      };
    }

    case 'bottom': {
      // 插入到消息列表最后面
      return {
        system: originalSystem,
        messages: [...messages, noteMsg],
      };
    }

    case 'depth': {
      // depth=0 → 最前面; depth=4 → 从末尾数第 4 条前
      const depth = Math.max(0, an.depth);
      const insertIndex = Math.min(
        Math.max(0, messages.length - depth),
        messages.length,
      );
      return {
        system: originalSystem,
        messages: [
          ...messages.slice(0, insertIndex),
          noteMsg,
          ...messages.slice(insertIndex),
        ],
      };
    }

    default:
      return { system: originalSystem, messages };
  }
}
