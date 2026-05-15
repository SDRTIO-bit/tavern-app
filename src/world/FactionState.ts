// ============================================================
// FactionState — 势力系统
//
// 管理势力间关系、权力、情绪。
// ============================================================

import type { FactionState } from './WorldState';

/** 势力操作 */
export class FactionManager {
  /** 创建势力 */
  static createFaction(
    name: string,
    power: number = 50,
    mood: number = 50,
    wealth: number = 100,
  ): FactionState {
    return {
      name,
      power: Math.max(0, Math.min(100, power)),
      mood: Math.max(0, Math.min(100, mood)),
      wealth,
      relations: {},
    };
  }

  /** 修改势力 mood */
  static adjustMood(
    faction: FactionState,
    delta: number,
  ): FactionState {
    return {
      ...faction,
      mood: Math.max(0, Math.min(100, faction.mood + delta)),
    };
  }

  /** 修改势力 power */
  static adjustPower(
    faction: FactionState,
    delta: number,
  ): FactionState {
    return {
      ...faction,
      power: Math.max(0, Math.min(100, faction.power + delta)),
    };
  }

  /** 修改势力关系 */
  static adjustRelation(
    faction: FactionState,
    targetId: string,
    delta: number,
  ): FactionState {
    const current = faction.relations[targetId] ?? 50;
    return {
      ...faction,
      relations: {
        ...faction.relations,
        [targetId]: Math.max(0, Math.min(100, current + delta)),
      },
    };
  }

  /** 获取两势力间的关系值 */
  static getRelation(
    faction: FactionState,
    targetId: string,
  ): number {
    return faction.relations[targetId] ?? 50;
  }

  /** 势力摘要 */
  static summarize(faction: FactionState): string {
    return `[${faction.name}] power=${faction.power} mood=${faction.mood} wealth=${faction.wealth} relations=${Object.keys(faction.relations).length}`;
  }
}
