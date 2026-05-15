// ============================================================
// requestLogger — 请求日志中间件
//
// 记录每个请求的方法、路径、耗时、状态码。
// ============================================================

import type { Request, Response, NextFunction } from 'express';
import { logger } from '@/core/logger';

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const start = performance.now();

  res.on('finish', () => {
    const duration = Math.round(performance.now() - start);
    logger.request(req.method, req.originalUrl, res.statusCode);
    logger.debug(`  duration=${duration}ms`);
  });

  next();
}
