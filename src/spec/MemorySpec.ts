// ============================================================
// MemorySpec — 长期记忆标准结构
//
// 兼容：会话记忆 / 关系记忆 / 世界记忆 / 剧情记忆 / 系统记忆
// ============================================================

/** 记忆类型 */
export type MemoryType =
  | "conversation"   // 对话记忆
  | "relationship"   // 关系记忆
  | "world"          // 世界记忆
  | "plot"           // 剧情记忆
  | "system";        // 系统记忆

/** 记忆条目 */
export interface MemoryEntry {
  id: string;
  timestamp: number;
  type?: MemoryType;
  content: string;
  importance?: number;     // 0-100
  tags?: string[];
  emotionImpact?: Record<string, number>;
  metadata?: Record<string, unknown>;
}

/** 记忆检索结果 */
export interface MemoryRetrievalResult {
  entries: MemoryEntry[];
  query: string;
  totalScanned: number;
  matched: number;
}

/** 记忆衰减配置 */
export interface MemoryDecayConfig {
  /** 每小时衰减率 (0-1) */
  rate: number;
  /** 最低保留重要性 */
  minimum: number;
}
