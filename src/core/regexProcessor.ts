// ============================================================
// regexProcessor — 正则脚本执行引擎
//
// 在发送前对用户输入、接收后对 AI 回复执行正则替换。
// 类似 SillyTavern 的 Regex Scripts 功能。
// ============================================================

import { RegexScript } from "@/types/regex";

/** 对文本执行一组正则脚本 */
export function applyRegexScripts(
  text: string,
  scripts: RegexScript[],
  direction: 'input' | 'output'
): string {
  const active = scripts.filter((s) => {
    if (!s.enabled) return false;
    if (s.runOn === 'both') return true;
    if (direction === 'input' && s.runOn === 'before_send') return true;
    if (direction === 'output' && s.runOn === 'after_receive') return true;
    return false;
  });
  if (active.length === 0) return text;

  let result = text;

  for (const script of active) {
    if (script.scope === 'both' || script.scope === direction) {
      try {
        const flags = [script.global !== false ? 'g' : '', script.caseInsensitive !== false ? 'i' : ''].filter(Boolean).join('');
        const regex = new RegExp(script.pattern, flags);
        result = result.replace(regex, script.replacement);
      } catch {
        // 跳过无效的正则
        console.warn(`[Regex] 无效的正则: ${script.pattern}`);
      }
    }
  }

  return result;
}
