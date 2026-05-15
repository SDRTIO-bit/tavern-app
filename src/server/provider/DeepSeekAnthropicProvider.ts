// ============================================================
// DeepSeekProvider — A7：优先 Anthropic 端点，回退 OpenAI
// ============================================================

import { logger } from '@/core/logger';

export interface ChatMessage {
  role: string;
  content: string;
}

export interface StreamChunk {
  delta: string;
  type?: 'text' | 'error' | 'done';
}

export interface StreamOptions {
  signal?: AbortSignal;
}

export class DeepSeekAnthropicProvider {
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY || '';
    this.model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
    if (!this.apiKey) logger.warn('DEEPSEEK_API_KEY not set');
    else logger.info(`Provider: model=${this.model}`);
  }

  async *chatStream(
    messages: ChatMessage[],
    options?: StreamOptions,
  ): AsyncGenerator<StreamChunk> {
    const sid = `s_${Date.now().toString(36)}`;

    if (!this.apiKey) {
      yield { delta: 'API key not configured', type: 'error' };
      return;
    }

    // 1) Anthropic 端点
    const systemMsgs = messages.filter((m) => m.role === 'system');
    const chatMsgs = messages.filter((m) => m.role !== 'system');
    const system = systemMsgs.map((m) => m.content).join('\n\n');

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: 4096,
      stream: true,
      messages: chatMsgs.map((m) => ({ role: m.role, content: m.content })),
    };
    if (system) body.system = system;

    logger.info(`[${sid}] Anthropic stream: ${chatMsgs.length} msgs`);

    const res = await fetch('https://api.deepseek.com/anthropic/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: options?.signal,
    });

    if (!res.ok) {
      // 回退 OpenAI
      logger.info(`[${sid}] Anthropic HTTP ${res.status}, fallback OpenAI`);
      yield* this.chatStreamOpenAI(messages, options, sid);
      return;
    }

    yield* this.readSSE(res, options, sid, true);
  }

  private async *readSSE(
    res: Response,
    options: StreamOptions | undefined,
    sid: string,
    isAnthropic: boolean,
  ): AsyncGenerator<StreamChunk> {
    if (!res.body) {
      yield { delta: 'No response body', type: 'error' };
      return;
    }

    logger.sse(`[${sid}] stream started`);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let chars = 0, chunks = 0;
    const t0 = performance.now();

    try {
      while (true) {
        if (options?.signal?.aborted) {
          logger.sse(`[${sid}] aborted`);
          reader.cancel();
          yield { delta: '', type: 'done' };
          return;
        }

        let done: boolean;
        let value: Uint8Array;
        try {
          const r = await reader.read();
          done = r.done;
          value = r.value ?? new Uint8Array(0);
        } catch {
          yield { delta: '', type: 'done' };
          return;
        }
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const t = line.trim();
          if (!t || !t.startsWith('data: ')) continue;
          const data = t.slice(6);
          if (data === '[DONE]') {
            yield { delta: '', type: 'done' };
            return;
          }

          try {
            const p = JSON.parse(data);
            if (isAnthropic) {
              if (p.type === 'content_block_delta' && p.delta?.text) {
                chunks++; chars += p.delta.text.length;
                yield { delta: p.delta.text, type: 'text' };
              } else if (p.type === 'message_stop') {
                yield { delta: '', type: 'done' };
                return;
              }
            } else {
              const d = p.choices?.[0]?.delta;
              if (d?.content) {
                chunks++; chars += d.content.length;
                yield { delta: d.content, type: 'text' };
              }
            }
          } catch { /* skip */ }
        }
      }

      logger.sse(`[${sid}] done | ${chunks} chunks ${chars} chars ${Math.round(performance.now() - t0)}ms`);
      yield { delta: '', type: 'done' };
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        logger.sse(`[${sid}] aborted`);
        yield { delta: '', type: 'done' };
        return;
      }
      logger.error(`[${sid}] error: ${(err as Error).message}`);
      yield { delta: `Error: ${(err as Error).message}`, type: 'error' };
    }
  }

  private async *chatStreamOpenAI(
    messages: ChatMessage[],
    options: StreamOptions | undefined,
    sid: string,
  ): AsyncGenerator<StreamChunk> {
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        max_tokens: 4096,
        stream: true,
      }),
      signal: options?.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      yield { delta: `HTTP ${res.status}: ${text.slice(0, 200)}`, type: 'error' };
      return;
    }

    yield* this.readSSE(res, options, sid, false);
  }
}
