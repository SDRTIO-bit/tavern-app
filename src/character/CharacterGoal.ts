// ============================================================
// CharacterGoal — 角色长期目标
//
// 追踪角色的目标生命周期：active → completed / failed。
// ============================================================

import { v4 as uuidv4 } from 'uuid';

/** 目标状态 */
export type GoalStatus = 'active' | 'completed' | 'failed';

/** 角色目标 */
export interface CharacterGoal {
  /** 目标 ID */
  id: string;
  /** 目标内容 */
  content: string;
  /** 优先级（越大越优先） */
  priority: number;
  /** 当前状态 */
  status: GoalStatus;
  /** 创建时间（ISO 8601） */
  createdAt: string;
  /** 完成/失败时间 */
  resolvedAt?: string;
  /** 结果备注 */
  resultNote?: string;
  /** 附加元数据 */
  metadata?: Record<string, unknown>;
}

/** 创建新目标 */
export function createGoal(
  content: string,
  priority: number = 0,
): CharacterGoal {
  return {
    id: uuidv4(),
    content,
    priority,
    status: 'active',
    createdAt: new Date().toISOString(),
  };
}

/** 标记目标为已完成 */
export function completeGoal(
  goal: CharacterGoal,
  note?: string,
): CharacterGoal {
  return {
    ...goal,
    status: 'completed',
    resolvedAt: new Date().toISOString(),
    resultNote: note,
  };
}

/** 标记目标为失败 */
export function failGoal(
  goal: CharacterGoal,
  note?: string,
): CharacterGoal {
  return {
    ...goal,
    status: 'failed',
    resolvedAt: new Date().toISOString(),
    resultNote: note,
  };
}

/** 按优先级排序目标（高优先在前） */
export function sortGoalsByPriority(
  goals: CharacterGoal[],
): CharacterGoal[] {
  return [...goals].sort((a, b) => b.priority - a.priority);
}

/** 获取所有活跃目标 */
export function getActiveGoals(goals: CharacterGoal[]): CharacterGoal[] {
  return goals.filter((g) => g.status === 'active');
}

/** 获取目标摘要 */
export function getGoalSummary(goal: CharacterGoal): string {
  const statusIcon =
    goal.status === 'active' ? '🔄' : goal.status === 'completed' ? '✅' : '❌';
  return `${statusIcon} [${goal.status}] priority=${goal.priority}: ${goal.content}`;
}
