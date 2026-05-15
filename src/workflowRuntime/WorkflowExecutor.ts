// ============================================================
// WorkflowExecutor v2 — A7.5 Spec-Driven
//
// 新增：
//   - Zod 运行时校验
//   - 节点元数据注册
//   - CapabilityRegistry 集成
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import type {
  WorkflowExecutionContext,
  WorkflowStepResult,
  NodeTiming,
  TimelineEvent,
} from './types/WorkflowRuntimeTypes';
import { WorkflowLoader } from './WorkflowLoader';
import { WorkflowRegistry } from './WorkflowRegistry';
import { RuntimeEventBus } from './RuntimeEventBus';
import { logger } from '@/core/logger';

export interface ExecutionResult {
  output: string;
  steps: WorkflowStepResult[];
  durationMs: number;
  /** 节点耗时明细 */
  timings: NodeTiming[];
  /** Timeline 事件 */
  timeline: TimelineEvent[];
}

export class WorkflowExecutor {
  private registry: WorkflowRegistry;
  private loader: WorkflowLoader;
  private eventBus: RuntimeEventBus;
  /** 节点类型 → Zod 输入 Schema */
  private inputSchemas: Map<string, z.ZodType> = new Map();

  constructor(
    registry: WorkflowRegistry,
    loader: WorkflowLoader,
    eventBus: RuntimeEventBus,
  ) {
    this.registry = registry;
    this.loader = loader;
    this.eventBus = eventBus;
  }

  getEventBus(): RuntimeEventBus {
    return this.eventBus;
  }

  /** 注册节点 Zod 输入校验 */
  registerSchema(nodeType: string, schema: z.ZodType): void {
    this.inputSchemas.set(nodeType, schema);
  }

  /**
   * 执行工作流（A7 增强版）。
   */
  async execute(
    workflowId: string,
    ctx: WorkflowExecutionContext,
    onChunk?: (text: string) => void,
  ): Promise<ExecutionResult> {
    const globalStart = performance.now();
    const timeline: TimelineEvent[] = [];
    const timings: NodeTiming[] = [];

    const workflow = this.loader.get(workflowId);
    if (!workflow) {
      throw new Error(`工作流不存在: ${workflowId}`);
    }

    // 更新运行时元数据
    ctx.runtime = {
      startedAt: Date.now(),
      workflowName: workflow.name,
      nodeCount: workflow.nodes.length,
    };

    this.eventBus.clearHistory();

    // ---- Workflow Start ----
    const wfStartEvent: TimelineEvent = {
      id: uuidv4(),
      timestamp: Date.now(),
      type: 'workflow_start',
      message: `当前模式: ${workflow.name}`,
      detail: { workflowId, nodeCount: workflow.nodes.length },
    };
    timeline.push(wfStartEvent);
    this.eventBus.emit('workflow_start', wfStartEvent.message, {
      data: { workflowId, nodeCount: workflow.nodes.length },
    });

    const steps: WorkflowStepResult[] = [];
    let lastOutput: string | undefined;

    // ---- 按序执行节点 ----
    for (let i = 0; i < workflow.nodes.length; i++) {
      const nodeType = workflow.nodes[i];
      const reg = this.registry.getRegistration(nodeType);

      if (!reg) {
        const errMsg = `节点未注册: ${nodeType}`;
        timeline.push({
          id: uuidv4(),
          timestamp: Date.now(),
          type: 'node_error',
          nodeType,
          message: errMsg,
        });
        this.eventBus.nodeError(nodeType, nodeType, errMsg);
        steps.push({ nodeType, output: `[Error] ${errMsg}` });
        continue;
      }

      // ---- 校验 I/O Schema -**
      if (reg.schema?.input) {
        this.validateInput(nodeType, reg.schema.input, ctx);
      }

      // Zod 运行时校验
      const zodSchema = this.inputSchemas.get(nodeType);
      if (zodSchema) {
        try {
          const inputData = {
            message: ctx.userInput,
            query: ctx.userInput,
            sessionId: ctx.sessionId,
            systemPrompt: ctx.systemPrompt,
            userInput: ctx.userInput,
            messages: ctx.messages,
            memories: ctx.variables?.sessionMemories ?? [],
          };
          zodSchema.parse(inputData);
        } catch (err) {
          if (err instanceof z.ZodError) {
            logger.warn(`[Zod] ${nodeType}: ${err.issues.map((e) => e.message).join(', ')}`);
          }
        }
      }

      // ---- Node Start ----
      const nodeStart = performance.now();
      const startEvent: TimelineEvent = {
        id: uuidv4(),
        timestamp: Date.now(),
        type: 'node_start',
        nodeType,
        nodeName: reg.name,
        message: `正在执行 ${reg.name}...`,
      };
      timeline.push(startEvent);
      this.eventBus.nodeStart(nodeType, reg.name);

      try {
        const result = await reg.execute(ctx);

        // ---- Node Done ----
        const durationMs = Math.round(performance.now() - nodeStart);
        const timing: NodeTiming = {
          nodeType,
          nodeName: reg.name,
          startedAt: startEvent.timestamp,
          endedAt: Date.now(),
          durationMs,
        };
        timings.push(timing);

        const doneEvent: TimelineEvent = {
          id: uuidv4(),
          timestamp: Date.now(),
          type: 'node_done',
          nodeType,
          nodeName: reg.name,
          message: `${reg.name} 完成`,
          detail: {
            durationMs,
            hasOutput: Boolean(result.output),
            outputLength: result.output?.length ?? 0,
            emotionDeltas: result.emotionDeltas,
            memoryCount: result.memories?.length ?? 0,
          },
          timing: { durationMs },
        };
        timeline.push(doneEvent);

        this.eventBus.nodeDone(nodeType, reg.name, {
          durationMs,
          hasOutput: Boolean(result.output),
          outputLength: result.output?.length ?? 0,
          emotionDeltas: result.emotionDeltas,
          memoryCount: result.memories?.length ?? 0,
        });

        // 缓存结果
        result.timing = timing;
        steps.push(result);
        ctx.stepResults.set(nodeType, result);

        if (result.output) {
          lastOutput = result.output;
        }

        // model 节点的流式输出
        if (result.output && onChunk && nodeType === 'model') {
          // onChunk 应由 model 节点的 execute 内部调用
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const errEvent: TimelineEvent = {
          id: uuidv4(),
          timestamp: Date.now(),
          type: 'node_error',
          nodeType,
          nodeName: reg.name,
          message: `${reg.name} 失败: ${msg}`,
          detail: { error: msg },
          timing: { durationMs: Math.round(performance.now() - nodeStart) },
        };
        timeline.push(errEvent);

        this.eventBus.nodeError(nodeType, reg.name, msg);
        steps.push({ nodeType, output: `[Error] ${msg}` });
      }
    }

    // ---- 汇总最终输出 ----
    const finalOutput = lastOutput ?? '';
    const totalDurationMs = Math.round(performance.now() - globalStart);

    // ---- Workflow Done ----
    const doneEvent: TimelineEvent = {
      id: uuidv4(),
      timestamp: Date.now(),
      type: 'workflow_done',
      message: '工作流执行完成',
      detail: {
        durationMs: totalDurationMs,
        stepCount: steps.length,
        hasOutput: Boolean(finalOutput),
        outputLength: finalOutput.length,
      },
      timing: { durationMs: totalDurationMs },
    };
    timeline.push(doneEvent);

    this.eventBus.emit('workflow_done', '工作流执行完成', {
      data: {
        durationMs: totalDurationMs,
        stepCount: steps.length,
        timeline: timings.map((t) => `${t.nodeName} (${t.durationMs}ms)`),
      },
    });

    return {
      output: finalOutput,
      steps,
      durationMs: totalDurationMs,
      timings,
      timeline,
    };
  }

  // ---- Schema 校验 ----
  private validateInput(
    nodeType: string,
    schema: Record<string, string>,
    ctx: WorkflowExecutionContext,
  ): void {
    for (const [key, expectedType] of Object.entries(schema)) {
      const value = ctx.variables[key];
      if (value === undefined) continue;

      const actualType = Array.isArray(value) ? 'object' : typeof value;
      const expected =
        expectedType === 'string[]' ? 'object' : expectedType;

      if (actualType !== expected) {
        console.warn(
          `[WorkflowSchema] ${nodeType}: 变量 "${key}" 类型不匹配，期望 ${expectedType}，实际 ${actualType}`,
        );
      }
    }
  }
}
