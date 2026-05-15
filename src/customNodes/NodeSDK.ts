// ============================================================
// NodeSDK — 节点创建 SDK
//
// createNode({ id, name, inputs, outputs, execute })
// 自动注册到 CapabilityRegistry。
// ============================================================

import type { NodeRegistration, NodeIOSchema, NodeCategory } from "@/spec/NodeSpec";

/** 节点创建参数 */
export interface CreateNodeParams {
  type: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  category?: NodeCategory;
  version?: string;
  inputs?: NodeIOSchema;
  outputs?: NodeIOSchema;
  /** 节点执行函数 */
  execute: (ctx: Record<string, unknown>) => Promise<{ output?: string; data?: Record<string, unknown> }>;
}

/** SDK 节点包 */
export interface NodePackage {
  id: string;
  version: string;
  author: string;
  description: string;
  tags: string[];
  nodeType: string;
  /** 依赖的能力包 */
  dependencies?: string[];
  /** 需要的权限 */
  permissions?: string[];
}

/**
 * 创建节点注册项。
 *
 * 使用方式：
 *   const myNode = createNode({
 *     type: "panic-detector",
 *     name: "Panic Detector",
 *     execute: async (ctx) => {
 *       const stress = ctx.variables?.stress ?? 0;
 *       const mode = stress > 70 ? "panic" : "calm";
 *       return { output: mode, data: { mode, stress } };
 *     },
 *   });
 *   registry.register(myNode);
 */
export function createNode(params: CreateNodeParams): NodeRegistration {
  return {
    type: params.type,
    name: params.name,
    description: params.description ?? "",
    icon: params.icon ?? "⚙",
    category: params.category ?? "plugin",
    schema: params.inputs,
    execute: params.execute as unknown as NodeRegistration['execute'],
  };
}

/**
 * 创建节点包元数据。
 */
export function createNodePackage(params: NodePackage): NodePackage {
  return params;
}
