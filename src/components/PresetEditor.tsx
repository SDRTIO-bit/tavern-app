"use client";

import { useState } from "react";
import { usePresetStore } from "@/store/presetStore";

export default function PresetEditor() {
  const presets = usePresetStore((s) => s.presets);
  const activePresetId = usePresetStore((s) => s.activePresetId);
  const setActivePreset = usePresetStore((s) => s.setActivePreset);
  const updatePreset = usePresetStore((s) => s.updatePreset);
  const addPreset = usePresetStore((s) => s.addPreset);
  const removePreset = usePresetStore((s) => s.removePreset);
  const activePreset = usePresetStore((s) => s.getActivePreset());

  const [isOpen, setIsOpen] = useState(false);
  const [newName, setNewName] = useState("");

  if (!activePreset) return null;

  return (
    <div className="border-t border-zinc-800">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm text-zinc-400 hover:text-zinc-300"
      >
        <span>预设: {activePreset.name}</span>
        <span>{isOpen ? "▼" : "▶"}</span>
      </button>

      {isOpen && (
        <div className="space-y-2 px-4 pb-4">
          {/* 切换 */}
          <div className="flex flex-wrap gap-1">
            {presets.map((p) => (
              <button
                key={p.id}
                onClick={() => setActivePreset(p.id)}
                className={`rounded px-2 py-0.5 text-xs ${
                  activePresetId === p.id ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>

          {/* 编辑活跃 preset */}
          <div className="space-y-2 rounded-lg bg-zinc-900 p-3 text-sm">
            <div>
              <label className="text-xs text-zinc-500">系统提示词</label>
              <textarea
                value={activePreset.systemPrompt}
                onChange={(e) => updatePreset(activePreset.id, { systemPrompt: e.target.value })}
                rows={4}
                className="mt-1 w-full rounded bg-zinc-800 px-3 py-2 text-zinc-100 outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500">越狱 / 风格强化</label>
              <textarea
                value={activePreset.jailbreak ?? ""}
                onChange={(e) => updatePreset(activePreset.id, { jailbreak: e.target.value })}
                rows={2}
                className="mt-1 w-full rounded bg-zinc-800 px-3 py-2 text-zinc-100 outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-zinc-500">温度 (Temperature)</label>
                <input
                  type="number"
                  step={0.05}
                  min={0}
                  max={2}
                  value={activePreset.temperature}
                  onChange={(e) => updatePreset(activePreset.id, { temperature: parseFloat(e.target.value) || 0.8 })}
                  className="mt-1 w-full rounded bg-zinc-800 px-3 py-2 text-zinc-100 outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 新增预设 */}
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="新预设名称..."
              className="flex-1 rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none"
            />
            <button
              onClick={() => {
                if (!newName.trim()) return;
                addPreset({ name: newName.trim(), systemPrompt: "", userPrefix: "用户", assistantPrefix: "助手", contextTemplate: "", temperature: 0.8, stopSequences: [], category: 'custom' });
                setNewName("");
              }}
              className="rounded bg-blue-600 px-3 text-xs text-white hover:bg-blue-500"
            >
              + 添加
            </button>
          </div>

          {/* 删除 */}
          {presets.length > 1 && (
            <button
              onClick={() => removePreset(activePreset.id)}
              className="text-xs text-red-400 hover:text-red-300"
            >
              删除当前预设
            </button>
          )}
        </div>
      )}
    </div>
  );
}
