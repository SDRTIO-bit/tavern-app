// ============================================================
// GraphExecutor — A8.5 语义增强版
//
// 拓扑排序 → 语义条件判断 → 输出契约 → 增强 Trace
// ============================================================

import { v4 as uuidv4 } from "uuid";
import type {
  GraphNode,
  GraphEdge,
  GraphExecutionTrace,
} from "@/spec/WorkflowSpec";
import type { WorkflowExecutionContext } from "./types/WorkflowRuntimeTypes";
import type { WorkflowStepResult, TimelineEvent, NodeTiming } from "./types/WorkflowRuntimeTypes";
import { WorkflowRegistry } from "./WorkflowRegistry";
import { RuntimeEventBus } from "./RuntimeEventBus";
import { GraphSemanticResolver } from "./GraphSemanticResolver";
import type { ResolveResult } from "./GraphSemanticResolver";
import { GraphTypeResolver, GraphTypeRegistry } from "./GraphTypeSystem";
import type { ResolvedPath } from "./GraphTypeSystem";
import { logger } from "@/core/logger";
import type { RuntimeSnapshot } from "@/runtimeInspector/RuntimeTrace";
import { createRuntimeTrace } from "@/runtimeInspector/RuntimeTrace";

export interface GraphExecutionResult {
  output: string;
  traces: GraphExecutionTrace[];
  timeline: TimelineEvent[];
  timings: NodeTiming[];
  snapshots: RuntimeSnapshot[];
  durationMs: number;
}

export class GraphExecutor {
  private registry: WorkflowRegistry;
  private eventBus: RuntimeEventBus;
  private semantic: GraphSemanticResolver = new GraphSemanticResolver();
  private typeRegistry = new GraphTypeRegistry();
  private typeResolver = new GraphTypeResolver(this.typeRegistry);

  constructor(registry: WorkflowRegistry, eventBus: RuntimeEventBus) {
    this.registry = registry;
    this.eventBus = eventBus;
  }

  async execute(
    nodes: GraphNode[],
    edges: GraphEdge[],
    ctx: WorkflowExecutionContext,
  ): Promise<GraphExecutionResult> {
    const globalStart = performance.now();
    const timeline: TimelineEvent[] = [];
    const traces: GraphExecutionTrace[] = [];
    const timings: NodeTiming[] = [];
    const snapshots: RuntimeSnapshot[] = [];

    this.semantic.clear();
    this.typeResolver.clear();
    this.semantic.setVariable("input", ctx.userInput);

    // 初始化追踪
    for (const node of nodes) {
      traces.push({ nodeId: node.id, nodeType: node.type, status: "pending" });
    }

    // 邻接表 + 入度
    const adjacency = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const nodeResults = new Map<string, WorkflowStepResult>();

    for (const n of nodes) {
      adjacency.set(n.id, []);
      inDegree.set(n.id, 0);
    }
    for (const edge of edges) {
      if (nodeMap.has(edge.source) && nodeMap.has(edge.target)) {
        adjacency.get(edge.source)!.push(edge.target);
        inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
      }
    }

    // ---- Graph Start ----
    this.emit(timeline, "graph_start",
      `图执行开始: ${nodes.length} 节点, ${edges.length} 连线`);

    // 入口
    const queue: string[] = [];
    for (const [id, deg] of inDegree) {
      if (deg === 0) queue.push(id);
    }

    const completed = new Set<string>();
    let lastOutput = "";

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      const node = nodeMap.get(nodeId);
      if (!node) continue;

      const trace = traces.find((t) => t.nodeId === nodeId)!;
      const reg = this.registry.getRegistration(node.type);
      const nodeName = reg?.name || node.type;

      // ---- 分支检查 ----
      const shouldRun = this.checkBranch(nodeId, node, edges, completed, nodeResults, timeline);

      if (!shouldRun) {
        trace.status = "skipped";
        this.release(nodeId, adjacency, inDegree, completed, queue, nodeMap);
        continue;
      }

      // ---- Node Enter ----
      trace.status = "running";
      trace.startedAt = Date.now();
      this.emit(timeline, "node_enter", `[GRAPH] ▶ ${nodeName}`);
      this.eventBus.nodeStart(node.type, nodeName);

      try {
        const rawResult = await (reg?.execute(ctx) ?? Promise.resolve({ nodeType: node.type, output: "" }));
        const result = rawResult as WorkflowStepResult;
        const durationMs = Math.round(performance.now() - (trace.startedAt ?? Date.now()));

        trace.status = "done";
        trace.endedAt = Date.now();
        trace.durationMs = durationMs;
        trace.output = result.output;
        nodeResults.set(nodeId, result);
        completed.add(nodeId);

        // 记录到语义层 + 类型层
        this.semantic.recordOutput(nodeId, node.type, result);
        this.typeResolver.recordOutput(nodeId, node.type, result);

        // 输出摘要
        const summary = this.summarizeOutput(node.type, result);
        this.emit(timeline, "node_exit",
          `[GRAPH] ✓ ${nodeName} (${durationMs}ms)${summary ? ` → ${summary}` : ""}`);

        timings.push({
          nodeType: node.type,
          nodeName,
          startedAt: trace.startedAt!,
          endedAt: trace.endedAt,
          durationMs,
        });

        this.eventBus.nodeDone(node.type, nodeName, {
          durationMs,
          outputLength: result.output?.length ?? 0,
          summary,
        });

        // 记录快照
        snapshots.push({
          nodeId,
          nodeType: node.type,
          nodeName,
          timestamp: Date.now(),
          status: "done",
          inputs: {
            messageCount: ctx.messages.length,
            inputLength: ctx.userInput.length,
            hasMemory: (result.memories?.length ?? 0) > 0,
            memoryCount: result.memories?.length ?? 0,
          },
          outputs: {
            outputLength: result.output?.length ?? 0,
            hasOutput: !!result.output,
            summary: this.summarizeOutput(node.type, result),
          },
          emotions: result.emotionDeltas
            ? { ...result.emotionDeltas, score: 0, dominant: Object.entries(result.emotionDeltas).sort(([,a], [,b]) => Math.abs(b) - Math.abs(a))[0]?.[0] }
            : undefined,
          memories: result.memories
            ? { total: 0, retrieved: result.memories.length, topMatches: result.memories.slice(0, 3).map((m) => m.content.slice(0, 60)) }
            : undefined,
          tokens: result.output
            ? { prompt: 0, output: Math.ceil(result.output.length / 4), total: Math.ceil(result.output.length / 4) }
            : undefined,
          durationMs,
        });

        if (result.output) lastOutput = result.output;

        // 释放下游
        this.releaseWithSemantics(nodeId, node, edges, adjacency, inDegree,
          completed, queue, nodeMap, nodeResults, timeline);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        trace.status = "error";
        trace.error = msg;
        trace.endedAt = Date.now();
        this.emit(timeline, "node_error", `[GRAPH] ✗ ${nodeName}: ${msg}`);
        this.eventBus.nodeError(node.type, nodeName, msg);
        this.release(nodeId, adjacency, inDegree, completed, queue, nodeMap);
      }
    }

    // 未到达节点
    for (const trace of traces) {
      if (trace.status === "pending") {
        trace.status = "skipped";
        this.emit(timeline, "edge_traverse", `[GRAPH] ⊘ ${trace.nodeType}: 路径未到达`);
      }
    }

    // Graph Complete
    const totalMs = Math.round(performance.now() - globalStart);
    const doneCount = traces.filter((t) => t.status === "done").length;
    this.emit(timeline, "graph_complete",
      `图执行完成: ${doneCount}/${traces.length} 节点, ${totalMs}ms`);
    this.eventBus.emit("workflow_done", "图执行完成", {
      data: { durationMs: totalMs, nodeCount: doneCount, totalNodes: traces.length },
    });

    return { output: lastOutput, traces, timeline, timings, snapshots, durationMs: totalMs };
  }

  // ---- 语义分支 ----
  private checkBranch(
    nodeId: string,
    _node: GraphNode,
    edges: GraphEdge[],
    completed: Set<string>,
    nodeResults: Map<string, WorkflowStepResult>,
    timeline: TimelineEvent[],
  ): boolean {
    const incoming = edges.filter((e) => e.target === nodeId);
    if (incoming.length === 0) return true;

    for (const edge of incoming) {
      if (!completed.has(edge.source)) continue;
      if (!edge.condition) return true;

      // 结构化解释 + 语义求值
      const resolveResult = this.semantic.resolve(edge.condition);
      const explanation = this.typeResolver.explainCondition(edge.condition);
      for (const line of explanation) {
        this.emit(timeline, "edge_traverse",
          `[GRAPH]    ${line.label}: ${line.value}${line.detail ? ` (${line.detail})` : ''}`);
      }

      if (!resolveResult.result) {
        this.emit(timeline, "edge_traverse",
          `[GRAPH] ⊘ ${nodeId}: 条件不满足 → 跳过`);
      }
      if (resolveResult.result) return true;
    }
    return false;
  }

  // ---- 语义下游释放 ----
  private releaseWithSemantics(
    nodeId: string,
    node: GraphNode,
    edges: GraphEdge[],
    adjacency: Map<string, string[]>,
    inDegree: Map<string, number>,
    completed: Set<string>,
    queue: string[],
    nodeMap: Map<string, GraphNode>,
    nodeResults: Map<string, WorkflowStepResult>,
    timeline: TimelineEvent[],
  ): void {
    const outEdges = edges.filter((e) => e.source === nodeId);

    for (const edge of outEdges) {
      if (edge.condition) {
        const resolveResult = this.semantic.resolve(edge.condition);
        if (resolveResult.result) {
          this.emit(timeline, "edge_traverse",
            `[GRAPH] → ${edge.target} (${edge.condition})`);
        } else {
          this.emit(timeline, "edge_traverse",
            `[GRAPH] ⊘ ${edge.target} (${resolveResult.description})`);
          continue;
        }
      }

      const targetId = edge.target;
      if (!nodeMap.has(targetId)) continue;
      const newDeg = (inDegree.get(targetId) ?? 1) - 1;
      inDegree.set(targetId, newDeg);
      if (newDeg <= 0 && !completed.has(targetId) && !queue.includes(targetId)) {
        queue.push(targetId);
      }
    }
  }

  private release(
    nodeId: string,
    adjacency: Map<string, string[]>,
    inDegree: Map<string, number>,
    completed: Set<string>,
    queue: string[],
    nodeMap: Map<string, GraphNode>,
  ): void {
    for (const targetId of adjacency.get(nodeId) ?? []) {
      const newDeg = (inDegree.get(targetId) ?? 1) - 1;
      inDegree.set(targetId, newDeg);
      if (newDeg <= 0 && !completed.has(targetId) && !queue.includes(targetId)) {
        queue.push(targetId);
      }
    }
  }

  // ---- 输出摘要 ----
  private summarizeOutput(nodeType: string, result: WorkflowStepResult): string {
    switch (nodeType) {
      case "emotion": {
        if (result.emotionDeltas) {
          const entries = Object.entries(result.emotionDeltas).filter(([, v]) => v !== 0);
          if (entries.length === 0) return "无变化";
          return entries.map(([k, v]) => `${k}=${v > 0 ? '+' : ''}${v}`).join(", ");
        }
        return "";
      }
      case "memory": {
        const count = result.memories?.length ?? 0;
        return count > 0 ? `匹配 ${count} 条记忆` : "无匹配";
      }
      case "narrative": {
        return (result.data?.phase as string) || "";
      }
      case "prompt": {
        const tokens = result.data?.totalTokens as number;
        return tokens ? `${tokens} tokens` : "";
      }
      case "model": {
        const len = result.output?.length ?? 0;
        return `输出 ${len} 字符`;
      }
      default:
        return "";
    }
  }

  private emit(timeline: TimelineEvent[], type: TimelineEvent["type"], message: string): void {
    timeline.push({ id: uuidv4(), timestamp: Date.now(), type, message });
    logger.debug(message);
  }
}
