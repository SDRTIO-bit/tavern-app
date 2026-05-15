// ============================================================
// spec — AI Runtime Platform 统一协议层
//
// 所有模块的类型定义依赖此层。
// ============================================================

// Memory
export type { MemoryType, MemoryEntry, MemoryRetrievalResult, MemoryDecayConfig } from "./MemorySpec";

// Session
export type { ChatMessage, NarrativeState, RuntimeSession } from "./SessionSpec";

// Runtime Event
export type { RuntimeEventType, RuntimeEvent, RuntimeEventListener } from "./RuntimeEventSpec";

// Workflow
export type {
  WorkflowDefinition,
  WorkflowNodeDefinition,
  WorkflowPort,
  WorkflowEdgeDefinition,
  WorkflowExecutionResult,
  // Graph
  GraphNode,
  GraphEdge,
  GraphWorkflowDefinition,
  NodeExecutionStatus,
  GraphExecutionTrace,
} from "./WorkflowSpec";

// Workflow Context
export type {
  WorkflowGenerationConfig,
  RuntimeState,
  WorkflowExecutionContext,
} from "./WorkflowContextSpec";

// Node
export type {
  NodeCategory,
  NodeIOSchema,
  NodeTiming,
  RuntimeNode,
  NodeRegistration,
  NodeExecutionResult,
} from "./NodeSpec";

// Character
export type { CharacterRuntimeDefinition } from "./CharacterSpec";

// Skill
export type { SkillType, SkillTrigger, RuntimeSkill, SkillLoadResult } from "./SkillSpec";

// Node Schemas (Zod)
export {
  EmotionInputSchema, EmotionOutputSchema,
  MemoryInputSchema, MemoryOutputSchema,
  NarrativeInputSchema, NarrativeOutputSchema,
  PromptInputSchema, PromptOutputSchema,
  ModelInputSchema, ModelOutputSchema,
  WorldBookInputSchema, WorldBookOutputSchema,
  GoalOutputSchema,
} from "./NodeSchemas";

// Node Metadata
export type { NodeMetadata } from "./NodeMetadata";
export {
  BUILTIN_NODE_METADATA,
  getNodeMetadata,
  getAllNodeMetadata,
  getNodesByCategory,
  CATEGORY_COLORS,
} from "./NodeMetadata";

// Capability Registry
export {
  CapabilityRegistry,
} from "./CapabilityRegistry";
export type { MemoryProvider, NarrativeHook } from "./CapabilityRegistry";
