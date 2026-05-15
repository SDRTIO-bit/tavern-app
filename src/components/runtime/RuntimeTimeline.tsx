"use client";

import { useEffect, useRef, useState } from "react";
import type { TimelineEvent, NodeTiming } from "@/workflowRuntime/types/WorkflowRuntimeTypes";

interface Props {
  timeline: TimelineEvent[];
  timings: NodeTiming[];
  isRunning: boolean;
  totalDurationMs: number;
}

/** 取节点图标 */
function nodeIcon(type: string | undefined): string {
  const map: Record<string, string> = {
    emotion: '💭', memory: '🧠', goal: '🎯',
    narrative: '📖', worldbook: '📚', prompt: '📝',
    model: '🤖',
  };
  return map[type ?? ''] ?? '⚙';
}

export default function RuntimeTimeline({ timeline, timings, isRunning, totalDurationMs }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [timeline]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // 计算每个节点占总时间的百分比
  const maxDuration = Math.max(...timings.map((t) => t.durationMs ?? 0), 1);

  return (
    <div className="flex h-full flex-col bg-zinc-950 font-mono">
      <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-2">
        <span className="text-xs font-bold text-zinc-400">▸ TIMELINE</span>
        {isRunning && (
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-yellow-400" />
        )}
        <span className="ml-auto text-[10px] text-zinc-600">
          {timings.length} 节点 · {totalDurationMs}ms
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 text-xs">
        {timeline.length === 0 && (
          <p className="py-4 text-center text-zinc-600">无数据</p>
        )}

        {/* 耗时概览 */}
        {timings.length > 0 && (
          <div className="mb-3 rounded-lg bg-zinc-900 p-3">
            <p className="mb-2 text-[10px] uppercase text-zinc-600">节点耗时</p>
            {timings.map((t) => {
              const barWidth = Math.max((t.durationMs ?? 0) / maxDuration * 100, 3);
              const isModel = t.nodeType === 'model';
              return (
                <div key={t.nodeType} className="mb-1.5">
                  <div className="mb-0.5 flex items-center justify-between">
                    <span className="text-zinc-400">
                      {nodeIcon(t.nodeType)} {t.nodeName}
                    </span>
                    <span className={`tabular-nums ${isModel ? 'text-yellow-400' : 'text-zinc-600'}`}>
                      {t.durationMs}ms
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-zinc-800">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        isModel ? 'bg-yellow-500' : 'bg-cyan-600'
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Timeline 事件 */}
        {timeline.map((event) => {
          const isStart = event.type === 'node_start' || event.type === 'workflow_start';
          const isDone = event.type === 'node_done' || event.type === 'workflow_done';
          const isError = event.type === 'node_error';
          const isExpanded = expanded.has(event.id);

          const lineColor = isError
            ? 'border-red-500'
            : isDone
              ? 'border-green-500'
              : isStart
                ? 'border-cyan-500'
                : 'border-zinc-700';

          return (
            <div key={event.id} className="relative pl-5">
              {/* 竖线 */}
              <div className={`absolute left-[5px] top-0 h-full w-px ${lineColor} ${isError ? '' : 'opacity-30'}`} />

              {/* 圆点 */}
              <div
                className={`absolute left-[1px] top-1.5 h-2.5 w-2.5 rounded-full border-2 ${
                  isError
                    ? 'border-red-500 bg-red-500/20'
                    : isDone
                      ? 'border-green-500 bg-green-500/20'
                      : isStart
                        ? 'border-cyan-500 bg-cyan-500/20'
                        : 'border-zinc-600 bg-zinc-800'
                } ${isStart ? 'animate-pulse' : ''}`}
              />

              <button
                onClick={() => toggleExpand(event.id)}
                className="w-full py-0.5 text-left"
              >
                <div className="flex items-center gap-1.5">
                  {event.nodeType && (
                    <span className="text-[10px]">{nodeIcon(event.nodeType)}</span>
                  )}
                  <span className={`${
                    isError ? 'text-red-400' : isDone ? 'text-green-400' : 'text-zinc-400'
                  }`}>
                    {event.message}
                  </span>
                  {event.timing && (
                    <span className="ml-auto tabular-nums text-[10px] text-zinc-600">
                      {event.timing.durationMs}ms
                    </span>
                  )}
                </div>
              </button>

              {/* 展开详情 */}
              {isExpanded && event.detail && (() => {
                const d = event.detail;
                const error = d.error as string | undefined;
                const durationMs = d.durationMs as number | undefined;
                const outputLength = d.outputLength as number | undefined;
                const memoryCount = d.memoryCount as number | undefined;
                const nodeCount = d.nodeCount as number | undefined;
                const stepCount = d.stepCount as number | undefined;
                const emotionDeltas = d.emotionDeltas as Record<string, number> | undefined;
                return (
                <div className="ml-4 mt-0.5 rounded bg-zinc-900/50 px-2 py-1 text-[10px] text-zinc-500">
                  {error && (
                    <div className="text-red-400">错误: {error}</div>
                  )}
                  {durationMs !== undefined && (
                    <div>耗时: {durationMs}ms</div>
                  )}
                  {outputLength !== undefined && (
                    <div>输出: {outputLength} 字符</div>
                  )}
                  {memoryCount !== undefined && (
                    <div>记忆: {memoryCount} 条</div>
                  )}
                  {nodeCount !== undefined && (
                    <div>节点数: {nodeCount}</div>
                  )}
                  {stepCount !== undefined && (
                    <div>步骤: {stepCount}</div>
                  )}
                  {emotionDeltas && (
                    <div>
                      情绪:{' '}
                      {Object.entries(emotionDeltas)
                        .filter(([, v]) => v !== 0)
                        .map(([k, v]) => `${k} ${v > 0 ? '+' : ''}${v}`)
                        .join(', ')}
                    </div>
                  )}
                </div>
                );
              })()}
            </div>
          );
        })}

        {isRunning && (
          <div className="relative pl-5 pt-1">
            <div className="absolute left-[5px] top-0 h-full w-px border-l border-dashed border-zinc-700" />
            <div className="flex items-center gap-2 text-zinc-600">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-yellow-400" />
              <span>执行中...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
