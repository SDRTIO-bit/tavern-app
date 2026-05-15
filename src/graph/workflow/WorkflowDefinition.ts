// ============================================================
// WorkflowDefinition — 工作流定义顶层协议
//
// 完整的可视化工作流描述，包括：
//   - 版本与元数据
//   - 视口状态
//   - 节点布局
//   - 连线关系
//
// 这是 UI 与 Runtime 之间的统一数据协议。
// 兼容 ReactFlow 的保存/恢复格式。
// ============================================================

import type { WorkflowViewport } from './WorkflowViewport';
import type { WorkflowNode } from './WorkflowNode';
import type { WorkflowEdge } from './WorkflowEdge';

/** 工作流元数据 */
export interface WorkflowMetadata {
  /** 工作流名称 */
  name?: string;
  /** 工作流描述 */
  description?: string;
  /** 作者 */
  author?: string;
  /** 创建时间（ISO 8601） */
  createdAt?: string;
  /** 最后更新时间（ISO 8601） */
  updatedAt?: string;
  /** 自定义标签 */
  tags?: string[];
}

/** 工作流定义（顶层数据结构） */
export interface WorkflowDefinition {
  /** 协议版本号，用于向前兼容 */
  version: string;

  /** 工作流元数据 */
  metadata?: WorkflowMetadata;

  /** 画布视口状态 */
  viewport?: WorkflowViewport;

  /** 节点列表 */
  nodes: WorkflowNode[];

  /** 连线列表 */
  edges: WorkflowEdge[];
}

/** 当前协议版本 */
export const WORKFLOW_PROTOCOL_VERSION = '1.0.0';
