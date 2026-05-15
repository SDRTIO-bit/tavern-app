"use client";

import type { RuntimeSnapshot } from "@/runtimeInspector/RuntimeTrace";
import { summarizeTokens, summarizeDurations } from "@/runtimeInspector/RuntimeTrace";

interface Props {
  snapshots: RuntimeSnapshot[];
  totalDurationMs: number;
}

/** 估算 Prompt 组成部分 */
function estimatePromptBreakdown(snapshots: RuntimeSnapshot[]): Array<{ source: string; icon: string; tokens: number; pct: number }> {
  const sourceTokens: Record<string, number> = {};

  for (const snap of snapshots) {
    // 按节点类型估算 token 来源
    switch (snap.nodeType) {
      case "emotion":
        sourceTokens["情绪注入"] = (sourceTokens["情绪注入"] ?? 0) + 80;
        break;
      case "memory":
        sourceTokens["记忆注入"] = (sourceTokens["记忆注入"] ?? 0) + snap.inputs.memoryCount * 50;
        break;
      case "narrative":
        sourceTokens["叙事注入"] = (sourceTokens["叙事注入"] ?? 0) + 150;
        break;
      case "goal":
        sourceTokens["目标注入"] = (sourceTokens["目标注入"] ?? 0) + 80;
        break;
      case "prompt":
        sourceTokens["System Prompt"] = (sourceTokens["System Prompt"] ?? 0) + 400;
        sourceTokens["历史消息"] = (sourceTokens["历史消息"] ?? 0) + snap.inputs.messageCount * 60;
        break;
      case "model":
        sourceTokens["用户输入"] = (sourceTokens["用户输入"] ?? 0) + snap.inputs.inputLength / 4;
        break;
    }
  }

  const total = Object.values(sourceTokens).reduce((s, v) => s + v, 0) || 1;

  return Object.entries(sourceTokens)
    .map(([source, tokens]) => ({
      source,
      icon: source.includes("情绪") ? "💭" : source.includes("记忆") ? "🧠" :
            source.includes("叙事") ? "📖" : source.includes("目标") ? "🎯" :
            source.includes("System") ? "⚙" : source.includes("历史") ? "💬" : "✏️",
      tokens: Math.round(tokens),
      pct: Math.round((tokens / total) * 100),
    }))
    .sort((a, b) => b.tokens - a.tokens);
}

export default function TokenInspector({ snapshots, totalDurationMs }: Props) {
  const tokenSummary = summarizeTokens(snapshots);
  const durationSummary = summarizeDurations(snapshots);
  const breakdown = estimatePromptBreakdown(snapshots);

  return (
    <div className="flex h-full flex-col bg-zinc-950 font-mono">
      <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2">
        <span className="text-xs font-bold text-zinc-400">▸ TOKEN</span>
        <span className="text-[10px] text-zinc-600">
          {tokenSummary.total} total · {totalDurationMs}ms
        </span>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-3 text-[10px]">
        {/* Token 总览 */}
        <div className="rounded bg-zinc-900 p-2.5">
          <p className="mb-1 text-zinc-500">Token 消耗</p>
          <div className="flex gap-3">
            <div>
              <span className="text-zinc-600">Prompt</span>
              <span className="ml-1 text-zinc-300">{tokenSummary.totalPrompt}</span>
            </div>
            <div>
              <span className="text-zinc-600">Output</span>
              <span className="ml-1 text-zinc-300">{tokenSummary.totalOutput}</span>
            </div>
            <div>
              <span className="text-zinc-600">总计</span>
              <span className="ml-1 text-yellow-400">{tokenSummary.total}</span>
            </div>
          </div>
        </div>

        {/* 来源分析 */}
        <div className="rounded bg-zinc-900 p-2.5">
          <p className="mb-2 text-zinc-500">Prompt 来源</p>
          {breakdown.map((b) => (
            <div key={b.source} className="mb-1.5">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">{b.icon} {b.source}</span>
                <span className="text-zinc-500">{b.tokens} ({b.pct}%)</span>
              </div>
              <div className="mt-0.5 h-1 w-full rounded-full bg-zinc-800">
                <div
                  className="h-1 rounded-full bg-blue-500/60"
                  style={{ width: `${b.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* 耗时分析 */}
        <div className="rounded bg-zinc-900 p-2.5">
          <p className="mb-2 text-zinc-500">耗时分布</p>
          {durationSummary.breakdown.map((d) => (
            <div key={d.nodeName} className="mb-1.5">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">{d.nodeName}</span>
                <span className={`text-zinc-500 ${d.pct > 50 ? "text-yellow-400" : ""}`}>
                  {d.durationMs}ms ({d.pct}%)
                </span>
              </div>
              <div className="mt-0.5 h-1 w-full rounded-full bg-zinc-800">
                <div
                  className={`h-1 rounded-full ${d.pct > 50 ? "bg-yellow-500" : "bg-cyan-600"}`}
                  style={{ width: `${Math.max(d.pct, 3)}%` }}
                />
              </div>
            </div>
          ))}
          {durationSummary.slowest && (
            <p className="mt-1 text-zinc-600">
              瓶颈: {durationSummary.slowest.nodeName} ({durationSummary.slowest.durationMs}ms)
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
