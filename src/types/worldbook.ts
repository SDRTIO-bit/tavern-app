/** 单条 Lore 条目 */
export type WorldBookEntry = {
  id: string;
  /** 触发关键词列表 */
  keys: string[];
  /** Lore 内容 */
  content: string;
  /** 是否启用 */
  enabled: boolean;
  /** 插入位置（SillyTavern 风格） */
  position?: 'before' | 'after' | 'an_top' | 'an_bottom' | 'depth';
  /** depth 模式下从末尾第几条消息前插入 */
  depth?: number;
  /** 优先级（数字越大越优先） */
  priority?: number;
  /** 备注/标签 */
  comment?: string;
  /** 是否选择性（需关键词精确匹配） */
  selective?: boolean;
  /** 额外触发键（选择性模式下需要额外匹配的键） */
  secondaryKeys?: string[];
};

/** WorldBook 完整数据（一本书） */
export type WorldBook = {
  id: string;
  name: string;
  entries: WorldBookEntry[];
  /** 是否启用 */
  enabled: boolean;
  /** 关联的角色 ID 列表（空 = 全部角色） */
  characterIds?: string[];
};
