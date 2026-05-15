// ============================================================
// EmotionRules — 规则驱动的情绪评估引擎
//
// 从用户输入文本分析情感影响，输出 EmotionDelta。
// 使用关键词 + 模式匹配（非 LLM，纯规则）。
//
// 可通过 registerRule() 动态扩展规则集。
// ============================================================

import type { EmotionDelta } from './EmotionTypes';

/** 单条情感规则 */
export interface EmotionRule {
  /** 规则名称 */
  name: string;
  /** 触发条件：文本包含任一关键词 */
  keywords: string[];
  /** 情绪变化 */
  delta: EmotionDelta;
  /** 优先级（越大越先匹配，用于规则冲突时覆盖） */
  priority?: number;
}

// ---- 内置规则集 ----

const BUILTIN_RULES: EmotionRule[] = [
  // ===== 负面 / 攻击 =====
  {
    name: 'insult_severe',
    keywords: ['滚', '滚开', '滚蛋', '傻逼', '智障'],
    delta: { anger: 30, trust: -20, stress: 15 },
    priority: 100,
  },
  {
    name: 'rejection',
    keywords: ['讨厌', '烦', '别烦我', '走开'],
    delta: { anger: 20, trust: -15, affection: -10 },
    priority: 90,
  },
  {
    name: 'dismissal',
    keywords: ['不在乎', '不关心', '无所谓', '随便'],
    delta: { trust: -10, affection: -5, stress: 5 },
    priority: 80,
  },
  {
    name: 'criticism',
    keywords: ['你不好', '你错了', '你不行', '没用'],
    delta: { stress: 12, trust: -8, happiness: -5 },
    priority: 80,
  },

  // ===== 正面 / 亲近 =====
  {
    name: 'gratitude',
    keywords: ['谢谢', '感谢', '帮了我', '多亏你'],
    delta: { affection: 12, trust: 10, happiness: 8 },
    priority: 90,
  },
  {
    name: 'praise',
    keywords: ['你好厉害', '真棒', '太好了', '最喜欢'],
    delta: { happiness: 15, affection: 10, trust: 5 },
    priority: 85,
  },
  {
    name: 'affection_direct',
    keywords: ['喜欢你', '爱你', '想你', '离不开你'],
    delta: { affection: 20, happiness: 12, loneliness: -15 },
    priority: 100,
  },
  {
    name: 'care',
    keywords: ['你还好吗', '还好吗', '没事吧', '担心你'],
    delta: { loneliness: -10, affection: 8, stress: -5 },
    priority: 80,
  },

  // ===== 好奇心 / 探索 =====
  {
    name: 'question_curious',
    keywords: ['为什么', '怎么', '告诉我', '你知道'],
    delta: { curiosity: 8, happiness: 2 },
    priority: 50,
  },
  {
    name: 'story_request',
    keywords: ['讲个故事', '说说看', '聊聊', '你呢'],
    delta: { curiosity: 5, affection: 3, happiness: 3 },
    priority: 60,
  },

  // ===== 压力 / 焦虑 =====
  {
    name: 'urgent_request',
    keywords: ['快', '马上', '紧急', '立刻', '赶紧'],
    delta: { stress: 8, curiosity: 5 },
    priority: 60,
  },
  {
    name: 'confession_negative',
    keywords: ['我很难过', '我失败了', '我失去'],
    delta: { stress: 10, affection: 5, loneliness: 5 },
    priority: 70,
  },

  // ===== 沉默 / 冷淡 =====
  {
    name: 'short_reply',
    keywords: ['嗯', '哦', '好', '行'],
    delta: { loneliness: 5, trust: -2, curiosity: -5 },
    priority: 20,
  },
];

// ---- EmotionRules ----

export class EmotionRules {
  private static customRules: EmotionRule[] = [];

  /** 注册自定义规则 */
  static registerRule(rule: EmotionRule): void {
    this.customRules.push(rule);
  }

  /** 清空自定义规则 */
  static clearCustomRules(): void {
    this.customRules = [];
  }

  /** 获取所有规则（内置 + 自定义，按优先级降序） */
  static getAllRules(): EmotionRule[] {
    return [...BUILTIN_RULES, ...this.customRules].sort(
      (a, b) => (b.priority ?? 0) - (a.priority ?? 0),
    );
  }

  /**
   * 评估文本，返回情绪增量。
   * 多个规则命中时，高优先级规则覆盖低优先级。
   */
  static evaluate(
    text: string,
    intensity: number = 1,
  ): EmotionDelta {
    const delta: Required<EmotionDelta> = {
      happiness: 0,
      stress: 0,
      trust: 0,
      affection: 0,
      anger: 0,
      loneliness: 0,
      curiosity: 0,
    };

    const rules = this.getAllRules();
    const lowerText = text.toLowerCase();

    for (const rule of rules) {
      const matched = rule.keywords.some((kw) =>
        lowerText.includes(kw.toLowerCase()),
      );
      if (!matched) continue;

      // 高优先级规则覆盖（如果维度冲突）
      for (const key of Object.keys(rule.delta) as (keyof EmotionDelta)[]) {
        const value = rule.delta[key];
        if (value === undefined) continue;
        // 简单累加（高优先级规则先匹配，低优先级影响较小）
        delta[key] += value * intensity;
      }
    }

    // 清除零值字段，返回稀疏对象
    return cleanDelta(delta);
  }

  /**
   * 评估用户消息（快捷方法，intensity=1）。
   */
  static evaluateUserMessage(text: string): EmotionDelta {
    return this.evaluate(text, 1);
  }
}

/** 移除 delta 中值为 0 的字段 */
function cleanDelta(delta: Required<EmotionDelta>): EmotionDelta {
  const result: EmotionDelta = {};
  for (const [key, value] of Object.entries(delta)) {
    if (value !== 0) {
      (result as Record<string, number>)[key] = Math.round(value);
    }
  }
  return result;
}
