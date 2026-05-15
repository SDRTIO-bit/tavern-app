// ============================================================
// WorkflowNode — 可视化节点数据协议
//
// 纯 UI 元数据层，与执行引擎的 ExecutionNode 解耦。
// 包含位置、尺寸、UI 外观等可视化信息。
// 兼容 ReactFlow Node 格式。
// ============================================================

/** UI 外观选项 */
export interface WorkflowNodeUI {
  /** 节点是否折叠（仅显示标题） */
  collapsed?: boolean;
  /** 节点背景色（CSS color，如 "#4A90D9"） */
  color?: string;
  /** 自定义 CSS 类名 */
  className?: string;
}

/** 节点端口定义 */
export interface WorkflowPort {
  /** 端口唯一标识（在节点内唯一） */
  id: string;
  /** 端口方向 */
  direction: 'input' | 'output';
  /** 端口标签 */
  label?: string;
  /** 端口数据类型 */
  dataType?: string;
  /** 端口位置索引（用于排序） */
  index?: number;
}

/** 可视化节点 */
export interface WorkflowNode {
  /** 节点唯一标识，与 ExecutionGraph 中的 nodeId 对应 */
  id: string;

  /** 节点类型名称（对应 NodeSchema.type） */
  type: string;

  /** 画布坐标 */
  position: {
    x: number;
    y: number;
  };

  /** 节点尺寸（px），默认由 NodeSchema.defaultSize 提供 */
  size?: {
    width: number;
    height: number;
  };

  /** 节点内部配置（与 schema 中的 config 对应） */
  config?: Record<string, unknown>;

  /** UI 外观选项 */
  ui?: WorkflowNodeUI;

  /** 端口列表（用于连线可视化） */
  ports?: WorkflowPort[];

  /** 用户自定义标签 */
  label?: string;

  /** 用户备注 */
  notes?: string;
}
