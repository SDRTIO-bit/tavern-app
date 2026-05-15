"use client";

import { useState } from "react";
import { useWorldBookStore } from "@/store/worldbookStore";
import { WorldBookEntry } from "@/types/worldbook";

export default function WorldBookEditor() {
  const books = useWorldBookStore((s) => s.books);
  const activeBookId = useWorldBookStore((s) => s.activeBookId);
  const enabled = useWorldBookStore((s) => s.enabled);
  const setEnabled = useWorldBookStore((s) => s.setEnabled);
  const addBook = useWorldBookStore((s) => s.addBook);
  const removeBook = useWorldBookStore((s) => s.removeBook);
  const setActiveBook = useWorldBookStore((s) => s.setActiveBook);
  const addEntry = useWorldBookStore((s) => s.addEntry);
  const removeEntry = useWorldBookStore((s) => s.removeEntry);
  const toggleEntry = useWorldBookStore((s) => s.toggleEntry);

  const [isOpen, setIsOpen] = useState(false);
  const [newBookName, setNewBookName] = useState("");
  const [newKeys, setNewKeys] = useState("");
  const [newContent, setNewContent] = useState("");

  const activeBook = books.find((b) => b.id === activeBookId) ?? books[0];

  const handleAddEntry = () => {
    const keys = newKeys.split(",").map((k) => k.trim()).filter(Boolean);
    if (!activeBook || keys.length === 0 || !newContent.trim()) return;
    addEntry(activeBook.id, { keys, content: newContent.trim(), enabled: true });
    setNewKeys("");
    setNewContent("");
  };

  const handleAddBook = () => {
    if (!newBookName.trim()) return;
    addBook(newBookName.trim());
    setNewBookName("");
  };

  const totalEntries = books.reduce((s, b) => s + b.entries.length, 0);

  return (
    <div className="border-t border-zinc-800">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm text-zinc-400 hover:text-zinc-300"
      >
        <span>世界书 ({totalEntries})</span>
        <span className="flex items-center gap-2">
          <input type="checkbox" checked={enabled} onChange={() => setEnabled(!enabled)} className="h-3 w-3 accent-blue-500" onClick={(e) => e.stopPropagation()} />
          <span>{isOpen ? "▼" : "▶"}</span>
        </span>
      </button>

      {isOpen && (
        <div className="space-y-3 px-4 pb-4">
          {/* 书切换 */}
          <div className="flex flex-wrap gap-1">
            {books.map((b) => (
              <button
                key={b.id}
                onClick={() => setActiveBook(b.id)}
                className={`rounded px-2 py-0.5 text-xs ${activeBook?.id === b.id ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400"}`}
              >
                {b.name}
              </button>
            ))}
            <input value={newBookName} onChange={(e) => setNewBookName(e.target.value)} placeholder="新书..." className="w-20 rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-100 outline-none" />
            <button onClick={handleAddBook} className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400 hover:text-white">+</button>
          </div>

          {activeBook && (
            <>
              {/* 新增条目 */}
              <div className="rounded-lg bg-zinc-900 p-3">
                <input value={newKeys} onChange={(e) => setNewKeys(e.target.value)} placeholder="关键词（逗号分隔）" className="w-full rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none" />
                <textarea value={newContent} onChange={(e) => setNewContent(e.target.value)} placeholder="设定内容..." rows={3} className="mt-2 w-full rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none" />
                <button onClick={handleAddEntry} className="mt-2 w-full rounded bg-blue-600 py-1.5 text-sm text-white hover:bg-blue-500">+ 添加条目</button>
              </div>

              {/* 条目列表 */}
              {activeBook.entries.length === 0 && <p className="text-center text-xs text-zinc-600">暂无条目</p>}
              {activeBook.entries.map((e) => (
                <div key={e.id} className={`rounded-lg bg-zinc-900 p-3 ${!e.enabled ? "opacity-40" : ""}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">{e.keys.join(", ")}</span>
                    <div className="flex gap-1">
                      <button onClick={() => toggleEntry(activeBook.id, e.id)} className="rounded px-1.5 py-0.5 text-xs text-zinc-400 hover:bg-zinc-800">{e.enabled ? "开" : "关"}</button>
                      <button onClick={() => removeEntry(activeBook.id, e.id)} className="rounded px-1.5 py-0.5 text-xs text-red-400 hover:bg-zinc-800">✕</button>
                    </div>
                  </div>
                  <div className="mt-1 text-sm text-zinc-300">{e.content}</div>
                  <div className="mt-1 text-[10px] text-zinc-600">
                    {e.position ?? "默认"} {e.priority ? `优先级=${e.priority}` : ""}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
