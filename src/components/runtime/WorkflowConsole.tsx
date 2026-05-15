"use client";

import { useEffect, useRef, useState } from "react";
import type { LogEntry, LogCategory } from "@/core/runtime";
import type { RuntimeEvent } from "@/workflowRuntime/types/WorkflowRuntimeTypes";
import { RuntimeConsoleBridge } from "@/workflowRuntime/RuntimeConsoleBridge";
import type { RuntimeEventBus } from "@/workflowRuntime/RuntimeEventBus";

const CAT_INFO: Record<LogCategory, { icon: string; color: string; label: string }> = {
  system:    { icon: "⚙",  color: "text-zinc-400",  label: "系统" },
  character: { icon: "👤", color: "text-blue-400",  label: "角色" },
  emotion:   { icon: "💭", color: "text-pink-400",  label: "情绪" },
  memory:    { icon: "🧠", color: "text-purple-400",label: "记忆" },
  goal:      { icon: "🎯", color: "text-amber-400", label: "目标" },
  worldbook: { icon: "📖", color: "text-emerald-400",label: "世界书" },
  prompt:    { icon: "📝", color: "text-cyan-400",  label: "Prompt" },
  model:     { icon: "🤖", color: "text-yellow-400",label: "模型" },
  stream:    { icon: "📡", color: "text-green-400", label: "流式" },
  agent:     { icon: "🧠", color: "text-amber-400", label: "Agent" },
  done:      { icon: "✅", color: "text-green-400", label: "完成" },
  error:     { icon: "❌", color: "text-red-400",   label: "错误" },
};

interface Props {
  eventBus: RuntimeEventBus;
  isRunning: boolean;
}

export default function WorkflowConsole({ eventBus, isRunning }: Props) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEntries([]);
    const bridge = new RuntimeConsoleBridge(eventBus);
    bridge.connect((entry) => {
      setEntries((prev) => [...prev, entry]);
    });
    return () => bridge.disconnect();
  }, [eventBus]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries]);

  return (
    <div className="flex h-full flex-col bg-zinc-950 font-mono">
      <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-2">
        <span className="text-xs font-bold text-zinc-400">▸ RUNTIME CONSOLE</span>
        {isRunning && (
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-yellow-400" />
        )}
        <span className="ml-auto text-[10px] text-zinc-600">
          {entries.length} 条
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2 text-xs">
        {entries.length === 0 && (
          <p className="py-4 text-center text-zinc-600">
            发送消息后查看流水
          </p>
        )}

        {entries.map((entry, i) => {
          const info = CAT_INFO[entry.category];
          return (
            <div key={i} className="animate-fadeIn py-0.5">
              <div className="flex items-start gap-2">
                <span className={`mt-px shrink-0 ${info.color}`}>{info.icon}</span>
                <span className={`font-medium ${info.color}`}>[{info.label}]</span>
                <span className="text-zinc-300">{entry.message}</span>
              </div>

              {entry.deltas && entry.deltas.length > 0 && (
                <div className="ml-12 mt-1 flex flex-wrap gap-1">
                  {entry.deltas.map((d, j) => (
                    <span
                      key={j}
                      className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] ${
                        d.value > 0
                          ? "bg-green-900/50 text-green-400"
                          : "bg-red-900/50 text-red-400"
                      }`}
                    >
                      {d.value > 0 ? "↑" : "↓"} {d.label} {d.value > 0 ? "+" : ""}{d.value}
                    </span>
                  ))}
                </div>
              )}

              {entry.children && entry.children.length > 0 && (
                <div className="ml-12 mt-0.5">
                  {entry.children.map((c, j) => (
                    <div key={j} className="text-[11px] leading-relaxed text-zinc-500">
                      {j === entry.children!.length - 1 ? "└ " : "├ "}{c}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {isRunning && (
          <div className="flex items-center gap-2 py-1 text-zinc-600">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-yellow-400" />
            <span>执行中...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
