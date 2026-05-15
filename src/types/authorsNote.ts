/** Author's Note（酒馆助手）— 插入到上下文中的临时指引 */
export type AuthorsNote = {
  /** 是否启用 */
  enabled: boolean;
  /** 笔记内容 */
  content: string;
  /** 插入位置: top / bottom / depth */
  position: 'top' | 'bottom' | 'depth';
  /** depth 模式下插入的深度（从末尾数第几条消息前） */
  depth: number;
  /** 向上取整的深度步长 */
  depthStep: number;
  /** 是否在每次回复后自动增加 depth */
  depthIncrease: boolean;
};
