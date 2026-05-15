// ============================================================
// GraphSemanticResolver — Graph 语义解析器
//
// 统一解析条件表达式 + 读取节点输出。
// 禁止节点内直接访问 ctx.xxx 判断逻辑。
// ============================================================

import type { GraphExpression } from "./GraphExpression";
import { evaluateExpression, describeExpression, parseSimpleExpression } from "./GraphExpression";
import type { ExpressionContext } from "./GraphExpression";
import { extractOutputData } from "./NodeOutputContract";
import type { WorkflowStepResult } from "./types/WorkflowRuntimeTypes";

export interface ResolveResult {
  condition: string;
  expression: GraphExpression | null;
  result: boolean;
  description: string;
}

export class GraphSemanticResolver {
  private expressionCtx: ExpressionContext = { outputs: {} };

  /** 记录节点输出 */
  recordOutput(
    nodeId: string,
    nodeType: string,
    result: WorkflowStepResult,
  ): void {
    const data = extractOutputData(nodeType, result);
    this.expressionCtx.outputs[nodeId] = data;
  }

  /** 设置全局变量 */
  setVariable(key: string, value: unknown): void {
    if (!this.expressionCtx.variables) {
      this.expressionCtx.variables = {};
    }
    this.expressionCtx.variables[key] = value;
  }

  /** 判断边条件 */
  resolve(conditionExpr: string, nodeType?: string): ResolveResult {
    const expr = parseSimpleExpression(conditionExpr);
    const description = expr ? describeExpression(expr) : conditionExpr;

    let result = false;
    if (expr) {
      result = evaluateExpression(expr, this.expressionCtx);
    }

    return {
      condition: conditionExpr,
      expression: expr,
      result,
      description: `${description} → ${result ? "TRUE" : "FALSE"}`,
    };
  }

  /** 获取表达式上下文（调试用） */
  getContext(): ExpressionContext {
    return {
      outputs: { ...this.expressionCtx.outputs },
      variables: this.expressionCtx.variables
        ? { ...this.expressionCtx.variables }
        : undefined,
    };
  }

  /** 清空 */
  clear(): void {
    this.expressionCtx = { outputs: {} };
  }
}
