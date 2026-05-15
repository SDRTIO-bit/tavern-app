"use client";

import type { RuntimeSnapshot } from "@/runtimeInspector/RuntimeTrace";
import type { GraphNode, GraphEdge, NodeExecutionStatus } from "@/spec/WorkflowSpec";
import { getNodeMetadata } from "@/spec/NodeMetadata";
import { useState } from "react";

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  snapshots: RuntimeSnapshot[];
  workflowName: string;
}

const STATUS_COLORS: Record<string, string> = {
  running: "border-cyan-400 bg-cyan-500/20 text-cyan-400",
  done: "border-green-400 bg-green-500/20 text-green-400",
  error: "border-red-400 bg-red-500/20 text-red-400",
  skipped: "border-zinc-600 bg-zinc-800/50 text-zinc-500",
  pending: "border-zinc-700 bg-zinc-900/50 text-zinc-600",
};

const STATUS_DOTS: Record<string, string> = {
  running: "🟡",
  done: "🟢",
  error: "🔴",
  skipped: "⚪",
  pending: "○",
};

function nodeStatus(nodeId: string, snapshots: RuntimeSnapshot[]): NodeExecutionStatus {
  const snap = snapshots.reverse().find((s) => s.nodeId === nodeId);
  return snap?.status ?? "pending";
}

export default function GraphInspector({ nodes, edges, snapshots, workflowName }: Props) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const selectedSnap = selectedNode
    ? snapshots.find((s) => s.nodeId === selectedNode)
    : null;

  // 构建邻接关系
  const adjacency = new Map<string, string[]>();
  for (const n of nodes) adjacency.set(n.id, []);
  for (const e of edges) {
    adjacency.get(e.source)?.push(e.target);
  }

  // 简单布局：按层排列
  const levels = new Map<string, number>();
  function assignLevel(id: string, lvl: number) {
    const cur = levels.get(id) ?? -1;
    if (lvl <= cur) return;
    levels.set(id, lvl);
    for (const t of adjacency.get(id) ?? []) assignLevel(t, lvl + 1);
  }
  // 入口节点
  const allTargets = new Set(edges.map((e) => e.target));
  for (const n of nodes) {
    if (!allTargets.has(n.id)) assignLevel(n.id, 0);
  }

  const maxLevel = Math.max(...Array.from(levels.values()), 0);
  const levelNodes = new Map<number, GraphNode[]>();
  for (const n of nodes) {
    const lvl = levels.get(n.id) ?? 0;
    if (!levelNodes.has(lvl)) levelNodes.set(lvl, []);
    levelNodes.get(lvl)!.push(n);
  }

  return (
    <div className="flex h-full flex-col bg-zinc-950 font-mono">
      <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2">
        <span className="text-xs font-bold text-zinc-400">▸ GRAPH</span>
        <span className="text-[10px] text-zinc-600">{workflowName}</span>
      </div>

      {/* 图布局 */}
      <div className="flex-1 overflow-auto p-3">
        <div className="flex flex-col gap-4">
          {Array.from({ length: maxLevel + 1 }, (_, lvl) => {
            const ln = levelNodes.get(lvl) ?? [];
            return (
              <div key={lvl} className="flex flex-wrap items-center justify-center gap-2">
                {ln.map((node) => {
                  const status = nodeStatus(node.id, snapshots);
                  const meta = getNodeMetadata(node.type);
                  const isSelected = selectedNode === node.id;
                  return (
                    <button
                      key={node.id}
                      onClick={() => setSelectedNode(isSelected ? null : node.id)}
                      className={`rounded-lg border px-2.5 py-1.5 text-left transition ${
                        STATUS_COLORS[status]
                      } ${isSelected ? "ring-2 ring-blue-400" : ""}`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px]">{STATUS_DOTS[status]}</span>
                        <span className="text-[10px]">{meta?.icon || "⚙"}</span>
                        <span className="text-[10px] font-medium">{meta?.name || node.type}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* 连线显示 */}
        <div className="mt-3 border-t border-zinc-800 pt-2">
          <p className="mb-1 text-[9px] text-zinc-600">连线</p>
          {edges.map((e) => (
            <div key={e.id} className="text-[9px] text-zinc-500">
              {e.source} → {e.target}
              {e.condition && <span className="text-zinc-600"> [{e.condition}]</span>}
              {e.label && <span className="text-zinc-600"> ({e.label})</span>}
            </div>
          ))}
        </div>
      </div>

      {/* 节点详情 */}
      {selectedSnap && (
        <div className="max-h-48 overflow-auto border-t border-zinc-800 p-3 text-[10px]">
          <p className="mb-1 font-medium text-zinc-300">{selectedSnap.nodeName}</p>
          <div className="space-y-1 text-zinc-500">
            <div>状态: {selectedSnap.status} · {selectedSnap.durationMs}ms</div>
            <div>输入: {selectedSnap.inputs.inputLength}字符 · {selectedSnap.inputs.memoryCount}记忆</div>
            <div>输出: {selectedSnap.outputs.summary}</div>
            {selectedSnap.emotions && (
              <div>
                情绪: {selectedSnap.emotions.dominant || "neutral"}
                {selectedSnap.emotions.score && ` (${(selectedSnap.emotions.score * 100).toFixed(0)}%)`}
              </div>
            )}
            {selectedSnap.decision && (
              <div>
                决策: →{selectedSnap.decision.selected} (置信度 {Math.round(selectedSnap.decision.confidence * 100)}%)
              </div>
            )}
            {selectedSnap.tokens && (
              <div>Token: Prompt={selectedSnap.tokens.prompt} Output={selectedSnap.tokens.output}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
