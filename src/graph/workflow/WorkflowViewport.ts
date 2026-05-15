// ============================================================
// WorkflowViewport — 可视化视口状态
//
// 纯数据协议，与执行引擎无关。
// 用于保存/恢复 UI 画布平移和缩放状态。
// 兼容 ReactFlow viewport 格式。
// ============================================================

export interface WorkflowViewport {
  /** 水平偏移（px） */
  x: number;
  /** 垂直偏移（px） */
  y: number;
  /** 缩放比率（1.0 = 100%） */
  zoom: number;
}

/** 默认视口：原点居中，100% 缩放 */
export const DEFAULT_VIEWPORT: WorkflowViewport = {
  x: 0,
  y: 0,
  zoom: 1,
};
