// ============================================================
// TimeEngine — 世界时间引擎
//
// 推进世界时间，处理日夜循环。
// ============================================================

import type { WorldState, WorldTime } from './WorldState';

export class TimeEngine {
  /**
   * 推进世界时间。
   * @param world 当前世界状态
   * @param minutes 推进的分钟数（默认 15 分钟/tick）
   */
  static tick(world: WorldState, minutes: number = 15): WorldState {
    let { day, hour, minute } = world.time;

    minute += minutes;

    // 进位
    while (minute >= 60) {
      minute -= 60;
      hour += 1;
    }

    while (hour >= 24) {
      hour -= 24;
      day += 1;
    }

    const newTime: WorldTime = { day, hour, minute };

    return {
      ...world,
      time: newTime,
    };
  }

  /**
   * 设置世界时间。
   */
  static setTime(
    world: WorldState,
    day?: number,
    hour?: number,
    minute?: number,
  ): WorldState {
    return {
      ...world,
      time: {
        day: day ?? world.time.day,
        hour: hour ?? world.time.hour,
        minute: minute ?? world.time.minute,
      },
    };
  }

  /**
   * 获取时间流逝的描述。
   */
  static describePassage(
    oldTime: WorldTime,
    newTime: WorldTime,
  ): string {
    if (oldTime.day !== newTime.day) {
      return `A new day dawns (Day ${newTime.day}).`;
    }
    const oldPeriod = getTimeOfDayStr(oldTime.hour);
    const newPeriod = getTimeOfDayStr(newTime.hour);
    if (oldPeriod !== newPeriod) {
      return `Time passes... it is now ${newPeriod}.`;
    }
    return `Time passes...`;
  }
}

function getTimeOfDayStr(hour: number): string {
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 14) return 'noon';
  if (hour >= 14 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 21) return 'evening';
  return 'night';
}
