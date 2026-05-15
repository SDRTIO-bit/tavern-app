// ============================================================
// adapters — 外部接口适配层
// ============================================================

export type {
  TavernRequest,
  TavernMessage,
  TavernCharacterCard,
  TavernWorldInfo,
  TavernWorldBookEntry,
  TavernGenerationSettings,
  ParsedTavernRequest,
  TavernChatResponse,
  TavernResponseMetadata,
  RuntimeOutput,
  WorldBookInjectable,
  TavernSession,
  TavernSessionManager,
  TavernPipeline,
  TavernPipelineResult,
} from './tavern';
export {
  TavernRequestParser,
  TavernResponseFormatter,
  CharacterCardAdapter,
  WorldBookAdapter,
  TavernServer,
  MemorySessionManager,
} from './tavern';
