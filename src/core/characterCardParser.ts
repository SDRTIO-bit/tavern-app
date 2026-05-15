// ============================================================
// characterCardParser — SillyTavern Character Card 解析器
//
// 支持：
//   - JSON V1（TavernAI 格式）
//   - JSON V2（SillyTavern chara_card_v2 格式）
//   - JSON V3（SillyTavern chara_card_v3 格式）
//   - PNG（SillyTavern V2/V3 嵌入 chara/ccv3 metadata）
//
// 完整提取：世界书 / 正则脚本 / 酒馆助手 / 变量系统
// ============================================================

import { Character, CharacterCardData, TavernHelperScript } from "@/types/character";
import type { WorldBookEntry } from "@/types/worldbook";
import type { RegexScript } from "@/types/regex";

let importIdCounter = 0;
function genId(): string {
  return `imported_${Date.now()}_${++importIdCounter}`;
}

/** 从角色卡 JSON 提取 worldBook 数据 */
function extractCharacterBook(raw: any): CharacterCardData["characterBook"] {
  const book = raw?.data?.character_book || raw?.character_book;
  if (!book?.entries?.length) return undefined;

  const entries: WorldBookEntry[] = book.entries.map((e: any) => ({
    id: String(e.id ?? Date.now() + Math.random()),
    keys: e.keys || [],
    secondaryKeys: e.secondary_keys || [],
    content: e.content || "",
    enabled: e.enabled !== false,
    constant: e.constant || false,
    selective: e.selective !== false,
    priority: e.insertion_order ?? 0,
    position: e.position === "before_char" ? "before" : e.position === "after_char" ? "after" : undefined,
    comment: e.comment || "",
    depth: e.extensions?.depth ?? undefined,
  }));

  return { name: book.name || "Character Book", entries };
}

/** 从角色卡 JSON 提取正则脚本 */
function extractRegexScripts(raw: any): RegexScript[] {
  const scripts = raw?.data?.extensions?.regex_scripts;
  if (!scripts?.length) return [];

  return scripts.map((s: any) => ({
    id: s.id || `regex_${Date.now()}_${Math.random()}`,
    name: s.scriptName || "Unnamed",
    pattern: s.findRegex || "",
    replacement: s.replaceString || "",
    enabled: !s.disabled,
    scope: s.promptOnly ? "output" : "both",
    global: true,
    caseInsensitive: s.substituteRegex !== 1,
    runOn: s.promptOnly ? "after_receive" : "both",
    group: "角色卡",
    minDepth: s.minDepth ?? null,
    maxDepth: s.maxDepth ?? null,
    markdownOnly: s.markdownOnly ?? false,
    placement: s.placement || [],
  }));
}

/** 从角色卡 JSON 提取酒馆助手脚本 */
function extractTavernHelper(raw: any): TavernHelperScript[] {
  return raw?.data?.extensions?.tavern_helper?.scripts || [];
}

/** 从角色卡数据构建 systemPrompt */
function buildSystemPrompt(raw: any): string {
  const src = raw.spec === "chara_card_v2" || raw.spec === "chara_card_v3" ? raw.data : raw;
  const parts: string[] = [];

  // 角色描述
  const desc = src.description || src.personality || "";
  if (desc) parts.push(desc);

  // 场景
  const scenario = src.scenario || "";
  if (scenario) parts.push(`[Scenario]\n${scenario}`);

  // 系统提示词
  const sp = src.system_prompt || "";
  if (sp) parts.push(sp);

  // 对话示例
  const example = src.mes_example || "";
  if (example) parts.push(`[对话示例]\n${example}`);

  // 深度提示（作为角色底层指引）
  const depthPrompt = src?.extensions?.depth_prompt?.prompt;
  if (depthPrompt) parts.push(depthPrompt);

  // 如果以上都为空，尝试从世界书提取核心规则构建系统提示词
  if (parts.length === 0) {
    const book = src?.character_book || raw?.character_book;
    if (book?.entries?.length) {
      const coreEntries = book.entries
        .filter((e: any) => e.enabled !== false)
        .sort((a: any, b: any) => (a.insertion_order || 0) - (b.insertion_order || 0));

      // 提取核心规则条目（前几个高优先级常量条目）
      for (const entry of coreEntries) {
        const comment = entry.comment || "";
        const isCore =
          comment.includes("核心规则") ||
          comment.includes("定义") ||
          comment.includes("约束") ||
          comment.includes("世界");

        if (isCore || parts.length < 3) {
          parts.push(entry.content || "");
        }
      }
    }
  }

  return parts.join("\n\n");
}

/** 提取核心 cardData */
function extractCardData(raw: any): CharacterCardData {
  const src = raw.spec === "chara_card_v2" || raw.spec === "chara_card_v3" ? raw.data : raw;

  return {
    characterVersion: src.character_version || raw.character_version,
    creator: src.creator || raw.creator,
    creatorNotes: src.creator_notes || raw.creator_notes || raw.creatorcomment,
    tags: src.tags || raw.tags || [],
    spec: raw.spec,
    specVersion: raw.spec_version,
    alternateGreetings: src.alternate_greetings || [],
    groupOnlyGreetings: src.group_only_greetings || [],
    mesExample: src.mes_example || "",
    characterBook: extractCharacterBook(raw),
    embeddedRegexScripts: extractRegexScripts(raw),
    tavernHelperScripts: extractTavernHelper(raw),
    depthPrompt: src?.extensions?.depth_prompt || raw?.extensions?.depth_prompt,
  };
}

/** 将任意来源的字符数据归一化为内部 Character 格式 */
function normalize(raw: any): Character {
  const src = raw.spec === "chara_card_v2" || raw.spec === "chara_card_v3" ? raw.data : raw;

  const name = src.name || "Unknown";
  const description = src.description || src.personality || "";
  const systemPrompt = buildSystemPrompt(raw);
  const greeting = src.first_mes || src.greeting || "";
  const cardData = extractCardData(raw);

  return {
    id: genId(),
    name,
    description,
    systemPrompt,
    greeting,
    cardData,
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

      if (keyword === "chara" || keyword === "ccv3") {
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
