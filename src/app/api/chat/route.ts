// ============================================================
// /api/chat — 聊天 API Route (A7 诊断增强版)
// ============================================================

import { createDeepSeekClient } from "@/core/deepseek";
import { logger } from "@/core/logger";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { system, messages, temperature, stopSequences } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "messages is required", code: "INVALID_REQUEST" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 三重回退读取 API Key
    const apiKey =
      process.env.DEEPSEEK_API_KEY ||
      process.env.DEEPSEEK_KEY ||
      process.env.DEEPSEEK_API ||
      "";

    if (!apiKey || apiKey.length < 10) {
      const msg = "DEEPSEEK_API_KEY not configured. Set it in .env.local or system environment.";
      logger.error(msg);
      return new Response(
        JSON.stringify({
          error: msg,
          code: "NO_API_KEY",
          hint: "在项目根目录创建 .env.local 文件，写入 DEEPSEEK_API_KEY=sk-xxx",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    logger.info(`Chat request: ${messages.length} messages, ${system.length} chars system`);

    const client = createDeepSeekClient({
      apiKey,
      temperature: temperature ?? 0.8,
    });

    const stream = await client.chatStream(system || "", messages, stopSequences);

    const encoder = new TextEncoder();
    const sseStream = new ReadableStream({
      async start(controller) {
        const reader = stream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(encoder.encode(`data: ${value}\n\n`));
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          logger.info("Chat stream completed");
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          logger.error(`Stream error: ${msg}`);
          controller.error(err);
        }
      },
    });

    return new Response(sseStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.error(`Chat API error: ${message}`);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
