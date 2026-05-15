// ============================================================
// TavernServer — 酒馆适配器主入口
//
// 将 Runtime + Graph + World + NPC + Narrative 系统
// 以 SillyTavern 兼容的 API 暴露出来。
//
// 使用方式（在 Next.js API Route 中）：
//   const server = new TavernServer(pipeline, sessionManager);
//   await server.handleChat(req, res);
//
// 或在 express/独立服务中：
//   server.mount(app);
// ============================================================

import { TavernRequestParser } from './TavernRequestParser';
import type { TavernRequest } from './TavernRequestParser';
import { TavernResponseFormatter } from './TavernResponseFormatter';
import type { RuntimeOutput } from './TavernResponseFormatter';
import { CharacterCardAdapter } from './CharacterCardAdapter';
import { WorldBookAdapter } from './WorldBookAdapter';
import type { WorldBookInjectable } from './WorldBookAdapter';
import type { CharacterBrain } from '@/character/CharacterBrain';
import { createCharacterBrain } from '@/character/CharacterBrain';
import { applyUserInteraction } from '@/character/runtime/CharacterPipeline';

// ---- 会话接口 ----

/** 会话（TavernServer 期望的接口） */
export interface TavernSession {
  /** 会话 ID */
  id: string;
  /** 角色大脑 */
  characterBrain?: CharacterBrain;
  /** 聊天历史 */
  messages: Array<{ role: string; content: string; name?: string }>;
  /** WorldBook 注入目标 */
  builder?: WorldBookInjectable;
}

/** 会话管理器接口 */
export interface TavernSessionManager {
  getOrCreate(characterId: string, sessionId?: string): TavernSession;
  save(session: TavernSession): void;
}

// ---- Pipeline 接口 ----

/** Pipeline 执行结果 */
export interface TavernPipelineResult {
  reply: string;
  characterState?: { brain?: CharacterBrain };
  trace?: { totalTokens: number; durationMs: number };
}

/** Pipeline 接口 */
export interface TavernPipeline {
  executeWithSession(
    session: TavernSession,
    userInput: string,
  ): Promise<TavernPipelineResult>;
}

// ---- TavernServer ----

export class TavernServer {
  private sessionManager: TavernSessionManager;
  private pipeline: TavernPipeline;

  constructor(
    pipeline: TavernPipeline,
    sessionManager: TavernSessionManager,
  ) {
    this.pipeline = pipeline;
    this.sessionManager = sessionManager;
  }

  /**
   * 处理聊天请求。
   * 可直接用于 Next.js Route Handler。
   */
  async handleChat(
    body: TavernRequest,
    options?: {
      /** 引擎状态（用于元数据） */
      worldEvents?: Array<{ type: string; description: string }>;
      arcs?: Array<{ title: string; phase: string }>;
      worldTime?: string;
    },
  ): Promise<RuntimeOutput> {
    // ---- 1. 解析请求 ----
    const parsed = TavernRequestParser.parse(body);

    // ---- 2. 获取/创建会话 ----
    const characterId = parsed.character?.id ?? parsed.character?.name ?? 'default';
    const session = this.sessionManager.getOrCreate(characterId);

    // ---- 3. 角色卡 → Brain ----
    if (parsed.character) {
      session.characterBrain = CharacterCardAdapter.toBrain(
        parsed.character,
        session.characterBrain,
      );
    } else if (!session.characterBrain) {
      session.characterBrain = createCharacterBrain(characterId);
    }

    // ---- 4. 注入 WorldBook ----
    if (parsed.worldBookEntries.length > 0 && session.builder) {
      WorldBookAdapter.inject(parsed.worldBookEntries, session.builder);
    }

    // ---- 5. 用户交互 Pipeline ----
    if (session.characterBrain && parsed.userInput) {
      session.characterBrain = applyUserInteraction(
        session.characterBrain,
        parsed.userInput,
      );
    }

    // ---- 6. 执行 Pipeline ----
    const startTime = performance.now();
    const result = await this.pipeline.executeWithSession(
      session,
      parsed.userInput,
    );
    const durationMs = Math.round(performance.now() - startTime);

    // ---- 7. 保存会话 ----
    this.sessionManager.save(session);

    // ---- 8. 构建输出 ----
    return {
      reply: result.reply,
      characterState: {
        brain: session.characterBrain ?? result.characterState?.brain,
      },
      worldEvents: options?.worldEvents,
      arcs: options?.arcs,
      trace: {
        totalTokens: result.trace?.totalTokens ?? 0,
        durationMs,
      },
      worldTime: options?.worldTime,
    };
  }

  /**
   * 处理流式聊天请求。
   * 使用 Server-Sent Events (SSE)。
   */
  async handleChatStream(
    body: TavernRequest,
    onChunk: (chunk: string) => void,
    options?: {
      worldEvents?: Array<{ type: string; description: string }>;
      arcs?: Array<{ title: string; phase: string }>;
      worldTime?: string;
    },
  ): Promise<RuntimeOutput> {
    const output = await this.handleChat(body, options);

    // 模拟流式输出（逐个字符发送）
    // 实际项目中应由 Pipeline 回调 onChunk
    onChunk(output.reply);

    return output;
  }

  /**
   * 获取会话。
   */
  getSession(characterId: string, sessionId?: string): TavernSession {
    return this.sessionManager.getOrCreate(characterId, sessionId);
  }
}

// ---- 简单内存会话管理器 ----

export class MemorySessionManager implements TavernSessionManager {
  private sessions: Map<string, TavernSession> = new Map();

  getOrCreate(characterId: string, _sessionId?: string): TavernSession {
    const key = characterId;
    let session = this.sessions.get(key);

    if (!session) {
      session = {
        id: `session_${Date.now()}`,
        messages: [],
      };
      this.sessions.set(key, session);
    }

    return session;
  }

  save(session: TavernSession): void {
    // 根据 characterId 查找并更新
    // 简化：遍历查找
    for (const [key, s] of this.sessions) {
      if (s.id === session.id) {
        this.sessions.set(key, session);
        return;
      }
    }
  }

  /** 清除所有会话 */
  clear(): void {
    this.sessions.clear();
  }

  /** 移除指定会话 */
  remove(characterId: string): boolean {
    return this.sessions.delete(characterId);
  }

  /** 会话数量 */
  get count(): number {
    return this.sessions.size;
  }
}
