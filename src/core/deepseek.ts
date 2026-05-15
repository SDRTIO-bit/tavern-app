// ============================================================
// deepseek.ts — DeepSeek 双端点适配
//
// 优先 Anthropic 端点 (https://api.deepseek.com/anthropic)
// 回退 OpenAI 端点 (https://api.deepseek.com/v1)
// ============================================================

import { logger } from "@/core/logger";

export interface DeepSeekMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface DeepSeekConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export function createDeepSeekClient(config: DeepSeekConfig) {
  const apiKey = config.apiKey;
  const model = config.model ?? "deepseek-chat";
  const maxTokens = config.maxTokens ?? 2048;
  const temperature = config.temperature ?? 0.8;

  // ---- Anthropic 端点 ----
  async function chatAnthropic(
    systemPrompt: string,
    messages: DeepSeekMessage[]
  ): Promise<{ content: string }> {
    // Anthropic API 要求 messages 是 content block 数组格式
    // 但简单字符串也是支持的（DeepSeek 文档确认）
    const body = {
      model,
      max_tokens: maxTokens,
      temperature,
      ...(systemPrompt ? { system: systemPrompt } : {}),
      messages: messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role, content: m.content })),
    };

    logger.info(`[Anthropic] ${messages.length} messages, model=${model}`);

    const res = await fetch("https://api.deepseek.com/anthropic/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      logger.error(`[Anthropic] HTTP ${res.status}: ${text.slice(0, 200)}`);
      // 回退到 OpenAI 端点
      logger.info("[Anthropic] Falling back to OpenAI endpoint");
      return chatOpenAI(systemPrompt, messages);
    }

    const data = await res.json() as Record<string, unknown>;
    const content = (data.content as Array<{ type: string; text?: string }>)
      ?.filter((b) => b.type === "text")
      .map((b) => b.text || "")
      .join("") || "";

    return { content };
  }

  // ---- OpenAI 端点（回退） ----
  async function chatOpenAI(
    systemPrompt: string,
    messages: DeepSeekMessage[]
  ): Promise<{ content: string }> {
    const allMessages: Array<{ role: string; content: string }> = [];
    if (systemPrompt) {
      allMessages.push({ role: "system", content: systemPrompt });
    }
    allMessages.push(...messages.filter((m) => m.role !== "system"));

    logger.info(`[OpenAI] ${allMessages.length} messages, model=${model}`);

    const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: allMessages,
        max_tokens: maxTokens,
        temperature,
        stream: false,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`DeepSeek error ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = await res.json() as Record<string, unknown>;
    const choice = (data.choices as Array<Record<string, unknown>>)?.[0];
    return {
      content: (choice?.message as Record<string, string>)?.content || "",
    };
  }

  // ---- 公开 API ----

  async function chat(
    systemPrompt: string,
    messages: DeepSeekMessage[]
  ): Promise<{ content: string; usage?: unknown }> {
    try {
      return await chatAnthropic(systemPrompt, messages);
    } catch {
      return chatOpenAI(systemPrompt, messages);
    }
  }

  async function chatStream(
    systemPrompt: string,
    messages: DeepSeekMessage[],
    stopSequences?: string[]
  ): Promise<ReadableStream<string>> {
    // Streaming: Anthropic 端点
    const body: Record<string, unknown> = {
      model,
      max_tokens: maxTokens,
      temperature,
      stream: true,
      ...(systemPrompt ? { system: systemPrompt } : {}),
      messages: messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role, content: m.content })),
      ...(stopSequences?.length ? { stop_sequences: stopSequences } : {}),
    };

    logger.info(`[Anthropic Stream] ${messages.length} messages`);

    const res = await fetch("https://api.deepseek.com/anthropic/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      // 回退 OpenAI 流式
      logger.info(`[Anthropic Stream] HTTP ${res.status}, fallback to OpenAI`);
      return chatStreamOpenAI(systemPrompt, messages, stopSequences);
    }

    if (!res.body) {
      throw new Error("No response body");
    }

    logger.sse("Anthropic stream started");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    return new ReadableStream<string>({
      async pull(controller) {
        try {
          const { done, value } = await reader.read();
          if (done) {
            logger.sse("Anthropic stream ended");
            controller.close();
            return;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;

            const data = trimmed.slice(6);
            if (data === "[DONE]") {
              controller.close();
              return;
            }

            try {
              const parsed = JSON.parse(data);

              // Anthropic SSE: content_block_delta
              if (parsed.type === "content_block_delta") {
                const text = parsed.delta?.text;
                if (typeof text === "string") {
                  controller.enqueue(text);
                }
              }
              // Anthropic SSE: message_stop
              else if (parsed.type === "message_stop") {
                controller.close();
                return;
              }
              // OpenAI SSE: choices[0].delta.content
              else if (parsed.choices) {
                const delta = parsed.choices[0]?.delta;
                if (delta?.content) {
                  controller.enqueue(delta.content);
                }
              }
            } catch {
              // skip
            }
          }
        } catch (err) {
          logger.error(`Stream read error: ${(err as Error).message}`);
          controller.error(err);
        }
      },
      cancel() {
        logger.sse("Anthropic stream cancelled");
        reader.cancel();
      },
    });
  }

  // ---- OpenAI 流式（回退） ----
  async function chatStreamOpenAI(
    systemPrompt: string,
    messages: DeepSeekMessage[],
    stopSequences?: string[]
  ): Promise<ReadableStream<string>> {
    const allMessages: Array<{ role: string; content: string }> = [];
    if (systemPrompt) {
      allMessages.push({ role: "system", content: systemPrompt });
    }
    allMessages.push(...messages.filter((m) => m.role !== "system"));

    const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: allMessages,
        max_tokens: maxTokens,
        temperature,
        stream: true,
        ...(stopSequences?.length ? { stop: stopSequences } : {}),
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`DeepSeek error ${res.status}: ${text.slice(0, 200)}`);
    }

    if (!res.body) throw new Error("No response body");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    return new ReadableStream<string>({
      async pull(controller) {
        try {
          const { done, value } = await reader.read();
          if (done) { controller.close(); return; }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;
            const data = trimmed.slice(6);
            if (data === "[DONE]") { controller.close(); return; }
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;
              if (delta?.content) controller.enqueue(delta.content);
            } catch { /* skip */ }
          }
        } catch (err) {
          controller.error(err);
        }
      },
      cancel() { reader.cancel(); },
    });
  }

  return { chat, chatStream };
}
