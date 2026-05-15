"use client";

import { useChatStore, type ProcessStatus } from "@/store/chatStore";

const STATUS_LABELS: Record<ProcessStatus, { text: string; color: string; dot: string }> = {
  idle:      { text: "就绪",        color: "text-zinc-500", dot: "bg-zinc-500" },
  connecting:{ text: "连接中...",    color: "text-yellow-400", dot: "bg-yellow-400 animate-pulse" },
  thinking:  { text: "思考中...",    color: "text-yellow-400", dot: "bg-yellow-400 animate-pulse" },
  streaming: { text: "生成中...",    color: "text-green-400", dot: "bg-green-400 animate-pulse" },
  done:      { text: "完成",        color: "text-green-400", dot: "bg-green-400" },
  error:     { text: "出错",        color: "text-red-400", dot: "bg-red-400" },
};

export default function StatusBar() {
  const status = useChatStore((s) => s.status);
  const lastError = useChatStore((s) => s.lastError);
  const clearError = useChatStore((s) => s.clearError);
  const tokenCount = useChatStore((s) => s.tokenCount);

  const info = STATUS_LABELS[status];

  return (
    <div className="flex h-8 items-center justify-between border-t border-zinc-800 bg-zinc-950 px-4 text-xs">
      <div className={`flex items-center gap-2 ${info.color}`}>
        <span className={`inline-block h-2 w-2 rounded-full ${info.dot}`} />
        <span>{info.text}</span>
        {tokenCount > 0 && status === 'done' && (
          <span className="text-zinc-600">~{tokenCount} tokens</span>
        )}
      </div>

      {status === 'error' && lastError && (
        <div className="flex items-center gap-2">
          <span className="max-w-md truncate text-red-400">{lastError}</span>
          <button
            onClick={clearError}
            className="rounded px-1.5 py-0.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
