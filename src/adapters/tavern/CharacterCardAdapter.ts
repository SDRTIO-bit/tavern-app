// ============================================================
// CharacterCardAdapter — 角色卡适配器
//
// 将 SillyTavern 风格的角色卡转换为内部 CharacterBrain。
// 支持双向转换：Tavern Card ↔ CharacterBrain。
// ============================================================

import type { TavernCharacterCard } from './TavernRequestParser';
import type { CharacterBrain } from '@/character/CharacterBrain';
import { createCharacterBrain } from '@/character/CharacterBrain';
import type { CharacterGoal } from '@/character/CharacterGoal';
import { createGoal } from '@/character/CharacterGoal';
import type { CharacterMemory } from '@/character/CharacterMemory';
import { createCharacterMemory } from '@/character/CharacterMemory';
import { createRelationshipState } from '@/character/RelationshipState';

export class CharacterCardAdapter {
  /**
   * 从 Tavern 角色卡创建 CharacterBrain。
   *
   * @param card Tavern 角色卡
   * @param existingBrain 已有的大脑（保留情绪/关系/目标/记忆）
   */
  static toBrain(
    card: TavernCharacterCard,
    existingBrain?: CharacterBrain,
  ): CharacterBrain {
    const brain = existingBrain ?? createCharacterBrain(card.id ?? card.name);

    // 基础信息
    const updatedBrain: CharacterBrain = {
      ...brain,
      characterId: card.id ?? card.name,
      metadata: {
        ...brain.metadata,
        characterCard: {
          name: card.name,
          description: card.description,
          personality: card.personality,
          scenario: card.scenario,
          firstMessage: card.first_mes,
          creator: card.creator,
          version: card.character_version,
          tags: card.tags,
        },
      },
    };

    // 首次创建：初始化
    if (!existingBrain) {
      return this.initializeFirstTime(updatedBrain, card);
    }

    return updatedBrain;
  }

  /**
   * 从 CharacterBrain 导出为 Tavern 角色卡（简化版）。
   */
  static fromBrain(brain: CharacterBrain): Partial<TavernCharacterCard> {
    const meta = brain.metadata?.characterCard as
      | Record<string, unknown>
      | undefined;

    return {
      id: brain.characterId,
      name: (meta?.name as string) ?? brain.characterId,
      description: (meta?.description as string) ?? '',
      personality: (meta?.personality as string) ?? '',
      scenario: (meta?.scenario as string) ?? '',
    };
  }

  /**
   * 首次初始化：根据角色卡创建初始记忆和目标。
   */
  private static initializeFirstTime(
    brain: CharacterBrain,
    card: TavernCharacterCard,
  ): CharacterBrain {
    const memories: CharacterMemory[] = [];
    const goals: CharacterGoal[] = [];

    // 从角色描述创建初始记忆
    if (card.description) {
      memories.push(
        createCharacterMemory(
          `I am ${card.name}. ${card.description}`,
          90,
        ),
      );
    }

    if (card.personality) {
      memories.push(
        createCharacterMemory(
          `My personality: ${card.personality}`,
          80,
        ),
      );
    }

    // 从场景创建初始目标
    if (card.scenario) {
      goals.push(
        createGoal(`Navigate the current scenario: ${card.scenario}`, 5),
      );
    }

    // 创建与用户的初始关系
    const userRelationship = createRelationshipState('user');

    return {
      ...brain,
      memories: [
        ...brain.memories,
        ...memories.map((m) => ({
          ...m,
          tags: ['character_card', 'identity'],
        })),
      ],
      goals: [...brain.goals, ...goals],
      relationships: [...brain.relationships, userRelationship],
      currentState: card.scenario
        ? { activity: card.scenario }
        : undefined,
    };
  }
}
