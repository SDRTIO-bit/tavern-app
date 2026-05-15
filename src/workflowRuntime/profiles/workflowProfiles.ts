// ============================================================
// WorkflowProfiles — 预设工作流模式
//
// 用户选择"模式"而非开关几十个选项。
// ============================================================

import type { WorkflowProfile } from '../types/WorkflowRuntimeTypes';

export const BUILTIN_PROFILES: WorkflowProfile[] = [
  {
    id: 'fast-chat',
    name: '快速聊天',
    description: '极低 Token 消耗，仅记忆+模型，适合日常对话',
    icon: '⚡',
    useCase: '日常对话 / 快速问答',
    workflowId: 'lightweight-rp',
    settings: { temperature: 0.7, maxTokens: 1024 },
  },
  {
    id: 'story-mode',
    name: '剧情模式',
    description: '完整叙事管线：情绪→记忆→剧情→Prompt→模型',
    icon: '📖',
    useCase: '深度角色扮演 / 故事推进',
    workflowId: 'immersive-rp',
    settings: { temperature: 0.85, maxTokens: 2048 },
  },
  {
    id: 'graph-mode',
    name: '图执行（分支）',
    description: 'Graph Runtime：情绪→分支→快速回复/完整剧情',
    icon: '🔀',
    useCase: '分支剧情 / 条件路由',
    workflowId: 'graph-rp',
    settings: { temperature: 0.8, maxTokens: 2048 },
  },
  {
    id: 'agent-decision',
    name: 'Agent 决策',
    description: 'Agent 观察→推理→决策：软评分选择最佳路径',
    icon: '🧠',
    useCase: '智能路由 / 自适应对话',
    workflowId: 'agent-decision',
    settings: { temperature: 0.8, maxTokens: 2048 },
  },
  {
    id: 'simulation',
    name: '世界模拟',
    description: '启用世界状态+NPC 社交网络+势力系统（预留）',
    icon: '🌍',
    useCase: '沙盒世界 / 多角色模拟',
    workflowId: 'immersive-rp',
    settings: { temperature: 0.8, maxTokens: 4096 },
  },
  {
    id: 'observer',
    name: '旁观模式',
    description: '角色自主演化，不等待用户输入（预留）',
    icon: '👁',
    useCase: '自动剧情生成 / NPC 自主行动',
    workflowId: 'immersive-rp',
    settings: { temperature: 0.9, maxTokens: 2048 },
  },
  {
    id: 'agent',
    name: 'Agent 模式',
    description: '启用工具调用+计划生成+Agent 循环（预留）',
    icon: '🤖',
    useCase: '复杂任务 / 工具调用',
    workflowId: 'lightweight-rp',
    settings: { temperature: 0.5, maxTokens: 4096 },
  },
];

/** 按 ID 查找 Profile */
export function getProfileById(id: string): WorkflowProfile | undefined {
  return BUILTIN_PROFILES.find((p) => p.id === id);
}

/** 获取 Profile 摘要列表 */
export function getProfileSummaries(): Array<Pick<WorkflowProfile, 'id' | 'name' | 'icon' | 'useCase'>> {
  return BUILTIN_PROFILES.map(({ id, name, icon, useCase }) => ({
    id, name, icon, useCase,
  }));
}
