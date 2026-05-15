// ============================================================
// variableUpdateEngine — 通用变量更新引擎
//
// 从 AI 响应中解析 <UpdateVariable> 块，提取 JSON Patch
// 并应用到通用变量存储。
//
// 对应 SillyTavern 的 MVU (MagVarUpdate) 系统。
// ============================================================

import { useUniversalVariableStore } from "@/store/universalVariableStore";

// ---- 类型 ----

export interface VariablePatch {
  op: "replace" | "add" | "remove" | "move" | "copy" | "test";
  path: string;
  value?: unknown;
  from?: string;
}

export interface VariableUpdateBlock {
  /** 分析文本（英文） */
  analysis: string;
  /** JSON Patch 操作列表 */
  patches: VariablePatch[];
  /** 原始文本 */
  raw: string;
}

// ---- 解析器 ----

/**
 * 从 AI 响应文本中提取所有 <UpdateVariable> 块。
 * 返回：{ blocks, cleanedText }
 */
export function extractVariableUpdates(text: string): {
  blocks: VariableUpdateBlock[];
  cleanedText: string;
} {
  const blocks: VariableUpdateBlock[] = [];
  const regex = /<UpdateVariable>([\s\S]*?)<\/UpdateVariable>/g;

  let cleanedText = text;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const raw = match[0];
    const inner = match[1];

    // 提取 Analysis
    const analysisMatch = inner.match(/<Analysis>([\s\S]*?)<\/Analysis>/);
    const analysis = analysisMatch?.[1]?.trim() || "";

    // 提取 JSONPatch
    const patchMatch = inner.match(/<JSONPatch>([\s\S]*?)<\/JSONPatch>/);
    const patchesStr = patchMatch?.[1]?.trim() || "[]";

    let patches: VariablePatch[] = [];
    try {
      patches = JSON.parse(patchesStr);
    } catch {
      console.warn("[VariableUpdate] Failed to parse JSONPatch:", patchesStr.slice(0, 200));
    }

    blocks.push({ analysis, patches, raw });

    // 从文本中移除
    cleanedText = cleanedText.replace(raw, "");
  }

  return { blocks, cleanedText: cleanedText.trim() };
}

/**
 * 应用变量更新到存储。
 * 返回应用的补丁数量。
 */
export function applyVariableUpdates(blocks: VariableUpdateBlock[]): number {
  if (blocks.length === 0) return 0;

  let applied = 0;
  const store = useUniversalVariableStore.getState();

  for (const block of blocks) {
    if (block.patches.length > 0) {
      store.applyPatches(block.patches);
      applied += block.patches.length;
    }
  }

  return applied;
}

/**
 * 处理 AI 响应的完整流程：
 * 1. 提取变量更新块
 * 2. 应用到存储
 * 3. 返回清洗后的文本
 *
 * @returns { cleanedText, appliedCount, blocks }
 */
export function processResponseVariables(text: string): {
  cleanedText: string;
  appliedCount: number;
  blocks: VariableUpdateBlock[];
} {
  const { blocks, cleanedText } = extractVariableUpdates(text);
  const appliedCount = applyVariableUpdates(blocks);

  return { cleanedText, appliedCount, blocks };
}

// ---- 格式化的变量注入 ----

/**
 * 生成当前变量状态的提示词注入文本。
 * 附带变量更新格式指令，引导 AI 输出正确格式的更新块。
 */
export function buildVariablePromptInjection(): string {
  const store = useUniversalVariableStore.getState();
  const summary = store.getVariableSummary(2);

  if (!summary) return "";

  return `${summary}

[变量更新规则]
当你需要更新变量时，在回复**末尾**输出以下格式的更新块。
不要输出其他内容代替正文，更新块紧接正文之后。

<UpdateVariable>
<Analysis>简述本次更新了什么</Analysis>
<JSONPatch>
[
  { "op": "replace", "path": "/路径/字段名", "value": 新值 }
]
</JSONPatch>
</UpdateVariable>

注意：
- path 必须以 / 开头，对应上方变量结构中的路径
- 对已有变量使用 "replace"，新增属性使用 "add"
- 数字类型不要加引号，字符串类型需要加引号
- 分析用中文或英文均可，不超过100字`;
}
