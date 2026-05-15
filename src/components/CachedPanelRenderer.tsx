"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { CachedPanel, preloadCardPanels, findPanelByTag } from "@/core/panelFetcher";
import type { RegexScript } from "@/types/regex";

// ============================================================
// CachedPanelRenderer — 本地化面板渲染
//
// 从角色卡 regex 脚本提取 CDN 面板，下载后缓存在
// sandboxed iframe 中渲染，安全且还原度 100%。
// ============================================================

// ---- 全局面板缓存 ----

/** 每个角色卡的面板缓存：characterId → panels */
const cardPanelCache = new Map<string, CachedPanel[]>();

/**
 * 预加载角色卡面板。
 * 在导入角色卡时调用。
 */
export async function cacheCardPanels(
  characterId: string,
  regexScripts: RegexScript[]
): Promise<CachedPanel[]> {
  // 已有缓存则跳过
  if (cardPanelCache.has(characterId)) {
    return cardPanelCache.get(characterId)!;
  }

  const panels = await preloadCardPanels(regexScripts);
  cardPanelCache.set(characterId, panels);
  return panels;
}

/**
 * 获取角色卡的面板缓存。
 */
export function getCardPanels(characterId: string): CachedPanel[] {
  return cardPanelCache.get(characterId) || [];
}

/**
 * 清除角色卡的面板缓存。
 */
export function clearCardPanels(characterId: string): void {
  cardPanelCache.delete(characterId);
}

// ---- Panel Iframe 组件 ----

interface PanelIframeProps {
  panel: CachedPanel;
  /** 容器最大高度 */
  maxHeight?: number;
}

function PanelIframe({ panel, maxHeight = 600 }: PanelIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(200);

  useEffect(() => {
    if (!iframeRef.current || panel.status !== "loaded" || !panel.html) return;

    const iframe = iframeRef.current;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(panel.html);
    doc.close();

    // 监听高度变化
    const observer = new ResizeObserver(() => {
      const body = doc.body;
      const html = doc.documentElement;
      const h = Math.max(
        body.scrollHeight,
        body.offsetHeight,
        html.clientHeight,
        html.scrollHeight,
        html.offsetHeight
      );
      if (h > 0) {
        setHeight(Math.min(h + 20, maxHeight));
      }
    });

    observer.observe(doc.body);

    // 尝试在加载后获取高度
    setTimeout(() => {
      const h = Math.max(
        doc.body.scrollHeight,
        doc.body.offsetHeight,
        doc.documentElement.scrollHeight
      );
      if (h > 0) setHeight(Math.min(h + 20, maxHeight));
    }, 500);

    return () => observer.disconnect();
  }, [panel.html, panel.status, maxHeight]);

  if (panel.status === "loading") {
    return (
      <div className="my-2 rounded-lg border border-zinc-700 bg-zinc-900/50 p-4 text-center">
        <div className="animate-pulse flex items-center justify-center gap-2 text-zinc-500 text-sm">
          <div className="w-3 h-3 rounded-full bg-zinc-600" />
          <span>加载面板中...</span>
        </div>
      </div>
    );
  }

  if (panel.status === "error") {
    return (
      <div className="my-2 rounded-lg border border-red-800/50 bg-red-950/20 p-3 text-center">
        <span className="text-xs text-red-400">
          面板加载失败: {panel.error}
        </span>
      </div>
    );
  }

  return (
    <div className="my-2 rounded-lg overflow-hidden border border-zinc-700">
      <div className="flex items-center justify-between bg-zinc-800 px-3 py-1.5">
        <span className="text-[10px] text-zinc-500">{panel.name}</span>
        <span className="text-[10px] text-zinc-600">cdn</span>
      </div>
      <iframe
        ref={iframeRef}
        sandbox="allow-scripts"
        className="w-full border-0"
        style={{ height: `${height}px`, background: "transparent" }}
        title={panel.name}
      />
    </div>
  );
}

// ---- CachedPanelRenderer 主组件 ----

interface CachedPanelRendererProps {
  content: string;
  characterId: string;
}

export default function CachedPanelRenderer({
  content,
  characterId,
}: CachedPanelRendererProps) {
  const panels = useMemo(() => getCardPanels(characterId), [characterId]);

  // 查找匹配的面板
  const matchedPanel = useMemo(() => {
    if (panels.length === 0) return null;
    return findPanelByTag(content, panels);
  }, [content, panels]);

  if (!matchedPanel) return null;

  return <PanelIframe panel={matchedPanel} />;
}

export { PanelIframe };
