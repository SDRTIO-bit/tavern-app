// ============================================================
// RuntimeScheduler — 有状态运行时调度器
//
// 管理多个 graph execution 实例。
// 提供：
//   - startExecution() — 启动图执行
//   - pauseExecution() — 暂停执行
//   - resumeExecution() — 恢复执行
//   - cancelExecution() — 取消执行
//   - dispatchEvent()  — 发送事件给等待中的执行
//   - createSnapshot() — 创建执行快照
//   - restoreFromSnapshot() — 从快照还原
//
// 集成控制流节点（WaitNode）和 retry/timeout 策略。
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import { ExecutionGraph } from '../../graph/ExecutionGraph';
import type {
  ExecutionNode,
  ExecutionEdge,
  ExecutionContext,
  NodeExecutionResult,
  RetryPolicy,
} from '../../graph/GraphTypes';
import { createExecutionState } from '../../graph/GraphTypes';
import type { RuntimeExecution, ExecutionStatus } from './RuntimeExecution';
import { createRuntimeExecution } from './RuntimeExecution';
import type { ExecutionEvent } from './ExecutionEvent';
import { ExecutionEventBus } from './ExecutionEvent';
import type { ExecutionSnapshot } from './ExecutionSnapshot';
import { createSnapshot, restoreExecution } from './ExecutionSnapshot';

// ---- 内部调度状态 ----

interface SchedulerExecution {
  runtime: RuntimeExecution;
  graph: ExecutionGraph;
  /** resolve when pause period ends */
  resumeResolve?: () => void;
  /** is pause requested */
  pauseRequested: boolean;
  /** is cancel requested */
  cancelRequested: boolean;
  /** event bus for this execution */
  eventBus: ExecutionEventBus;
  /** promise that resolves when execution completes */
  completionPromise?: Promise<RuntimeExecution>;
  completionResolve?: (exec: RuntimeExecution) => void;
}

// ---- RuntimeScheduler ----

export class RuntimeScheduler {
  private executions: Map<string, SchedulerExecution> = new Map();
  private graphs: Map<string, ExecutionGraph> = new Map();
  /** 已完成的执行（保留用于查询） */
  private history: RuntimeExecution[] = [];

  // ==========================================
  // Graph 注册
  // ==========================================

  /** 注册一个图 */
  registerGraph(graphId: string, graph: ExecutionGraph): void {
    this.graphs.set(graphId, graph);
  }

  /** 创建一个新的图并注册 */
  createGraph(): { graphId: string; graph: ExecutionGraph } {
    const graphId = uuidv4();
    const graph = new ExecutionGraph();
    this.graphs.set(graphId, graph);
    return { graphId, graph };
  }

  /** 获取已注册的图 */
  getGraph(graphId: string): ExecutionGraph | undefined {
    return this.graphs.get(graphId);
  }

  // ==========================================
  // 执行管理
  // ==========================================

  /**
   * 启动一次图执行。
   * 返回 RuntimeExecution（异步执行，返回时可能已经 running/waiting/paused）。
   */
  async startExecution(graphId: string, input: string): Promise<RuntimeExecution> {
    const graph = this.graphs.get(graphId);
    if (!graph) {
      throw new Error(`Graph not found: ${graphId}`);
    }

    const execId = uuidv4();
    const runtime = createRuntimeExecution(execId, graphId);
    const eventBus = new ExecutionEventBus();

    const schedExec: SchedulerExecution = {
      runtime,
      graph,
      pauseRequested: false,
      cancelRequested: false,
      eventBus,
    };

    this.executions.set(execId, schedExec);

    // 启动异步执行
    const completionPromise = this._runExecution(schedExec, input);
    schedExec.completionPromise = completionPromise;

    // 等待第一个 yield 点（让调用者看到初始状态）
    // 不 await completionPromise，让执行在后台运行
    completionPromise.then((result) => {
      // 执行完成后移到历史记录
      this.history.push(result);
    });

    return runtime;
  }

  /** 等待执行完成 */
  async waitForCompletion(executionId: string): Promise<RuntimeExecution> {
    const sched = this.executions.get(executionId);
    if (!sched) {
      // 检查历史记录
      const hist = this.history.find((h) => h.id === executionId);
      if (hist) return hist;
      throw new Error(`Execution not found: ${executionId}`);
    }
    if (!sched.completionPromise) {
      throw new Error(`Execution ${executionId} has no completion promise`);
    }
    return sched.completionPromise;
  }

  /** 暂停执行 */
  pauseExecution(executionId: string): void {
    const sched = this.executions.get(executionId);
    if (!sched) return;
    if (sched.runtime.status !== 'running') return;

    sched.pauseRequested = true;
    sched.runtime.status = 'paused';
    sched.runtime.updatedAt = new Date().toISOString();
  }

  /** 恢复执行 */
  async resumeExecution(executionId: string): Promise<RuntimeExecution> {
    const sched = this.executions.get(executionId);
    if (!sched) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    if (sched.runtime.status === 'paused') {
      sched.pauseRequested = false;
      sched.runtime.status = 'running';
      sched.runtime.updatedAt = new Date().toISOString();

      // 触发恢复
      if (sched.resumeResolve) {
        sched.resumeResolve();
        sched.resumeResolve = undefined;
      }
    } else if (sched.runtime.status === 'waiting') {
      // 直接恢复等待的执行
      sched.runtime.status = 'running';
      sched.runtime.updatedAt = new Date().toISOString();

      if (sched.resumeResolve) {
        sched.resumeResolve();
        sched.resumeResolve = undefined;
      }
    }

    return sched.runtime;
  }

  /** 取消执行 */
  cancelExecution(executionId: string): void {
    const sched = this.executions.get(executionId);
    if (!sched) return;

    sched.cancelRequested = true;
    sched.runtime.status = 'failed';
    sched.runtime.updatedAt = new Date().toISOString();

    // 触发恢复以让循环检测到取消
    if (sched.resumeResolve) {
      sched.resumeResolve();
      sched.resumeResolve = undefined;
    }
  }

  /** 向等待中的执行发送事件 */
  async dispatchEvent(
    executionId: string,
    event: ExecutionEvent,
  ): Promise<void> {
    const sched = this.executions.get(executionId);
    if (!sched) return;

    if (
      sched.runtime.status === 'waiting' &&
      sched.runtime.waitingFor === event.type
    ) {
      // 存储事件负载到 state
      sched.runtime.state[`event_${event.type}`] = event.payload;

      // 恢复执行
      sched.runtime.status = 'running';
      sched.runtime.updatedAt = new Date().toISOString();

      sched.eventBus.dispatch(event);

      if (sched.resumeResolve) {
        sched.resumeResolve();
        sched.resumeResolve = undefined;
      }
    }
  }

  /** 获取执行状态 */
  getExecution(executionId: string): RuntimeExecution | undefined {
    const sched = this.executions.get(executionId);
    if (sched) return sched.runtime;
    return this.history.find((h) => h.id === executionId);
  }

  /** 获取所有活跃执行 */
  getActiveExecutions(): RuntimeExecution[] {
    return Array.from(this.executions.values()).map((s) => s.runtime);
  }

  /** 获取执行历史 */
  getHistory(): RuntimeExecution[] {
    return [...this.history];
  }

  // ==========================================
  // 快照
  // ==========================================

  /**
   * 创建执行快照（用于持久化 / 崩溃恢复）。
   * 仅在 paused 或 waiting 状态下可快照。
   */
  createSnapshot(
    executionId: string,
    contextInput: string,
    contextResults: Map<string, unknown>,
    contextLogs: string[],
    executionState: {
      path: string[];
      skipped: Array<{ nodeId: string; reason: string }>;
      activeBranches: string[];
      routeResult?: string;
      visited: Set<string>;
    },
  ): ExecutionSnapshot | null {
    const sched = this.executions.get(executionId);
    if (!sched) return null;

    const graphJson = sched.graph.toJSON();

    return createSnapshot({
      execution: sched.runtime,
      contextInput,
      contextResults,
      contextLogs,
      executionStatePath: executionState.path,
      executionStateSkipped: executionState.skipped,
      executionStateActiveBranches: executionState.activeBranches,
      executionStateRouteResult: executionState.routeResult,
      executionStateVisited: executionState.visited,
      graphNodes: graphJson.nodes,
      graphEdges: graphJson.edges,
    });
  }

  /**
   * 从快照恢复执行。
   */
  async restoreFromSnapshot(snapshot: ExecutionSnapshot): Promise<RuntimeExecution> {
    // 重建 graph
    const graph = new ExecutionGraph();
    graph.fromJSON(snapshot.graph);

    const graphId = snapshot.execution.graphId;
    this.graphs.set(graphId, graph);

    // 恢复执行状态
    const runtime = restoreExecution(snapshot);
    const eventBus = new ExecutionEventBus();

    const schedExec: SchedulerExecution = {
      runtime,
      graph,
      pauseRequested: false,
      cancelRequested: false,
      eventBus,
    };

    this.executions.set(runtime.id, schedExec);

    // 根据快照状态决定是否继续执行
    if (runtime.status === 'paused') {
      schedExec.pauseRequested = true;
      // 调用方可调用 resumeExecution 继续
    } else if (runtime.status === 'waiting') {
      // 等待事件来恢复
    } else if (runtime.status === 'running') {
      // 继续执行（从 currentNodeId 之后）
      const contextInput = snapshot.context.input;
      const completionPromise = this._continueExecution(
        schedExec,
        contextInput,
        new Map(snapshot.context.results),
        snapshot.context.logs,
        {
          path: snapshot.context.executionState.path,
          skipped: snapshot.context.executionState.skipped,
          activeBranches: snapshot.context.executionState.activeBranches,
          routeResult: snapshot.context.executionState.routeResult,
          visited: new Set(snapshot.context.executionState.visited),
        },
      );
      schedExec.completionPromise = completionPromise;
    }

    return runtime;
  }

  // ==========================================
  // 调试输出
  // ==========================================

  /**
   * 格式化执行状态报告。
   *
   * 格式：
   *   ======== EXECUTION STATE ========
   *   Execution: exec_001
   *   Status: waiting
   *   Current: wait_user_input
   *   Visited: character, planner, wait_user_input
   *   Waiting For: user_message
   */
  formatExecutionState(executionId: string): string {
    const exec = this.getExecution(executionId);
    if (!exec) return `Execution not found: ${executionId}`;

    const lines = ['======== EXECUTION STATE ========'];
    lines.push(`Execution: ${exec.id}`);
    lines.push(`Status: ${exec.status}`);

    if (exec.currentNodeId) {
      lines.push(`Current: ${exec.currentNodeId}`);
    }
    if (exec.visitedNodes.length > 0) {
      lines.push(`Visited: ${exec.visitedNodes.join(', ')}`);
    }
    if (exec.waitingFor) {
      lines.push(`Waiting For: ${exec.waitingFor}`);
    }

    return lines.join('\n');
  }

  // ==========================================
  // 内部：执行循环
  // ==========================================

  /**
   * 运行执行循环。从图的入口节点开始顺序执行。
   */
  private async _runExecution(
    sched: SchedulerExecution,
    input: string,
  ): Promise<RuntimeExecution> {
    const { graph, runtime } = sched;
    runtime.status = 'running';
    runtime.startedAt = new Date().toISOString();
    runtime.updatedAt = runtime.startedAt;

    const executionState = createExecutionState();
    const context: ExecutionContext = {
      input,
      results: new Map(),
      logs: [],
      executionState,
    };

    const nodeOutputs = new Map<string, string>();
    const sourceResults = new Map<string, NodeExecutionResult>();

    // 获取排序后的节点
    const sortedNodes = graph.topologicalSort();

    if (sortedNodes.length === 0) {
      runtime.status = 'completed';
      runtime.updatedAt = new Date().toISOString();
      this.executions.delete(runtime.id);
      return runtime;
    }

    // 构建邻接表用于前进
    const adjacency = new Map<string, string[]>();
    const incoming = new Map<string, string[]>();

    for (const node of sortedNodes) {
      adjacency.set(node.id, []);
      incoming.set(node.id, []);
    }

    for (const edge of graph.getAllEdges()) {
      if (adjacency.has(edge.sourceNodeId)) {
        adjacency.get(edge.sourceNodeId)!.push(edge.targetNodeId);
      }
      if (incoming.has(edge.targetNodeId)) {
        incoming.get(edge.targetNodeId)!.push(edge.sourceNodeId);
      }
    }

    // 找到入口节点
    const entryNodes = sortedNodes.filter((n) => (incoming.get(n.id) ?? []).length === 0);

    // 按拓扑顺序和分支执行节点
    let idx = 0;
    let currentNodeIndex = 0;

    // 找到 currentNodeId 对应的索引（恢复时使用）
    if (runtime.currentNodeId) {
      const restoreIdx = sortedNodes.findIndex((n) => n.id === runtime.currentNodeId);
      if (restoreIdx >= 0) currentNodeIndex = restoreIdx;
    }

    for (let i = currentNodeIndex; i < sortedNodes.length; i++) {
      // ---- 检查取消 ----
      if (sched.cancelRequested) {
        runtime.status = 'failed';
        runtime.updatedAt = new Date().toISOString();
        this.executions.delete(runtime.id);
        return runtime;
      }

      // ---- 检查暂停 ----
      if (sched.pauseRequested) {
        await this._waitForResume(sched);
        if (sched.cancelRequested) {
          runtime.status = 'failed';
          runtime.updatedAt = new Date().toISOString();
          this.executions.delete(runtime.id);
          return runtime;
        }
      }

      const node = sortedNodes[i];
      idx = i;
      runtime.currentNodeId = node.id;
      runtime.updatedAt = new Date().toISOString();

      // 检查是否该执行（有活跃入边路径）
      if (i > 0 && !entryNodes.includes(node)) {
        const shouldExec = this._shouldExecuteNode(
          node,
          incoming,
          runtime,
          sourceResults,
        );
        if (!shouldExec) {
          runtime.skippedNodes.push({
            nodeId: node.id,
            reason: 'no active incoming edge',
          });
          context.logs.push(`[Skip] ${node.type} (${node.id}): no active path`);
          executionState.skipped.push({
            nodeId: node.id,
            reason: 'no active incoming edge',
          });
          continue;
        }
      }

      context.logs.push(`[Execute] ${node.type} (${node.id})`);

      // 收集上游输入
      const upstreamInput = this._collectUpstreamInput(node.id, incoming, nodeOutputs);
      const effectiveInput = upstreamInput || input;
      context.results.set(`${node.id}.input`, effectiveInput);

      // ---- 执行节点（含 retry） ----
      const executor = graph.getExecutor(node.type);
      let result: NodeExecutionResult;

      if (executor) {
        result = await this._executeWithRetry(
          node,
          context,
          executor,
          this._getRetryPolicy(node, incoming),
        );
      } else {
        context.logs.push(`  → SKIP: no executor for "${node.type}"`);
        result = { output: effectiveInput };
      }

      // 检查执行是否失败
      if (result.output.startsWith('[Error]')) {
        // 检查 fallback 路由
        if (node.config.onTimeout === 'fail' || node.config.onTimeout === 'fallback') {
          runtime.status = 'failed';
          runtime.updatedAt = new Date().toISOString();
          context.logs.push(`  → FAILED: ${result.output}`);
          this.executions.delete(runtime.id);
          return runtime;
        }
      }

      // 保存结果
      nodeOutputs.set(node.id, result.output);
      sourceResults.set(node.id, result);
      context.results.set(`${node.id}.output`, result.output);
      runtime.visitedNodes.push(node.id);
      executionState.path.push(node.id);
      executionState.visited.add(node.id);

      context.logs.push(
        `  → output: ${result.output.slice(0, 80)}${result.output.length > 80 ? '...' : ''}`,
      );

      if (result.branch) {
        context.logs.push(`  → branch: ${result.branch}`);
        executionState.activeBranches.push(result.branch);
        executionState.routeResult = result.branch;
      }
      if (result.route) {
        context.logs.push(`  → route: ${result.route}`);
        executionState.routeResult = result.route;
      }

      // ---- 处理 wait 指令 ----
      if (result.wait) {
        runtime.status = 'waiting';
        runtime.waitingFor = result.wait.eventType || result.wait.type;
        runtime.waitingMessage = result.wait.message;
        runtime.currentNodeId = node.id;
        runtime.updatedAt = new Date().toISOString();

        context.logs.push(`  → WAITING for: ${runtime.waitingFor}`);

        // 如果是 duration wait，设置定时器
        if (result.wait.type === 'duration' && result.wait.durationMs) {
          const delay = result.wait.durationMs;
          setTimeout(() => {
            // 自动恢复
            this.dispatchEvent(runtime.id, {
              type: `timeout:${delay}`,
              payload: { elapsed: delay },
            });
          }, delay);
        }

        // 等待恢复
        await this._waitForResume(sched);

        // 恢复后清除等待状态
        runtime.waitingFor = undefined;
        runtime.waitingMessage = undefined;
        runtime.status = 'running';
        runtime.updatedAt = new Date().toISOString();
      }
    }

    // ---- 标记未执行的节点 ----
    for (const node of sortedNodes) {
      if (!runtime.visitedNodes.includes(node.id)) {
        const alreadySkipped = runtime.skippedNodes.some((s) => s.nodeId === node.id);
        if (!alreadySkipped) {
          runtime.skippedNodes.push({
            nodeId: node.id,
            reason: 'branch not taken',
          });
        }
      }
    }

    // ---- 完成 ----
    runtime.status = 'completed';
    runtime.currentNodeId = undefined;
    runtime.updatedAt = new Date().toISOString();
    this.executions.delete(runtime.id);

    return runtime;
  }

  /**
   * 从指定节点继续执行（快照恢复用）。
   */
  private async _continueExecution(
    sched: SchedulerExecution,
    input: string,
    contextResults: Map<string, unknown>,
    contextLogs: string[],
    execState: {
      path: string[];
      skipped: Array<{ nodeId: string; reason: string }>;
      activeBranches: string[];
      routeResult?: string;
      visited: Set<string>;
    },
  ): Promise<RuntimeExecution> {
    // 继续执行的核心逻辑与 _runExecution 相同
    // 这里简化：设置 runtime 的 currentNodeId 后重新调用 _runExecution
    // _runExecution 会从 currentNodeId 对应的索引继续
    return this._runExecution(sched, input);
  }

  // ==========================================
  // 内部辅助方法
  // ==========================================

  /** 等待 pause/wait 恢复 */
  private _waitForResume(sched: SchedulerExecution): Promise<void> {
    return new Promise((resolve) => {
      sched.resumeResolve = resolve;
    });
  }

  /** 检查节点是否该执行 */
  private _shouldExecuteNode(
    node: ExecutionNode,
    incoming: Map<string, string[]>,
    runtime: RuntimeExecution,
    sourceResults: Map<string, NodeExecutionResult>,
  ): boolean {
    const deps = incoming.get(node.id) ?? [];
    if (deps.length === 0) return true;

    for (const depId of deps) {
      if (!runtime.visitedNodes.includes(depId)) continue;
      // 如果有入边源节点已执行，认为该执行
      return true;
    }
    return false;
  }

  /** 收集上游输入 */
  private _collectUpstreamInput(
    nodeId: string,
    incoming: Map<string, string[]>,
    nodeOutputs: Map<string, string>,
  ): string {
    const deps = incoming.get(nodeId) ?? [];
    const parts: string[] = [];
    for (const depId of deps) {
      const output = nodeOutputs.get(depId);
      if (output) parts.push(output);
    }
    return parts.join('\n');
  }

  /** 带重试执行节点 */
  private async _executeWithRetry(
    node: ExecutionNode,
    context: ExecutionContext,
    executor: NonNullable<ReturnType<ExecutionGraph['getExecutor']>>,
    retry?: RetryPolicy,
  ): Promise<NodeExecutionResult> {
    const maxAttempts = retry?.maxAttempts ?? 1;
    const delayMs = retry?.delayMs ?? 0;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await executor(node, context);

        // 检查是否输出中包含错误
        if (result.output.startsWith('[Error]') && attempt < maxAttempts) {
          context.logs.push(`  → Retry ${attempt}/${maxAttempts}: ${result.output}`);
          if (delayMs > 0) {
            await new Promise((r) => setTimeout(r, delayMs));
          }
          continue;
        }

        return result;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        context.logs.push(
          `  → Attempt ${attempt}/${maxAttempts} failed: ${lastError.message}`,
        );

        if (attempt < maxAttempts && delayMs > 0) {
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }
    }

    // 所有重试耗尽
    const errMsg = lastError?.message ?? 'unknown error';
    return { output: `[Error] Retry exhausted: ${errMsg}` };
  }

  /** 从入边中获取重试策略 */
  private _getRetryPolicy(
    node: ExecutionNode,
    incoming: Map<string, string[]>,
  ): RetryPolicy | undefined {
    const deps = incoming.get(node.id) ?? [];
    // 从传入该节点的第一条有 retry 策略的边获取
    for (const depId of deps) {
      // 需要从 graph 中查找 edge
      for (const [, sched] of this.executions) {
        const edges = sched.graph.getAllEdges();
        const edge = edges.find((e) => e.sourceNodeId === depId && e.targetNodeId === node.id);
        if (edge?.retry) return edge.retry;
      }
    }
    return undefined;
  }
}
