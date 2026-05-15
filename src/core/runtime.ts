// ============================================================
// runtime.ts — Runtime Facade (A4 实时追踪版)
//
// UI 层唯一允许调用的 Runtime API。
// 内部协调 promptBuilder / provider / abort / trace。
// ============================================================

import { buildPrompt } from "./promptBuilder";
import { applyRegexScripts } from "./regexProcessor";
import { matchWorldBook } from "./worldbook";
import type { PromptNode } from "./promptAST";
import { EmotionRules } from "@/character/runtime/EmotionRules";
import { getTopMemories } from "@/character/CharacterMemory";
import { getActiveGoals } from "@/character/CharacterGoal";
import { Preset } from "@/types/preset";
import { WorldBookEntry } from "@/types/worldbook";
import { AuthorsNote } from "@/types/authorsNote";
import type { RegexScript } from "@/types/regex";

// ---- Log Entry（实时控制台） ----

export type LogCategory =
  | 'system'
  | 'character'
  | 'emotion'
  | 'memory'
  | 'goal'
  | 'worldbook'
  | 'prompt'
  | 'model'
  | 'stream'
  | 'agent'
  | 'done'
  | 'error';

export interface LogEntry {
  id: number;
  category: LogCategory;
  message: string;
  detail?: string;
  /** 子条目（缩进显示） */
  children?: string[];
  timestamp: number;
  /** 带颜色的情绪 delta，如 [{ label: "好感", value: 3 }] */
  deltas?: Array<{ label: string; value: number }>;
  /** token 估算 */
  tokenEstimate?: number;
}

export type LogListener = (entry: LogEntry) => void;

// ---- Trace ----

export interface BuildStep {
  step: number;
  name: string;
  content: string;
  tokenEstimate: number;
}

export interface DebugTrace {
  steps: BuildStep[];
  finalSystem: string;
  finalMessages: Array<{ role: string; content: string }>;
  astNodes: PromptNode[];
  totalTokens: number;
  durationMs: number;
}

let traceSteps: BuildStep[] = [];
let logIdCounter = 0;

function resetTrace() {
  traceSteps = [];
  logIdCounter = 0;
}

function addStep(name: string, content: string) {
  traceSteps.push({
    step: traceSteps.length + 1,
    name,
    content,
    tokenEstimate: Math.ceil(content.length / 4),
  });
}

function nextLogId(): number {
  return ++logIdCounter;
}

// ---- Runtime Config ----

export interface RuntimeConfig {
  characterName: string;
  systemPrompt: string;
}

// ---- Runtime Facade ----

class Runtime {
  // 配置
  characterSystemPrompt = "";
  characterName = "";
  worldBookEntries: WorldBookEntry[] = [];
  worldBookEnabled = true;
  authorsNote?: AuthorsNote;
  regexScripts: RegexScript[] = [];
  regexEnabled = true;

  // 角色运行时数据（供控制台读取）
  characterMemories: Array<{ content: string; importance: number }> = [];
  characterGoals: Array<{ content: string; priority: number; status: string }> = [];

  // 内部状态
  private abortController: AbortController | null = null;
  private logListener: LogListener | null = null;
  private _logEntries: LogEntry[] = [];

  /** 获取最近一次日志 */
  get logEntries(): LogEntry[] {
    return this._logEntries;
  }

  /** 注册实时日志监听器 */
  onLog(listener: LogListener): void {
    this.logListener = listener;
  }

  /** 移除监听 */
  offLog(): void {
    this.logListener = null;
  }

  private emit(category: LogCategory, message: string, opts?: Partial<LogEntry>): void {
    const entry: LogEntry = {
      id: nextLogId(),
      category,
      message,
      timestamp: Date.now(),
      ...opts,
    };
    this._logEntries.push(entry);
    this.logListener?.(entry);
  }

  /** 配置当前角色 */
  configure(config: RuntimeConfig): void {
    this.characterName = config.characterName;
    this.characterSystemPrompt = config.systemPrompt;
  }

  /** 取消当前请求 */
  abort(): void {
    this.abortController?.abort();
    this.abortController = null;
  }

  /** 获取最近一次构建的调试追踪 */
  getDebugTrace(): DebugTrace | null {
    if (traceSteps.length === 0) return null;
    const last = traceSteps[traceSteps.length - 1];
    return {
      steps: traceSteps,
      finalSystem: last.name === "Final" ? last.content : "",
      finalMessages: [],
      astNodes: [],
      totalTokens: traceSteps.reduce((s, t) => s + t.tokenEstimate, 0),
      durationMs: 0,
    };
  }

  // ---- 核心：流式发送 ----

  async sendMessage(
    messages: Array<{ role: string; content: string }>,
    preset: Preset,
    onChunk: (text: string) => void,
    onTrace?: (trace: DebugTrace) => void,
  ): Promise<string> {
    resetTrace();
    this._logEntries = [];

    const startTime = performance.now();

    if (!this.characterSystemPrompt) {
      this.emit('error', '未配置角色');
      return "[未配置]";
    }

    // 创建新的 AbortController
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    const lastMsg = messages[messages.length - 1];
    const history = lastMsg ? messages.slice(0, -1) : messages;
    const userInput = lastMsg?.content ?? "";

    // ═══════════════════════════════════════════
    // [系统] 收到用户消息
    // ═══════════════════════════════════════════
    this.emit('system', '收到用户消息', {
      detail: userInput.slice(0, 120),
      tokenEstimate: Math.ceil(userInput.length / 4),
    });

    // ═══════════════════════════════════════════
    // [角色] 加载角色大脑
    // ═══════════════════════════════════════════
    this.emit('character', '正在加载角色大脑...', {
      children: [
        `Name: ${this.characterName}`,
      ],
    });

    // ═══════════════════════════════════════════
    // [情绪] 规则匹配
    // ═══════════════════════════════════════════
    if (userInput.trim()) {
      const emotionDelta = EmotionRules.evaluateUserMessage(userInput);
      const deltaKeys = Object.keys(emotionDelta).filter(
        (k) => (emotionDelta as Record<string, number>)[k] !== 0,
      );

      if (deltaKeys.length > 0) {
        const labels: Record<string, string> = {
          happiness: '幸福', stress: '压力', trust: '信任',
          affection: '好感', anger: '愤怒', loneliness: '孤独', curiosity: '好奇',
        };
        const deltas = deltaKeys.map((k) => ({
          label: labels[k] || k,
          value: Math.round((emotionDelta as Record<string, number>)[k]),
        }));

        this.emit('emotion', '分析消息情绪...', {
          children: deltas.map((d) => `${d.value > 0 ? '+' : ''}${d.label} ${d.value > 0 ? '+' : ''}${d.value}`),
          deltas,
        });
      } else {
        this.emit('emotion', '分析消息情绪... 无明显变化');
      }
    }

    // ═══════════════════════════════════════════
    // [记忆] 检索
    // ═══════════════════════════════════════════
    const topMemories = getTopMemories(this.characterMemories as any, 12);
    if (topMemories.length > 0) {
      const top4 = topMemories.slice(0, 4);
      this.emit('memory', '检索长期记忆...', {
        children: [
          `找到 ${topMemories.length} 条相关记忆`,
          `注入 ${Math.min(4, top4.length)} 条高优先级记忆`,
        ],
      });
    }

    // ═══════════════════════════════════════════
    // [目标] 活跃目标
    // ═══════════════════════════════════════════
    const activeGoals = getActiveGoals(this.characterGoals as any).slice(0, 3);
    if (activeGoals.length > 0) {
      this.emit('goal', '当前角色目标', {
        children: activeGoals.map((g: any) => `[p=${g.priority}] ${g.content}`),
      });
    }

    // ---- 1. 正则处理输入 ----
    const processedInput = this.regexEnabled
      ? (() => {
          const result = applyRegexScripts(userInput, this.regexScripts, "input");
          if (result !== userInput) {
            addStep("Regex (Input)", `${userInput} → ${result}`);
            this.emit('system', `正则替换: ${userInput.slice(0, 40)} → ${result.slice(0, 40)}`);
          }
          return result;
        })()
      : userInput;

    // ═══════════════════════════════════════════
    // [WorldBook] 关键词匹配
    // ═══════════════════════════════════════════
    if (this.worldBookEnabled && this.worldBookEntries.length > 0) {
      const textsToMatch = history
        .slice(-5)
        .map((m) => m.content)
        .concat(processedInput)
        .filter(Boolean);
      const { entries: matched } = matchWorldBook(this.worldBookEntries, textsToMatch);
      if (matched.length > 0) {
        this.emit('worldbook', 'WorldBook 关键词匹配', {
          children: matched.map((e) => `[${e.id}] ${e.keys.join(', ')}`),
        });
      }
    }

    // ═══════════════════════════════════════════
    // [Prompt] 构建 AST
    // ═══════════════════════════════════════════
    const { system, messages: finalMessages, astNodes } = buildPrompt({
      preset,
      characterSystemPrompt: this.characterSystemPrompt,
      worldBookEntries: this.worldBookEnabled ? this.worldBookEntries : [],
      authorsNote: this.authorsNote,
      messages: history,
      userInput: processedInput,
    });

    addStep("AST Nodes", astNodes.map((n) => `[${n.slot}] ${n.type}: ${n.content.slice(0, 60)}`).join("\n"));
    addStep("System Prompt", system);
    addStep("Messages", finalMessages.map((m) => `[${m.role}] ${m.content.slice(0, 80)}`).join("\n"));

    const totalPromptTokens = Math.ceil((system.length + finalMessages.reduce((s, m) => s + m.content.length, 0)) / 4);

    this.emit('prompt', '正在构建 Prompt AST...', {
      children: [
        `节点数: ${astNodes.length}`,
        `Slot 分布: ${[...new Set(astNodes.map((n) => n.slot))].join(', ')}`,
        `Messages: ${finalMessages.length} 条`,
      ],
      tokenEstimate: totalPromptTokens,
    });

    // ═══════════════════════════════════════════
    // [模型] 请求
    // ═══════════════════════════════════════════
    this.emit('model', '正在请求 DeepSeek...');

    // ---- 5. 调用 API ----
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system,
        messages: finalMessages,
        temperature: preset.temperature,
        stopSequences: preset.stopSequences,
      }),
      signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      const errorMsg = err.error || `请求失败: ${res.status}`;
      const hint = err.hint || '';
      const code = err.code || 'UNKNOWN';
      const fullMsg = hint ? `${errorMsg}\n💡 ${hint}` : errorMsg;
      this.emit('error', fullMsg, {
        children: code === 'NO_API_KEY' ? [
          '创建 .env.local 写入 DEEPSEEK_API_KEY=sk-xxx',
          '重启 pnpm dev',
        ] : undefined,
      });
      throw new Error(fullMsg);
    }

    const reader = res.body?.getReader();
    if (!reader) {
      this.emit('error', '响应无 body');
      throw new Error("响应无 body");
    }

    const decoder = new TextDecoder();
    let fullContent = "";
    let streamStarted = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ") && line !== "data: [DONE]") {
          const text = line.slice(6);
          fullContent += text;
          onChunk(text);

          if (!streamStarted) {
            streamStarted = true;
            // ═══════════════════════════════════════════
            // [流式] 开始输出
            // ═══════════════════════════════════════════
            this.emit('stream', '开始流式输出...');
          }
        }
      }
    }

    // ---- 6. 正则处理输出 ----
    let finalContent = fullContent;
    if (this.regexEnabled && this.regexScripts.length > 0) {
      finalContent = applyRegexScripts(fullContent, this.regexScripts, "output");
      if (finalContent !== fullContent) {
        addStep("Regex (Output)", `${fullContent.slice(0, 60)}… → ${finalContent.slice(0, 60)}…`);
      }
    }

    addStep("Final", finalContent.slice(0, 200));

    // ═══════════════════════════════════════════
    // [完成]
    // ═══════════════════════════════════════════
    const duration = (performance.now() - startTime) / 1000;
    const outputTokens = Math.ceil(finalContent.length / 4);

    this.emit('done', '响应结束', {
      children: [
        `输出: ${finalContent.length} 字符 (~${outputTokens} tokens)`,
        `Prompt: ~${totalPromptTokens} tokens`,
        `耗时: ${duration.toFixed(1)}s`,
      ],
      tokenEstimate: outputTokens,
    });

    // 回调 trace
    if (onTrace) {
      const steps = [...traceSteps];
      onTrace({
        steps,
        finalSystem: system,
        finalMessages,
        astNodes,
        totalTokens: steps.reduce((s, t) => s + t.tokenEstimate, 0),
        durationMs: Math.round(duration * 1000),
      });
    }

    this.abortController = null;
    return finalContent;
  }
}

export const runtime = new Runtime();
