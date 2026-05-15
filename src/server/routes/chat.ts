// ============================================================
// Chat Route — A4 版：Logger + 错误包装 + Session CRUD
// ============================================================

import { Router } from 'express';
import { OpenAIAdapter } from '../adapter/OpenAIAdapter';
import { SessionService } from '../session/SessionService';
import { GraphAdapter } from '../adapter/GraphAdapter';
import { logger } from '@/core/logger';

// ---- 全局单例 ----
const sessionService = new SessionService();
const graphAdapter = new GraphAdapter();

export const chatRouter = Router();

// ==========================================
// 主聊天端点
// ==========================================

chatRouter.post('/', async (req, res, next) => {
  try {
    logger.info(`Chat request: stream=${req.body.stream !== false} messages=${req.body.messages?.length ?? 0}`);

    const adapter = new OpenAIAdapter(sessionService, graphAdapter);
    const result = await adapter.handle(req.body, res);

    // streaming 已在 adapter 内处理完成
    if (!result) return;

    logger.info(`Chat response: non-streaming completed`);
    res.json(result);
  } catch (e: unknown) {
    next(e);
  }
});

// ==========================================
// Abort 端点（停止生成）
// ==========================================

chatRouter.post('/abort', (req, res) => {
  const sessionId = req.body.session_id || req.body.conversation_id;

  if (!sessionId) {
    res.status(400).json({
      error: {
        message: 'session_id is required',
        type: 'invalid_request',
      },
    });
    return;
  }

  logger.info(`Abort request: session=${sessionId}`);
  const aborted = sessionService.abortGeneration(sessionId);

  res.json({
    aborted,
    session_id: sessionId,
    message: aborted
      ? 'Generation aborted'
      : 'No active generation found for this session',
  });
});

// ==========================================
// 会话管理
// ==========================================

chatRouter.get('/session/:id', (req, res) => {
  const session = sessionService.get(req.params.id);
  if (!session) {
    res.status(404).json({
      error: { message: 'Session not found', type: 'not_found' },
    });
    return;
  }

  res.json({
    id: session.id,
    characterId: session.characterId,
    messageCount: session.messages.length,
    createdAt: session.createdAt,
    lastActiveAt: session.lastActiveAt,
    hasActiveGeneration: sessionService.hasActiveGeneration(session.id),
    behavior: session.characterBrain.metadata?.behavior,
  });
});

chatRouter.delete('/session/:id', (req, res) => {
  logger.info(`Delete session: ${req.params.id}`);
  const deleted = sessionService.delete(req.params.id);
  res.json({ deleted });
});
