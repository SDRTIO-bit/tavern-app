// ============================================================
// WorldImpact — 世界对角色大脑的影响桥接
//
// 将 WorldState 的变化映射为 CharacterBrain 的情绪更新。
// 在 world tick 后对每个 session 调用。
// ============================================================

import type { CharacterBrain } from '../CharacterBrain';
import type { WorldState } from '../../world/WorldState';
import { getEventEmotionImpact } from '../../world/WorldEvent';
import { modifyEmotions } from '../EmotionState';

/**
 * 将世界状态作用于角色大脑。
 *
 * 影响来源：
 *   1. 活跃事件 → 情绪冲击
 *   2. 时间段 → 基础情绪调整
 *   3. 势力状态 → 安全感
 *
 * 返回新的 CharacterBrain（不可变）。
 */
export function applyWorldImpact(
  brain: CharacterBrain,
  world: WorldState,
  options?: {
    /** 角色所在位置 */
    location?: string;
    /** 角色所属势力 */
    faction?: string;
  },
): CharacterBrain {
  let result = { ...brain };
  const deltas: Record<string, number> = {};

  // ---- 1. 事件影响 ----
  for (const event of world.activeEvents) {
    if (event.status !== 'active') continue;

    // 检查角色是否受影响
    const isAffected =
      event.affectedCharacters.length === 0 ||
      event.affectedCharacters.includes(brain.characterId) ||
      (options?.location && event.location === options.location);

    if (!isAffected) continue;

    const impact = getEventEmotionImpact(event);
    deltas.happiness = (deltas.happiness ?? 0) + impact.happiness;
    deltas.stress = (deltas.stress ?? 0) + impact.stress;
    // fear 映射到 stress
    deltas.stress = (deltas.stress ?? 0) + impact.fear * 0.5;
  }

  // ---- 2. 时间段影响 ----
  const hour = world.time.hour;
  if (hour >= 22 || hour < 5) {
    // 深夜 → 孤独感上升
    deltas.loneliness = (deltas.loneliness ?? 0) + 3;
    deltas.curiosity = (deltas.curiosity ?? 0) - 2;
  } else if (hour >= 5 && hour < 8) {
    // 黎明 → 希望感
    deltas.happiness = (deltas.happiness ?? 0) + 3;
  } else if (hour >= 12 && hour < 14) {
    // 正午 → 活力
    deltas.stress = (deltas.stress ?? 0) - 2;
  }

  // ---- 3. 势力影响 ----
  if (options?.faction && world.factions[options.faction]) {
    const faction = world.factions[options.faction];
    // 势力 mood 影响角色情感
    if (faction.mood > 70) {
      deltas.happiness = (deltas.happiness ?? 0) + 2;
    } else if (faction.mood < 30) {
      deltas.stress = (deltas.stress ?? 0) + 3;
    }
  } else if (world.factions.global) {
    const globalMood = world.factions.global.mood;
    if (globalMood < 35) {
      deltas.stress = (deltas.stress ?? 0) + 2;
    }
  }

  // ---- 4. 地点影响 ----
  if (options?.location && world.locations[options.location]) {
    const loc = world.locations[options.location];
    if (loc.flags.dangerous) {
      deltas.stress = (deltas.stress ?? 0) + 5;
    }
    if (loc.flags.safe) {
      deltas.stress = (deltas.stress ?? 0) - 3;
    }
  }

  // 应用所有 delta
  if (Object.keys(deltas).length > 0) {
    result = {
      ...result,
      emotion: modifyEmotions(result.emotion, deltas as Record<string, number>),
    };
  }

  // ---- 5. 写入世界感知到 metadata ----
  result = {
    ...result,
    metadata: {
      ...result.metadata,
      worldPerception: {
        time: `${world.time.day}-${String(world.time.hour).padStart(2, '0')}:${String(world.time.minute).padStart(2, '0')}`,
        activeEvents: world.activeEvents.length,
        globalMood: world.factions.global?.mood ?? 50,
      },
    },
  };

  return result;
}

/**
 * 全局 world tick pipeline：
 *   1. 世界推进
 *   2. 所有会话的角色受影响
 */
export function globalWorldTick(
  world: WorldState,
  sessions: Array<{
    characterBrain?: CharacterBrain;
    setCharacterBrain?: (brain: CharacterBrain) => void;
    location?: string;
    faction?: string;
  }>,
  worldEngine: { tick: (w: WorldState) => WorldState },
): WorldState {
  // 🌍 世界推进
  const newWorld = worldEngine.tick(world);

  // 🧠 世界影响每个角色
  for (const session of sessions) {
    if (session.characterBrain && session.setCharacterBrain) {
      const updatedBrain = applyWorldImpact(
        session.characterBrain,
        newWorld,
        {
          location: session.location,
          faction: session.faction,
        },
      );
      session.setCharacterBrain(updatedBrain);
    }
  }

  return newWorld;
}
