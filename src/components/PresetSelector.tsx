"use client";

import { usePresetStore } from "@/store/presetStore";

export default function PresetSelector() {
  const presets = usePresetStore((s) => s.presets);
  const activePresetId = usePresetStore((s) => s.activePresetId);
  const setActivePreset = usePresetStore((s) => s.setActivePreset);
  const activePreset = usePresetStore((s) => s.getActivePreset());

  return (
    <div className="border-t border-zinc-800 px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-500">预设</span>
        <span className="text-xs text-zinc-600">{presets.length} 个预设</span>
      </div>

      <div className="flex flex-wrap gap-1">
        {presets.map((p) => (
          <button
            key={p.id}
            onClick={() => setActivePreset(p.id)}
            className={`rounded-md px-2.5 py-1 text-xs transition ${
              activePresetId === p.id
                ? "bg-blue-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300"
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* 当前预设参数 */}
      <div className="mt-2 flex gap-3 text-[10px] text-zinc-600">
        <span>🌡 {activePreset.temperature}</span>
        <span>⛔ {activePreset.stopSequences.length > 0 ? activePreset.stopSequences.join(", ") : "—"}</span>
      </div>
    </div>
  );
}
