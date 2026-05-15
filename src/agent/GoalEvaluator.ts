// ============================================================
// GoalEvaluator — 目标进度评估
//
// 基于上下文更新目标进度，检测完成/失败。
// ============================================================

import type { Goal } from "./GoalTypes";

export interface EvaluationContext {
  /** 最近用户消息 */
  userInput: string;
  /** 用户消息数 */
  messageCount: number;
  /** 情绪状态 */
  emotion?: Record<string, number>;
  /** 关系状态 */
  relationship?: { trust: number; affection: number };
  /** 对话轮次 */
  turnCount: number;
}

export class GoalEvaluator {
  /**
   * 评估并更新目标进度。
   * 返回更新后的 Goal（不可变）。
   */
  static evaluate(goal: Goal, ctx: EvaluationContext): Goal {
    if (goal.status !== "active") return goal;

    let progressDelta = 0;
    let newStatus: Goal["status"] = "active";

    switch (goal.type) {
      case "relationship": {
        // 每次对话 +2，含亲密关键词 +8
        progressDelta = 2;
        const intimacyWords = ["喜欢", "爱", "想你", "信任", "一起", "永远", "陪伴"];
        if (intimacyWords.some((w) => ctx.userInput.includes(w))) {
          progressDelta += 8;
        }
        // 字数多 = 深度交流
        if (ctx.userInput.length > 30) progressDelta += 3;
        break;
      }
      case "narrative": {
        // 剧情目标：长消息 + 含叙事关键词
        progressDelta = 1;
        const narrativeWords = ["发生", "故事", "过去", "秘密", "真相", "记得", "曾经"];
        if (narrativeWords.some((w) => ctx.userInput.includes(w))) {
          progressDelta += 10;
        }
        if (ctx.userInput.length > 60) progressDelta += 5;
        break;
      }
      case "emotion": {
        // 情绪目标：检测情绪关键词
        progressDelta = 3;
        const emotionWords = ["难过", "开心", "生气", "害怕", "紧张", "放松"];
        if (emotionWords.some((w) => ctx.userInput.includes(w))) {
          progressDelta += 7;
        }
        break;
      }
      case "world": {
        // 世界目标：探索/影响相关
        progressDelta = 1;
        const worldWords = ["外面", "世界", "城里", "森林", "酒馆", "冒险"];
        if (worldWords.some((w) => ctx.userInput.includes(w))) {
          progressDelta += 10;
        }
        break;
      }
      case "hidden": {
        // 隐藏目标：缓慢推进
        progressDelta = 1;
        break;
      }
    }

    const newProgress = Math.min(100, goal.progress + progressDelta);
    const target = goal.target ?? 100;

    if (newProgress >= target) {
      newStatus = "completed";
    }

    return {
      ...goal,
      progress: newProgress,
      status: newStatus,
      completedAt: newStatus === "completed" ? Date.now() : undefined,
    };
  }

  /**
   * 批量评估所有活跃目标。
   */
  static evaluateAll(goals: Goal[], ctx: EvaluationContext): Goal[] {
    return goals.map((g) => this.evaluate(g, ctx));
  }

  /**
   * 获取目标进度摘要。
   */
  static summarize(goals: Goal[]): string[] {
    return goals
      .filter((g) => g.status === "active")
      .map((g) => {
        const bar = progressBar(g.progress);
        return `${goalIcon(g.type)} ${g.description} ${bar} ${g.progress}%`;
      });
  }
}

function progressBar(pct: number): string {
  const filled = Math.round(pct / 10);
  return "█".repeat(filled) + "░".repeat(10 - filled);
}

function goalIcon(type: string): string {
  const icons: Record<string, string> = {
    relationship: "💕",
    narrative: "📖",
    emotion: "💭",
    world: "🌍",
    hidden: "🔮",
  };
  return icons[type] ?? "🎯";
}
