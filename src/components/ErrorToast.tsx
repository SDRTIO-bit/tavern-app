"use client";

import { useEffect, useState } from "react";
import { useChatStore } from "@/store/chatStore";

export default function ErrorToast() {
  const lastError = useChatStore((s) => s.lastError);
  const clearError = useChatStore((s) => s.clearError);
  const status = useChatStore((s) => s.status);
  const [visible, setVisible] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (status === 'error' && lastError) {
      setMsg(lastError);
      setVisible(true);
      // 8 秒后自动消失
      const t = setTimeout(() => setVisible(false), 8000);
      return () => clearTimeout(t);
    }
  }, [status, lastError]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-16 left-1/2 z-50 -translate-x-1/2 animate-fadeIn">
      <div className="flex max-w-lg items-start gap-3 rounded-xl border border-red-500/30 bg-red-950/90 px-5 py-4 shadow-2xl backdrop-blur">
        {/* 图标 */}
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-base">
          ❌
        </div>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-red-300">连接失败</p>
          <p className="mt-1 text-xs leading-relaxed text-red-200/80 break-all">
            {msg}
          </p>

          {/* 如果是 API Key 问题，给出操作提示 */}
          {msg.includes('API_KEY') || msg.includes('环境变量') || msg.includes('not configured') ? (
            <div className="mt-2 rounded bg-zinc-900/50 px-3 py-2 text-[11px] text-zinc-400">
              <p className="font-medium text-zinc-300">💡 解决方法：</p>
              <p className="mt-1">1. 在项目根目录创建 <code className="rounded bg-zinc-800 px-1 text-yellow-400">.env.local</code></p>
              <p>2. 写入: <code className="rounded bg-zinc-800 px-1 text-yellow-400">DEEPSEEK_API_KEY=sk-你的key</code></p>
              <p className="mt-1">3. 重启 <code className="rounded bg-zinc-800 px-1">pnpm dev</code></p>
              <p className="mt-2 text-zinc-500">
                诊断: <a href="/api/debug/env" target="_blank" className="text-blue-400 underline">/api/debug/env</a>
              </p>
            </div>
          ) : null}
        </div>

        {/* 关闭按钮 */}
        <button
          onClick={() => { setVisible(false); clearError(); }}
          className="shrink-0 rounded p-1 text-red-400 hover:bg-red-500/20 hover:text-red-300"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
