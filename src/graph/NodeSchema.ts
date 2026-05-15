// ============================================================
// NodeSchema — 节点类型定义
//
// 定义每种节点的元数据：配置结构、端口、默认外观等。
// 用于 ExecutionGraph 创建节点实例和 WorkflowDefinition
// 的 UI 渲染。
// ============================================================

/** 端口方向 */
export type PortDirection = 'input' | 'output';

/** 端口数据类型 */
export type PortDataType = 'string' | 'number' | 'boolean' | 'object' | 'any';

/** 节点端口定义 */
export interface NodePortSchema {
  /** 端口 ID（在节点内唯一） */
  id: string;
  /** 端口标签 */
  label: string;
  /** 端口方向 */
  direction: PortDirection;
  /** 端口数据类型 */
  dataType?: PortDataType;
  /** 端口描述 */
  description?: string;
}

/** 节点配置字段 */
export interface ConfigField {
  /** 字段键名 */
  key: string;
  /** 字段标签 */
  label: string;
  /** 字段类型 */
  type: 'string' | 'number' | 'boolean' | 'select' | 'textarea' | 'code';
  /** 默认值 */
  defaultValue?: unknown;
  /** 字段描述 */
  description?: string;
  /** 是否必填 */
  required?: boolean;
  /** select 类型的选项 */
  options?: Array<{ label: string; value: string }>;
  /** 数字类型的 min/max */
  min?: number;
  max?: number;
}

/** 节点类型 schema */
export interface NodeSchema {
  /** 节点类型名称（唯一标识） */
  type: string;

  /** 节点分类 */
  category: string;

  /** 节点显示名称 */
  label: string;

  /** 节点描述 */
  description?: string;

  /** 分类颜色（CSS color，用于 UI 着色） */
  categoryColor: string;

  /** 节点默认尺寸（px），用于 UI 初始放置 */
  defaultSize: {
    width: number;
    height: number;
  };

  /** 端口定义 */
  ports: NodePortSchema[];

  /** 配置字段定义 */
  configFields?: ConfigField[];

  /** 节点图标（emoji 或 icon name） */
  icon?: string;
}
