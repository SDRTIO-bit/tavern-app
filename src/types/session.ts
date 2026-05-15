import { Message } from "./message";

/** 每个角色的独立对话记录 */
export interface CharacterSession {
  characterId: string;
  messages: Message[];
}
