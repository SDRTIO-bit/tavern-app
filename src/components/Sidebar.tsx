"use client";

import { useChatStore } from "@/store/chatStore";
import { characters as builtInCharacters } from "@/core/characterLoader";
import CharacterImport from "./CharacterImport";
import PresetEditor from "./PresetEditor";
import WorldBookEditor from "./WorldBookEditor";
import AuthorNoteEditor from "./AuthorNoteEditor";
import RegexEditor from "./RegexEditor";

export default function Sidebar() {
  const activeCharacterId = useChatStore((s) => s.activeCharacterId);
  const setCharacter = useChatStore((s) => s.setCharacter);
  const customCharacters = useChatStore((s) => s.customCharacters);
  const removeCharacter = useChatStore((s) => s.removeCharacter);

  const allCharacters = [...builtInCharacters, ...customCharacters];

  return (
    <div className="flex h-full w-72 flex-col border-r border-zinc-800 bg-zinc-950">
      <h2 className="px-4 pb-2 pt-4 text-lg font-bold text-zinc-100">酒馆</h2>
      <CharacterImport />

      <div className="flex-1 overflow-y-auto">
        {/* 角色列表 */}
        <div className="space-y-1 px-4 pb-2">
          {allCharacters.map((char) => {
            const isCustom = customCharacters.some((c) => c.id === char.id);
            return (
              <div key={char.id} className="group relative">
                <button
                  onClick={() => setCharacter(char.id)}
                  className={`w-full rounded-lg p-3 text-left transition ${
                    activeCharacterId === char.id ? "bg-zinc-700 ring-1 ring-blue-500" : "bg-zinc-900 hover:bg-zinc-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-100">{char.name}</span>
                    {isCustom && <span className="text-[10px] text-zinc-500">已导入</span>}
                  </div>
                  <div className="mt-0.5 truncate text-sm text-zinc-400">{char.description}</div>
                </button>
                {isCustom && (
                  <button onClick={(e) => { e.stopPropagation(); removeCharacter(char.id); }}
                    className="absolute right-2 top-2 hidden rounded p-1 text-xs text-red-400 hover:bg-zinc-700 group-hover:block" title="删除"
                  >✕</button>
                )}
              </div>
            );
          })}
        </div>

        {/* 功能面板 */}
        <PresetEditor />
        <WorldBookEditor />
        <AuthorNoteEditor />
        <RegexEditor />
      </div>

      <div className="border-t border-zinc-800 px-4 py-2 text-xs text-zinc-600">
        {allCharacters.length} 个角色 · {customCharacters.length} 个已导入
      </div>
    </div>
  );
}
