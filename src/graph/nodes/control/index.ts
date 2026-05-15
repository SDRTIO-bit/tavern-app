// ============================================================
// control — 控制流节点
//
// 统一导出控制流节点的 schema 和 executor。
// ============================================================

export {
  IF_NODE_SCHEMA,
  ifNodeExecutor,
} from './IfNode';

export {
  SWITCH_NODE_SCHEMA,
  switchNodeExecutor,
  buildSwitchNodeSchema,
} from './SwitchNode';

export {
  MERGE_NODE_SCHEMA,
  mergeNodeExecutor,
} from './MergeNode';
