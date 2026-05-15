// ============================================================
// GoalTypes — 目标系统核心类型
// ============================================================

/** 目标类型 */
export type GoalType =
  | "relationship"   // 关系目标（建立信任、增进好感）
  | "narrative"      // 叙事目标（推进剧情、揭示秘密）
  | "emotion"        // 情绪目标（保持冷静、寻求安慰）
  | "world"          // 世界目标（探索地点、影响势力）
  | "hidden";        // 隐藏目标（角色自己不知道的深层动机）

/** 目标状态 */
export type GoalStatus = "active" | "completed" | "failed" | "paused";

/** 目标 */
export interface Goal {
  id: string;
  type: GoalType;
  description: string;
  /** 优先级 (0-100) */
  priority: number;
  /** 当前进度 (0-100) */
  progress: number;
  /** 目标进度 (100 = 完成) */
  target?: number;
  status: GoalStatus;
  /** 达成策略描述 */
  strategy?: string;
  /** 创建时间 */
  createdAt: number;
  /** 完成时间 */
  completedAt?: number;
}

/** 目标对决策的影响权重 */
export interface GoalInfluence {
  goalId: string;
  goalDescription: string;
  /** 对某条路径的加分 (0-1) */
  narrativeBonus: number;
  promptBonus: number;
  modelBonus: number;
}

/** 目标模板（用于初始化/自动生成） */
export interface GoalTemplate {
  type: GoalType;
  description: string;
  basePriority: number;
  strategy: string;
  /** 触发条件（满足才激活） */
  trigger?: {
    minMessages?: number;
    emotionThreshold?: { key: string; min: number };
    relationshipThreshold?: { key: string; min: number };
  };
}
