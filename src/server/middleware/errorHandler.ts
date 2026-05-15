// ============================================================
// errorHandler — 全局错误中间件
//
// 捕获所有未处理的错误，返回统一的 JSON 格式。
// ============================================================

import type { Request, Response, NextFunction } from 'express';
import { logger } from '@/core/logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  logger.error(`[${req.method} ${req.path}]`, err.message);

  if (process.env.NODE_ENV === 'development') {
    logger.debug('Stack:', err.stack);
  }

  const statusCode = (err as unknown as Record<string, unknown>).statusCode as number || 500;

  res.status(statusCode).json({
    error: {
      message: err.message || 'Internal server error',
      type: err.name || 'internal_error',
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack?.split('\n').slice(0, 5),
      }),
    },
  });
}
