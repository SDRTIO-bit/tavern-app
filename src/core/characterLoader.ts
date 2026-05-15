// ============================================================
// characterLoader — 角色卡加载器
//
// 从 src/characters/*.json 加载所有角色卡。
// 新增角色只需在 src/characters/ 下放一个 .json 文件。
// ============================================================

import { Character } from "@/types/character";
import maid from "@/characters/maid.json";
import catgirl from "@/characters/catgirl.json";
import rei from "@/characters/rei.json";

/** 所有已加载的角色 */
export const characters: Character[] = [maid, catgirl, rei];

/** 按 ID 查找角色 */
export function getCharacterById(id: string): Character | undefined {
  return characters.find((c) => c.id === id);
}

/** 按 ID 获取角色（带默认 fallback） */
export function getCharacterOrDefault(id: string): Character {
  return getCharacterById(id) ?? characters[0];
}

/** 获取首个角色的 greeting */
export function getDefaultGreeting(): string {
  return characters[0]?.greeting ?? "Hello";
}
