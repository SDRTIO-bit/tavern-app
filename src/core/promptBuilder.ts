// ============================================================
// promptBuilder — Prompt 构造器（AST 版）
//
// 每次请求：
//   1. 各模块生成 PromptNode → 注入 AST
//   2. 按 slot + priority 排序
//   3. 渲染为 system + messages
// ============================================================

import { PromptAST, PromptNode, InjectionSlot } from "./promptAST";
import { createNode, anPositionToSlot } from "./injectionSlot";
import { Preset } from "@/types/preset";
import { WorldBookEntry } from "@/types/worldbook";
import { AuthorsNote } from "@/types/authorsNote";
import { matchWorldBook } from "./worldbook";

export interface BuildPromptInput {
  preset: Preset;
  characterSystemPrompt: string;
  worldBookEntries: WorldBookEntry[];
  authorsNote?: AuthorsNote;
  messages: Array<{ role: string; content: string }>;
  userInput: string;
}

export interface BuildPromptOutput {
  system: string;
  messages: Array<{ role: string; content: string }>;
  /** AST 节点（调试用） */
  astNodes: PromptNode[];
}

export function buildPrompt(input: BuildPromptInput): BuildPromptOutput {
  const {
    preset,
    characterSystemPrompt,
    worldBookEntries,
    authorsNote,
    messages,
    userInput,
  } = input;

  const ast = new PromptAST();

  // ---- 1. Preset system prompt ----
  if (preset.systemPrompt) {
    ast.add(createNode('preset', preset.systemPrompt));
  }

  // ---- 2. Jailbreak ----
  if (preset.jailbreak) {
    ast.add(createNode('jailbreak', preset.jailbreak));
  }

  // ---- 3. Character ----
  if (characterSystemPrompt) {
    ast.add(createNode('character', characterSystemPrompt));
  }

  // ---- 4. WorldBook ----
  if (worldBookEntries.length > 0) {
    const textsToMatch = messages
      .slice(-5)
      .map((m) => m.content)
      .concat(userInput)
      .filter(Boolean);

    const { systemText: worldbookText } = matchWorldBook(worldBookEntries, textsToMatch);
    if (worldbookText) {
      ast.add(createNode('worldbook', worldbookText));
    }
  }

  // ---- 5. Author's Note ----
  if (authorsNote?.enabled && authorsNote.content.trim()) {
    const anContent = `[Author's Note]\n${authorsNote.content.trim()}`;
    const anSlot = anPositionToSlot(authorsNote.position);

    if (anSlot === 'depth') {
      // depth 需要在 history 中插入，由 render 阶段特殊处理
      ast.add(createNode('an_depth', anContent, {
        slot: 'depth',
        asSystemMessage: true,
        metadata: { depth: authorsNote.depth },
      }));
    } else {
      ast.add(createNode('an_top', anContent, {
        slot: anSlot,
        asSystemMessage: true,
      }));
    }
  }

  // ---- 6. Chat history ----
  for (const msg of messages) {
    ast.add({
      type: 'chat_history',
      slot: 'history',
      priority: 0,
      content: `[${msg.role}]\n${msg.content}`,
      metadata: { originalRole: msg.role, originalContent: msg.content },
    });
  }

  // ---- 7. User input ----
  ast.add({
    type: 'user_input',
    slot: 'after_history',
    priority: 999,
    content: userInput,
    metadata: { originalRole: 'user', originalContent: userInput },
  });

  // ---- 渲染 ----
  const rendered = ast.render();
  const sortedNodes = ast.getSorted();

  // 处理 depth 注入（在 messages 中插入 AN）
  let finalMessages = rendered.messages.map((m) => ({
    role: m.role as 'user' | 'assistant' | 'system',
    content: m.content,
  }));

  // 把 user_input 加到 messages 末尾
  if (userInput) {
    finalMessages.push({ role: 'user', content: userInput });
  }

  // depth AN：从末尾第 N 条前插入
  const depthNodes = sortedNodes.filter((n) => n.slot === 'depth');
  for (const node of depthNodes) {
    const depth = (node.metadata?.depth as number) ?? 4;
    const insertAt = Math.max(0, finalMessages.length - depth);
    finalMessages.splice(insertAt, 0, { role: 'system', content: node.content });
  }

  return {
    system: rendered.system,
    messages: finalMessages,
    astNodes: sortedNodes,
  };
}
