"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ============================================================
// UniversalVariableStore — 通用游戏变量存储
//
// 不预设任何具体结构，支持任意 JSON 路径的变量存储。
// 初始结构可以从角色卡的 MVU Zod Schema 或 InitVar 条目中解析。
// ============================================================

/** 变量存储：任意嵌套的 JSON 对象 */
export type VariableTree = Record<string, unknown>;

interface UniversalVarStore {
  /** 当前关联的角色 ID */
  activeCharacterId: string | null;
  /** 变量数据（任意嵌套结构） */
  variables: VariableTree;
  /** 是否已初始化 */
  initialized: boolean;

  /** 设置关联角色 */
  setCharacter: (id: string) => void;
  /** 设置完整变量树 */
  setVariables: (vars: VariableTree) => void;
  /** 重置为 {} */
  reset: () => void;
  /** 更新单个变量（支持点路径如 "惩戒者.惩戒点数"） */
  updateVariable: (path: string, value: unknown) => void;
  /** 批量更新（JSON Patch RFC 6902） */
  applyPatches: (patches: Array<{ op: string; path: string; value?: unknown; from?: string }>) => void;
  /** 读取变量（支持点路径） */
  getVariable: (path: string) => unknown;
  /** 获取格式化的变量摘要（用于注入 prompt） */
  getVariableSummary: (maxDepth?: number) => string;
  /** 获取简短状态行 */
  getStatusLine: () => string;
}

/** 递归格式化变量树 */
function formatTree(obj: unknown, indent = 0, maxDepth = 3): string {
  if (indent >= maxDepth) return "";
  const pad = "  ".repeat(indent);

  if (obj === null || obj === undefined) return "";
  if (typeof obj === "string") return obj.length > 100 ? obj.slice(0, 100) + "..." : obj;
  if (typeof obj === "number") return String(obj);
  if (typeof obj === "boolean") return obj ? "是" : "否";

  if (Array.isArray(obj)) {
    if (obj.length === 0) return "[]";
    return obj
      .map((item, i) => {
        const val = formatTree(item, indent + 1, maxDepth);
        return val ? `${pad}[${i}] ${val}` : "";
      })
      .filter(Boolean)
      .join("\n");
  }

  if (typeof obj === "object") {
    const entries = Object.entries(obj as Record<string, unknown>);
    if (entries.length === 0) return "{}";
    // 如果都是简单值，单行显示
    const allSimple = entries.every(
      ([, v]) => typeof v !== "object" || v === null
    );
    if (allSimple && indent > 0) {
      return entries
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
    }
    return entries
      .map(([key, val]) => {
        if (typeof val === "object" && val !== null) {
          const sub = formatTree(val, indent + 1, maxDepth);
          return sub ? `${pad}${key}:\n${sub}` : `${pad}${key}: {...}`;
        }
        return `${pad}${key}: ${val}`;
      })
      .join("\n");
  }

  return String(obj);
}

/** 从变量树生成简短状态行：选取前几个叶子值 */
function buildStatusLine(vars: VariableTree): string {
  const parts: string[] = [];
  const seen = new Set<string>();

  function walk(obj: unknown, prefix: string) {
    if (parts.length >= 6) return;
    if (obj === null || obj === undefined) return;
    if (typeof obj === "object" && !Array.isArray(obj)) {
      for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
        if (parts.length >= 6) break;
        if (typeof val === "number" && !seen.has(key)) {
          seen.add(key);
          parts.push(`${key}:${val}`);
        } else if (typeof val === "string" && val.length < 20 && !seen.has(key) && val !== "空" && val !== "无") {
          seen.add(key);
          parts.push(`${val}`);
        }
      }
    }
  }

  walk(vars, "");
  return parts.join(" | ") || "就绪";
}

export const useUniversalVariableStore = create<UniversalVarStore>()(
  persist(
    (set, get) => ({
      activeCharacterId: null,
      variables: {},
      initialized: false,

      setCharacter: (id: string) => {
        const currentId = get().activeCharacterId;
        if (currentId !== id) {
          set({ activeCharacterId: id, variables: {}, initialized: true });
        } else if (!get().initialized) {
          set({ initialized: true });
        }
      },

      setVariables: (vars) => set({ variables: vars }),

      reset: () => set({ variables: {} }),

      updateVariable: (path: string, value: unknown) => {
        const vars = JSON.parse(JSON.stringify(get().variables));
        const parts = path.replace(/^\//, "").split("/");
        let obj: any = vars;
        for (let i = 0; i < parts.length - 1; i++) {
          if (!(parts[i] in obj) || typeof obj[parts[i]] !== "object") {
            obj[parts[i]] = {};
          }
          obj = obj[parts[i]];
        }
        obj[parts[parts.length - 1]] = value;
        set({ variables: vars });
      },

      applyPatches: (patches) => {
        const vars = JSON.parse(JSON.stringify(get().variables));
        for (const patch of patches) {
          const path = (patch.path || "").replace(/^\//, "");
          const parts = path.split("/").filter(Boolean);
          let obj: any = vars;
          for (let i = 0; i < parts.length - 1; i++) {
            if (!(parts[i] in obj)) obj[parts[i]] = {};
            obj = obj[parts[i]];
          }
          const lastKey = parts[parts.length - 1];

          switch (patch.op) {
            case "replace":
            case "add":
              if (lastKey) obj[lastKey] = patch.value;
              break;
            case "remove":
              if (lastKey && Array.isArray(obj)) obj.splice(Number(lastKey), 1);
              else if (lastKey) delete obj[lastKey];
              break;
            case "move": {
              const fromPath = (patch.from || "").replace(/^\//, "");
              const fromParts = fromPath.split("/").filter(Boolean);
              let fromObj: any = vars;
              for (const fp of fromParts.slice(0, -1)) fromObj = fromObj?.[fp];
              if (fromObj) {
                const moved = fromObj[fromParts[fromParts.length - 1]];
                if (lastKey && moved !== undefined) {
                  obj[lastKey] = moved;
                  delete fromObj[fromParts[fromParts.length - 1]];
                }
              }
              break;
            }
          }
        }
        set({ variables: vars });
      },

      getVariable: (path: string) => {
        const parts = path.replace(/^\//, "").split("/").filter(Boolean);
        let obj: any = get().variables;
        for (const part of parts) {
          if (obj === null || obj === undefined) return undefined;
          obj = obj[part];
        }
        return obj;
      },

      getVariableSummary: (maxDepth = 3) => {
        const vars = get().variables;
        if (!vars || Object.keys(vars).length === 0) return "";
        return "[Game State]\n" + formatTree(vars, 0, maxDepth);
      },

      getStatusLine: () => buildStatusLine(get().variables),
    }),
    {
      name: "tavern-universal-variables",
      partialize: (state) => ({
        activeCharacterId: state.activeCharacterId,
        variables: state.variables,
        initialized: state.initialized,
      }),
    }
  )
);

// ---- 辅助：从角色卡 InitVar 条目解析初始变量 ----

/**
 * 从 InitVar 世界书条目内容解析初始变量树。
 * 格式: 缩进 YAML 风格
 *   日期: 2025年4月15日
 *   惩戒者:
 *     惩戒点数: 1000
 */
export function parseInitVars(content: string): VariableTree {
  const result: VariableTree = {};
  const lines = content.split("\n");
  const stack: Array<{ key: string; obj: Record<string, unknown>; indent: number }> = [];

  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith("#")) continue;

    const indent = line.search(/\S/);
    const trimmed = line.trim();
    const colonIdx = trimmed.indexOf(":");

    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    const value = trimmed.slice(colonIdx + 1).trim();

    // 处理缩进：栈弹出直到合适深度
    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    const parent = stack.length > 0 ? stack[stack.length - 1].obj : result;

    if (value === "" || value === "{}" || value === "[]") {
      // 嵌套对象
      const child: Record<string, unknown> = {};
      parent[key] = child;
      stack.push({ key, obj: child, indent });
    } else {
      // 叶子值
      parent[key] = parseLeafValue(value);
    }
  }

  return result;
}

function parseLeafValue(value: string): unknown {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "空" || value === "无" || value === "{}") return "";
  if (value === "[]") return [];
  if (/^\d+$/.test(value)) return Number(value);
  if (/^\d+\.\d+$/.test(value)) return parseFloat(value);
  return value;
}

// ---- 辅助：从 Zod Schema 提取类型结构 ----

/**
 * 从 MVU Zod Schema 文本中提取变量键名列表。
 * 用于理解变量系统的顶层结构。
 */
export function extractSchemaKeys(schemaText: string): string[] {
  const keys: string[] = [];
  const topLevelRegex = /^\s*(\w+):\s*z\./gm;
  let match;
  while ((match = topLevelRegex.exec(schemaText)) !== null) {
    keys.push(match[1]);
  }
  return keys;
}
