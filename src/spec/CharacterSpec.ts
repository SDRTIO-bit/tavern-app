// ============================================================
// CharacterSpec — 统一角色运行时定义
//
// 兼容：Tavern Card / PNG Card / Chub / Janitor / JSON Card
// 内部统一转换为 CharacterRuntimeDefinition。
// ============================================================

import type { EmotionState } from "@/character/EmotionState";

/** 角色运行时定义 */
export interface CharacterRuntimeDefinition {
  id: string;
  name: string;
  description: string;
  personality?: string;
  scenario?: string;
  systemPrompt: string;
  firstMessage?: string;
  exampleMessages?: string[];

  /** 来源格式 */
  sourceFormat?: "tavern_v1" | "tavern_v2" | "png" | "chub" | "janitor" | "json";

  /** 情绪初始值 */
  emotion: EmotionState;

  /** 标签 */
  tags?: string[];

  /** 创建者 */
  creator?: string;

  /** 版本 */
  version?: string;

  /** 扩展 */
  metadata?: Record<string, unknown>;
}
