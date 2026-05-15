"use client";

import { useState, useRef, useEffect } from "react";
import { useChatStore } from "@/store/chatStore";

export default function InputBox() {
  const [text, setText] = useState("");
  const sendMessage = useChatStore((s) => s.sendMessage);
  const isLoading = useChatStore((s) => s.isLoading);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async () => {
    if (!text.trim() || isLoading) return;
    const value = text;
    setText("");
    await sendMessage(value);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-zinc-800 bg-zinc-950 p-4">
      <div className="mx-auto flex max-w-4xl gap-2">
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息..."
          disabled={isLoading}
          className="flex-1 rounded-xl bg-zinc-800 px-4 py-3 text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !text.trim()}
          className="rounded-xl bg-blue-600 px-5 font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
        >
          发送
        </button>
      </div>
    </div>
  );
}
