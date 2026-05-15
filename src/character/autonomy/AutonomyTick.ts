// ============================================================
// AutonomyTick — 角色心跳定时系统
//
// 可启动/停止的 interval-based tick 系统。
// 不依赖特定平台（setInterval 在 Node.js 和浏览器通用）。
// ============================================================

/** Tick 回调 */
export type TickCallback = () => void;

/** Tick 系统配置 */
export interface TickConfig {
  /** 基础间隔（毫秒），默认 5000 */
  intervalMs: number;
  /** 是否启用随机抖动（避免多个角色同时 tick） */
  jitter?: boolean;
  /** 抖动范围（± ms） */
  jitterRange?: number;
}

export class AutonomyTickSystem {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private config: Required<TickConfig>;
  private running = false;
  private currentTickFn: TickCallback | null = null;

  constructor(config: Partial<TickConfig> = {}) {
    this.config = {
      intervalMs: config.intervalMs ?? 5000,
      jitter: config.jitter ?? false,
      jitterRange: config.jitterRange ?? 1000,
    };
  }

  /** 启动 tick */
  start(tickFn: TickCallback): void {
    if (this.running) return;
    this.currentTickFn = tickFn;

    const interval = this.config.jitter
      ? this.config.intervalMs +
        (Math.random() * 2 - 1) * this.config.jitterRange
      : this.config.intervalMs;

    this.intervalId = setInterval(() => {
      tickFn();
      // 如果启用抖动，每次后重新设定间隔
      if (this.config.jitter && this.intervalId && this.currentTickFn) {
        clearInterval(this.intervalId);
        const newInterval =
          this.config.intervalMs +
          (Math.random() * 2 - 1) * this.config.jitterRange;
        this.intervalId = setInterval(this.currentTickFn, newInterval);
      }
    }, interval);

    this.running = true;
  }

  /** 停止 tick */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.running = false;
    this.currentTickFn = null;
  }

  /** 是否运行中 */
  get isRunning(): boolean {
    return this.running;
  }

  /** 更新配置（强制重启以应用新间隔） */
  updateConfig(config: Partial<TickConfig>): void {
    if (config.intervalMs !== undefined) {
      this.config.intervalMs = config.intervalMs;
    }
    if (config.jitter !== undefined) {
      this.config.jitter = config.jitter;
    }
    if (config.jitterRange !== undefined) {
      this.config.jitterRange = config.jitterRange;
    }

    if (this.running && this.currentTickFn) {
      const fn = this.currentTickFn;
      this.stop();
      this.start(fn);
    }
  }
}
