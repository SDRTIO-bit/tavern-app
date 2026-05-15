"use client";

import { useEffect, useRef, useState } from "react";
import { runtime, type LogEntry, type LogCategory } from "@/core/runtime";
import { useChatStore } from "@/store/chatStore";

// ---- 分类图标和颜色 ----
const CAT_INFO: Record<LogCategory, { icon: string; color: string; label: string }> = {
  system:    { icon: "⚙",  color: "text-zinc-400", label: "系统" },
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

function DeltaBadge({ label, value }: { label: string; value: number }) {
  const isPositive = value > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-mono ${
        isPositive
          ? "bg-green-900/50 text-green-400"
          : "bg-red-900/50 text-red-400"
      }`}
    >
      <span>{isPositive ? "↑" : "↓"}</span>
      {label}
      <span>{isPositive ? "+" : ""}{value}</span>
    </span>
  );
}

function LogLine({ entry }: { entry: LogEntry }) {
  const info = CAT_INFO[entry.category];

  return (
    <div className="animate-fadeIn py-0.5">
      {/* 主行 */}
      <div className="flex items-start gap-2">
        <span className={`mt-px shrink-0 text-xs ${info.color}`}>
          {info.icon}
        </span>
        <span className={`text-xs font-medium ${info.color}`}>
          [{info.label}]
        </span>
        <span className="text-xs text-zinc-300">{entry.message}</span>
      </div>

      {/* 情绪 delta badges */}
      {entry.deltas && entry.deltas.length > 0 && (
        <div className="ml-12 mt-1 flex flex-wrap gap-1">
          {entry.deltas.map((d, i) => (
            <DeltaBadge key={i} label={d.label} value={d.value} />
          ))}
        </div>
      )}

      {/* 子条目 */}
      {entry.children && entry.children.length > 0 && (
        <div className="ml-12 mt-0.5">
          {entry.children.map((child, i) => (
            <div key={i} className="text-[11px] leading-relaxed text-zinc-500">
              {i === entry.children!.length - 1 ? "└ " : "├ "}
              {child}
            </div>
          ))}
        </div>
      )}

      {/* detail */}
      {entry.detail && (
        <div className="ml-12 mt-0.5 text-[11px] italic text-zinc-600 line-clamp-2">
          "{entry.detail}"
        </div>
      )}
    </div>
  );
}

export default function RuntimeConsole() {
  const [isOpen, setIsOpen] = useState(false);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const status = useChatStore((s) => s.status);
  const isActive = status === 'connecting' || status === 'thinking' || status === 'streaming';

  // 注册实时日志监听
  useEffect(() => {
    const handler = (entry: LogEntry) => {
      setEntries((prev) => [...prev, entry]);
    };
    runtime.onLog(handler);
    return () => runtime.offLog();
  }, []);

  // 开始新请求时清空并自动展开
  useEffect(() => {
    if (isActive) {
      setEntries([]);
      setIsOpen(true);
    }
  }, [isActive]);

  // 自动滚底
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries]);

  // 完成 3s 后自动收起
  useEffect(() => {
    if (status === 'done' && entries.length > 0) {
      const timer = setTimeout(() => setIsOpen(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const entryCount = entries.length;

  return (
    <div className="border-t border-zinc-800 bg-zinc-950">
      {/* 标题栏 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-1.5 text-xs text-zinc-500 hover:text-zinc-300"
      >
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-zinc-400">▸ RUNTIME CONSOLE</span>
          {isActive && (
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-yellow-400" />
          )}
          {entryCount > 0 && (
            <span className="rounded bg-zinc-800 px-1.5 py-0 text-[10px] text-zinc-500">
              {entryCount} 条
            </span>
          )}
        </div>
        <span className="font-mono">{isOpen ? "─" : "＋"}</span>
      </button>

      {/* 日志面板 */}
      {isOpen && (
        <div className="max-h-64 overflow-y-auto border-t border-zinc-800 bg-zinc-950/90 px-4 py-2 font-mono">
          {entries.length === 0 && (
            <p className="py-2 text-center text-xs text-zinc-600">
              {isActive ? "等待中..." : "发送消息后查看流水"}
            </p>
          )}

          {entries.map((entry) => (
            <LogLine key={entry.id} entry={entry} />
          ))}

          {/* 加载中指示器 */}
          {isActive && (
            <div className="flex items-center gap-2 py-1 text-xs text-zinc-600">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-yellow-400" />
              <span>
                {status === 'connecting'
                  ? '连接中...'
                  : status === 'thinking'
                    ? '思考中...'
                    : '生成中...'}
              </span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
