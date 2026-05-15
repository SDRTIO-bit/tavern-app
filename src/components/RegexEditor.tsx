"use client";

import { useState } from "react";
import { useRegexStore } from "@/store/regexStore";

export default function RegexEditor() {
  const scripts = useRegexStore((s) => s.scripts);
  const enabled = useRegexStore((s) => s.enabled);
  const setEnabled = useRegexStore((s) => s.setEnabled);
  const addScript = useRegexStore((s) => s.addScript);
  const updateScript = useRegexStore((s) => s.updateScript);
  const removeScript = useRegexStore((s) => s.removeScript);
  const toggleScript = useRegexStore((s) => s.toggleScript);

  const [isOpen, setIsOpen] = useState(false);
  const [newPattern, setNewPattern] = useState("");
  const [newReplacement, setNewReplacement] = useState("");

  const handleAdd = () => {
    if (!newPattern.trim()) return;
    addScript({
      name: `Script ${scripts.length + 1}`,
      pattern: newPattern.trim(),
      replacement: newReplacement,
      enabled: true,
      scope: "both",
      global: true,
      caseInsensitive: true,
      runOn: "before_send",
    });
    setNewPattern("");
    setNewReplacement("");
  };

  return (
    <div className="border-t border-zinc-800">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm text-zinc-400 hover:text-zinc-300"
      >
        <span>正则 ({scripts.length})</span>
        <span className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={enabled}
            onChange={() => setEnabled(!enabled)}
            className="h-3 w-3 accent-blue-500"
            onClick={(e) => e.stopPropagation()}
          />
          <span>{isOpen ? "▼" : "▶"}</span>
        </span>
      </button>

      {isOpen && (
        <div className="space-y-3 px-4 pb-4">
          {/* 新增 */}
          <div className="rounded-lg bg-zinc-900 p-3">
            <input
              value={newPattern}
              onChange={(e) => setNewPattern(e.target.value)}
              placeholder="正则模式 (如: foo)"
              className="w-full rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none"
            />
            <input
              value={newReplacement}
              onChange={(e) => setNewReplacement(e.target.value)}
              placeholder="替换为 (如: bar, 支持 $1)"
              className="mt-2 w-full rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none"
            />
            <button onClick={handleAdd} className="mt-2 w-full rounded bg-blue-600 py-1.5 text-sm text-white">
              + 添加脚本
            </button>
          </div>

          {/* 列表 */}
          {scripts.length === 0 && (
            <p className="text-center text-xs text-zinc-600">暂无正则脚本</p>
          )}
          {scripts.map((s) => (
            <div key={s.id} className={`rounded-lg bg-zinc-900 p-3 ${!s.enabled ? "opacity-40" : ""}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-zinc-400">{s.pattern} → {s.replacement}</span>
                <div className="flex gap-1">
                  <button onClick={() => toggleScript(s.id)} className="rounded px-1.5 py-0.5 text-xs text-zinc-400 hover:bg-zinc-800">
                    {s.enabled ? "开" : "关"}
                  </button>
                  <button onClick={() => removeScript(s.id)} className="rounded px-1.5 py-0.5 text-xs text-red-400 hover:bg-zinc-800">
                    ✕
                  </button>
                </div>
              </div>
              <div className="mt-1 flex gap-2 text-[10px] text-zinc-600">
                <span>{s.scope}</span>
                <span>{s.runOn}</span>
                <span>{s.global ? "g" : ""}{s.caseInsensitive ? "i" : ""}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
