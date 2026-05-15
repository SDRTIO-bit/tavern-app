// ============================================================
// logger — 统一日志系统
//
// 提供带时间戳的分级日志。
// 后续可换 pino / winston。
// ============================================================

const ts = () => new Date().toISOString().slice(11, 23);

export const logger = {
  info: (...args: unknown[]) =>
    console.log(`[${ts()}] [INFO]`, ...args),
  warn: (...args: unknown[]) =>
    console.warn(`[${ts()}] [WARN]`, ...args),
  error: (...args: unknown[]) =>
    console.error(`[${ts()}] [ERROR]`, ...args),
  debug: (...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${ts()}] [DEBUG]`, ...args);
    }
  },
  sse: (event: string, detail?: unknown) =>
    console.log(`[${ts()}] [SSE] ${event}`, detail ?? ''),
  request: (method: string, path: string, status?: number) =>
    console.log(
      `[${ts()}] [REQ] ${method} ${path}` +
        (status !== undefined ? ` → ${status}` : ''),
    ),
};
