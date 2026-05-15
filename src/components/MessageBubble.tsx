"use client";

import { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Message } from "@/types/message";
import { useChatStore } from "@/store/chatStore";
import UniversalPanelRenderer, { hasPanelTags, cleanPanelTags } from "./UniversalPanelRenderer";
import CachedPanelRenderer from "./CachedPanelRenderer";

export default function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const [showActions, setShowActions] = useState(false);
  const regenerate = useChatStore((s) => s.regenerate);
  const isLoading = useChatStore((s) => s.isLoading);
  const characters = useChatStore((s) => s.customCharacters);
  const activeId = useChatStore((s) => s.activeCharacterId);

  const isLastAssistant = !isUser && message.content && !isLoading;

  // 获取当前角色信息（用于面板品牌显示）
  const currentChar = useMemo(
    () => characters.find((c) => c.id === activeId),
    [characters, activeId]
  );

  const hasPanels = useMemo(
    () => (!isUser && hasPanelTags(message.content)),
    [message.content, isUser]
  );

  const cleanContent = useMemo(
    () => (isUser || !hasPanels ? message.content : cleanPanelTags(message.content)),
    [message.content, isUser, hasPanels]
  );

  return (
    <div
      className={`group relative flex ${isUser ? "justify-end" : "justify-start"}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div
        className={`max-w-[70%] rounded-2xl px-4 py-3 leading-relaxed ${
          isUser
            ? "bg-blue-600 text-white"
            : "bg-zinc-800 text-zinc-100"
        }`}
      >
        {isUser ? (
          <span className="whitespace-pre-wrap">{message.content}</span>
        ) : (
          <>
            {/* 通用面板渲染 */}
            {hasPanels && (
              <UniversalPanelRenderer
                content={message.content}
                characterName={currentChar?.name}
                creator={currentChar?.cardData?.creator}
                inline
              />
            )}

            {/* 本地化 HTML 面板 (iframe 渲染 CDN 面板) */}
            {hasPanels && currentChar && (
              <CachedPanelRenderer
                content={message.content}
                characterId={currentChar.id}
              />
            )}

            {/* Markdown 文本（已清洗面板标签） */}
            {cleanContent && (
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ className, children, ...props }) {
                      const isInline = !className;
                      if (isInline) {
                        return (
                          <code
                            className="rounded bg-zinc-700 px-1.5 py-0.5 text-sm text-zinc-200"
                            {...props}
                          >
                            {children}
                          </code>
                        );
                      }
                      return (
                        <pre className="overflow-x-auto rounded-lg bg-zinc-950 p-4">
                          <code className={className} {...props}>
                            {children}
                          </code>
                        </pre>
                      );
                    },
                    blockquote({ children }) {
                      return (
                        <blockquote className="border-l-4 border-zinc-500 pl-4 italic text-zinc-400">
                          {children}
                        </blockquote>
                      );
                    },
                    ul({ children }) {
                      return <ul className="list-disc pl-5">{children}</ul>;
                    },
                    ol({ children }) {
                      return <ol className="list-decimal pl-5">{children}</ol>;
                    },
                    a({ href, children }) {
                      return (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 underline hover:text-blue-300"
                        >
                          {children}
                        </a>
                      );
                    },
                    strong({ children }) {
                      return <strong className="font-bold text-zinc-100">{children}</strong>;
                    },
                    em({ children }) {
                      return <em className="italic text-zinc-200">{children}</em>;
                    },
                    p({ children }) {
                      return <p className="mb-2 last:mb-0">{children}</p>;
                    },
                  }}
                >
                  {cleanContent}
                </ReactMarkdown>
              </div>
            )}
          </>
        )}

        {/* 操作按钮（hover 显示） */}
        {isLastAssistant && showActions && (
          <div className="mt-2 flex gap-2 border-t border-zinc-700 pt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                regenerate();
              }}
              className="rounded bg-zinc-700 px-2 py-0.5 text-xs text-zinc-300 hover:bg-zinc-600"
            >
              重新生成
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(message.content);
              }}
              className="rounded bg-zinc-700 px-2 py-0.5 text-xs text-zinc-300 hover:bg-zinc-600"
            >
              复制
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
