// ============================================================
// CapabilityComposer — 能力装配引擎
//
// Profile → 加载 packs → 组装 Runtime → 生成 execution graph
// ============================================================

import type { RuntimeProfile, RuntimeBudget, BudgetUsage } from "./RuntimeProfile";
import { formatBudget, isOverBudget } from "./RuntimeProfile";
import type { CapabilityPack } from "./CapabilityPack";
import { getCapabilityPack } from "./CapabilityPack";
import type { GraphNode, GraphEdge } from "@/spec/WorkflowSpec";

export interface ComposedRuntime {
  /** 最终图节点 */
  nodes: GraphNode[];
  /** 最终图连线 */
  edges: GraphEdge[];
  /** 注入 Prompt 的文本 */
  promptInjection: string;
  /** 加载的能力包 */
  loadedPacks: string[];
  /** 预算摘要 */
  budgetSummary: string[];
  /** 总预算消耗 */
  totalBudget: Partial<BudgetUsage>;
}

export class CapabilityComposer {
  /**
   * 从 Profile 组装 Runtime。
   */
  compose(profile: RuntimeProfile): ComposedRuntime {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const injections: string[] = [];
    const loadedPacks: string[] = [];
    const totalBudget: Partial<BudgetUsage> = {
      nodeExecutions: 0,
      memoryRetrieval: 0,
      promptTokens: 0,
      reasoningDepth: 0,
    };

    // 1) 基础节点（始终存在）
    nodes.push({ id: "n_prompt", type: "prompt" });
    nodes.push({ id: "n_model", type: "model" });
    edges.push({ id: "e_base", source: "n_prompt", target: "n_model" });

    let prev: { id: string; type: string } | null = null;
    let nodeIdx = 1;

    // 2) 按 capability 依次插入节点
    for (const capId of profile.capabilities) {
      const pack = getCapabilityPack(capId);
      if (!pack) continue;

      loadedPacks.push(capId);

      // 创建节点
      const nodeId = `n_cap_${nodeIdx}`;
      const nodeType = capId.replace("-pack", ""); // "emotion-pack" → "emotion"
      nodes.push({ id: nodeId, type: nodeType });

      // 连线: prev → this → prompt（或 model）
      if (prev) {
        edges.push({ id: `e_cap_${nodeIdx}_in`, source: prev.id, target: nodeId });
      }
      edges.push({ id: `e_cap_${nodeIdx}_out`, source: nodeId, target: "n_prompt" });

      // Prompt 注入
      if (pack.promptInjection) {
        injections.push(pack.promptInjection);
      }

      // 预算累加
      totalBudget.nodeExecutions = (totalBudget.nodeExecutions ?? 0) + (pack.budgetCost.nodeExecutions ?? 0);
      totalBudget.memoryRetrieval = (totalBudget.memoryRetrieval ?? 0) + (pack.budgetCost.memoryRetrieval ?? 0);
      totalBudget.promptTokens = (totalBudget.promptTokens ?? 0) + (pack.budgetCost.promptTokens ?? 0);
      totalBudget.reasoningDepth = (totalBudget.reasoningDepth ?? 0) + (pack.budgetCost.reasoningDepth ?? 0);

      prev = { id: nodeId, type: nodeType };
      nodeIdx++;
    }

    // 3) 预算检查
    const usage: BudgetUsage = {
      executionTime: 0,
      nodeExecutions: totalBudget.nodeExecutions ?? 0,
      memoryRetrieval: totalBudget.memoryRetrieval ?? 0,
      promptTokens: totalBudget.promptTokens ?? 0,
      reasoningDepth: totalBudget.reasoningDepth ?? 0,
    };
    const budgetResult = isOverBudget(usage, profile.budget);
    const budgetSummary = formatBudget(usage, profile.budget);

    if (budgetResult.over) {
      injections.push(`\n[⚠ 预算警告]\n${budgetResult.reasons.join(", ")}`);
    }

    return {
      nodes,
      edges,
      promptInjection: injections.join("\n"),
      loadedPacks,
      budgetSummary,
      totalBudget,
    };
  }
}
