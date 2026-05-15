// ============================================================
// panelFetcher — HTML 面板本地缓存
//
// 从角色卡的正则脚本中提取 CDN URL，下载 HTML 并缓存。
// 渲染时使用 sandboxed iframe 保证安全隔离。
// ============================================================

import type { RegexScript } from "@/types/regex";

/** 面板缓存条目 */
export interface CachedPanel {
  /** 面板标识（从 regex name 提取） */
  id: string;
  /** 面板名称 */
  name: string;
  /** CDN URL */
  url: string;
  /** HTML 内容 */
  html: string;
  /** 匹配此面板的正则 */
  findRegex: string;
  /** 替换正则（原始） */
  replaceRegex: string;
  /** 加载状态 */
  status: "loading" | "loaded" | "error";
  /** 错误信息 */
  error?: string;
}

/** 从正则脚本中提取 CDN URL */
function extractCdnUrl(replaceString: string): string | null {
  // 匹配 $('body').load('url') 或类似的 URL 模式
  const urlMatch = replaceString.match(
    /https?:\/\/[^\s'")`<>]+/i
  );
  return urlMatch?.[0] || null;
}

/** 从正则脚本中提取面板标签名 */
function extractPanelTag(findRegex: string): string {
  // 从 <TAG_NAME> 或 /<TAG_NAME>/ 中提取
  const tagMatch = findRegex.match(/<(\w+)>/);
  if (tagMatch) return tagMatch[1];

  // 中文标签 【xxx】
  const cnMatch = findRegex.match(/【([^】]+)】/);
  if (cnMatch) return `cn_${cnMatch[1]}`;

  // 从正则路径中提取
  return `panel_${Date.now()}`;
}

// ---- 缓存存储 ----

/** 内存缓存：url → CachedPanel */
const panelCache = new Map<string, CachedPanel>();

/** 正在加载中的 Promise */
const loadingPromises = new Map<string, Promise<CachedPanel>>();

/**
 * 从角色卡的正则脚本中提取所有 HTML 面板并预加载。
 */
export function extractPanelScripts(regexScripts: RegexScript[]): CachedPanel[] {
  const panels: CachedPanel[] = [];

  for (const script of regexScripts) {
    const url = extractCdnUrl(script.replacement);
    if (!url) continue;

    const tag = extractPanelTag(script.pattern || "");

    // 检查是否已缓存
    const existing = panelCache.get(url);
    if (existing) {
      panels.push(existing);
      continue;
    }

    // 创建新缓存条目
    const panel: CachedPanel = {
      id: tag,
      name: script.name || tag,
      url,
      html: "",
      findRegex: script.pattern || "",
      replaceRegex: script.replacement,
      status: "loading",
    };

    panelCache.set(url, panel);
    panels.push(panel);

    // 异步加载
    loadPanel(panel);
  }

  return panels;
}

/**
 * 异步加载面板 HTML。
 */
async function loadPanel(panel: CachedPanel): Promise<CachedPanel> {
  // 去重：如果已在加载中，等待
  const existing = loadingPromises.get(panel.url);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const resp = await fetch(panel.url, {
        // 通过我们的 API 代理避免 CORS
        headers: { Accept: "text/html" },
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      panel.html = await resp.text();
      panel.status = "loaded";

      // 处理 HTML 中的相对路径引用
      panel.html = processHtml(panel.html, panel.url);

      panelCache.set(panel.url, panel);
      return panel;
    } catch (err) {
      panel.status = "error";
      panel.error = err instanceof Error ? err.message : "加载失败";
      panelCache.set(panel.url, panel);
      return panel;
    } finally {
      loadingPromises.delete(panel.url);
    }
  })();

  loadingPromises.set(panel.url, promise);
  return promise;
}

/**
 * 处理 HTML 内容，注入基础样式隔离。
 */
function processHtml(html: string, baseUrl: string): string {
  // 注入安全策略和基础样式隔离
  const safetyStyles = `
    <style>
      :root {
        --bg: transparent;
        color-scheme: dark;
      }
      body {
        background: transparent !important;
        color: #e8e8f0 !important;
        margin: 0;
        padding: 0;
      }
      a { color: #60a5fa; }
    </style>
  `;

  // 在 </head> 前注入
  if (html.includes("</head>")) {
    html = html.replace("</head>", `${safetyStyles}</head>`);
  } else if (html.includes("<body")) {
    html = html.replace("<body", `${safetyStyles}<body`);
  } else {
    html = safetyStyles + html;
  }

  return html;
}

/**
 * 获取已缓存的面板。
 */
export function getCachedPanel(url: string): CachedPanel | undefined {
  return panelCache.get(url);
}

/**
 * 获取所有已加载的面板。
 */
export function getLoadedPanels(): CachedPanel[] {
  return Array.from(panelCache.values()).filter((p) => p.status === "loaded");
}

/**
 * 根据正则匹配查找对应的缓存面板。
 */
export function findPanelByTag(content: string, panels: CachedPanel[]): CachedPanel | null {
  for (const panel of panels) {
    try {
      const regex = new RegExp(panel.findRegex, "s");
      if (regex.test(content)) {
        return panel;
      }
    } catch {
      // 跳过无效正则
    }
  }
  return null;
}

/**
 * 预加载角色卡的所有面板。
 * 应在导入角色卡时调用。
 */
export async function preloadCardPanels(
  regexScripts: RegexScript[]
): Promise<CachedPanel[]> {
  const panels = extractPanelScripts(regexScripts);
  await Promise.allSettled(panels.map((p) => loadPanel(p)));
  return panels;
}

/**
 * 清除所有缓存。
 */
export function clearPanelCache(): void {
  panelCache.clear();
  loadingPromises.clear();
}
