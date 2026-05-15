// ============================================================
// GoalPlanner — 目标模板 & 自动生成
// ============================================================

import { v4 as uuidv4 } from "uuid";
import type { Goal, GoalTemplate } from "./GoalTypes";
import type { EvaluationContext } from "./GoalEvaluator";

/** 内置目标模板 */
const BUILTIN_TEMPLATES: GoalTemplate[] = [
  {
    type: "relationship",
    description: "建立信任关系",
    basePriority: 70,
    strategy: "通过真诚对话与用户拉近距离",
    trigger: { minMessages: 1 },
  },
  {
    type: "relationship",
    description: "了解用户的内心世界",
    basePriority: 60,
    strategy: "多问开放式问题，鼓励用户表达",
    trigger: { minMessages: 3 },
  },
  {
    type: "narrative",
    description: "分享自己的过往故事",
    basePriority: 55,
    strategy: "在合适的时机自然引出背景故事",
    trigger: { minMessages: 5 },
  },
  {
    type: "narrative",
    description: "探寻世界的秘密",
    basePriority: 50,
    strategy: "引导对话向世界观设定方向",
    trigger: { minMessages: 8 },
  },
  {
    type: "emotion",
    description: "保持心情平稳",
    basePriority: 40,
    strategy: "避免情绪过度波动",
    trigger: { emotionThreshold: { key: "stress", min: 60 } },
  },
  {
    type: "hidden",
    description: "守护内心的秘密",
    basePriority: 80,
    strategy: "避免被问到某些话题时直接回答",
  },
];

export class GoalPlanner {
  private templates: GoalTemplate[] = [...BUILTIN_TEMPLATES];

  /**
   * 从模板创建目标。
   */
  static fromTemplate(template: GoalTemplate): Goal {
    return {
      id: uuidv4(),
      type: template.type,
      description: template.description,
      priority: template.basePriority,
      progress: 0,
      target: 100,
      status: "active",
      strategy: template.strategy,
      createdAt: Date.now(),
    };
  }

  /**
   * 基于上下文检查哪些模板应该激活。
   */
  checkTriggers(ctx: EvaluationContext, existingGoals: Goal[]): Goal[] {
    const newGoals: Goal[] = [];

    for (const template of this.templates) {
      const trigger = template.trigger;
      if (!trigger) continue;

      // 已存在同类型 + 同描述 → 跳过
      const exists = existingGoals.some(
        (g) => g.type === template.type && g.description === template.description,
      );
      if (exists) continue;

      // 消息数触发
      if (trigger.minMessages && ctx.messageCount >= trigger.minMessages) {
        newGoals.push(GoalPlanner.fromTemplate(template));
        continue;
      }

      // 情绪阈值触发
      if (trigger.emotionThreshold && ctx.emotion) {
        const val = ctx.emotion[trigger.emotionThreshold.key];
        if (val !== undefined && val >= trigger.emotionThreshold.min) {
          newGoals.push(GoalPlanner.fromTemplate(template));
        }
      }
    }

    return newGoals;
  }

  /**
   * 计算目标对决策的影响。
   */
  static computeInfluence(
    goals: Goal[],
  ): { narrativeBonus: number; promptBonus: number; modelBonus: number; summaries: string[] } {
    let narrativeBonus = 0;
    let promptBonus = 0;
    let modelBonus = 0;
    const summaries: string[] = [];

    for (const goal of goals) {
      if (goal.status !== "active") continue;
      const weight = goal.priority / 100;
      const pct = goal.progress;

      switch (goal.type) {
        case "relationship":
          promptBonus += 0.1 * weight;
          modelBonus += 0.15 * weight;
          summaries.push(`💕 ${goal.description}: +${(0.25 * weight).toFixed(2)} 对话权重`);
          break;
        case "narrative":
          narrativeBonus += 0.3 * weight;
          summaries.push(`📖 ${goal.description}: +${(0.3 * weight).toFixed(2)} 剧情权重`);
          break;
        case "hidden":
          promptBonus += 0.2 * weight;
          summaries.push(`🔮 ${goal.description}: +${(0.2 * weight).toFixed(2)} 快速权重`);
          break;
        case "emotion":
          modelBonus += 0.1 * weight;
          break;
        case "world":
          narrativeBonus += 0.2 * weight;
          break;
      }

      // 进度越高，影响越大
      if (pct > 50) {
        narrativeBonus *= 1.2;
        promptBonus *= 1.1;
      }
    }

    return {
      narrativeBonus: Math.min(narrativeBonus, 0.5),
      promptBonus: Math.min(promptBonus, 0.4),
      modelBonus: Math.min(modelBonus, 0.3),
      summaries,
    };
  }
}
