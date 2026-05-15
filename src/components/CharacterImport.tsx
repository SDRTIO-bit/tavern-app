"use client";

import { useRef, useState } from "react";
import { useChatStore } from "@/store/chatStore";

export default function CharacterImport() {
  const inputRef = useRef<HTMLInputElement>(null);
  const importCharacter = useChatStore((s) => s.importCharacter);
  const [status, setStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus({ type: null, message: "导入中..." });

    try {
      const char = await importCharacter(file);
      setStatus({
        type: "success",
        message: `✅ 已导入: ${char.name}`,
      });
    } catch (err) {
      setStatus({
        type: "error",
        message: `❌ ${err instanceof Error ? err.message : "导入失败"}`,
      });
    }

    // 清空 input 以便重复导入同一文件
    e.target.value = "";

    // 3 秒后清除状态
    setTimeout(() => setStatus({ type: null, message: "" }), 3000);
  };

  return (
    <div className="px-4 pb-2">
      <input
        ref={inputRef}
        type="file"
        accept=".json,.png"
        onChange={handleFile}
        className="hidden"
      />
      <button
        onClick={handleClick}
        className="w-full rounded-lg border border-dashed border-zinc-700 px-3 py-2 text-sm text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-300"
      >
        + 导入角色卡
      </button>
      {status.message && (
        <div
          className={`mt-1 text-xs ${
            status.type === "success" ? "text-green-400" : "text-red-400"
          }`}
        >
          {status.message}
        </div>
      )}
    </div>
  );
}
