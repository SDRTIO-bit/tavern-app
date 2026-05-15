# Tavern — AI Runtime Platform

AI 角色扮演聊天应用，已演进为支持 **可组合 Workflow、图执行引擎、Agent 决策、目标驱动行为和持久化会话** 的 AI 运行时平台。

## 快速开始

```bash
# 1. 配置 API Key（创建 .env.local）
echo DEEPSEEK_API_KEY=sk-你的key > .env.local

# 2. 安装依赖
pnpm install

# 3. 启动
pnpm dev
```

浏览器打开 **http://localhost:3000**。
或者http://localhost:3000/workflow-demo

> Windows 用户可直接双击 `start.bat`。

## 页面

| 路径 | 功能 |
|------|------|
| `/` | AI 角色扮演聊天 |
| `/workflow-demo` | Workflow Runtime 平台（会话管理 / 能力配置 / 运行时检查器） |

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

### 运行时检查器（4 Tab）
- **日志** — 实时中文流水
- **时间线** — 节点耗时柱状图 + 事件瀑布
- **节点图** — 🟢🔴⚪ 彩色节点按层级排列，点击看详情
- **Token** — 来源分解（情绪 / 记忆 / 叙事占比）+ 耗时瓶颈

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
├── core/                 # 核心引擎（Prompt构建 / DeepSeek适配）
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
│   └── runtime/          # 检查器组件（Console / Timeline / Graph / Token）
├── store/                # Zustand 状态管理
├── server/               # Express 独立服务
└── workflows/            # 工作流 JSON 定义
```

## 项目报告

详见 [`项目报告.md`](./项目报告.md) 和 [`使用指南.md`](./使用指南.md)。
# tavern-app
