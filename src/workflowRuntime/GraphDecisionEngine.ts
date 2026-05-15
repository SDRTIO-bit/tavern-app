// ============================================================
// GraphDecisionEngine — Agent 决策引擎
//
// 观察 → 推理 → 评分 → 路由选择
// 替代硬条件 "n2.count >= 3" 为软加权评分。
// ============================================================

import type { GraphEdge } from "@/spec/WorkflowSpec";

/** 计划对象 */
export interface Plan {
  steps: string[];
  confidence: number;   // 0-1
  reasoning: string;
}

/** 边评分结果 */
export interface ScoredEdge {
  edge: GraphEdge;
  score: number;        // 0-1
  reasoning: string;
}

/** 决策上下文 */
export interface DecisionContext {
  /** 当前节点输出 */
  outputs: Record<string, Record<string, unknown>>;
  /** 用户输入长度 */
  inputLength: number;
  /** 会话消息数 */
  messageCount: number;
}

/** 路径评分器 */
type EdgeScorer = (edge: GraphEdge, ctx: DecisionContext) => ScoredEdge;

/**
 * Decision Engine
 */
export class GraphDecisionEngine {
  private scorers: Map<string, EdgeScorer> = new Map();

  constructor() {
    this.registerDefaults();
  }

  /** 注册自定义评分器 */
  registerScorer(nodeType: string, scorer: EdgeScorer): void {
    this.scorers.set(nodeType, scorer);
  }

  /**
   * 对出边评分并排序。
   */
  scoreEdges(edges: GraphEdge[], ctx: DecisionContext, sourceNodeType?: string): ScoredEdge[] {
    const scorer = sourceNodeType ? this.scorers.get(sourceNodeType) : undefined;

    const scored = edges.map((edge) => {
      if (edge.condition) {
        // 有硬条件 → 二值评分
        const conditionResult = this.evaluateHardCondition(edge.condition, ctx);
        return {
          edge,
          score: conditionResult ? 0.9 : 0.1,
          reasoning: conditionResult
            ? `条件满足: ${edge.condition}`
            : `条件不满足: ${edge.condition}`,
        };
      }

      // 无硬条件 → 使用评分器
      if (scorer) {
        return scorer(edge, ctx);
      }

      // 默认评分：基于启发式
      return this.heuristicScore(edge, ctx);
    });

    // 按分数降序排列
    return scored.sort((a, b) => b.score - a.score);
  }

  /**
   * 生成 Plan（基于当前状态）。
   */
  generatePlan(ctx: DecisionContext): Plan {
    const hasMemory = (ctx.outputs["memory"] || ctx.outputs["n2"] || {}) as Record<string, unknown>;
    const memoryCount = (hasMemory.count as number) ?? 0;
    const hasEmotion = (ctx.outputs["emotion"] || ctx.outputs["n1"] || {}) as Record<string, unknown>;
    const emotionScore = (hasEmotion.score as number) ?? 0;

    const steps: string[] = [];
    const reasons: string[] = [];

    if (memoryCount >= 3) {
      steps.push("narrative");
      reasons.push(`记忆丰富 (${memoryCount}条)`);
    } else {
      steps.push("prompt");
      reasons.push(`记忆较少 (${memoryCount}条)`);
    }

    if (emotionScore > 0.5) {
      steps.push("model");
      reasons.push(`情绪活跃 (${(emotionScore * 100).toFixed(0)}%)`);
    } else {
      steps.push("model");
      reasons.push(`情绪平稳`);
    }

    return {
      steps,
      confidence: memoryCount >= 3 ? 0.75 : 0.55,
      reasoning: reasons.join("; "),
    };
  }

  // ---- 内部 ----

  private evaluateHardCondition(condition: string, ctx: DecisionContext): boolean {
    // 尝试从 outputs 中求值
    for (const [nodeId, outputs] of Object.entries(ctx.outputs)) {
      for (const [key, value] of Object.entries(outputs)) {
        const pattern = `${nodeId}.${key}`;
        if (condition.includes(pattern)) {
          const numVal = Number(value);
          const numMatch = condition.match(/(>=|<=|!=|==|>|<)\s*(\d+(\.\d+)?)/);
          if (numMatch && !isNaN(numVal)) {
            const [, op, right] = numMatch;
            switch (op) {
              case ">=": return numVal >= Number(right);
              case ">":  return numVal > Number(right);
              case "<":  return numVal < Number(right);
              case "<=": return numVal <= Number(right);
              case "==": return numVal === Number(right);
              case "!=": return numVal !== Number(right);
            }
          }
        }
      }
    }
    return false;
  }

  private heuristicScore(edge: GraphEdge, ctx: DecisionContext): ScoredEdge {
    // 基于目标类型的启发式评分
    const targetType = this.inferTargetType(edge.target);
    let score = 0.6;
    let reason = "默认路径";

    if (targetType === "narrative" && ctx.messageCount > 5) {
      score = 0.8;
      reason = "多轮对话，适合剧情推进";
    } else if (targetType === "prompt" && ctx.inputLength < 50) {
      score = 0.85;
      reason = "短消息，快速回复优先";
    }

    return { edge, score, reasoning: reason };
  }

  private inferTargetType(targetId: string): string {
    // 尝试从 ID 推断类型（n5→narrative, n3→prompt, etc.）
    return targetId;
  }

  private registerDefaults(): void {
    // 默认 memory 后决策：记忆多→narrative，记忆少→prompt
    this.registerScorer("memory", (edge, ctx) => {
      const mem = (ctx.outputs["n2"] || ctx.outputs["memory"] || {}) as Record<string, unknown>;
      const count = (mem.count as number) ?? 0;
      const targetType = this.inferTargetType(edge.target);

      if (targetType.includes("narrative") || edge.target.includes("n5")) {
        const score = Math.min(count / 10, 0.95);
        return { edge, score, reasoning: `记忆=${count}条，剧情权重=${score.toFixed(2)}` };
      }
      if (targetType.includes("prompt") || edge.target.includes("n3")) {
        const score = Math.max(0.1, 1 - count / 10);
        return { edge, score, reasoning: `记忆=${count}条，快速权重=${score.toFixed(2)}` };
      }

      return { edge, score: 0.5, reasoning: "默认评分" };
    });
  }
}
