// ============================================================
// NPCWorldTick — NPC 全局社交心跳
//
// 协调每次社交 tick：
//   1. NPCScheduler 生成互动事件
//   2. SocialEventProcessor 应用到社交图
//   3. 关系衰减
//   4. 返回更新后的图和事件日志
// ============================================================

import type { SocialGraph } from './SocialGraph';
import { NPCScheduler } from './NPCScheduler';
import type { NPCSchedulerConfig } from './NPCScheduler';
import { SocialEventProcessor } from './SocialEventProcessor';
import type { InteractionEvent } from './InteractionEvent';
import { describeInteraction } from './InteractionEvent';

/** 社交 Tick 结果 */
export interface NPCTickResult {
  /** 更新后的社交图 */
  graph: SocialGraph;
  /** 本 tick 生成的互动事件 */
  events: InteractionEvent[];
  /** 事件日志 */
  log: string[];
}

export class NPCWorldTick {
  private scheduler: NPCScheduler;

  constructor(config?: Partial<NPCSchedulerConfig>) {
    this.scheduler = new NPCScheduler(config);
  }

  /**
   * 执行一个社交 tick。
   */
  tick(graph: SocialGraph): NPCTickResult {
    const log: string[] = [];

    // 1️⃣ NPC 自主互动
    const events = this.scheduler.tick(graph);

    if (events.length > 0) {
      log.push(`[Social Tick] ${events.length} interaction(s) generated`);
    }

    // 2️⃣ 应用所有事件
    let updatedGraph = SocialEventProcessor.applyAll(graph, events);

    // 3️⃣ 记录日志
    for (const event of events) {
      log.push(`  ${describeInteraction(event)}`);
    }

    // 4️⃣ 关系衰减（低频，每 N 个 tick 一次）
    // 在外部控制频率，这里每次 tick 都执行（影响小）

    return { graph: updatedGraph, events, log };
  }

  /**
   * 执行带衰减的 tick。
   */
  tickWithDecay(graph: SocialGraph, decayEdges: boolean = false): NPCTickResult {
    const result = this.tick(graph);

    if (decayEdges) {
      result.graph = SocialEventProcessor.decayAllEdges(result.graph);
      result.log.push('[Social] Edge decay applied');
    }

    return result;
  }
}
