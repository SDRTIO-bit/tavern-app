"use client";

import { useState } from "react";
import { runtime, DebugTrace } from "@/core/runtime";

export default function PromptInspector() {
  const [isOpen, setIsOpen] = useState(false);
  const [trace, setTrace] = useState<DebugTrace | null>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [tab, setTab] = useState<"steps" | "ast">("steps");

  const handleRefresh = () => {
    const t = runtime.getDebugTrace();
    setTrace(t);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => { setIsOpen(!isOpen); if (!isOpen) handleRefresh(); }}
        className="rounded-full bg-zinc-800 px-4 py-2 text-xs text-zinc-400 shadow-lg hover:bg-zinc-700 hover:text-zinc-200"
      >
        {isOpen ? "✕ Close" : "🔍 Prompt"}
      </button>

      {isOpen && (
        <div className="absolute bottom-12 right-0 max-h-[75vh] w-[520px] overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-950 shadow-2xl">
          {/* 标题栏 */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 py-3">
            <h3 className="text-sm font-bold text-zinc-200">Prompt 调试器</h3>
            <div className="flex items-center gap-2">
              {/* 标签切换 */}
              <div className="flex rounded bg-zinc-900 p-0.5 text-xs">
                <button
                  onClick={() => setTab("steps")}
                  className={`rounded px-2 py-1 ${tab === "steps" ? "bg-zinc-700 text-zinc-200" : "text-zinc-500"}`}
                >
                  构建流程
                </button>
                <button
                  onClick={() => setTab("ast")}
                  className={`rounded px-2 py-1 ${tab === "ast" ? "bg-zinc-700 text-zinc-200" : "text-zinc-500"}`}
                >
                  节点树 (AST)
                </button>
              </div>
              <button onClick={handleRefresh} className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-700">
                刷新
              </button>
            </div>
          </div>

          {!trace && (
            <p className="py-8 text-center text-xs text-zinc-600">发送一条消息后查看</p>
          )}

          {/* Pipeline 标签 */}
          {tab === "steps" && trace && (
            <div className="space-y-1 p-3">
              {trace.steps.map((step) => (
                <div key={step.step} className="rounded-lg bg-zinc-900">
                  <button
                    onClick={() => setExpandedStep(expandedStep === step.step ? null : step.step)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded bg-zinc-800 text-[10px] text-zinc-500">{step.step}</span>
                      <span className="text-sm text-zinc-300">{step.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-600">~{step.tokenEstimate} tok</span>
                      <span className="text-xs text-zinc-600">{expandedStep === step.step ? "▲" : "▼"}</span>
                    </div>
                  </button>
                  {expandedStep === step.step && (
                    <pre className="overflow-x-auto whitespace-pre-wrap break-all px-3 pb-3 font-mono text-[11px] leading-relaxed text-zinc-400">
                      {step.content || "(空)"}
                    </pre>
                  )}
                </div>
              ))}

              <div className="rounded-lg bg-zinc-900 px-3 py-2 text-xs text-zinc-600">
                总计 ~{trace.totalTokens} tokens · {trace.steps.length} 个阶段 · {trace.astNodes?.length ?? 0} 个节点
              </div>
            </div>
          )}

          {/* AST 标签 */}
          {tab === "ast" && trace && trace.astNodes && (
            <div className="space-y-1 p-3">
              {trace.astNodes.map((node, i) => (
                <div key={i} className="rounded-lg bg-zinc-900">
                  <button
                    onClick={() => setExpandedStep(expandedStep === i ? null : i)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-zinc-500">{node.slot}</span>
                      <span className="text-sm text-zinc-300">{node.type}</span>
                    </div>
                    <span className="text-xs text-zinc-600">{expandedStep === i ? "▲" : "▼"}</span>
                  </button>
                  {expandedStep === i && (
                    <div className="px-3 pb-3">
                      <div className="mb-1 flex gap-2 text-[10px] text-zinc-600">
                        <span>槽位: {node.slot}</span>
                        <span>优先级: {node.priority}</span>
                        <span>{node.asSystemMessage ? "独立 system 消息" : "拼入 system"}</span>
                      </div>
                      <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-zinc-400">
                        {node.content || "(空)"}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
