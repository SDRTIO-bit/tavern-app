// ============================================================
// GraphAdapter — Graph Runtime 适配器（A2 版）
//
// 将 Tavern 请求映射到 ExecutionGraph 执行。
//
// 当前为桥接层（预留完整 Graph 集成）。
// 后续 A3 会接入完整的 Control Flow / Tool / Agent。
// ============================================================

import type { SessionMessage } from '../session/SessionService';
import type { ExecutionGraph } from '@/graph/ExecutionGraph';

/** Graph 执行上下文 */
export interface GraphExecutionContext {
  /** 会话消息 */
  messages: SessionMessage[];
  /** 用户最后一条输入 */
  userInput: string;
  /** Injected 角色状态 */
  brainInjection?: {
    systemPrompt: string;
    characterName: string;
    behavior: { tone: string; initiative: string; summary: string };
  };
  /** 世界书内容 */
  worldBookContent?: string;
}

/** Graph 执行结果 */
export interface GraphExecutionResult {
  /** 最终输出 */
  finalMessage: string;
  /** 是否使用了工具 */
  toolsUsed?: string[];
  /** 执行的节点路径 */
  nodePath?: string[];
  /** 跟踪信息 */
  trace?: {
    totalTokens: number;
    durationMs: number;
  };
}

export class GraphAdapter {
  private graph?: ExecutionGraph;

  /** 绑定 Graph Runtime */
  bindGraph(graph: ExecutionGraph): void {
    this.graph = graph;
  }

  /**
   * 执行 Graph（A2 简化版：构建 system + messages 后调用 Provider）。
   * A3 会改为完整的 topological execution。
   */
  async execute(ctx: GraphExecutionContext): Promise<GraphExecutionResult> {
    // 构建完整的 messages 数组
    const resultMessages: Array<{ role: string; content: string }> = [];

    // 1. System prompt（角色 + 世界书）
    const systemParts: string[] = [];

    if (ctx.brainInjection?.systemPrompt) {
      systemParts.push(ctx.brainInjection.systemPrompt);
    }

    if (ctx.worldBookContent) {
      systemParts.push(`\n[World Knowledge]\n${ctx.worldBookContent}`);
    }

    if (systemParts.length > 0) {
      resultMessages.push({
        role: 'system',
        content: systemParts.join('\n\n'),
      });
    }

    // 2. 历史消息（最近 N 条）
    const recentMessages = ctx.messages.slice(-20);
    for (const msg of recentMessages) {
      resultMessages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // 3. 当前用户输入（如果不在历史中）
    const lastMsg = recentMessages[recentMessages.length - 1];
    if (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== ctx.userInput) {
      resultMessages.push({
        role: 'user',
        content: ctx.userInput,
      });
    }

    // 如果绑定了 Graph，尝试执行 Graph runtime
    if (this.graph) {
      // A3: 真正的 graph topological execution
      // const result = await this.graph.execute(ctx.userInput);
      // return { finalMessage: result.output };
    }

    // A2: 返回组装好的 messages（由 OpenAIAdapter 调用 Provider）
    return {
      finalMessage: JSON.stringify(resultMessages),
      nodePath: ['character_injector', 'worldbook_injector', 'provider'],
    };
  }

  /**
   * 从 GraphExecutionResult 提取可发送的消息数组。
   */
  extractMessages(result: GraphExecutionResult): Array<{ role: string; content: string }> {
    try {
      const parsed = JSON.parse(result.finalMessage);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // 非 JSON，作为原始输出
    }
    return [{ role: 'assistant', content: result.finalMessage }];
  }
}
