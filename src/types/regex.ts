/** 正则脚本 — 类似 SillyTavern 的 Regex Scripts */
export type RegexScript = {
  id: string;
  /** 脚本名称 */
  name: string;
  /** 正则模式 */
  pattern: string;
  /** 替换文本（支持 $1 等捕获组） */
  replacement: string;
  /** 是否启用 */
  enabled: boolean;
  /** 作用范围 */
  scope: RegexScope;
  /** 是否全局替换（默认 true） */
  global: boolean;
  /** 是否忽略大小写（默认 true） */
  caseInsensitive: boolean;
  /** 处理时机 */
  runOn: RegexRunOn;
  /** 子目录（用于组织） */
  group?: string;
};

export type RegexScope = 'input' | 'output' | 'both';
export type RegexRunOn = 'before_send' | 'after_receive' | 'both';
