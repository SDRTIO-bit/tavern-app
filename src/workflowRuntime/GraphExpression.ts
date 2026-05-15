// ============================================================
// GraphExpression — 统一条件表达式 AST
//
// 替代 edge.condition 原始 JS 字符串。
// ============================================================

/** 操作符 */
export type CompareOp = ">=" | ">" | "<" | "<=" | "==" | "!=";

/** 表达式节点 */
export type GraphExpression =
  | { type: "compare"; op: CompareOp; left: string; right: unknown }
  | { type: "exists"; target: string }
  | { type: "and"; exprs: GraphExpression[] }
  | { type: "or"; exprs: GraphExpression[] }
  | { type: "not"; expr: GraphExpression };

/** 表达式求值上下文 */
export interface ExpressionContext {
  /** 节点输出缓存（nodeId → output data） */
  outputs: Record<string, Record<string, unknown>>;
  /** 全局变量 */
  variables?: Record<string, unknown>;
}

/**
 * 求值表达式。
 *
 * left 支持路径引用:
 *   "memory.count"   → ctx.outputs["memory"].count
 *   "emotion.score"  → ctx.outputs["emotion"].score
 *   "$input.length"  → ctx.variables["input"].length
 */
export function evaluateExpression(
  expr: GraphExpression,
  ctx: ExpressionContext,
): boolean {
  const resolve = (path: string): unknown => {
    // $ 前缀 = 全局变量
    if (path.startsWith("$")) {
      const key = path.slice(1).split(".")[0];
      const rest = path.slice(1).split(".").slice(1);
      let val: unknown = ctx.variables?.[key];
      for (const seg of rest) {
        val = (val as Record<string, unknown>)?.[seg];
      }
      return val;
    }

    // 节点输出引用: "memory.count"
    const parts = path.split(".");
    const nodeId = parts[0];
    const field = parts.slice(1);
    let val: unknown = ctx.outputs[nodeId];
    for (const seg of field) {
      val = (val as Record<string, unknown>)?.[seg];
    }
    return val;
  };

  switch (expr.type) {
    case "compare": {
      const leftVal = resolve(expr.left);
      const rightVal = expr.right;
      switch (expr.op) {
        case ">=": return Number(leftVal) >= Number(rightVal);
        case ">":  return Number(leftVal) > Number(rightVal);
        case "<":  return Number(leftVal) < Number(rightVal);
        case "<=": return Number(leftVal) <= Number(rightVal);
        case "==": return String(leftVal) === String(rightVal);
        case "!=": return String(leftVal) !== String(rightVal);
      }
    }
    case "exists": {
      return resolve(expr.target) !== undefined;
    }
    case "and": {
      return expr.exprs.every((e) => evaluateExpression(e, ctx));
    }
    case "or": {
      return expr.exprs.some((e) => evaluateExpression(e, ctx));
    }
    case "not": {
      return !evaluateExpression(expr.expr, ctx);
    }
  }
}

/**
 * 将表达式格式化为人类可读字符串。
 */
export function describeExpression(expr: GraphExpression): string {
  switch (expr.type) {
    case "compare": return `${expr.left} ${expr.op} ${String(expr.right)}`;
    case "exists":  return `${expr.target} 存在`;
    case "and":     return expr.exprs.map(describeExpression).join(" 且 ");
    case "or":      return expr.exprs.map(describeExpression).join(" 或 ");
    case "not":     return `非 (${describeExpression(expr.expr)})`;
  }
}

/**
 * 从简单的字符串条件解析为 AST。
 * 支持: "memory.count >= 200", "emotion.score > 0.7"
 */
export function parseSimpleExpression(raw: string): GraphExpression | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // 尝试 and/or
  if (trimmed.includes(" && ")) {
    const parts = trimmed.split(" && ").map((p) => parseSimpleExpression(p)).filter(Boolean) as GraphExpression[];
    return parts.length > 0 ? { type: "and", exprs: parts } : null;
  }
  if (trimmed.includes(" || ")) {
    const parts = trimmed.split(" || ").map((p) => parseSimpleExpression(p)).filter(Boolean) as GraphExpression[];
    return parts.length > 0 ? { type: "or", exprs: parts } : null;
  }

  // compare: "left op right"
  const ops: CompareOp[] = [">=", "<=", "!=", "==", ">", "<"];
  for (const op of ops) {
    const idx = trimmed.indexOf(` ${op} `);
    if (idx !== -1) {
      const left = trimmed.slice(0, idx).trim();
      const rightStr = trimmed.slice(idx + op.length + 2).trim();
      // 尝试解析为数字
      const rightNum = Number(rightStr);
      const right = isNaN(rightNum) ? rightStr : rightNum;
      return { type: "compare", op, left, right };
    }
  }

  return null;
}
