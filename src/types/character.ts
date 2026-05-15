import type { WorldBookEntry } from "./worldbook";
import type { RegexScript } from "./regex";

/** 酒馆助手脚本（从角色卡提取的原数据，供高级功能使用） */
export type TavernHelperScript = {
  type: string;
  enabled: boolean;
  name: string;
  id: string;
  content: string;
  info: string;
  data: Record<string, unknown>;
};

/** 角色卡扩展数据（从 PNG/JSON 完整提取） */
export type CharacterCardData = {
  /** 角色版本 */
  characterVersion?: string;
  /** 作者 */
  creator?: string;
  /** 作者备注 */
  creatorNotes?: string;
  /** 标签 */
  tags?: string[];
  /** 角色卡规范版本 */
  spec?: string;
  specVersion?: string;
  /** 备用开场白 */
  alternateGreetings?: string[];
  /** 群组专用开场白 */
  groupOnlyGreetings?: string[];
  /** 对话示例 */
  mesExample?: string;
  /** 角色卡内嵌的世界书条目 */
  characterBook?: {
    name: string;
    entries: WorldBookEntry[];
  };
  /** 角色卡内嵌的正则脚本 */
  embeddedRegexScripts?: RegexScript[];
  /** 酒馆助手脚本（原始数据） */
  tavernHelperScripts?: TavernHelperScript[];
  /** 深度提示 */
  depthPrompt?: {
    prompt: string;
    depth: number;
    role: string;
  };
};

export type Character = {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  greeting: string;
  /** 角色卡原始扩展数据 */
  cardData?: CharacterCardData;
};
