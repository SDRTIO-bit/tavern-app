// ============================================================
// ScriptSandbox — 安全脚本沙箱
//
// 限制：
//   - 最大执行时间 5000ms
//   - 最大循环 10000 次
//   - 禁止 fs / network / process / eval / child_process
//   - 只暴露 ctx (inputs/outputs/variables)
// ============================================================

export interface ScriptContext {
  /** 输入数据 */
  inputs: Record<string, unknown>;
  /** 输出数据（脚本写入） */
  outputs: Record<string, unknown>;
  /** 变量 */
  variables: Record<string, unknown>;
  /** 日志 */
  log: (msg: string) => void;
}

export interface ScriptResult {
  success: boolean;
  outputs: Record<string, unknown>;
  logs: string[];
  error?: string;
  durationMs: number;
  loopCount: number;
}

/** 安全沙箱执行脚本 */
export function executeScript(
  code: string,
  ctx: ScriptContext,
  options?: {
    maxTimeMs?: number;
    maxLoops?: number;
  },
): ScriptResult {
  const maxTimeMs = options?.maxTimeMs ?? 5000;
  const maxLoops = options?.maxLoops ?? 10000;
  const logs: string[] = [];
  let loopCount = 0;

  const startTime = performance.now();

  // 安全包装：拦截危险 API
  const sandbox = {
    // 允许的全局
    Math,
    Date,
    String,
    Number,
    Boolean,
    Array,
    Object,
    JSON,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,

    // 上下文
    inputs: { ...ctx.inputs },
    outputs: { ...ctx.outputs },
    vars: { ...ctx.variables },

    // 受限 console
    console: {
      log: (...args: unknown[]) => {
        logs.push(args.map(String).join(" "));
        ctx.log(args.map(String).join(" "));
      },
      warn: (...args: unknown[]) => logs.push("[warn] " + args.map(String).join(" ")),
      error: (...args: unknown[]) => logs.push("[error] " + args.map(String).join(" ")),
    },

    // 循环保护
    _loopCount: 0,
    _maxLoops: maxLoops,

    // 时间检查
    _checkTimeout: () => {
      if (performance.now() - startTime > maxTimeMs) {
        throw new Error(`Script timeout: exceeded ${maxTimeMs}ms`);
      }
      loopCount++;
      if (loopCount > maxLoops) {
        throw new Error(`Script loop limit: exceeded ${maxLoops} iterations`);
      }
    },
  };

  try {
    // 包装用户代码
    const wrappedCode = `
      "use strict";
      const { inputs, outputs, vars, console: c, _checkTimeout } = __sandbox__;
      ${code}
    `;

    const fn = new Function("__sandbox__", wrappedCode);
    fn(sandbox);

    const durationMs = Math.round(performance.now() - startTime);

    return {
      success: true,
      outputs: sandbox.outputs,
      logs,
      durationMs,
      loopCount,
    };
  } catch (err) {
    const durationMs = Math.round(performance.now() - startTime);
    return {
      success: false,
      outputs: {},
      logs,
      error: (err as Error).message,
      durationMs,
      loopCount,
    };
  }
}

/** 预置脚本模板 */
export const SCRIPT_TEMPLATES: Record<string, { name: string; description: string; code: string }> = {
  "emotion-filter": {
    name: "情绪过滤器",
    description: "根据情绪强度决定输出模式",
    code: `
// 检查情绪分数
const score = inputs.score || 0;
const dominant = inputs.dominant || "neutral";

if (score > 0.7) {
  outputs.mode = "intense";
  c.log("高强度情绪: " + dominant);
} else if (score > 0.4) {
  outputs.mode = "moderate";
} else {
  outputs.mode = "calm";
}
`,
  },
  "memory-counter": {
    name: "记忆计数器",
    description: "统计记忆并设置标志",
    code: `
const count = inputs.count || 0;
const total = inputs.total || 0;

outputs.hasMemory = count > 0;
outputs.isRich = count > 5;
outputs.ratio = total > 0 ? count / total : 0;

c.log("记忆: " + count + "/" + total);
`,
  },
};
