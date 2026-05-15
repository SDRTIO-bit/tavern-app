// ============================================================
// Tavern Adapter Server — A4 稳定版
//
// 启动：
//   npx tsx src/server/index.ts
//
// 端点：
//   POST /v1/chat/completions     OpenAI 兼容 Chat API
//   GET  /health                   健康检查
//   GET  /health/detail            详细健康检查
// ============================================================

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { chatRouter } from './routes/chat';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { healthRouter } from './health/healthCheck';
import { logger } from '@/core/logger';

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10); // 4000 避免与 Next.js 3000 冲突

// ---- 中间件 ----
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(requestLogger);

// ---- 路由 ----
app.use('/v1/chat/completions', chatRouter);
app.use('/health', healthRouter);

// ---- 全局错误处理（必须在路由之后） ----
app.use(errorHandler);

// ---- 启动 ----
app.listen(PORT, () => {
  logger.info(`Tavern Adapter running on http://localhost:${PORT}`);
  logger.info(`Chat API:  POST http://localhost:${PORT}/v1/chat/completions`);
  logger.info(`Health:    GET  http://localhost:${PORT}/health`);
  logger.info(`Detail:    GET  http://localhost:${PORT}/health/detail`);

  if (!process.env.DEEPSEEK_API_KEY) {
    logger.warn('DEEPSEEK_API_KEY not set — chat API will return error');
  } else {
    logger.info('DEEPSEEK_API_KEY configured');
  }
});
