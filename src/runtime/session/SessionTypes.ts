// ============================================================
// SessionTypes — 持久化 Session 类型
//
// 继承自 src/spec/（统一协议层）
// ============================================================

// 全部从 Spec 层 re-export
export type { MemoryEntry } from "@/spec/MemorySpec";
export type { RuntimeSession, ChatMessage, NarrativeState } from "@/spec/SessionSpec";
