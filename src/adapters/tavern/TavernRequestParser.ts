// ============================================================
// TavernRequestParser — SillyTavern 请求解析器
//
// 将 SillyTavern 兼容的 POST /api/chat 请求体
// 解析为内部标准格式。
// ============================================================

/** SillyTavern 风格的请求体 */
export interface TavernRequest {
  /** 消息列表 */
  messages: TavernMessage[];
  /** 角色卡片 */
  character?: TavernCharacterCard;
  /** 世界书/lorebook */
  world_info?: TavernWorldInfo;
  /** 生成设置 */
  settings?: TavernGenerationSettings;
}

/** 消息 */
export interface TavernMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string;
}

/** 角色卡 */
export interface TavernCharacterCard {
  id?: string;
  name: string;
  description?: string;
  personality?: string;
  scenario?: string;
  first_mes?: string;
  mes_example?: string;
  system_prompt?: string;
  post_history_instructions?: string;
  creator?: string;
  character_version?: string;
  tags?: string[];
}

/** 世界书 */
export interface TavernWorldInfo {
  entries?: Record<string, TavernWorldBookEntry>;
}

/** 世界书条目 */
export interface TavernWorldBookEntry {
  id?: number;
  keys: string[];
  content: string;
  selective?: boolean;
  constant?: boolean;
  priority?: number;
  position?: 'before_char' | 'after_char';
}

/** 生成设置 */
export interface TavernGenerationSettings {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  top_k?: number;
  repetition_penalty?: number;
  stop?: string[];
}

/** 解析后的请求 */
export interface ParsedTavernRequest {
  /** 消息历史 */
  messages: TavernMessage[];
  /** 最后一条用户消息 */
  userInput: string;
  /** 角色卡 */
  character: TavernCharacterCard | null;
  /** 世界书条目 */
  worldBookEntries: TavernWorldBookEntry[];
  /** 生成设置 */
  settings: Required<TavernGenerationSettings>;
}

export class TavernRequestParser {
  /** 默认生成设置 */
  private static defaultSettings: Required<TavernGenerationSettings> = {
    temperature: 0.8,
    max_tokens: 1024,
    top_p: 0.9,
    top_k: 40,
    repetition_penalty: 1.1,
    stop: [],
  };

  /**
   * 解析 Tavern 请求。
   */
  static parse(body: TavernRequest): ParsedTavernRequest {
    const messages = body.messages ?? [];
    const userMessages = messages.filter((m) => m.role === 'user');
    const userInput = userMessages.length > 0
      ? userMessages[userMessages.length - 1].content
      : '';

    const settings = {
      ...this.defaultSettings,
      ...body.settings,
    };

    const worldBookEntries = body.world_info?.entries
      ? Object.values(body.world_info.entries)
      : [];

    return {
      messages,
      userInput,
      character: body.character ?? null,
      worldBookEntries,
      settings,
    };
  }

  /**
   * 从 parsed request 提取 system prompt。
   */
  static extractSystemPrompt(parsed: ParsedTavernRequest): string {
    const char = parsed.character;
    if (!char) return '';

    const parts: string[] = [];

    if (char.system_prompt) {
      parts.push(char.system_prompt);
    }

    if (char.description) {
      parts.push(`[Character: ${char.name}]\n${char.description}`);
    }

    if (char.personality) {
      parts.push(`[Personality]\n${char.personality}`);
    }

    if (char.scenario) {
      parts.push(`[Scenario]\n${char.scenario}`);
    }

    if (char.post_history_instructions) {
      parts.push(char.post_history_instructions);
    }

    return parts.join('\n\n');
  }
}
