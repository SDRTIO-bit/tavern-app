// ============================================================
// RelationshipEngine — 关系演化引擎
//
// 根据互动事件更新社交图边。
// 不可变更新：返回新的 SocialEdge。
// ============================================================

import type { SocialEdge } from './SocialGraph';
import type { InteractionEvent } from './InteractionEvent';

function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

export class RelationshipEngine {
  /**
   * 根据互动事件更新关系边。
   * 返回新的 SocialEdge（不可变）。
   */
  static updateEdge(
    edge: SocialEdge,
    event: InteractionEvent,
  ): SocialEdge {
    const shift = event.impact.relationshipShift ?? {};

    let newEdge: SocialEdge = {
      ...edge,
      trust: clamp(edge.trust + (shift.trust ?? 0)),
      affinity: clamp(edge.affinity + (shift.affinity ?? 0)),
      tension: clamp(edge.tension + (shift.tension ?? 0)),
      lastInteractionAt: event.timestamp,
      interactionCount: edge.interactionCount + 1,
    };

    // 额外情绪驱动的变化
    newEdge = this.applyEmotionDrift(newEdge);

    return newEdge;
  }

  /**
   * 关系随时间自然漂移（向中性回归）。
   */
  static decay(edge: SocialEdge): SocialEdge {
    const neutralTrust = 50;
    const neutralAffinity = 50;
    const neutralTension = 50;

    // 每次 decay 向中性靠近 2%
    const rate = 0.02;

    return {
      ...edge,
      trust: clamp(edge.trust + (neutralTrust - edge.trust) * rate),
      affinity: clamp(
        edge.affinity + (neutralAffinity - edge.affinity) * rate,
      ),
      tension: clamp(
        edge.tension + (neutralTension - edge.tension) * rate * 0.5,
      ), // tension 衰减更慢
    };
  }

  /**
   * 基于关系内部状态的情绪漂移。
   * 高 tension → 微降 trust
   * 高 affinity → 微降 tension
   */
  private static applyEmotionDrift(edge: SocialEdge): SocialEdge {
    let { trust, affinity, tension } = edge;

    if (tension > 70) {
      trust = clamp(trust - 2);
    }
    if (affinity > 70) {
      tension = clamp(tension - 1);
    }
    if (trust < 20) {
      tension = clamp(tension + 1);
    }

    return { ...edge, trust, affinity, tension };
  }

  /**
   * 获取关系等级标签。
   */
  static getRelationshipLevel(edge: SocialEdge): string {
    const avg = (edge.trust + edge.affinity - edge.tension) / 2;

    if (avg > 80) return 'close friend';
    if (avg > 65) return 'friend';
    if (avg > 50) return 'acquaintance';
    if (avg > 35) return 'neutral';
    if (avg > 20) return 'distant';
    return 'hostile';
  }

  /**
   * 关系摘要。
   */
  static summarize(edge: SocialEdge): string {
    return `[${edge.from}→${edge.to}] ${this.getRelationshipLevel(edge)} | trust=${edge.trust} affinity=${edge.affinity} tension=${edge.tension} | ${edge.interactionCount} interactions`;
  }
}
