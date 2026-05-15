// ============================================================
// SessionService — A2 会话状态管理
//
// 管理多轮对话 session，绑定 CharacterBrain、WorldBook、
// 聊天历史、Runtime 状态。
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import type { CharacterBrain } from '@/character/CharacterBrain';
import { createCharacterBrain } from '@/character/CharacterBrain';
import { applyUserInteraction } from '@/character/runtime/CharacterPipeline';
import type { WorldBookEntry } from '@/types/worldbook';

/** 会话消息 */
export interface SessionMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: string;
}

/** 会话 */
export interface TavernSession {
  /** 会话 ID */
  id: string;
  /** 角色 ID */
  characterId: string;
  /** 角色大脑 */
  characterBrain: CharacterBrain;
  /** 聊天历史 */
  messages: SessionMessage[];
  /** 世界书条目 */
  worldBookEntries: WorldBookEntry[];
  /** 是否启用世界书 */
  worldBookEnabled: boolean;
  /** 摘要记忆（最近一次摘要） */
  summaryMemory?: string;
  /** Runtime 状态 */
  runtimeState: Record<string, unknown>;
  /** 创建时间 */
  createdAt: string;
  /** 最后活跃时间 */
  lastActiveAt: string;
}

export class SessionService {
  private sessions: Map<string, TavernSession> = new Map();
  /** characterId → sessionId 映射（每个角色一个活跃会话） */
  private characterSessionMap: Map<string, string> = new Map();
  /** sessionId → AbortController（用于取消生成） */
  private activeGenerations: Map<string, AbortController> = new Map();

  /**
   * 获取或创建会话。
   */
  getOrCreate(characterId: string, sessionId?: string): TavernSession {
    // 优先按 sessionId 查找
    if (sessionId && this.sessions.has(sessionId)) {
      const session = this.sessions.get(sessionId)!;
      session.lastActiveAt = new Date().toISOString();
      return session;
    }

    // 按 characterId 查找已有会话
    const existingId = this.characterSessionMap.get(characterId);
    if (existingId && this.sessions.has(existingId)) {
      const session = this.sessions.get(existingId)!;
      session.lastActiveAt = new Date().toISOString();
      return session;
    }

    // 创建新会话
    const newId = sessionId || uuidv4();
    const brain = createCharacterBrain(characterId);
    const now = new Date().toISOString();

    const session: TavernSession = {
      id: newId,
      characterId,
      characterBrain: brain,
      messages: [],
      worldBookEntries: [],
      worldBookEnabled: true,
      runtimeState: {},
      createdAt: now,
      lastActiveAt: now,
    };

    this.sessions.set(newId, session);
    this.characterSessionMap.set(characterId, newId);

    return session;
  }

  /**
   * 保存会话。
   */
  save(session: TavernSession): void {
    session.lastActiveAt = new Date().toISOString();
    this.sessions.set(session.id, session);
    this.characterSessionMap.set(session.characterId, session.id);
  }

  /**
   * 获取会话。
   */
  get(sessionId: string): TavernSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * 删除会话。
   */
  delete(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    this.characterSessionMap.delete(session.characterId);
    return this.sessions.delete(sessionId);
  }

  /**
   * 向会话添加用户消息并触发角色情绪更新。
   */
  addUserMessage(session: TavernSession, content: string): TavernSession {
    // 添加消息
    session.messages.push({
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    });

    // 角色情绪更新
    session.characterBrain = applyUserInteraction(
      session.characterBrain,
      content,
    );

    this.save(session);
    return session;
  }

  /**
   * 向会话添加 Assistant 消息。
   */
  addAssistantMessage(session: TavernSession, content: string): TavernSession {
    session.messages.push({
      role: 'assistant',
      content,
      timestamp: new Date().toISOString(),
    });

    this.save(session);
    return session;
  }

  /**
   * 设置世界书条目。
   */
  setWorldBook(session: TavernSession, entries: WorldBookEntry[]): void {
    session.worldBookEntries = entries;
    this.save(session);
  }

  /**
   * 获取最近 N 条消息（用于上下文窗口）。
   */
  getRecentMessages(session: TavernSession, count: number = 20): SessionMessage[] {
    return session.messages.slice(-count);
  }

  /**
   * 获取所有活跃会话数。
   */
  get activeCount(): number {
    return this.sessions.size;
  }

  // ==========================================
  // A3: AbortController 管理
  // ==========================================

  /**
   * 为会话注册一个 AbortController（开始生成时调用）。
   */
  registerAbortController(sessionId: string): AbortController {
    // 取消旧的 controller
    this.abortGeneration(sessionId);

    const controller = new AbortController();
    this.activeGenerations.set(sessionId, controller);
    return controller;
  }

  /**
   * 中止会话的当前生成。
   */
  abortGeneration(sessionId: string): boolean {
    const controller = this.activeGenerations.get(sessionId);
    if (!controller) return false;

    controller.abort();
    this.activeGenerations.delete(sessionId);
    return true;
  }

  /**
   * 移除 AbortController（生成完成后调用）。
   */
  unregisterAbortController(sessionId: string): void {
    this.activeGenerations.delete(sessionId);
  }

  /**
   * 检查会话是否有活跃的生成。
   */
  hasActiveGeneration(sessionId: string): boolean {
    return this.activeGenerations.has(sessionId);
  }
}
