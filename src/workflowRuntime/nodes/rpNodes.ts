// ============================================================
// rpNodes — RP 工作流节点实现 (A7 适配)
//
// 使用 WorkflowExecutionContext 代替旧 WorkflowContext。
// ============================================================

import type {
  WorkflowNodeRegistration,
  WorkflowNodeExecutor,
  WorkflowExecutionContext,
  WorkflowStepResult,
} from '../types/WorkflowRuntimeTypes';
import { EmotionRules } from '@/character/runtime/EmotionRules';
import { getActiveGoals } from '@/character/CharacterGoal';
import { buildPrompt } from '@/core/promptBuilder';
import { matchWorldBook } from '@/core/worldbook';
import { SessionMemory } from '@/runtime/session/SessionMemory';

// ---- Emotion 节点 ----
const emotionExecutor: WorkflowNodeExecutor = (ctx: WorkflowExecutionContext) => {
  if (!ctx.userInput.trim()) {
    return { nodeType: 'emotion', emotionDeltas: {} };
  }
  const delta = EmotionRules.evaluateUserMessage(ctx.userInput);
  const deltas: Record<string, number> = {};
  for (const [k, v] of Object.entries(delta)) {
    if (v !== undefined && v !== 0) deltas[k] = Math.round(v);
  }
  return { nodeType: 'emotion', emotionDeltas: deltas };
};

// ---- Memory 节点 ----
const memoryExecutor: WorkflowNodeExecutor = (ctx: WorkflowExecutionContext) => {
  // 使用真实 SessionMemory 检索
  const sessionMemories = (ctx.variables?.sessionMemories as any[]) ?? [];
  const query = ctx.userInput;
  const retrieved = SessionMemory.retrieve(sessionMemories, query, 5);

  return {
    nodeType: 'memory',
    memories: retrieved.map((m: any) => ({
      content: m.content,
      importance: m.importance,
    })),
    data: {
      totalMemories: sessionMemories.length,
      retrievedCount: retrieved.length,
      topMatches: retrieved.slice(0, 3).map((m: any) => m.content.slice(0, 60)),
    },
  };
};

// ---- Goal 节点 ----
const goalExecutor: WorkflowNodeExecutor = (ctx: WorkflowExecutionContext) => {
  const goals = getActiveGoals((ctx.goals as any[]) ?? []);
  return {
    nodeType: 'goal',
    data: { goals: goals.map((g: any) => ({ content: g.content, priority: g.priority })) },
  };
};

// ---- Narrative 节点 ----
const narrativeExecutor: WorkflowNodeExecutor = (_ctx: WorkflowExecutionContext) => {
  return {
    nodeType: 'narrative',
    output: '[叙事] 剧情状态: 无活跃剧情线',
    data: { phase: 'idle' },
  };
};

// ---- WorldBook 节点 ----
const worldbookExecutor: WorkflowNodeExecutor = (ctx: WorkflowExecutionContext) => {
  const entries = (ctx.variables?.worldBookEntries as any[]) ?? [];
  if (entries.length === 0) return { nodeType: 'worldbook' };
  const texts = [...ctx.messages.map((m) => m.content), ctx.userInput].filter(Boolean);
  const { entries: matched, systemText } = matchWorldBook(entries, texts);
  return { nodeType: 'worldbook', output: systemText, data: { matchedCount: matched.length } };
};

// ---- Prompt 节点 ----
const promptExecutor: WorkflowNodeExecutor = (ctx: WorkflowExecutionContext) => {
  const emotionDeltas = ctx.stepResults.get('emotion')?.emotionDeltas;
  const memories = ctx.stepResults.get('memory')?.memories;
  const narrative = ctx.stepResults.get('narrative')?.output;
  const worldbook = ctx.stepResults.get('worldbook')?.output;

  let enhancedSystem = ctx.systemPrompt;

  if (emotionDeltas && Object.keys(emotionDeltas).length > 0) {
    const labels: Record<string, string> = {
      happiness: '幸福', stress: '压力', trust: '信任',
      affection: '好感', anger: '愤怒', loneliness: '孤独', curiosity: '好奇',
    };
    const lines = Object.entries(emotionDeltas)
      .filter(([, v]) => v !== 0)
      .map(([k, v]) => `  ${labels[k] || k}: ${v > 0 ? '+' : ''}${v}`);
    enhancedSystem += `\n\n[情绪状态]\n${lines.join('\n')}`;
  }
  if (memories && memories.length > 0) {
    enhancedSystem += `\n\n[相关记忆]\n${memories.slice(0, 4).map((m) => `  - ${m.content.slice(0, 80)}`).join('\n')}`;
  }
  if (narrative) enhancedSystem += `\n\n[剧情状态]\n${narrative}`;
  if (worldbook) enhancedSystem += `\n\n${worldbook}`;

  const { system, messages } = buildPrompt({
    preset: {
      id: 'workflow-prompt',
      name: 'Workflow Prompt',
      systemPrompt: enhancedSystem,
      userPrefix: '用户',
      assistantPrefix: '助手',
      contextTemplate: '',
      temperature: ctx.generation.temperature,
      stopSequences: ctx.generation.stopSequences,
      jailbreak: undefined,
    },
    characterSystemPrompt: enhancedSystem,
    worldBookEntries: [],
    messages: ctx.messages,
    userInput: ctx.userInput,
  });

  return {
    nodeType: 'prompt',
    output: JSON.stringify({ system, messages }),
    data: {
      systemLength: system.length,
      messageCount: messages.length + 1,
      totalTokens: Math.ceil((system.length +
        messages.reduce((s, m) => s + m.content.length, 0) +
        ctx.userInput.length) / 4),
    },
  };
};

// ---- Model 节点 ----
const modelExecutor: WorkflowNodeExecutor = async (ctx: WorkflowExecutionContext) => {
  const promptResult = ctx.stepResults.get('prompt');
  let system = ctx.systemPrompt;
  let finalMessages: Array<{ role: string; content: string }> = [
    ...ctx.messages,
    { role: 'user' as const, content: ctx.userInput },
  ];

  if (promptResult?.output) {
    try {
      const parsed = JSON.parse(promptResult.output);
      system = parsed.system || system;
      finalMessages = parsed.messages || finalMessages;
    } catch { /* default */ }
  }

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system,
      messages: finalMessages,
      temperature: ctx.generation.temperature,
      stopSequences: ctx.generation.stopSequences,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `API 请求失败: ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('响应无 body');

  const decoder = new TextDecoder();
  let fullContent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ') && line !== 'data: [DONE]') {
        fullContent += line.slice(6);
      }
    }
  }

  return { nodeType: 'model', output: fullContent };
};

// ---- 导出所有节点注册 ----
export const rpNodeRegistrations: WorkflowNodeRegistration[] = [
  { type: 'emotion',    name: '情绪分析',     description: '分析用户消息对角色情绪的影响',     icon: '💭', category: 'emotion',    execute: emotionExecutor },
  { type: 'memory',     name: '记忆检索',     description: '检索角色相关的长期记忆',          icon: '🧠', category: 'memory',     execute: memoryExecutor },
  { type: 'goal',       name: '目标管理',     description: '获取角色当前活跃目标',            icon: '🎯', category: 'memory',     execute: goalExecutor },
  { type: 'narrative',  name: '剧情推进',     description: '推进当前活跃的剧情线',            icon: '📖', category: 'narrative',  execute: narrativeExecutor },
  { type: 'worldbook',  name: '世界书',       description: '根据关键词匹配世界书条目',        icon: '📚', category: 'world',      execute: worldbookExecutor },
  { type: 'prompt',     name: 'Prompt 构建',  description: '组装并注入上下文到 Prompt',        icon: '📝', category: 'core',       execute: promptExecutor },
  { type: 'model',      name: '模型调用',     description: '调用 DeepSeek 生成回复',           icon: '🤖', category: 'generation', execute: modelExecutor },
];
