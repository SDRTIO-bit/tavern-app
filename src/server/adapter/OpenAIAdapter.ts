// ============================================================
// OpenAIAdapter — A3 版：SSE Streaming + AbortController
//
// 请求 → Session → CharacterBrain → WorldBook → Graph → Provider
// 流式输出兼容 OpenAI chat completions SSE 格式。
// ============================================================

import type { Response } from 'express';
import {
  DeepSeekAnthropicProvider,
} from '../provider/DeepSeekAnthropicProvider';
import { SessionService } from '../session/SessionService';
import { CharacterInjector } from '../runtime/CharacterInjector';
import { GraphAdapter } from './GraphAdapter';

interface OpenAIChatRequest {
  messages: Array<{ role: string; content: string }>;
  stream?: boolean;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  stop?: string[];
  /** 会话 ID（可选，用于恢复会话） */
  session_id?: string;
  /** 角色名称（可选） */
  character_name?: string;
}

export class OpenAIAdapter {
  private provider = new DeepSeekAnthropicProvider();
  private sessionService: SessionService;
  private graphAdapter: GraphAdapter;

  constructor(
    sessionService: SessionService,
    graphAdapter: GraphAdapter,
  ) {
    this.sessionService = sessionService;
    this.graphAdapter = graphAdapter;
  }

  /**
   * 处理 OpenAI 兼容请求（A3 版：完整 Streaming + Abort）。
   */
  async handle(
    body: OpenAIChatRequest,
    res: Response,
  ): Promise<Record<string, unknown> | null> {
    const messages = body.messages || [];
    const isStream = body.stream !== false;

    if (messages.length === 0) {
      res.status(400).json({ error: 'messages is required' });
      return null;
    }

    // ---- 1. Session ----
    const characterId = body.character_name || 'default';
    const session = this.sessionService.getOrCreate(
      characterId,
      body.session_id,
    );

    // ---- 2. 用户输入 ----
    const userMessages = messages.filter((m) => m.role === 'user');
    const userInput = userMessages.length > 0
      ? userMessages[userMessages.length - 1].content
      : '';

    // ---- 3. 更新 Session ----
    if (userInput) {
      this.sessionService.addUserMessage(session, userInput);
    }

    // ---- 4. 角色大脑注入 ----
    const injection = CharacterInjector.inject(
      session,
      body.character_name,
    );

    // ---- 5. 世界书 ----
    const worldBookContent = this.buildWorldBookContent(session, userInput);

    // ---- 6. Graph 上下文 ----
    const graphResult = await this.graphAdapter.execute({
      messages: session.messages,
      userInput,
      brainInjection: injection,
      worldBookContent,
    });

    // ---- 7. Provider messages ----
    const providerMessages = this.graphAdapter.extractMessages(graphResult);
    const finalMessages = this.buildProviderMessages(injection, providerMessages);

    if (isStream) {
      return this.handleStream(finalMessages, session, res);
    } else {
      return this.handleNonStream(finalMessages, session);
    }
  }

  private buildProviderMessages(
    injection: ReturnType<typeof CharacterInjector.inject>,
    messages: Array<{ role: string; content: string }>,
  ): Array<{ role: string; content: string }> {
    return [
      { role: 'system', content: injection.systemPrompt },
      ...messages.filter((m) => m.role !== 'system'),
    ];
  }

  private buildWorldBookContent(
    session: ReturnType<SessionService['get']> extends undefined
      ? never
      : ReturnType<SessionService['getOrCreate']>,
    userInput: string,
  ): string {
    if (!session?.worldBookEnabled || session.worldBookEntries.length === 0) {
      return '';
    }
    const lowerInput = userInput.toLowerCase();
    const matched: string[] = [];
    for (const entry of session.worldBookEntries) {
      if (!entry.enabled) continue;
      if (entry.position === 'depth') continue;
      const keyMatched = entry.keys.some((key) =>
        lowerInput.includes(key.toLowerCase()),
      );
      if (keyMatched) matched.push(entry.content);
    }
    return matched.join('\n\n');
  }

  // ================================================================
  // A3: SSE Streaming with AbortController
  // ================================================================

  /**
   * 标准 SSE 流式响应。
   *
   * 格式（OpenAI chat completions stream）：
   *   data: {"id":"...","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"你"}}]}
   *   data: {"id":"...","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"好"}}]}
   *   data: {"id":"...","object":"chat.completion.chunk","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}
   *   data: [DONE]
   */
  private async handleStream(
    messages: Array<{ role: string; content: string }>,
    session: ReturnType<SessionService['get']> extends undefined
      ? never
      : ReturnType<SessionService['getOrCreate']>,
    res: Response,
  ): Promise<null> {
    // ---- SSE 头部 ----
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // 禁用 nginx 缓冲
    res.flushHeaders(); // 立即发送头部

    // ---- 注册 AbortController ----
    const abortController = this.sessionService.registerAbortController(session.id);

    // 监听客户端断开
    res.on('close', () => {
      this.sessionService.abortGeneration(session.id);
    });

    const stream = this.provider.chatStream(messages, {
      signal: abortController.signal,
    });

    const chatId = `chatcmpl-${Date.now()}`;
    let fullContent = '';
    let firstChunk = true;

    try {
      for await (const chunk of stream) {
        // 完成信号
        if (chunk.type === 'done') break;

        // 错误
        if (chunk.type === 'error') {
          const errMsg = chunk.delta;
          res.write(
            `data: ${JSON.stringify({ error: { message: errMsg } })}\n\n`,
          );
          break;
        }

        const text = chunk.delta || '';
        if (!text) continue;

        fullContent += text;

        // 部分刷新（每个 token 立即发送）
        const sseData = {
          id: chatId,
          object: 'chat.completion.chunk',
          created: Math.floor(Date.now() / 1000),
          model: 'tavern-adapter',
          choices: [
            {
              index: 0,
              delta: { content: text },
              finish_reason: null,
            },
          ],
        };

        res.write(`data: ${JSON.stringify(sseData)}\n\n`);

        // 强制 flush（部分环境需要）
        if (firstChunk) {
          firstChunk = false;
          if (typeof (res as unknown as Record<string, unknown>).flush === 'function') {
            (res as unknown as Record<string, () => void>).flush();
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res.write(`data: ${JSON.stringify({ error: { message: msg } })}\n\n`);
    }

    // ---- 写回 Session（仅在非 abort 时） ----
    if (fullContent && !abortController.signal.aborted) {
      this.sessionService.addAssistantMessage(session, fullContent);
    }

    // ---- 清理 AbortController ----
    this.sessionService.unregisterAbortController(session.id);

    // ---- 完成信号 ----
    const doneData = {
      id: chatId,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model: 'tavern-adapter',
      choices: [
        {
          index: 0,
          delta: {},
          finish_reason: abortController.signal.aborted ? 'stop' : 'stop',
        },
      ],
    };

    res.write(`data: ${JSON.stringify(doneData)}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();

    return null;
  }

  /**
   * 非流式响应。
   */
  private async handleNonStream(
    messages: Array<{ role: string; content: string }>,
    session: ReturnType<SessionService['get']> extends undefined
      ? never
      : ReturnType<SessionService['getOrCreate']>,
  ): Promise<Record<string, unknown>> {
    const stream = this.provider.chatStream(messages);
    let fullContent = '';

    for await (const chunk of stream) {
      if (chunk.type === 'done') break;
      fullContent += chunk.delta || '';
    }

    this.sessionService.addAssistantMessage(session, fullContent);

    return {
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: 'tavern-adapter',
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: fullContent },
          finish_reason: 'stop',
        },
      ],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    };
  }
}
