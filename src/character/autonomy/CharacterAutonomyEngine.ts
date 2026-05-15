// ============================================================
// CharacterAutonomyEngine — 角色自主性引擎
//
// 核心 think → decide → act 流程。
//
// 每个 tick 调用：
//   1. 计算情绪分数（AutonomyPolicy.score）
//   2. 决定行动类型（AutonomyPolicy.decideAction）
//   3. 规划具体行动（ActionPlanner.plan）
//
// 与 Scheduler / Pipeline 集成入口：
//   runAutonomy(session, scheduler, pipeline)
// ============================================================

import type { CharacterBrain } from '../CharacterBrain';
import { EmotionEngine } from '../runtime/EmotionEngine';
import { AutonomyPolicy, DEFAULT_AUTONOMY_CONFIG } from './AutonomyPolicy';
import type { AutonomyPolicyConfig, AutonomyScore } from './AutonomyPolicy';
import { ActionPlanner } from './ActionPlanner';
import type { AutonomyAction } from './ActionPlanner';

/** Tick 上下文 */
export interface AutonomyContext {
  /** 角色大脑 */
  brain: CharacterBrain;
  /** 上次用户输入（可选） */
  lastUserInput?: string;
  /** 世界状态（可选） */
  worldState?: Record<string, unknown>;
  /** 距离上次 tick 的时间差（毫秒） */
  timeDelta?: number;
}

/** Tick 结果 */
export interface AutonomyTickResult {
  /** 决策动作 */
  action: AutonomyAction;
  /** 情绪分数 */
  score: AutonomyScore;
  /** 决策说明 */
  explanation: string;
  /** 更新后的 brain（已应用情绪衰减） */
  brain: CharacterBrain;
}

export class CharacterAutonomyEngine {
  private config: AutonomyPolicyConfig;

  constructor(config?: Partial<AutonomyPolicyConfig>) {
    this.config = { ...DEFAULT_AUTONOMY_CONFIG, ...config };
  }

  /**
   * 执行一次 tick（think → decide → act）。
   *
   * @param ctx 自主性上下文
   * @returns 行动 + 更新后的 brain
   */
  tick(ctx: AutonomyContext): AutonomyTickResult {
    // ---- 0. 情绪随时间衰减 ----
    let brain = EmotionEngine.decayOverTime(ctx.brain);

    // ---- 1. 计算情绪分数 ----
    const score = AutonomyPolicy.score(brain);

    // ---- 2. 决定行动类型 ----
    const actionType = AutonomyPolicy.decideAction(brain, score, this.config);

    // ---- 3. 规划具体行动 ----
    const action = ActionPlanner.plan(brain, actionType);

    // ---- 4. 生成决策说明 ----
    const explanation = AutonomyPolicy.explainDecision(
      brain,
      score,
      action.type,
    );

    return { action, score, explanation, brain };
  }

  /**
   * 更新策略配置。
   */
  updateConfig(config: Partial<AutonomyPolicyConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * 将自主行动接入 Scheduler / Pipeline 的执行函数。
 *
 * 使用方式：
 *   const result = engine.tick({ brain: session.characterBrain })
 *   session.characterBrain = result.brain
 *   await runAutonomyAction(result.action, session, scheduler, pipeline)
 *
 * @param action 自主行动
 * @param executeMessage 执行消息的回调
 * @param dispatchTool 分发工具的回调
 * @param pauseScheduler 暂停调度器的回调
 */
export async function runAutonomyAction(
  action: AutonomyAction,
  executeMessage: (content: string) => Promise<void>,
  dispatchTool: (toolName: string, payload: Record<string, unknown>) => void,
  pauseScheduler: () => void,
): Promise<void> {
  switch (action.type) {
    case 'message':
      if (action.content) {
        await executeMessage(action.content);
      }
      break;

    case 'tool':
      if (action.toolName) {
        dispatchTool(action.toolName, action.payload ?? {});
      }
      break;

    case 'event':
      // 事件由外部系统处理
      break;

    case 'wait':
      pauseScheduler();
      break;

    case 'none':
    default:
      break;
  }
}
