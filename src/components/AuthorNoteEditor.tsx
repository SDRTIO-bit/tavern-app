"use client";

import { useState } from "react";
import { useANStore } from "@/store/authorsNoteStore";

export default function AuthorNoteEditor() {
  const note = useANStore((s) => s.note);
  const setEnabled = useANStore((s) => s.setEnabled);
  const setContent = useANStore((s) => s.setContent);
  const setPosition = useANStore((s) => s.setPosition);
  const setDepth = useANStore((s) => s.setDepth);
  const setDepthStep = useANStore((s) => s.setDepthStep);
  const setDepthIncrease = useANStore((s) => s.setDepthIncrease);

  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-t border-zinc-800">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm text-zinc-400 hover:text-zinc-300"
      >
        <span>酒馆助手 (Author's Note)</span>
        <span className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={note.enabled}
            onChange={() => setEnabled(!note.enabled)}
            className="h-3 w-3 accent-blue-500"
            onClick={(e) => e.stopPropagation()}
          />
          <span>{isOpen ? "▼" : "▶"}</span>
        </span>
      </button>

      {isOpen && (
        <div className="space-y-3 px-4 pb-4">
          <textarea
            value={note.content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="在此输入指引 AI 的内容..."
            rows={4}
            className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-1 focus:ring-blue-500"
          />

          <div className="flex gap-3 text-xs">
            <label className="flex items-center gap-1 text-zinc-500">
              位置:
              <select
                value={note.position}
                onChange={(e) => setPosition(e.target.value as any)}
                className="rounded bg-zinc-800 px-2 py-1 text-zinc-300"
              >
                <option value="top">顶部 (system 前)</option>
                <option value="bottom">底部 (system 后)</option>
                <option value="depth">深度插入 (消息间)</option>
              </select>
            </label>
          </div>

          {note.position === "depth" && (
            <div className="flex gap-3 text-xs">
              <label className="flex items-center gap-1 text-zinc-500">
                深度 (Depth):
                <input
                  type="number"
                  min={1}
                  value={note.depth}
                  onChange={(e) => setDepth(parseInt(e.target.value) || 4)}
                  className="w-14 rounded bg-zinc-800 px-2 py-1 text-zinc-300"
                />
              </label>
              <label className="flex items-center gap-1 text-zinc-500">
                <input
                  type="checkbox"
                  checked={note.depthIncrease}
                  onChange={() => setDepthIncrease(!note.depthIncrease)}
                  className="h-3 w-3 accent-blue-500"
                />
                自动递进
              </label>
            </div>
          )}

          <div className="text-[10px] text-zinc-600">
            {note.enabled
              ? `✓ 已启用 — ${note.position} 模式${note.position === 'depth' ? ` (depth=${note.depth})` : ''}`
              : "○ 已禁用"}
          </div>
        </div>
      )}
    </div>
  );
}
