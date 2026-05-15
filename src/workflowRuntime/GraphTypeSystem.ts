// ============================================================
// GraphTypeSystem — Graph 类型系统
//
// 统一路径 → 类型注册 → 运行时解析 → 结构化条件解释
// ============================================================

import type { WorkflowStepResult } from "./types/WorkflowRuntimeTypes";
import { extractOutputData, BUILTIN_OUTPUT_CONTRACTS } from "./NodeOutputContract";

// ---- Path 类型 ----

/** 标准 GraphPath */
export type GraphPath =
  | `memory.${string}`
  | `emotion.${string}`
  | `narrative.${string}`
  | `prompt.${string}`
  | `model.${string}`
  | `n${number}.${string}`   // n1.count, n2.score
  | `$${string}`;             // $input, $session

/** Primitive 类型 */
export type GraphPrimitive = "string" | "number" | "boolean";

/** 路径类型定义 */
export interface PathTypeDef {
  path: string;
  type: GraphPrimitive;
  description: string;
  example?: unknown;
}

// ---- Type Registry ----

export class GraphTypeRegistry {
  private paths: Map<string, PathTypeDef> = new Map();

  constructor() {
    this.registerBuiltins();
  }

  /** 注册路径类型 */
  register(path: string, type: GraphPrimitive, description: string, example?: unknown): void {
    this.paths.set(path, { path, type, description, example });
  }

  /** 获取路径类型 */
  get(path: string): PathTypeDef | undefined {
    return this.paths.get(path);
  }

  /** 列出所有路径（供 editor autocomplete） */
  list(): PathTypeDef[] {
    return Array.from(this.paths.values());
  }

  /** 按前缀过滤 */
  filter(prefix: string): PathTypeDef[] {
    return this.list().filter((p) => p.path.startsWith(prefix));
  }

  private registerBuiltins(): void {
    // emotion
    this.register("emotion.score", "number", "情绪总强度 (0-1)");
    this.register("emotion.dominant", "string", "优势情绪维度名");
    this.register("emotion.happiness", "number", "幸福感变化");
    this.register("emotion.stress", "number", "压力变化");
    this.register("emotion.affection", "number", "好感变化");
    this.register("emotion.anger", "number", "愤怒变化");
    this.register("emotion.curiosity", "number", "好奇心变化");

    // memory
    this.register("memory.count", "number", "检索到的记忆条数", 4);
    this.register("memory.total", "number", "记忆总数", 47);

    // narrative
    this.register("narrative.phase", "string", "剧情阶段 (setup/rising/climax/fallout/resolved)");
    this.register("narrative.arcCount", "number", "活跃剧情线数量");

    // prompt
    this.register("prompt.tokens", "number", "Prompt Token 数");
    this.register("prompt.messageCount", "number", "消息数");

    // model
    this.register("model.length", "number", "回复字符数");
    this.register("model.tokens", "number", "输出 Token 数");

    // 全局
    this.register("$input", "string", "当前用户输入");

    // 通用 node 引用 (n1, n2, ...)
    for (let i = 1; i <= 20; i++) {
      for (const [nodeType, contract] of Object.entries(BUILTIN_OUTPUT_CONTRACTS)) {
        for (const field of contract.fields) {
          this.register(
            `n${i}.${field.key}`,
            field.type === "number" ? "number" : "string",
            `[n${i}] ${field.label}`,
            contract.example?.[field.key],
          );
        }
        // 也注册通用字段
        this.register(`n${i}.count`, "number", `[n${i}] 输出计数`);
      }
    }
  }
}

// ---- Type Resolver ----

export interface ResolvedPath {
  path: string;
  value: unknown;
  type: GraphPrimitive;
  exists: boolean;
  description?: string;
}

export class GraphTypeResolver {
  private registry: GraphTypeRegistry;
  private outputs: Record<string, Record<string, unknown>> = {};

  constructor(registry: GraphTypeRegistry) {
    this.registry = registry;
  }

  /** 记录节点输出 */
  recordOutput(nodeId: string, nodeType: string, result: WorkflowStepResult): void {
    this.outputs[nodeId] = extractOutputData(nodeType, result);
  }

  /** 解析路径到运行时值 */
  resolvePath(raw: string): ResolvedPath {
    const pathDef = this.registry.get(raw);

    // 全局变量
    if (raw.startsWith("$")) {
      return {
        path: raw,
        value: raw,
        type: "string",
        exists: true,
        description: pathDef?.description ?? "全局变量",
      };
    }

    // 节点输出: "memory.count" 或 "n2.count"
    const parts = raw.split(".");
    if (parts.length < 2) {
      return { path: raw, value: undefined, type: "string", exists: false };
    }

    const nodeRef = parts[0];  // "memory" or "n2"
    const field = parts.slice(1).join(".");

    // 按节点类型查找输出
    let nodeOutputs: Record<string, unknown> | undefined;
    for (const [id, outputs] of Object.entries(this.outputs)) {
      // 匹配 nodeId 或 nodeType
      const contracts = BUILTIN_OUTPUT_CONTRACTS;
      // 尝试直接匹配 nodeRef（如 "n2"）
      if (id === nodeRef) {
        nodeOutputs = outputs;
        break;
      }
      // 尝试按类型匹配（如 "memory"）
      if (nodeRef === "memory" && id.startsWith("n") && outputs.count !== undefined) {
        nodeOutputs = outputs;
        break;
      }
    }

    if (!nodeOutputs) {
      return {
        path: raw,
        value: undefined,
        type: pathDef?.type ?? "string",
        exists: false,
      };
    }

    const value = nodeOutputs[field];

    return {
      path: raw,
      value,
      type: pathDef?.type ?? (typeof value === "number" ? "number" : typeof value === "boolean" ? "boolean" : "string"),
      exists: value !== undefined,
      description: pathDef?.description,
    };
  }

  /** 结构化解释条件表达式 */
  explainCondition(condition: string): Array<{ label: string; value: string; detail?: string }> {
    const lines: Array<{ label: string; value: string; detail?: string }> = [];

    // 匹配 "path op value" 模式
    const match = condition.match(/^([\w.$]+)\s*(>=|<=|!=|==|>|<)\s*(.+)$/);
    if (match) {
      const [, pathStr, op, expected] = match;
      const resolved = this.resolvePath(pathStr);

      const opLabel: Record<string, string> = {
        ">=": "大于等于", ">": "大于", "<": "小于",
        "<=": "小于等于", "==": "等于", "!=": "不等于",
      };

      lines.push({ label: "路径", value: pathStr, detail: resolved.description });
      lines.push({
        label: "实际值",
        value: String(resolved.value ?? "undefined"),
        detail: `类型: ${resolved.type}`,
      });
      lines.push({ label: "比较", value: `${opLabel[op] || op} ${expected}` });
      lines.push({
        label: "结果",
        value: this.evaluateSimple(resolved.value, op, expected) ? "TRUE ✓" : "FALSE ✗",
      });
    }

    return lines;
  }

  private evaluateSimple(value: unknown, op: string, expected: string): boolean {
    const numVal = Number(value);
    const numExp = Number(expected);
    const useNum = !isNaN(numVal) && !isNaN(numExp);
    const left = useNum ? numVal : String(value ?? "");
    const right = useNum ? numExp : expected;

    switch (op) {
      case ">=": return left >= right;
      case ">":  return left > right;
      case "<":  return left < right;
      case "<=": return left <= right;
      case "==": return left === right;
      case "!=": return left !== right;
      default:   return false;
    }
  }

  /** 清空 */
  clear(): void {
    this.outputs = {};
  }
}
