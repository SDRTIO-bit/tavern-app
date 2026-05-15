"use client";

import React, { useMemo } from "react";
import { useUniversalVariableStore } from "@/store/universalVariableStore";

// ============================================================
// UniversalPanelRenderer — 通用面板渲染器
//
// 不预设任何特定面板，而是根据角色卡自身的 regex 脚本
// 定义来检测和渲染 XML-like 标签。
//
// 工作原理：
//   1. 每个角色卡通过 regex scripts 定义自己的标签系统
//   2. 本组件检测内容中的 XML-like / bracket 标签
//   3. 将标签提取为结构化面板渲染
// ============================================================

// ---- 标签检测 ----

/** 从文本中提取所有 XML-like 标签 */
function extractTags(content: string): Array<{ tag: string; innerContent: string; start: number; end: number }> {
  const results: Array<{ tag: string; innerContent: string; start: number; end: number }> = [];
  const regex = /<(\w+)>([\s\S]*?)<\/\1>/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    results.push({
      tag: match[1],
      innerContent: match[2].trim(),
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  // 也检测自闭合标签 <xxx/>
  const selfClosingRegex = /<(\w+)\/>/g;
  while ((match = selfClosingRegex.exec(content)) !== null) {
    results.push({
      tag: match[1],
      innerContent: "",
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  // 检测 【xxx】 格式的中文标签
  const cnRegex = /【([^】]+)】/g;
  while ((match = cnRegex.exec(content)) !== null) {
    results.push({
      tag: `cn_${match[1]}`,
      innerContent: match[1],
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  return results.sort((a, b) => a.start - b.start);
}

/** 检测内容中是否包含面板标签 */
export function hasPanelTags(content: string): boolean {
  return /<(\w+)>[\s\S]*?<\/\1>|<(\w+)\/>|【[^】]+】/.test(content);
}

// ---- 变量展示面板 ----

/** 变量状态栏（通用） */
function VariableStatusBar() {
  const vars = useUniversalVariableStore((s) => s.variables);
  const statusLine = useUniversalVariableStore((s) => s.getStatusLine());

  if (!vars || Object.keys(vars).length === 0) return null;

  // 提取关键数值变量用于可视化
  const numericFields: Array<{ key: string; value: number; max?: number }> = [];
  const infoFields: Array<{ key: string; value: string }> = [];

  function walk(obj: unknown, prefix: string) {
    if (typeof obj === "object" && obj !== null && !Array.isArray(obj)) {
      for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (key === "特殊能力" || key === "持有道具" || key === "出轨证据" || key === "性经验" || key === "任务目标" || key === "点数限制" || key === "额外奖励") {
          // 跳过复杂嵌套
          continue;
        }
        if (typeof val === "number") {
          // 检测是否是百分比类（屈服度/警戒度/怀疑度）
          const isPercent = key.includes("度") || key.includes("率");
          numericFields.push({
            key: fullKey,
            value: val as number,
            max: isPercent ? 100 : undefined,
          });
        } else if (typeof val === "string" && val.length < 30 && val !== "空" && val !== "无") {
          infoFields.push({ key, value: val });
        } else if (typeof val === "object" && val !== null) {
          walk(val, fullKey);
        }
      }
    }
  }

  walk(vars, "");

  return (
    <div className="my-2 rounded-lg border border-zinc-700 bg-zinc-900/80 p-3 font-mono text-xs">
      <div className="mb-2 text-center text-xs font-bold text-zinc-500">
        📊 {statusLine}
      </div>

      {/* 数值条 */}
      {numericFields.length > 0 && (
        <div className="space-y-1 mb-2">
          {numericFields.slice(0, 8).map((f) => (
            <div key={f.key} className="flex items-center gap-2">
              <span className="w-16 text-right text-zinc-500 truncate">{f.key.split(".").pop()}</span>
              <div className="flex-1 h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    f.max && f.value / f.max > 0.8 ? "bg-red-500" :
                    f.max && f.value / f.max > 0.5 ? "bg-amber-500" :
                    "bg-blue-500"
                  }`}
                  style={{ width: f.max ? `${Math.min(100, (f.value / f.max) * 100)}%` : `${Math.min(100, (f.value / 10000) * 100)}%` }}
                />
              </div>
              <span className="w-10 text-right text-zinc-400">
                {f.max ? `${f.value}%` : f.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 信息标签 */}
      {infoFields.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {infoFields.slice(0, 6).map((f) => (
            <span key={f.key} className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-400">
              {f.key}: {f.value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- 标签面板（通用） ----

interface TagPanelProps {
  tag: string;
  innerContent: string;
  /** 角色的 cardData（用于标题和品牌信息） */
  characterName?: string;
  creator?: string;
}

function TagPanel({ tag, innerContent, characterName, creator }: TagPanelProps) {
  // 清理标签名用于显示
  const displayTag = tag
    .replace(/^cn_/, "")
    .replace(/_/g, " ")
    .replace(/panel|placehold|impl/gi, "");

  // 根据标签名选择颜色主题
  const isSearch = /search|检索|搜索/i.test(tag);
  const isMission = /mission|任务|mission_panel/i.test(tag);
  const isOptions = /option|选项|选择/i.test(tag);
  const isStatus = /status|状态|placeholder/i.test(tag);

  const colors = isSearch
    ? "border-blue-700/50 bg-blue-950/30"
    : isMission
    ? "border-pink-700/50 bg-pink-950/30"
    : isOptions
    ? "border-emerald-700/50 bg-emerald-950/20"
    : isStatus
    ? "border-zinc-700 bg-zinc-900/50"
    : "border-zinc-700/50 bg-zinc-900/40";

  const titleColor = isSearch
    ? "text-blue-300"
    : isMission
    ? "text-pink-300"
    : isOptions
    ? "text-emerald-300"
    : isStatus
    ? "text-zinc-400"
    : "text-zinc-300";

  return (
    <div className={`my-2 rounded-lg border ${colors} p-4`}>
      {/* 标题 */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className={`text-sm font-bold ${titleColor}`}>
          {isSearch && "🔍 "}
          {isMission && "📋 "}
          {isOptions && "📌 "}
          {isStatus && "📊 "}
          {displayTag || "面板"}
        </h3>
        {characterName && (
          <span className="text-[10px] text-zinc-600">{characterName}</span>
        )}
      </div>

      {/* 内容 */}
      {innerContent ? (
        <div className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
          {innerContent}
        </div>
      ) : (
        <div className="text-xs text-zinc-600 italic">（自闭合标签）</div>
      )}

      {/* 选项面板特殊处理：可点击的按钮 */}
      {isOptions && innerContent.includes("|") && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {innerContent.split("|").filter(Boolean).map((opt, i) => (
            <button
              key={i}
              className="rounded-full bg-emerald-900/40 border border-emerald-700/30 px-3 py-1 text-xs text-emerald-300 hover:bg-emerald-800/40 hover:text-emerald-200 transition cursor-pointer"
              onClick={() => {
                const inputEl = document.querySelector<HTMLTextAreaElement>("textarea[placeholder]");
                if (inputEl) {
                  inputEl.value = opt.trim();
                  inputEl.focus();
                  inputEl.dispatchEvent(new Event("input", { bubbles: true }));
                }
              }}
              title="点击选择"
            >
              {i + 1}. {opt.trim()}
            </button>
          ))}
        </div>
      )}

      {/* 作者信息 */}
      {creator && (
        <div className="mt-3 pt-2 border-t border-zinc-800 text-[10px] text-zinc-600">
          Created by {creator}
        </div>
      )}
    </div>
  );
}

// ---- 主渲染器 ----

interface UniversalPanelRendererProps {
  content: string;
  /** 角色名（用于面板品牌显示） */
  characterName?: string;
  /** 创作者 */
  creator?: string;
  /** 是否在消息气泡内（紧凑模式） */
  inline?: boolean;
  /** 总是显示状态栏 */
  alwaysShowStatus?: boolean;
}

export default function UniversalPanelRenderer({
  content,
  characterName,
  creator,
  inline,
  alwaysShowStatus,
}: UniversalPanelRendererProps) {
  const tags = useMemo(() => extractTags(content), [content]);
  const vars = useUniversalVariableStore((s) => s.variables);
  const hasVars = vars && Object.keys(vars).length > 0;

  if (tags.length === 0 && !hasVars) return null;

  // 分离标签类型
  const statusTags = tags.filter((t) => /status|placeholder/i.test(t.tag));
  const otherTags = tags.filter((t) => !/status|placeholder/i.test(t.tag));

  return (
    <div className="game-panels space-y-1">
      {/* 非状态面板在顶部 */}
      {otherTags.map((t, i) => (
        <TagPanel
          key={i}
          tag={t.tag}
          innerContent={t.innerContent}
          characterName={characterName}
          creator={creator}
        />
      ))}

      {/* 状态栏 */}
      {(statusTags.length > 0 || alwaysShowStatus || hasVars) && (
        <VariableStatusBar />
      )}
    </div>
  );
}

/** 清洗面板标签和变量更新，返回纯文本 */
export function cleanPanelTags(content: string): string {
  return content
    .replace(/<\w+>[\s\S]*?<\/\w+>/g, "")
    .replace(/<\w+\/>/g, "")
    .replace(/【[^】]+】/g, "")
    .replace(/<UpdateVariable>[\s\S]*?<\/UpdateVariable>/g, "")
    .trim();
}

// 导出辅助函数供外部使用
export { extractTags, TagPanel, VariableStatusBar };
