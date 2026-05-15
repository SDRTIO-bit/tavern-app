// ============================================================
// AutonomyPolicy — 自主性决策策略
//
// 根据 CharacterBrain 状态计算行动倾向分数和阈值。
// 纯函数式，无副作用。
// ============================================================

import type { CharacterBrain } from '../CharacterBrain';

/** 自主性分数分解 */
export interface AutonomyScore {
  /** 综合行动倾向 (0~100) */
  total: number;
  /** 好奇心驱动 */
  curiosityDrive: number;
  /** 孤独驱动 */
  lonelinessDrive: number;
  /** 压力抑制 */
  stressPenalty: number;
  /** 友情驱动 */
  affectionDrive: number;
  /** 主动性等级 */
  tier: 'idle' | 'contemplative' | 'active' | 'driven';
}

/** 行动类型 */
export type AutonomyActionType =
  | 'none'
  | 'message'
  | 'tool'
  | 'event'
  | 'wait';

/** 策略配置 */
export interface AutonomyPolicyConfig {
  /** 最低行动分数阈值（低于此值什么都不做） */
  idleThreshold: number;
  /** 主动发消息的最低孤独值 */
  messageLonelinessMin: number;
  /** 触发工具的最低好奇心 */
  toolCuriosityMin: number;
  /** 触发事件的最低综合分数 */
  eventScoreMin: number;
}

export const DEFAULT_AUTONOMY_CONFIG: AutonomyPolicyConfig = {
  idleThreshold: 40,
  messageLonelinessMin: 60,
  toolCuriosityMin: 70,
  eventScoreMin: 65,
};

export class AutonomyPolicy {
  /**
   * 计算自主性分数。
   *
   * 公式：
   *   total = curiosity*0.3 + loneliness*0.4 + (100-stress)*0.3
   *   + affection*0.2（cap 到 100）
   */
  static score(brain: CharacterBrain): AutonomyScore {
    const e = brain.emotion;

    const curiosityDrive = e.curiosity * 0.3;
    const lonelinessDrive = e.loneliness * 0.4;
    const stressPenalty = (100 - e.stress) * 0.3;
    const affectionDrive = e.affection * 0.2;

    const total = Math.min(
      100,
      Math.round(curiosityDrive + lonelinessDrive + stressPenalty + affectionDrive),
    );

    let tier: AutonomyScore['tier'];
    if (total < 40) tier = 'idle';
    else if (total < 60) tier = 'contemplative';
    else if (total < 80) tier = 'active';
    else tier = 'driven';

    return {
      total,
      curiosityDrive: Math.round(curiosityDrive),
      lonelinessDrive: Math.round(lonelinessDrive),
      stressPenalty: Math.round(stressPenalty),
      affectionDrive: Math.round(affectionDrive),
      tier,
    };
  }

  /**
   * 决定行动类型。
   */
  static decideAction(
    brain: CharacterBrain,
    score: AutonomyScore,
    config: AutonomyPolicyConfig = DEFAULT_AUTONOMY_CONFIG,
  ): AutonomyActionType {
    // 低于阈值 → 什么都不做
    if (score.total < config.idleThreshold) {
      return 'none';
    }

    const e = brain.emotion;

    // 高孤独 + 有关系对象 → 主动发消息
    if (
      e.loneliness >= config.messageLonelinessMin &&
      brain.relationships.length > 0
    ) {
      return 'message';
    }

    // 高好奇心 → 触发工具
    if (e.curiosity >= config.toolCuriosityMin) {
      return 'tool';
    }

    // 高综合分数 → 触发事件
    if (score.total >= config.eventScoreMin) {
      return 'event';
    }

    // 中等分数 → 等待（保持活跃但不行动）
    return 'wait';
  }

  /**
   * 获取决策理由（调试用）。
   */
  static explainDecision(
    brain: CharacterBrain,
    score: AutonomyScore,
    action: AutonomyActionType,
  ): string {
    const e = brain.emotion;
    const reasons: string[] = [];

    reasons.push(`score=${score.total} tier=${score.tier}`);
    reasons.push(
      `curiosity=${e.curiosity} loneliness=${e.loneliness} stress=${e.stress} affection=${e.affection}`,
    );

    switch (action) {
      case 'none':
        reasons.push(`→ IDLE: score below threshold`);
        break;
      case 'message':
        reasons.push(
          `→ MESSAGE: loneliness(${e.loneliness}) >= ${DEFAULT_AUTONOMY_CONFIG.messageLonelinessMin}`,
        );
        break;
      case 'tool':
        reasons.push(
          `→ TOOL: curiosity(${e.curiosity}) >= ${DEFAULT_AUTONOMY_CONFIG.toolCuriosityMin}`,
        );
        break;
      case 'event':
        reasons.push(
          `→ EVENT: score(${score.total}) >= ${DEFAULT_AUTONOMY_CONFIG.eventScoreMin}`,
        );
        break;
      case 'wait':
        reasons.push(`→ WAIT: moderate activity, observing`);
        break;
    }

    return reasons.join(' | ');
  }
}
