// ============================================================
// GoalSystem — 目标系统统一入口
// ============================================================

import type { Goal, GoalType } from "./GoalTypes";
import { GoalEvaluator } from "./GoalEvaluator";
import type { EvaluationContext } from "./GoalEvaluator";
import { GoalPlanner } from "./GoalPlanner";

export class GoalSystem {
  private planner = new GoalPlanner();

  /**
   * 处理一轮对话：评估现有目标 + 检测新目标。
   */
  processTurn(
    goals: Goal[],
    ctx: EvaluationContext,
  ): { goals: Goal[]; newGoals: Goal[]; completedGoals: Goal[] } {
    // 1) 评估现有目标进度
    const evaluated = GoalEvaluator.evaluateAll(goals, ctx);

    // 2) 检测新激活目标
    const newGoals = this.planner.checkTriggers(ctx, evaluated);

    // 3) 确认完成的
    const completedGoals = evaluated.filter(
      (g) => g.status === "completed" && goals.find((prev) => prev.id === g.id)?.status !== "completed",
    );

    return {
      goals: [...evaluated, ...newGoals],
      newGoals,
      completedGoals,
    };
  }

  /**
   * 计算目标对 Agent 决策的加权影响。
   */
  getDecisionInfluence(goals: Goal[]): {
    narrativeBonus: number;
    promptBonus: number;
    modelBonus: number;
    activeGoals: Array<{ type: GoalType; description: string; progress: number; priority: number }>;
    summaries: string[];
  } {
    const influence = GoalPlanner.computeInfluence(goals);

    const activeGoals = goals
      .filter((g) => g.status === "active")
      .map((g) => ({
        type: g.type,
        description: g.description,
        progress: g.progress,
        priority: g.priority,
      }));

    return {
      ...influence,
      activeGoals,
    };
  }

  /**
   * 格式化目标进度（供 Console / Prompt）。
   */
  static formatProgress(goals: Goal[]): string[] {
    return GoalEvaluator.summarize(goals);
  }

  /**
   * 为 Prompt 生成目标注入文本。
   */
  static injectPrompt(goals: Goal[]): string {
    const active = goals.filter((g) => g.status === "active");
    if (active.length === 0) return "";

    const lines = ["\n[角色内在目标]", ""];
    for (const g of active) {
      const bar = "█".repeat(Math.round(g.progress / 10)) + "░".repeat(10 - Math.round(g.progress / 10));
      lines.push(`- ${g.description} (${g.progress}%) ${bar}`);
      if (g.strategy) {
        lines.push(`  策略: ${g.strategy}`);
      }
    }

    return lines.join("\n");
  }
}
