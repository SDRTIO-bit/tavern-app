// ============================================================
// AgentDecisionNode — Agent 决策节点（目标驱动版）
//
// goal → observe → think → decide → act → goal update
// ============================================================

import type { WorkflowNodeRegistration, WorkflowNodeExecutor, WorkflowExecutionContext } from "../types/WorkflowRuntimeTypes";
import { GraphDecisionEngine } from "../GraphDecisionEngine";
import type { Plan, DecisionContext } from "../GraphDecisionEngine";
import { GoalSystem } from "@/agent/GoalSystem";
import { GoalEvaluator } from "@/agent/GoalEvaluator";
import { GoalPlanner } from "@/agent/GoalPlanner";
import type { Goal } from "@/agent/GoalTypes";

const decisionEngine = new GraphDecisionEngine();
const goalSystem = new GoalSystem();

const agentExecutor: WorkflowNodeExecutor = (ctx: WorkflowExecutionContext) => {
  // 0) 加载 session goals
  const sessionGoals: Goal[] = (ctx.variables?.sessionGoals as Goal[]) ?? [];

  // 1) Observe — 收集上游输出 + 目标状态
  const outputs: Record<string, Record<string, unknown>> = {};
  ctx.stepResults.forEach((result, nodeType) => {
    outputs[nodeType] = {
      ...result.data,
      ...result.emotionDeltas,
      count: result.memories?.length ?? 0,
      output: result.output,
    };
  });

  const decisionCtx: DecisionContext = {
    outputs,
    inputLength: ctx.userInput.length,
    messageCount: ctx.messages.length,
  };

  // 2) Think — 生成计划 + 目标影响
  const plan: Plan = decisionEngine.generatePlan(decisionCtx);

  // 目标对决策的加权
  const influence = goalSystem.getDecisionInfluence(sessionGoals);

  // 调整计划：目标加权
  if (influence.narrativeBonus > 0.1 && !plan.steps.includes("narrative")) {
    plan.steps.unshift("narrative");
    plan.reasoning += `; 目标驱动: narrative +${influence.narrativeBonus.toFixed(2)}`;
  }

  // 3) Goal 进度评估
  const goalResult = goalSystem.processTurn(sessionGoals, {
    userInput: ctx.userInput,
    messageCount: ctx.messages.length,
    turnCount: ctx.messages.length,
  });

  // 4) Decide — 主路径
  const primaryStep = plan.steps[0] || "prompt";

  // 5) Act — 返回决策 + 目标状态
  return {
    nodeType: "agent",
    output: primaryStep,
    data: {
      plan: plan.steps,
      confidence: plan.confidence,
      reasoning: plan.reasoning,
      suggestedRoute: primaryStep,
      // 目标
      goals: {
        active: influence.activeGoals.map((g) => ({
          type: g.type,
          description: g.description,
          progress: g.progress,
          priority: g.priority,
        })),
        influence: influence.summaries,
        updatedGoals: goalResult.goals,
        newGoals: goalResult.newGoals.map((g) => g.description),
        completedGoals: goalResult.completedGoals.map((g) => g.description),
      },
      observedState: {
        inputLength: ctx.userInput.length,
        messageCount: ctx.messages.length,
        goalCount: sessionGoals.filter((g) => g.status === "active").length,
      },
    },
  };
};

export const AGENT_DECISION_NODE: WorkflowNodeRegistration = {
  type: "agent",
  name: "Agent 决策",
  description: "观察→推理→决策：基于目标与状态选择最佳路径",
  icon: "🧠",
  category: "core",
  execute: agentExecutor,
};

export function getDecisionEngine(): GraphDecisionEngine {
  return decisionEngine;
}
