// ============================================================
// healthCheck — 健康检查端点
//
// GET /health         — 基础健康检查
// GET /health/detail  — 详细状态（provider / sessions / scheduler）
// ============================================================

import { Router } from 'express';
import { logger } from '@/core/logger';

export const healthRouter = Router();

// 基础健康检查
healthRouter.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    version: 'a4',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// 详细健康检查
healthRouter.get('/detail', (req, res) => {
  const hasApiKey = Boolean(process.env.DEEPSEEK_API_KEY);

  // 从全局单例读取状态（需要实际导入才能获取实例状态）
  // 这里提供框架，后续接入 SessionService / Scheduler
  const detail = {
    status: 'ok',
    version: 'a4',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    provider: {
      configured: hasApiKey,
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      status: hasApiKey ? 'connected' : 'not_configured',
    },
    memory: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      unit: 'MB',
    },
    env: process.env.NODE_ENV || 'development',
  };

  logger.debug('Health detail requested');
  res.json(detail);
});
