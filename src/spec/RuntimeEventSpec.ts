// ============================================================
// RuntimeEventSpec — 统一运行时事件协议
//
// Runtime Console 完全基于此协议。
// ============================================================

/** 运行时事件类型 */
export type RuntimeEventType =
  // 节点
  | "node_start"
  | "node_complete"
  | "node_error"
  // 图执行
  | "graph_start"
  | "node_enter"
  | "node_exit"
  | "edge_traverse"
  | "graph_complete"
  // 数据
  | "memory_update"
  | "emotion_update"
  | "narrative_update"
  // 模型
  | "provider_request"
  | "provider_stream"
  | "provider_done"
  // 系统
  | "warning"
  | "error";

/** 运行时事件 */
export interface RuntimeEvent {
  /** 事件唯一 ID */
  id: string;

  /** 事件类型 */
  type: RuntimeEventType;

  /** 事件来源（节点类型/模块名） */
  source: string;

  /** 时间戳 (ms) */
  timestamp: number;

  /** 显示文本 */
  text?: string;

  /** 详细数据 */
  detail?: Record<string, unknown>;

  /** 事件耗时 (ms) */
  durationMs?: number;
}

/** 事件监听器 */
export type RuntimeEventListener = (event: RuntimeEvent) => void;
