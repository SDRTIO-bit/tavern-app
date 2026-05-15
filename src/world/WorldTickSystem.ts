// ============================================================
// WorldTickSystem — 世界心跳系统
//
// 定时触发 WorldEngine.tick()，驱动世界自主运行。
// 与 autonomy 的 AutonomyTickSystem 类似，但作用于全局世界。
// ============================================================

/** Tick 回调 */
export type WorldTickCallback = () => void;

export interface WorldTickConfig {
  /** 世界 tick 间隔（毫秒），默认 5000 */
  intervalMs: number;
  /** 随机抖动 */
  jitter?: boolean;
  jitterRange?: number;
}

export class WorldTickSystem {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private config: Required<WorldTickConfig>;
  private running = false;
  private currentTickFn: WorldTickCallback | null = null;

  constructor(config: Partial<WorldTickConfig> = {}) {
    this.config = {
      intervalMs: config.intervalMs ?? 5000,
      jitter: config.jitter ?? false,
      jitterRange: config.jitterRange ?? 500,
    };
  }

  start(tickFn: WorldTickCallback): void {
    if (this.running) return;
    this.currentTickFn = tickFn;

    this.intervalId = setInterval(() => {
      tickFn();
    }, this.config.intervalMs);

    this.running = true;
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.running = false;
    this.currentTickFn = null;
  }

  get isRunning(): boolean {
    return this.running;
  }

  updateConfig(config: Partial<WorldTickConfig>): void {
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
