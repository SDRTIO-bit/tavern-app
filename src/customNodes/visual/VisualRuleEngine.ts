// ============================================================
// VisualRuleEngine — 可视化规则引擎
//
// 支持 IF condition THEN action 规则。
// 复用 GraphTypeSystem 的类型安全检查。
// 不允许 JS，纯声明式。
// ============================================================

import { GraphTypeRegistry, GraphTypeResolver } from "@/workflowRuntime/GraphTypeSystem";
import { evaluateExpression, parseSimpleExpression, describeExpression } from "@/workflowRuntime/GraphExpression";
import type { GraphExpression, ExpressionContext } from "@/workflowRuntime/GraphExpression";

/** 操作 */
export type RuleAction =
  | { type: "set_output"; key: string; value: string }
  | { type: "set_variable"; key: string; value: string }
  | { type: "route"; target: string };

/** 单条规则 */
export interface VisualRule {
  id: string;
  /** 条件表达式 (如 "emotion.stress > 70") */
  condition: string;
  /** 满足条件时的动作 */
  actions: RuleAction[];
  /** 优先级 */
  priority?: number;
}

/** 可视化节点定义 */
export interface VisualNodeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  /** 规则列表 */
  rules: VisualRule[];
  /** 默认输出 */
  defaultOutput?: Record<string, string>;
  /** 输入端口标签 */
  inputLabel?: string;
  /** 输出端口标签 */
  outputLabel?: string;
}

/** 规则执行结果 */
export interface RuleExecutionResult {
  triggered: boolean;
  ruleId?: string;
  condition: string;
  outputs: Record<string, string>;
  variables: Record<string, string>;
  route?: string;
}

export class VisualRuleEngine {
  private typeRegistry = new GraphTypeRegistry();
  private typeResolver = new GraphTypeResolver(this.typeRegistry);
  private exprCtx: ExpressionContext = { outputs: {} };

  /** 设置上游节点输出 */
  setInputs(outputs: Record<string, Record<string, unknown>>): void {
    this.exprCtx.outputs = outputs;
  }

  /**
   * 执行规则列表。
   * 按优先级从高到低依次检查，触发第一条满足的规则。
   */
  execute(node: VisualNodeDefinition): RuleExecutionResult {
    const sorted = [...node.rules].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    for (const rule of sorted) {
      const result = this.tryRule(rule);
      if (result.triggered) return result;
    }

    // 无规则触发 → 返回默认值
    return {
      triggered: false,
      condition: "default",
      outputs: node.defaultOutput ?? {},
      variables: {},
    };
  }

  private tryRule(rule: VisualRule): RuleExecutionResult {
    const expr = parseSimpleExpression(rule.condition);

    let result = false;
    if (expr) {
      result = evaluateExpression(expr, this.exprCtx);
    }

    if (!result) {
      return {
        triggered: false,
        condition: rule.condition,
        outputs: {},
        variables: {},
      };
    }

    // 收集动作
    const outputs: Record<string, string> = {};
    const variables: Record<string, string> = {};
    let route: string | undefined;

    for (const action of rule.actions) {
      switch (action.type) {
        case "set_output":
          outputs[action.key] = action.value;
          break;
        case "set_variable":
          variables[action.key] = action.value;
          break;
        case "route":
          route = action.target;
          break;
      }
    }

    return {
      triggered: true,
      ruleId: rule.id,
      condition: rule.condition,
      outputs,
      variables,
      route,
    };
  }

  /** 解释规则（供 Console 显示） */
  static explain(node: VisualNodeDefinition): string[] {
    const lines: string[] = [`[节点] ${node.name}`, `规则数: ${node.rules.length}`];
    for (const rule of node.rules) {
      lines.push(`  IF ${rule.condition}`);
      for (const action of rule.actions) {
        switch (action.type) {
          case "set_output": lines.push(`    → output.${action.key} = ${action.value}`); break;
          case "set_variable": lines.push(`    → var.${action.key} = ${action.value}`); break;
          case "route": lines.push(`    → route: ${action.target}`); break;
        }
      }
    }
    return lines;
  }
}
