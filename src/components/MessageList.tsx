"use client";

import { useRef, useEffect } from "react";
import { useChatStore } from "@/store/chatStore";
import MessageBubble from "./MessageBubble";

export default function MessageList() {
  const sessions = useChatStore((s) => s.sessions);
  const activeCharacterId = useChatStore((s) => s.activeCharacterId);
  const isLoading = useChatStore((s) => s.isLoading);
  const messages = sessions[activeCharacterId] ?? [];
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-4">
      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} />
      ))}
      {isLoading && (
        <div className="flex justify-start">
          <div className="rounded-2xl bg-zinc-800 px-4 py-3 text-zinc-400">
            <span className="inline-block animate-pulse">思考中...</span>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
