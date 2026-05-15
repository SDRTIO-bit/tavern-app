# Tavern — AI Runtime Platform

AI 角色扮演聊天应用，已演进为支持 **可组合 Workflow、图执行引擎、Agent 决策、目标驱动行为、持久化会话、通用变量系统、角色卡面板缓存和 HTML 面板渲染** 的 AI 运行时平台。

## 快速开始

```bash
# 1. 配置 API Key（创建 .env.local）
echo DEEPSEEK_API_KEY=sk-你的key > .env.local

# 2. 安装依赖
pnpm install

# 3. 启动开发服务器
pnpm dev
```

浏览器打开 **http://localhost:3000**。

启动后终端会自动列出所有可访问的路由：

```
📋 可访问的路由:
══════════════════════════════════════════════════
  🏠 http://localhost:3000/                (首页)
  📄 http://localhost:3000/workflow-demo   (workflow-demo)
  🔌 http://localhost:3000/api/chat        (api/chat)
══════════════════════════════════════════════════
```

## 页面

| 路径 | 功能 |
|------|------|
| `/` | AI 角色扮演聊天 |
| `/workflow-demo` | Workflow Runtime 平台（会话管理 / 能力配置 / 运行时检查器 / 角色卡导入 / 通用变量 / 面板预览） |

## 特性

### 可组合 Workflow
- 5 种预设 Profile（极简 / 情感对话 / 故事专注 / 完全沉浸 / 自定义）
- 勾选 emotion / memory / narrative / goal / world 能力开关，动态组装执行图
- 预算实时计算（节点 / 记忆 / Token / 推理上限）

### 图执行引擎
- 拓扑排序 + 分支条件路由 + 状态追踪
- 语义表达式（`memory.count >= 3`）+ 类型安全校验
- Agent 决策层（观察 → 推理 → 评分 → 路由）

### 持久化会话
- 会话列表（新建 / 切换 / 删除），localStorage 持久化
- 长期记忆（自动提取 + 关键词检索 + 时间衰减）

### 通用变量系统（v1.5 新增）
- **任意结构化变量存储** — 不预设具体结构，支持任意 JSON 路径
- **AI 响应变量更新** — 从 AI 回复中解析 `<UpdateVariable>` 块，自动应用 JSON Patch
- **角色卡 InitVar 支持** — 从世界书条目解析初始变量（兼容 SillyTavern MVU 系统）
- **变量注入** — 自动将当前变量摘要注入 Prompt 上下文
- **点路径访问** — 支持 `惩戒者.惩戒点数` 形式的嵌套访问

### 角色卡面板系统（v1.5 新增）
- **CDN 面板缓存** — 从角色卡 regex 脚本提取 CDN URL，下载 HTML 并在本地缓存
- **安全隔离渲染** — 使用 sandboxed iframe 渲染 HTML，保证安全性和还原度
- **通用标签面板** — 检测消息内容中的 XML-like 标签（如 `<status>`），提取为结构化面板
- **面板适配器** — 自动适配 SillyTavern 格式的角色卡面板脚本

### 角色卡导入（v1.5 新增）
- **一键导入** — 支持拖放或选择 PNG/JSON 角色卡文件
- **自动解析** — 解析角色定义、世界书条目、正则脚本
- **变量初始化** — 自动从世界书 InitVar 条目初始化通用变量
- **面板预加载** — 导入后自动下载并缓存 CDN 面板

### 运行时检查器（4 Tab）
- **日志** — 实时中文流水
- **时间线** — 节点耗时柱状图 + 事件瀑布
- **节点图** — 🟢🔴⚪ 彩色节点按层级排列，点击看详情
- **Token** — 来源分解（情绪 / 记忆 / 叙事占比）+ 耗时瓶颈

### 开发体验（v1.5 新增）
- **自动路由显示** — `pnpm dev` 启动后自动列出所有可访问路由
- **实际端口检测** — 端口被占用时自动识别实际使用的端口

### 工程化
- Zod 运行时校验
- 统一 Logger + 错误中间件
- SSE 流式输出 + AbortController
- 三种诊断端点（`/api/debug/env` `/ping` `/chat`）

## 技术栈

| 层 | 技术 |
|----|------|
| 框架 | Next.js 15 · React 19 |
| 语言 | TypeScript (strict) |
| 状态管理 | Zustand (persist) |
| 样式 | Tailwind CSS 4 |
| 校验 | zod |
| AI | DeepSeek API (Anthropic + OpenAI 双端点) |
| 包管理 | pnpm |

## 架构

```
src/
├── spec/                 # 统一协议层（11 个类型定义文件）
├── core/                 # 核心引擎（Prompt构建 / DeepSeek适配 / 面板获取 / 变量更新）
│   ├── panelFetcher.ts   #   面板缓存下载（v1.5 新增）
│   └── variableUpdateEngine.ts  # 变量解析与更新（v1.5 新增）
├── character/            # 角色运行时（情绪 / 行为 / 自主性）
├── workflowRuntime/      # 工作流引擎（图执行 / 决策 / 类型系统）
│   ├── nodes/            # 节点实现（8 种）
│   └── GraphExecutor.ts  # 图执行器
├── runtime/session/      # 会话持久化 + 记忆引擎
├── agent/                # Agent 系统（目标 / 规划 / 评估）
├── runtimeProfile/       # Profile 系统（能力包 / 装配 / 预算）
├── runtimeInspector/     # 运行时检查器（快照 / 汇总）
├── customNodes/          # 自定义节点（规则引擎 / 沙箱 / SDK）
├── components/           # UI 组件
│   ├── CachedPanelRenderer.tsx    # CDN 面板渲染（v1.5 新增）
│   ├── UniversalPanelRenderer.tsx # 通用标签面板（v1.5 新增）
│   └── runtime/          # 检查器组件（Console / Timeline / Graph / Token）
├── store/                # Zustand 状态管理
│   └── universalVariableStore.ts  # 通用变量存储（v1.5 新增）
├── server/               # Express 独立服务
└── workflows/            # 工作流 JSON 定义
```

## 版本历史

| 版本 | 新增内容 |
|------|----------|
| v1.0 | 基础角色扮演聊天 · Workflow 组合 · 图执行引擎 · Agent 决策 · 持久化会话 · 运行时检查器 |
| v1.5 | **通用变量系统** — 任意结构化变量 / AI 响应变量更新 / InitVar 解析 |
|      | **角色卡面板系统** — CDN 面板缓存 / 安全 iframe 渲染 / 通用标签面板 |
|      | **角色卡导入** — 一键导入 PNG/JSON / 自动解析 / 面板预加载 |
|      | **开发体验** — 自动路由显示 / 端口检测 |

## 项目报告

详见 [`项目报告.md`](./项目报告.md) 和 [`使用指南.md`](./使用指南.md)。
