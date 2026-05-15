// ============================================================
// SkillSpec — 可插拔技能定义
//
// 未来支持渐进式 Skill 加载。
// ============================================================

/** 技能类型 */
export type SkillType =
  | "writing"      // 写作风格
  | "character"    // 角色行为
  | "narrative"    // 叙事控制
  | "system";      // 系统级

/** 技能触发条件 */
export interface SkillTrigger {
  /** 触发关键词 */
  keywords?: string[];
  /** 触发场景 */
  scenario?: string;
  /** 触发概率 (0-1) */
  probability?: number;
  /** 最小生效轮次 */
  minTurn?: number;
}

/** 运行时技能 */
export interface RuntimeSkill {
  id: string;
  name: string;
  type: SkillType;
  /** 技能内容（注入 prompt 的文本） */
  content: string;
  /** 触发条件 */
  trigger?: SkillTrigger;
  /** 优先级（数字越大越优先） */
  priority?: number;
  /** 是否启用 */
  enabled?: boolean;
  /** 版本 */
  version?: string;
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

/** 技能加载结果 */
export interface SkillLoadResult {
  skill: RuntimeSkill;
  matched: boolean;
  matchReason?: string;
}
