// ============================================================
// promptAST — Prompt 抽象语法树
//
// 将 prompt 从 string[] 拼接升级为结构化 PromptNode[]。
// 每个模块产出 PromptNode，按 slot + priority 排序后渲染。
// ============================================================

// ---- 节点类型 ----

export type PromptNodeType =
  | 'preset_system'
  | 'jailbreak'
  | 'character'
  | 'worldbook'
  | 'authors_note'
  | 'memory'
  | 'chat_history'
  | 'user_input'
  | 'regex_transform'
  | 'custom';

// ---- 注入槽位 ----

export type InjectionSlot =
  | 'system_top'       // order 0-99:  最顶部（jailbreak 等）
  | 'system'           // order 100-199: system prompt 区
  | 'before_history'   // order 200-299: 历史之前（worldbook）
  | 'history'          // order 300-399: 对话历史
  | 'depth'            // order 400-499: 深度注入
  | 'after_history'    // order 500-599: 历史之后
  | 'footer';          // order 600+:   底部

/** 每个 slot 的基准顺序 */
const SLOT_ORDER: Record<InjectionSlot, number> = {
  system_top: 0,
  system: 100,
  before_history: 200,
  history: 300,
  depth: 400,
  after_history: 500,
  footer: 600,
};

// ---- AST 节点 ----

export interface PromptNode {
  /** 节点类型 */
  type: PromptNodeType;
  /** 注入槽位 */
  slot: InjectionSlot;
  /** 内容 */
  content: string;
  /** 同一 slot 内的优先级（越小越前） */
  priority: number;
  /** 是否作为 system message 插入 */
  asSystemMessage?: boolean;
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

/** 计算节点的全局排序键 */
export function nodeSortKey(node: PromptNode): number {
  return SLOT_ORDER[node.slot] + node.priority;
}

// ---- AST 构建器 ----

export class PromptAST {
  private nodes: PromptNode[] = [];

  /** 添加节点 */
  add(node: PromptNode): void {
    this.nodes.push(node);
  }

  /** 批量添加 */
  addMany(nodes: PromptNode[]): void {
    this.nodes.push(...nodes);
  }

  /** 获取所有节点（按 slot + priority 排序） */
  getSorted(): PromptNode[] {
    return [...this.nodes].sort((a, b) => nodeSortKey(a) - nodeSortKey(b));
  }

  /** 清空 */
  clear(): void {
    this.nodes = [];
  }

  /** 节点数量 */
  get count(): number {
    return this.nodes.length;
  }

  /** 按类型过滤 */
  findByType(type: PromptNodeType): PromptNode[] {
    return this.nodes.filter((n) => n.type === type);
  }

  /** 按 slot 过滤 */
  findBySlot(slot: InjectionSlot): PromptNode[] {
    return this.nodes.filter((n) => n.slot === slot);
  }

  // ---- 渲染 ----

  /**
   * 渲染为 { system: string, messages: Array<{role, content}> }。
   * system 消息归入 system string，其余按顺序放入 messages。
   */
  render(): { system: string; messages: Array<{ role: string; content: string }> } {
    const sorted = this.getSorted();
    const systemParts: string[] = [];
    const messages: Array<{ role: string; content: string }> = [];

    for (const node of sorted) {
      if (node.asSystemMessage) {
        messages.push({ role: 'system', content: node.content });
      } else {
        systemParts.push(node.content);
      }
    }

    return {
      system: systemParts.join('\n\n'),
      messages,
    };
  }

  /**
   * 渲染为调试文本
   */
  renderDebug(): string {
    const sorted = this.getSorted();
    return sorted
      .map((n, i) => {
        const slot = n.slot.padEnd(16);
        const type = n.type.padEnd(20);
        const preview = n.content.slice(0, 60).replace(/\n/g, '\\n');
        return `[${String(i).padStart(2)}] ${slot} ${type} ${preview}`;
      })
      .join('\n');
  }
}
