// ============================================================
// tavern — SillyTavern 适配器
//
// TavernRequestParser    — 请求解析
// TavernResponseFormatter — 响应格式化
// CharacterCardAdapter   — 角色卡 ↔ CharacterBrain
// WorldBookAdapter       — 世界书注入
// TavernServer           — 主入口（编排 + 内存会话管理）
// ============================================================

export type {
  TavernRequest,
  TavernMessage,
  TavernCharacterCard,
  TavernWorldInfo,
  TavernWorldBookEntry,
  TavernGenerationSettings,
  ParsedTavernRequest,
} from './TavernRequestParser';
export { TavernRequestParser } from './TavernRequestParser';

export type {
  TavernChatResponse,
  TavernResponseMetadata,
  RuntimeOutput,
} from './TavernResponseFormatter';
export { TavernResponseFormatter } from './TavernResponseFormatter';

export type { WorldBookInjectable } from './WorldBookAdapter';
export { WorldBookAdapter } from './WorldBookAdapter';

export { CharacterCardAdapter } from './CharacterCardAdapter';

export type {
  TavernSession,
  TavernSessionManager,
  TavernPipeline,
  TavernPipelineResult,
} from './TavernServer';
export {
  TavernServer,
  MemorySessionManager,
} from './TavernServer';
