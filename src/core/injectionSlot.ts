// ============================================================
// injectionSlot — 注入槽位注册表
//
// 统一管理 WorldBook / AN / Memory 等模块的槽位分配。
// 每个模块注册自己的 slot + priority，
// PromptAST 负责排序和渲染。
// ============================================================

import { InjectionSlot, PromptNode, PromptNodeType } from "./promptAST";

export interface SlotRegistration {
  key: string;
  type: PromptNodeType;
  slot: InjectionSlot;
  priority: number;
  /** 是否作为独立的 system message 插入（而不是拼入 system string） */
  asSystemMessage: boolean;
}

const DEFAULT_SLOTS: SlotRegistration[] = [
  { key: 'jailbreak',       type: 'jailbreak',     slot: 'system_top',     priority: 0,  asSystemMessage: false },
  { key: 'preset',          type: 'preset_system',  slot: 'system',         priority: 0,  asSystemMessage: false },
  { key: 'character',       type: 'character',      slot: 'system',         priority: 10, asSystemMessage: false },
  { key: 'worldbook',       type: 'worldbook',      slot: 'before_history', priority: 0,  asSystemMessage: true },
  { key: 'memory',          type: 'memory',          slot: 'before_history', priority: 10, asSystemMessage: true },
  { key: 'an_top',          type: 'authors_note',    slot: 'before_history', priority: 20, asSystemMessage: true },
  { key: 'chat_history',    type: 'chat_history',    slot: 'history',        priority: 0,  asSystemMessage: false },
  { key: 'an_depth',        type: 'authors_note',    slot: 'depth',          priority: 0,  asSystemMessage: true },
  { key: 'an_bottom',       type: 'authors_note',    slot: 'after_history',  priority: 0,  asSystemMessage: true },
  { key: 'footer',          type: 'custom',          slot: 'footer',         priority: 0,  asSystemMessage: false },
];

/** 根据 AN 位置获取对应的 slot */
export function anPositionToSlot(position: string): InjectionSlot {
  switch (position) {
    case 'top':    return 'before_history';
    case 'bottom': return 'after_history';
    case 'depth':  return 'depth';
    default:       return 'before_history';
  }
}

/** 获取某个 key 的注册信息 */
export function getSlot(key: string): SlotRegistration | undefined {
  return DEFAULT_SLOTS.find((s) => s.key === key);
}

/** 创建 PromptNode（自动填充 slot 信息） */
export function createNode(
  key: string,
  content: string,
  overrides?: Partial<PromptNode>,
): PromptNode {
  const reg = getSlot(key);
  if (!reg) {
    return {
      type: 'custom',
      slot: 'footer',
      priority: 999,
      content,
      ...overrides,
    };
  }

  return {
    type: reg.type,
    slot: reg.slot,
    priority: reg.priority,
    content,
    asSystemMessage: reg.asSystemMessage,
    ...overrides,
  };
}
