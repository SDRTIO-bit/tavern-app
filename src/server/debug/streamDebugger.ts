// ============================================================
// streamDebugger — SSE 流调试工具
//
// 追踪 SSE 连接生命周期。
// ============================================================

import { logger } from '@/core/logger';

export class StreamDebugger {
  private streamId: string;
  private startTime: number;
  private chunkCount = 0;
  private totalChars = 0;

  constructor(id: string) {
    this.streamId = id;
    this.startTime = performance.now();
    logger.sse(`[${this.streamId}] client connected`);
  }

  onChunkReceived(text: string): void {
    this.chunkCount++;
    this.totalChars += text.length;

    // 每 20 个 chunk 或 500 字符打一次日志
    if (this.chunkCount % 20 === 0) {
      logger.sse(
        `[${this.streamId}] chunks=${this.chunkCount} chars=${this.totalChars}`,
      );
    }
  }

  onStreamClosed(): void {
    const duration = Math.round(performance.now() - this.startTime);
    logger.sse(
      `[${this.streamId}] stream closed | chunks=${this.chunkCount} chars=${this.totalChars} duration=${duration}ms`,
    );
  }

  onAbort(): void {
    const duration = Math.round(performance.now() - this.startTime);
    logger.sse(
      `[${this.streamId}] stream aborted | chunks=${this.chunkCount} chars=${this.totalChars} duration=${duration}ms`,
    );
  }

  onError(err: Error): void {
    logger.sse(`[${this.streamId}] stream error | ${err.message}`);
  }
}
