// ============================================================
// characterCardParser — SillyTavern Character Card 解析器
//
// 支持：
//   - JSON V1（TavernAI 格式）
//   - JSON V2（SillyTavern chara_card_v2 格式）
//   - PNG（SillyTavern V2 嵌入 chara metadata）
// ============================================================

import { Character } from "@/types/character";

let importIdCounter = 0;
function genId(): string {
  return `imported_${Date.now()}_${++importIdCounter}`;
}

/** 将任意来源的字符数据归一化为内部 Character 格式 */
function normalize(raw: any): Character {
  // V2: spec.chara_card_v2 → data.name
  // V1: 扁平结构
  // PNG: 同 V2 JSON
  const src = raw.spec === "chara_card_v2" ? raw.data : raw;

  const name = src.name || "Unknown";
  const description = src.description || src.personality || "";
  const systemPrompt = src.system_prompt || src.post_history_instructions || "";
  const greeting = src.first_mes || src.greeting || "";

  return {
    id: genId(),
    name,
    description,
    systemPrompt,
    greeting,
  };
}

/** 解析 JSON File → Character */
export async function parseJsonFile(file: File): Promise<Character> {
  const text = await file.text();
  const raw = JSON.parse(text);
  return normalize(raw);
}

/** 解析 PNG File → Character */
export async function parsePngFile(file: File): Promise<Character> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);

  // PNG signature: 8 bytes
  const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) {
    if (bytes[i] !== pngSignature[i]) {
      throw new Error("不是有效的 PNG 文件");
    }
  }

  let offset = 8;

  while (offset < bytes.length) {
    // 每个 chunk: length(4) + type(4) + data(length) + CRC(4)
    const length =
      (bytes[offset] << 24) |
      (bytes[offset + 1] << 16) |
      (bytes[offset + 2] << 8) |
      bytes[offset + 3];
    const type = String.fromCharCode(
      bytes[offset + 4],
      bytes[offset + 5],
      bytes[offset + 6],
      bytes[offset + 7]
    );

    if (type === "tEXt") {
      // tEXt: keyword (null-terminated) + text string
      const dataStart = offset + 8;
      const dataEnd = dataStart + length;

      // 找 null 分隔符
      let nullPos = dataStart;
      while (nullPos < dataEnd && bytes[nullPos] !== 0) nullPos++;

      const keyword = new TextDecoder().decode(bytes.slice(dataStart, nullPos));
      const value = new TextDecoder().decode(bytes.slice(nullPos + 1, dataEnd));

      if (keyword === "chara" && value) {
        const raw = JSON.parse(value);
        return normalize(raw);
      }
    }

    if (type === "IEND") break;

    offset += 12 + length; // length + type + data + CRC
  }

  throw new Error("PNG 中未找到角色卡数据（缺少 chara metadata）");
}

/** 根据文件后缀自动选择解析方式 */
export async function parseCharacterFile(file: File): Promise<Character> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".json")) {
    return parseJsonFile(file);
  }
  if (name.endsWith(".png")) {
    return parsePngFile(file);
  }

  throw new Error(`不支持的文件格式: ${file.name}（仅支持 .json / .png）`);
}
