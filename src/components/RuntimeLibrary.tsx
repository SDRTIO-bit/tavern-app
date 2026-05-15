"use client";

import type { ProfileMetadata, CapabilityGuide } from "@/runtimeProfile/ProfileMetadata";
import { BUILTIN_PROFILE_META, CAPABILITY_GUIDES } from "@/runtimeProfile/ProfileMetadata";
import type { RuntimeProfile } from "@/runtimeProfile/RuntimeProfile";
import { BUILTIN_PROFILES } from "@/runtimeProfile/ProfileLoader";
import { getAllCapabilityPacks } from "@/runtimeProfile/CapabilityPack";
import { CapabilityComposer } from "@/runtimeProfile/CapabilityComposer";
import type { ComposedRuntime } from "@/runtimeProfile/CapabilityComposer";
import { useState, useMemo } from "react";

const composer = new CapabilityComposer();
const packs = getAllCapabilityPacks();

interface Props {
  onSelect: (profile: RuntimeProfile) => void;
  activeProfileId: string;
}

function TokenStars(n: number): string {
  return "★".repeat(n) + "☆".repeat(5 - n);
}

function DifficultyBadge({ d }: { d: string }) {
  const colors: Record<string, string> = {
    beginner: "bg-green-900/50 text-green-400",
    advanced: "bg-yellow-900/50 text-yellow-400",
    experimental: "bg-red-900/50 text-red-400",
  };
  const labels: Record<string, string> = {
    beginner: "入门",
    advanced: "高级",
    experimental: "实验",
  };
  return (
    <span className={`rounded px-1.5 py-0.5 text-[9px] ${colors[d] || ""}`}>
      {labels[d] || d}
    </span>
  );
}

export default function RuntimeLibrary({ onSelect, activeProfileId }: Props) {
  const [showGuide, setShowGuide] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"profiles" | "capabilities">("profiles");

  return (
    <div className="space-y-2">
      {/* Tab 切换 */}
      <div className="flex gap-1 rounded bg-zinc-900 p-0.5">
        <button
          onClick={() => setActiveTab("profiles")}
          className={`flex-1 rounded py-1 text-[10px] ${
            activeTab === "profiles" ? "bg-blue-600 text-white" : "text-zinc-500"
          }`}
        >
          📦 模板
        </button>
        <button
          onClick={() => setActiveTab("capabilities")}
          className={`flex-1 rounded py-1 text-[10px] ${
            activeTab === "capabilities" ? "bg-blue-600 text-white" : "text-zinc-500"
          }`}
        >
          🧩 能力说明
        </button>
      </div>

      {/* Profiles 列表 */}
      {activeTab === "profiles" && (
        <div className="space-y-1.5">
          {BUILTIN_PROFILES.filter((p) => BUILTIN_PROFILE_META[p.id]).map((rp) => {
            const meta = BUILTIN_PROFILE_META[rp.id];
            const composed = composer.compose(rp);
            return (
              <button
                key={rp.id}
                onClick={() => onSelect(rp)}
                className={`w-full rounded-lg p-3 text-left transition ${
                  activeProfileId === rp.id
                    ? "bg-blue-600/20 ring-1 ring-blue-500"
                    : "bg-zinc-900 hover:bg-zinc-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{rp.icon}</span>
                    <div>
                      <span className="text-sm font-semibold text-zinc-200">{meta.name}</span>
                      <DifficultyBadge d={meta.difficulty} />
                    </div>
                  </div>
                  <span className="text-[10px] text-zinc-600">
                    {TokenStars(meta.estimatedTokenCost)}
                  </span>
                </div>
                <p className="mt-1 text-[10px] leading-relaxed text-zinc-500">
                  {meta.description}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {meta.tags.map((t) => (
                    <span key={t} className="rounded bg-zinc-800/50 px-1 py-0 text-[8px] text-zinc-600">{t}</span>
                  ))}
                  <span className="rounded bg-zinc-800/50 px-1 py-0 text-[8px] text-zinc-600">
                    {packs.filter((p) => rp.capabilities.includes(p.id)).length} 能力
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Capability Guides */}
      {activeTab === "capabilities" && (
        <div className="space-y-1.5">
          {packs.map((pack) => {
            const guide = CAPABILITY_GUIDES[pack.id];
            const isExpanded = showGuide === pack.id;
            return (
              <div key={pack.id} className="rounded-lg bg-zinc-900">
                <button
                  onClick={() => setShowGuide(isExpanded ? null : pack.id)}
                  className="flex w-full items-center justify-between p-3 text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{pack.icon}</span>
                    <span className="text-sm font-semibold text-zinc-200">{pack.name}</span>
                  </div>
                  <span className="text-[10px] text-zinc-600">{isExpanded ? "▲" : "▼"}</span>
                </button>
                {isExpanded && guide && (
                  <div className="border-t border-zinc-800 px-3 pb-3 pt-2 space-y-2 text-[10px]">
                    <div>
                      <span className="text-zinc-500">作用: </span>
                      <span className="text-zinc-400">{guide.purpose}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">提升: </span>
                      <span className="text-zinc-400">{guide.benefit}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">消耗: </span>
                      <span className="text-zinc-400">{guide.tokenCost}</span>
                    </div>
                    {guide.bestFor.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {guide.bestFor.map((s) => (
                          <span key={s} className="rounded bg-blue-900/30 px-1.5 py-0.5 text-[9px] text-blue-400">{s}</span>
                        ))}
                      </div>
                    )}
                    {guide.caveats && (
                      <div className="text-zinc-600">
                        ⚠ {guide.caveats.join("；")}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
