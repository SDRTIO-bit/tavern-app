/** Preset = 模型输入构造器，控制整个 prompt 如何组装 */
export type Preset = {
  id: string;
  name: string;
  /** 核心系统提示词 */
  systemPrompt: string;
  /** 用户消息前缀 */
  userPrefix: string;
  /** AI 消息前缀 */
  assistantPrefix: string;
  /** 上下文模板 */
  contextTemplate: string;
  /** 生成温度 */
  temperature: number;
  /** 停止序列 */
  stopSequences: string[];
  /** 分类（方便管理） */
  category?: 'rp' | 'chat' | 'instruct' | 'custom';
  /** 角色行为指令（JB / 风格强化） */
  jailbreak?: string;
  /** 角色描述格式（{{char}} 的包装方式） */
  charDescriptionTemplate?: string;
};

export type PresetSummary = { id: string; name: string; category?: string };
