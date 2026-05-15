// ============================================================
// WorkflowEdge — 可视化连线数据协议
//
// 纯 UI 元数据层，描述节点之间的数据流向连线。
// 兼容 ReactFlow Edge 格式。
// ============================================================

/** 连线样式 */
export interface WorkflowEdgeStyle {
  /** 描边颜色 */
  stroke?: string;
  /** 描边宽度 */
  strokeWidth?: number;
  /** 线型：'default' | 'straight' | 'step' | 'smoothstep' */
  type?: 'default' | 'straight' | 'step' | 'smoothstep';
  /** 是否显示动画 */
  animated?: boolean;
}

/** 可视化连线 */
export interface WorkflowEdge {
  /** 连线唯一标识 */
  id: string;

  /** 源节点 ID */
  source: string;
  /** 源端口 ID（可选，对应 WorkflowNode.ports[].id） */
  sourcePort?: string;

  /** 目标节点 ID */
  target: string;
  /** 目标端口 ID（可选，对应 WorkflowNode.ports[].id） */
  targetPort?: string;

  /** 连线标签 */
  label?: string;

  /**
   * 条件表达式（可选）。
   * 从 ExecutionEdge.condition 映射而来。
   */
  condition?: string;

  /** 重试策略（可选），从 ExecutionEdge.retry 映射 */
  retry?: { maxAttempts: number; delayMs: number };

  /** 连线样式 */
  style?: WorkflowEdgeStyle;
}
