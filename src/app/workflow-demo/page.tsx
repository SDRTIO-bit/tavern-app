"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { WorkflowRegistry } from "@/workflowRuntime/WorkflowRegistry";
import { WorkflowLoader } from "@/workflowRuntime/WorkflowLoader";
import { WorkflowExecutor } from "@/workflowRuntime/WorkflowExecutor";
import type { ExecutionResult } from "@/workflowRuntime/WorkflowExecutor";
import { GraphExecutor } from "@/workflowRuntime/GraphExecutor";
import type { GraphExecutionResult } from "@/workflowRuntime/GraphExecutor";
import { RuntimeEventBus } from "@/workflowRuntime/RuntimeEventBus";
import type {
  WorkflowExecutionContext,
  TimelineEvent,
  NodeTiming,
} from "@/workflowRuntime/types/WorkflowRuntimeTypes";
import { rpNodeRegistrations } from "@/workflowRuntime/nodes/rpNodes";
import { AGENT_DECISION_NODE } from "@/workflowRuntime/nodes/AgentDecisionNode";
import { BUILTIN_PROFILES, getProfileById } from "@/workflowRuntime/profiles/workflowProfiles";
import { SessionMemory } from "@/runtime/session/SessionMemory";
import { useSessionStore } from "@/store/sessionStore";
import { GoalSystem } from "@/agent/GoalSystem";
import type { Goal } from "@/agent/GoalTypes";
import { CapabilityComposer } from "@/runtimeProfile/CapabilityComposer";
import { BUILTIN_PROFILES as RUNTIME_PROFILES } from "@/runtimeProfile/ProfileLoader";
import type { RuntimeProfile } from "@/runtimeProfile/RuntimeProfile";
import { getAllCapabilityPacks } from "@/runtimeProfile/CapabilityPack";
import RuntimeLibrary from "@/components/RuntimeLibrary";
import { MemoryInputSchema, EmotionInputSchema, PromptInputSchema } from "@/spec/NodeSchemas";
import WorkflowConsole from "@/components/runtime/WorkflowConsole";
import RuntimeTimeline from "@/components/runtime/RuntimeTimeline";
import GraphInspector from "@/components/runtime/GraphInspector";
import TokenInspector from "@/components/runtime/TokenInspector";
import type { RuntimeSnapshot } from "@/runtimeInspector/RuntimeTrace";

import lightweightWf from "@/workflows/lightweight-rp.json";
import immersiveWf from "@/workflows/immersive-rp.json";
import graphRpWf from "@/workflows/graph-rp.json";
import agentWf from "@/workflows/agent-decision.json";
import { characters } from "@/core/characterLoader";

const registry = new WorkflowRegistry();
registry.registerAll(rpNodeRegistrations);
registry.register(AGENT_DECISION_NODE);
const loader = new WorkflowLoader(registry);
loader.registerAll([lightweightWf, immersiveWf]);
// graph-rp 是 GraphWorkflowDefinition（nodes+edges），不使用 WorkflowLoader

function createEventBus() {
  return new RuntimeEventBus();
}

export default function WorkflowDemoPage() {
  // ---- Session Store ----
  const sessions = useSessionStore((s) => s.sessions);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const activeSession = useSessionStore((s) => s.getActive());
  const hasHydrated = useSessionStore((s) => s.hasHydrated);
  const newSession = useSessionStore((s) => s.newSession);
  const setActive = useSessionStore((s) => s.setActive);
  const removeSession = useSessionStore((s) => s.removeSession);
  const renameSession = useSessionStore((s) => s.renameSession);
  const addUserMessage = useSessionStore((s) => s.addUserMessage);
  const addAssistantMessage = useSessionStore((s) => s.addAssistantMessage);
  const setWorkflow = useSessionStore((s) => s.setWorkflow);
  const getGoals = useSessionStore((s) => s.getGoals);

  const profiles = BUILTIN_PROFILES;
  const [activeProfileId, setActiveProfileId] = useState(profiles[0]?.id ?? "");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [lastTimeline, setLastTimeline] = useState<TimelineEvent[]>([]);
  const [lastTimings, setLastTimings] = useState<NodeTiming[]>([]);
  const [lastDuration, setLastDuration] = useState(0);
  const [eventBus, setEventBus] = useState(createEventBus);
  const [conversationKey, setConversationKey] = useState(0);
  const [showMemories, setShowMemories] = useState(false);
  const [runtimeProfile, setRuntimeProfile] = useState<RuntimeProfile>(RUNTIME_PROFILES[1]);
  const [showProfileConfig, setShowProfileConfig] = useState(false);
  const [lastSnapshots, setLastSnapshots] = useState<RuntimeSnapshot[]>([]);
  const [inspectorTab, setInspectorTab] = useState<"console" | "timeline" | "graph" | "token">("console");
  const composer = new CapabilityComposer();
  const bottomRef = useRef<HTMLDivElement>(null);

  // 从 session 读取 workflow
  const activeProfile = getProfileById(activeProfileId);
  const sessionWorkflowId = activeSession?.workflowId || activeProfile?.workflowId || "lightweight-rp";
  const activeWfId = sessionWorkflowId;
  const activeWf = loader.get(activeWfId);

  // 初始化：没有 session 则自动创建
  useEffect(() => {
    if (sessions.length === 0) {
      const char = characters[0];
      newSession({
        name: `与 ${char.name} 的对话`,
        characterId: char.id,
        characterName: char.name,
        workflowId: "lightweight-rp",
      });
    } else if (!activeSessionId) {
      setActive(sessions[0].id);
    }
  }, []);

  // 首次 greeting
  useEffect(() => {
    if (activeSession && activeSession.messages.length === 0) {
      const char = characters[0];
      const greeting = char.greeting || "你好！";
      addAssistantMessage(greeting);
    }
  }, [activeSession?.id]);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleNewSession = () => {
    const char = characters[0];
    const s = newSession({
      name: `与 ${char.name} 的对话 ${sessions.length + 1}`,
      characterId: char.id,
      characterName: char.name,
      workflowId: activeWfId,
    });
    const greeting = char.greeting || "你好！";
    // 需要等 session 创建后再加 greeting
    setTimeout(() => addAssistantMessage(greeting), 0);

    // 关联 workflow profile
    const matchingProfile = profiles.find((p) => p.workflowId === activeWfId);
    if (matchingProfile) setActiveProfileId(matchingProfile.id);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading || !activeSession) return;
    setInput("");
    setIsLoading(true);

    // 写入用户消息到 session
    addUserMessage(text);

    const newBus = createEventBus();
    setEventBus(newBus);
    setConversationKey((k) => k + 1);

    scrollToBottom();

    const char = characters[0];

    // 判断线性 vs 图工作流
  const isGraph = activeWfId === 'graph-rp' || activeWfId === 'agent-decision';

    // 从 session 取最新数据
    const latestSession = useSessionStore.getState().getActive();
    const allMessages = latestSession?.messages ?? [];
    const historyMessages = allMessages.slice(0, -1);

    // 构建 context
    const ctx: WorkflowExecutionContext = {
      sessionId: activeSession.id,
      workflowId: activeWfId,
      characterName: char?.name || "Unknown",
      systemPrompt: char?.systemPrompt || "",
      messages: historyMessages.map((m) => ({ role: m.role, content: m.content })),
      userInput: text,
      emotion: latestSession?.emotion ?? {
        happiness: 50, stress: 50, trust: 50, affection: 50, anger: 50, loneliness: 50, curiosity: 50,
      },
      memories: (latestSession?.memories ?? []) as any[],
      goals: [],
      generation: {
        temperature: activeProfile?.settings?.temperature ?? 0.8,
        maxTokens: activeProfile?.settings?.maxTokens ?? 2048,
        stopSequences: [],
      },
      variables: {
        sessionMemories: latestSession?.memories ?? [],
        sessionGoals: getGoals(activeSession.id),
        sessionId: activeSession.id,
      },
      stepResults: new Map(),
      runtime: { startedAt: Date.now(), nodeCount: activeWf?.nodes.length ?? 0 },
    };

    try {
      let output = "";

      if (isGraph) {
        // 动态装配 Runtime（基于当前 Profile + Capabilities）
        const composed = composer.compose(runtimeProfile);
        const graphExecutor = new GraphExecutor(registry, newBus);
        const graphResult: GraphExecutionResult = await graphExecutor.execute(
          composed.nodes, composed.edges, ctx,
        );
        output = graphResult.output;
        setLastTimeline(graphResult.timeline);
        setLastTimings(graphResult.timings);
        setLastSnapshots(graphResult.snapshots || []);
        setLastDuration(graphResult.durationMs);

        // 如果 agent 节点返回了更新后的 goals
        const agentTrace = graphResult.traces.find((t) => t.nodeType === "agent");
        if (agentTrace?.output && graphResult.traces) {
          // goals 通过 stepResults 传递，此处从执行上下文获取
        }
      } else {
        // ---- 线性执行 -**
        const executor = new WorkflowExecutor(registry, loader, newBus);
        executor.registerSchema('emotion', EmotionInputSchema);
        executor.registerSchema('memory', MemoryInputSchema);
        executor.registerSchema('prompt', PromptInputSchema);
        const result: ExecutionResult = await executor.execute(activeWfId, ctx);
        output = result.output;
        setLastTimeline(result.timeline);
        setLastTimings(result.timings);
        setLastDuration(result.durationMs);
      }

      addAssistantMessage(output);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "执行失败";
      addAssistantMessage(`[错误] ${errMsg}`);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <main className="flex h-screen bg-zinc-950 text-white" suppressHydrationWarning>
      {/* ========== 左侧：Session + Profile ========== */}
      <aside className="flex w-60 flex-col border-r border-zinc-800 bg-zinc-950">
        {/* Session 列表 */}
        <div className="border-b border-zinc-800 px-3 py-2">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase text-zinc-600">会话</span>
            <button
              onClick={handleNewSession}
              className="rounded bg-blue-600 px-2 py-0.5 text-[10px] text-white hover:bg-blue-500"
            >
              + 新建
            </button>
          </div>
          <div className="max-h-32 space-y-0.5 overflow-y-auto">
            {hasHydrated && sessions.map((s) => (
              <div
                key={s.id}
                onClick={() => setActive(s.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') setActive(s.id); }}
                className={`w-full rounded px-2 py-1.5 text-left text-[11px] transition cursor-pointer ${
                  activeSessionId === s.id
                    ? "bg-blue-600/20 text-blue-300 ring-1 ring-blue-500/50"
                    : "text-zinc-400 hover:bg-zinc-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate">{s.name}</span>
                  {sessions.length > 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeSession(s.id); }}
                      className="ml-1 shrink-0 rounded px-1 text-[9px] text-zinc-600 hover:bg-zinc-700 hover:text-red-400"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="mt-0.5 flex gap-2 text-[9px] text-zinc-600">
                  <span>{s.messages.length} 条</span>
                  <span>{s.memories.length} 记</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 记忆查看器 */}
        <div className="border-b border-zinc-800 px-3 py-2">
          <button
            onClick={() => setShowMemories(!showMemories)}
            className="flex w-full items-center justify-between text-[10px] font-medium uppercase text-zinc-600 hover:text-zinc-400"
          >
            <span>🧠 长期记忆 ({hasHydrated ? (activeSession?.memories.length ?? 0) : 0})</span>
            <span>{showMemories ? "▲" : "▼"}</span>
          </button>
          {showMemories && hasHydrated && activeSession && (
            <div className="mt-1 max-h-40 overflow-y-auto space-y-0.5">
              {activeSession.memories.length === 0 && (
                <p className="py-2 text-center text-[10px] text-zinc-600">暂无记忆</p>
              )}
              {SessionMemory.retrieve(activeSession.memories, "", 20).map((m) => (
                <div key={m.id} className="rounded bg-zinc-900 px-2 py-1">
                  <p className="text-[10px] leading-relaxed text-zinc-400">
                    {m.content.slice(0, 80)}
                  </p>
                  <div className="mt-0.5 flex gap-2 text-[9px] text-zinc-600">
                    <span>重要性 {m.importance}</span>
                    {m.tags?.slice(0, 3).map((t) => (
                      <span key={t} className="rounded bg-zinc-800 px-1">{t}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Runtime Profile */}
        <div className="border-b border-zinc-800 px-3 py-2">
          <button
            onClick={() => setShowProfileConfig(!showProfileConfig)}
            className="flex w-full items-center justify-between text-[10px] font-medium uppercase text-zinc-600 hover:text-zinc-400"
          >
            <span>⚙ 能力配置</span>
            <span>{showProfileConfig ? "▲" : "▼"}</span>
          </button>
          {showProfileConfig && (
            <div className="mt-2 space-y-2">
              {/* Profile 快速选择 */}
              <div className="flex flex-wrap gap-1">
                {RUNTIME_PROFILES.slice(0, 4).map((rp) => (
                  <button
                    key={rp.id}
                    onClick={() => setRuntimeProfile(rp)}
                    className={`rounded px-1.5 py-0.5 text-[9px] ${
                      runtimeProfile.id === rp.id
                        ? "bg-blue-600/30 text-blue-300"
                        : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {rp.icon} {rp.name}
                  </button>
                ))}
              </div>

              {/* 能力开关 */}
              <p className="text-[9px] text-zinc-600">能力开关</p>
              {getAllCapabilityPacks().map((pack) => {
                const isOn = runtimeProfile.capabilities.includes(pack.id);
                return (
                  <label key={pack.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isOn}
                      onChange={() => {
                        const newCaps = isOn
                          ? runtimeProfile.capabilities.filter((c) => c !== pack.id)
                          : [...runtimeProfile.capabilities, pack.id];
                        const newFeatures = { ...runtimeProfile.features };
                        const featKey = pack.id.replace("-pack", "") as keyof typeof newFeatures;
                        if (featKey in newFeatures) (newFeatures as any)[featKey] = !isOn;
                        setRuntimeProfile({
                          ...runtimeProfile,
                          id: "custom",
                          name: "自定义",
                          capabilities: newCaps,
                          features: newFeatures,
                        });
                      }}
                      className="h-3 w-3 accent-blue-500"
                    />
                    <span className="text-[10px] text-zinc-400">
                      {pack.icon} {pack.name}
                    </span>
                  </label>
                );
              })}

              {/* 预算 */}
              {runtimeProfile.id !== "bare-minimum" && (
                <div className="rounded bg-zinc-900 p-1.5 text-[9px] text-zinc-600">
                  {composer.compose(runtimeProfile).budgetSummary.map((s, i) => (
                    <div key={i}>{s}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 📦 Runtime Library */}
        <div className="flex-1 overflow-y-auto p-3">
          <RuntimeLibrary
            onSelect={setRuntimeProfile}
            activeProfileId={runtimeProfile.id}
          />
        </div>

        <div className="border-t border-zinc-800 p-2">
          <p className="text-[9px] text-zinc-600">
            会话: {hasHydrated ? (activeSession?.name ?? "—") : "加载中..."} · {hasHydrated ? sessions.length : 0} 个
          </p>
        </div>
      </aside>

      {/* ========== 中间：聊天区 ========== */}
      <section className="flex flex-1 flex-col min-w-0">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">当前:</span>
            <span className="rounded bg-blue-600/20 px-2 py-0.5 text-xs text-blue-400">
              {activeProfile?.icon} {activeProfile?.name}
            </span>
            <span className="text-[10px] text-zinc-600">·</span>
            <span className="text-[10px] text-zinc-500">
              {hasHydrated ? (activeSession?.name ?? "—") : "加载中..."}
            </span>
            {lastDuration > 0 && (
              <>
                <span className="text-[10px] text-zinc-600">·</span>
                <span className="text-[10px] text-zinc-500">{lastDuration}ms</span>
              </>
            )}
          </div>
          <button
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            className="rounded px-2 py-0.5 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
          >
            {rightPanelOpen ? "◀" : "▶"}
          </button>
        </div>

        {/* 消息列表 */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {hasHydrated && activeSession?.messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[65%] rounded-2xl px-4 py-2.5 leading-relaxed ${
                  m.role === "user" ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-100"
                }`}
              >
                <span className="whitespace-pre-wrap text-sm">{m.content}</span>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-zinc-800 px-4 py-2.5">
                <span className="inline-block animate-pulse text-sm text-zinc-400">生成中...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* 输入框 */}
        <div className="border-t border-zinc-800 p-4">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息..."
              disabled={isLoading}
              className="flex-1 rounded-xl bg-zinc-800 px-4 py-3 text-zinc-100 outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="rounded-xl bg-blue-600 px-5 font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
            >
              发送
            </button>
          </div>
        </div>
      </section>

      {/* ========== 右侧面板 ========== */}
      {rightPanelOpen && (
        <aside className="flex w-80 flex-col border-l border-zinc-800 bg-zinc-950">
          {/* Tab 栏 */}
          <div className="flex border-b border-zinc-800">
            {(["console","timeline","graph","token"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setInspectorTab(tab)}
                className={`flex-1 py-1.5 text-[10px] ${
                  inspectorTab === tab
                    ? "border-b border-blue-500 text-blue-400"
                    : "text-zinc-600 hover:text-zinc-400"
                }`}
              >
                {tab === "console" ? "日志" : tab === "timeline" ? "时间线" : tab === "graph" ? "节点图" : "Token"}
              </button>
            ))}
          </div>

          {/* 内容区 */}
          <div className="flex-1 overflow-hidden">
            {inspectorTab === "console" && (
              <WorkflowConsole key={conversationKey} eventBus={eventBus} isRunning={isLoading} />
            )}
            {inspectorTab === "timeline" && (
              <RuntimeTimeline
                timeline={lastTimeline}
                timings={lastTimings}
                isRunning={isLoading}
                totalDurationMs={lastDuration}
              />
            )}
            {inspectorTab === "graph" && (
              <GraphInspector
                nodes={composer.compose(runtimeProfile).nodes}
                edges={composer.compose(runtimeProfile).edges}
                snapshots={lastSnapshots}
                workflowName={runtimeProfile.name}
              />
            )}
            {inspectorTab === "token" && (
              <TokenInspector
                snapshots={lastSnapshots}
                totalDurationMs={lastDuration}
              />
            )}
          </div>
        </aside>
      )}

      {!rightPanelOpen && (
        <div className="flex w-8 items-center justify-center border-l border-zinc-800 bg-zinc-950">
          <button
            onClick={() => setRightPanelOpen(true)}
            className="text-[10px] text-zinc-600 hover:text-zinc-400"
          >
            ▶
          </button>
        </div>
      )}
    </main>
  );
}
