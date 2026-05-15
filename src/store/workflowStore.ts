// ============================================================
// workflowStore — 工作流状态管理
// ============================================================

"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { WorkflowDefinition } from "@/workflowRuntime/types/WorkflowRuntimeTypes";

interface WorkflowState {
  /** 可用工作流列表 */
  available: WorkflowDefinition[];
  /** 当前选中工作流 ID */
  activeId: string;
  /** 是否显示控制台 */
  consoleOpen: boolean;

  /** 设置可用工作流 */
  setAvailable: (workflows: WorkflowDefinition[]) => void;
  /** 切换工作流 */
  setActive: (id: string) => void;
  /** 切换控制台 */
  toggleConsole: () => void;
  /** 获取当前工作流 */
  getActive: () => WorkflowDefinition | undefined;
}

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set, get) => ({
      available: [],
      activeId: '',
      consoleOpen: true,

      setAvailable: (workflows) => {
        set({
          available: workflows,
          activeId: get().activeId || workflows[0]?.id || '',
        });
      },

      setActive: (id) => set({ activeId: id }),

      toggleConsole: () => set({ consoleOpen: !get().consoleOpen }),

      getActive: () => {
        const { available, activeId } = get();
        return available.find((w) => w.id === activeId);
      },
    }),
    { name: "tavern-workflow" },
  ),
);
