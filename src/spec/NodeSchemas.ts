// ============================================================
// NodeSchemas — Zod 运行时校验
//
// 每个节点的输入/输出 Schema，在 execute 前校验。
// 消灭 "ctx.xxx" / any / 隐式字段。
// ============================================================

import { z } from "zod";

// ---- Emotion 节点 ----
export const EmotionInputSchema = z.object({
  message: z.string(),
});

export const EmotionOutputSchema = z.object({
  nodeType: z.literal("emotion"),
  emotionDeltas: z.record(z.string(), z.number()).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

// ---- Memory 节点 ----
export const MemoryInputSchema = z.object({
  query: z.string(),
  memories: z.array(z.object({
    id: z.string(),
    content: z.string(),
    importance: z.number().optional(),
    timestamp: z.number(),
  })).optional(),
});

export const MemoryOutputSchema = z.object({
  nodeType: z.literal("memory"),
  memories: z.array(z.object({
    content: z.string(),
    importance: z.number(),
  })).optional(),
  data: z.object({
    totalMemories: z.number(),
    retrievedCount: z.number(),
    topMatches: z.array(z.string()).optional(),
  }).optional(),
});

// ---- Narrative 节点 ----
export const NarrativeInputSchema = z.object({
  sessionId: z.string(),
});

export const NarrativeOutputSchema = z.object({
  nodeType: z.literal("narrative"),
  output: z.string().optional(),
  data: z.object({
    phase: z.string(),
  }).optional(),
});

// ---- Prompt 节点 ----
export const PromptInputSchema = z.object({
  systemPrompt: z.string(),
  userInput: z.string(),
  messages: z.array(z.object({
    role: z.string(),
    content: z.string(),
  })),
});

export const PromptOutputSchema = z.object({
  nodeType: z.literal("prompt"),
  output: z.string(), // JSON stringified { system, messages }
  data: z.object({
    systemLength: z.number(),
    messageCount: z.number(),
    totalTokens: z.number(),
  }).optional(),
});

// ---- Model 节点 ----
export const ModelInputSchema = z.object({
  system: z.string(),
  messages: z.array(z.object({
    role: z.string(),
    content: z.string(),
  })),
  temperature: z.number().optional(),
  stopSequences: z.array(z.string()).optional(),
});

export const ModelOutputSchema = z.object({
  nodeType: z.literal("model"),
  output: z.string(),
});

// ---- WorldBook 节点 ----
export const WorldBookInputSchema = z.object({
  query: z.string(),
  history: z.array(z.string()).optional(),
});

export const WorldBookOutputSchema = z.object({
  nodeType: z.literal("worldbook"),
  output: z.string().optional(),
  data: z.object({
    matchedCount: z.number(),
  }).optional(),
});

// ---- Goal 节点 ----
export const GoalOutputSchema = z.object({
  nodeType: z.literal("goal"),
  data: z.object({
    goals: z.array(z.object({
      content: z.string(),
      priority: z.number(),
    })),
  }).optional(),
});
