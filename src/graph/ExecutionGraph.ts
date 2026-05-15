// ============================================================
// ExecutionGraph — 执行图核心引擎
//
// 管理节点（ExecutionNode）和连线（ExecutionEdge）。
// 提供：
//   - 拓扑排序
//   - 控制流执行（条件分支、路由、合并）
//   - 序列化 / 反序列化
//   - toWorkflowDefinition() / fromWorkflowDefinition()
//
// execution 与 workflow 解耦：
//   - execution 不保存位置、尺寸等 UI 元数据
//   - workflow 数据协议纯负责可视化信息
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import type { NodeSchema } from './NodeSchema';
import type {
  ExecutionNode,
  ExecutionEdge,
  ExecutionContext,
  ExecutionState,
  NodeExecutor,
  NodeExecutionResult,
} from './GraphTypes';
import { createExecutionState } from './GraphTypes';
import type {
  WorkflowDefinition,
  WorkflowNode,
  WorkflowEdge,
  WorkflowViewport,
  WorkflowPort,
} from './workflow';
import { WORKFLOW_PROTOCOL_VERSION } from './workflow';

// ---- 注册表 ----

type SchemaRegistry = Map<string, NodeSchema>;
type ExecutorRegistry = Map<string, NodeExecutor>;

// ---- ExecutionGraph ----

export class ExecutionGraph {
  private nodeMap: Map<string, ExecutionNode> = new Map();
  private edgeMap: Map<string, ExecutionEdge> = new Map();
  private schemas: SchemaRegistry = new Map();
  private executors: ExecutorRegistry = new Map();

  private workflowMetadata?: WorkflowDefinition['metadata'];
  private workflowViewport?: WorkflowViewport;

  // ==========================================
  // Schema & Executor 注册
  // ==========================================

  registerSchema(schema: NodeSchema): void {
    this.schemas.set(schema.type, schema);
  }

  registerSchemas(schemas: NodeSchema[]): void {
    for (const s of schemas) this.schemas.set(s.type, s);
  }

  getSchema(type: string): NodeSchema | undefined {
    return this.schemas.get(type);
  }

  registerExecutor(type: string, executor: NodeExecutor): void {
    this.executors.set(type, executor);
  }

  /** 获取节点执行器（供 RuntimeScheduler 使用） */
  getExecutor(type: string): NodeExecutor | undefined {
    return this.executors.get(type);
  }

  // ==========================================
  // 节点管理
  // ==========================================

  addNode(
    type: string,
    config: Record<string, unknown> = {},
    id?: string,
  ): ExecutionNode {
    const schema = this.schemas.get(type);
    const nodeId = id ?? uuidv4();
    const node: ExecutionNode = { id: nodeId, type, config, schema };
    this.nodeMap.set(nodeId, node);
    return node;
  }

  removeNode(nodeId: string): boolean {
    const edgesToRemove: string[] = [];
    for (const [edgeId, edge] of this.edgeMap) {
      if (edge.sourceNodeId === nodeId || edge.targetNodeId === nodeId) {
        edgesToRemove.push(edgeId);
      }
    }
    for (const edgeId of edgesToRemove) this.edgeMap.delete(edgeId);
    return this.nodeMap.delete(nodeId);
  }

  getNode(nodeId: string): ExecutionNode | undefined {
    return this.nodeMap.get(nodeId);
  }

  getAllNodes(): ExecutionNode[] {
    return Array.from(this.nodeMap.values());
  }

  // ==========================================
  // 连线管理
  // ==========================================

  addEdge(
    sourceNodeId: string,
    targetNodeId: string,
    sourcePortId?: string,
    targetPortId?: string,
    id?: string,
    condition?: string,
    retry?: ExecutionEdge['retry'],
  ): ExecutionEdge | null {
    if (!this.nodeMap.has(sourceNodeId) || !this.nodeMap.has(targetNodeId)) {
      return null;
    }

    const edgeId = id ?? uuidv4();
    const edge: ExecutionEdge = {
      id: edgeId,
      sourceNodeId,
      sourcePortId,
      targetNodeId,
      targetPortId,
      condition,
      retry,
    };
    this.edgeMap.set(edgeId, edge);
    return edge;
  }

  removeEdge(edgeId: string): boolean {
    return this.edgeMap.delete(edgeId);
  }

  getEdge(edgeId: string): ExecutionEdge | undefined {
    return this.edgeMap.get(edgeId);
  }

  getAllEdges(): ExecutionEdge[] {
    return Array.from(this.edgeMap.values());
  }

  getOutgoingEdges(nodeId: string): ExecutionEdge[] {
    return this.getAllEdges().filter((e) => e.sourceNodeId === nodeId);
  }

  getIncomingEdges(nodeId: string): ExecutionEdge[] {
    return this.getAllEdges().filter((e) => e.targetNodeId === nodeId);
  }

  // ==========================================
  // 拓扑排序
  // ==========================================

  topologicalSort(): ExecutionNode[] {
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();
    const nodeIds = new Set(this.nodeMap.keys());

    for (const nodeId of nodeIds) {
      inDegree.set(nodeId, 0);
      adjacency.set(nodeId, []);
    }

    for (const edge of this.edgeMap.values()) {
      if (nodeIds.has(edge.sourceNodeId) && nodeIds.has(edge.targetNodeId)) {
        adjacency.get(edge.sourceNodeId)!.push(edge.targetNodeId);
        inDegree.set(edge.targetNodeId, (inDegree.get(edge.targetNodeId) ?? 0) + 1);
      }
    }

    const queue: string[] = [];
    for (const [nodeId, degree] of inDegree) {
      if (degree === 0) queue.push(nodeId);
    }

    const result: ExecutionNode[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const node = this.nodeMap.get(current);
      if (node) result.push(node);
      for (const neighbor of adjacency.get(current) ?? []) {
        const newDegree = (inDegree.get(neighbor) ?? 1) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) queue.push(neighbor);
      }
    }
    return result;
  }

  // ======================================================================
  // 控制流执行
  // ======================================================================

  /**
   * 执行整图（含控制流：条件分支、路由、合并）。
   *
   * 算法概述：
   *   1. 从入度为 0 的节点（入口节点）开始
   *   2. 按 work-queue 驱动执行：
   *      a. 执行当前节点
   *      b. 根据节点执行结果（branch / route）和边缘条件
   *         决定哪些出边生效
   *      c. 只将生效出边的目标节点加入队列
   *   3. 未被任何生效入边连接的节点 → 跳过
   *   4. MergeNode 等待所有活跃入边就绪后合并
   *   5. 生成完整执行路径和跳过信息
   */
  async execute(input: string): Promise<{
    output: string;
    context: ExecutionContext;
  }> {
    const executionState = createExecutionState();

    const context: ExecutionContext = {
      input,
      results: new Map(),
      logs: [],
      executionState,
    };

    // ---- 构建邻接 / 入度 ----
    const adjacency = new Map<string, string[]>();  // sourceId → targetId[]
    const incoming = new Map<string, string[]>();     // targetId → sourceId[]
    const nodeIds = new Set(this.nodeMap.keys());

    for (const nid of nodeIds) {
      adjacency.set(nid, []);
      incoming.set(nid, []);
    }
    for (const edge of this.edgeMap.values()) {
      if (nodeIds.has(edge.sourceNodeId) && nodeIds.has(edge.targetNodeId)) {
        adjacency.get(edge.sourceNodeId)!.push(edge.targetNodeId);
        incoming.get(edge.targetNodeId)!.push(edge.sourceNodeId);
      }
    }

    // ---- 入口节点（无入边） ----
    const entryNodes: string[] = [];
    for (const [nid, deps] of incoming) {
      if (deps.length === 0) entryNodes.push(nid);
    }

    // ---- 状态 ----
    const completed = new Set<string>();
    const nodeOutputs = new Map<string, string>();
    const sourceResults = new Map<string, NodeExecutionResult>(); // nodeId → result

    // ---- 工作队列 ----
    const queue: string[] = [...entryNodes];
    const enqueued = new Set(entryNodes);

    // ---- 处理入口节点 ----
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      const node = this.nodeMap.get(nodeId);
      if (!node) continue;

      // 检查此节点是否该执行（是否有一条活跃入边路径）
      const shouldExecute = this.shouldNodeExecute(
        nodeId,
        entryNodes,
        completed,
        sourceResults,
        context,
      );

      if (!shouldExecute) {
        executionState.skipped.push({
          nodeId,
          reason: 'no active incoming edge',
        });
        context.logs.push(`[Skip] ${node.type} (${nodeId}): no active path`);
        // 即使跳过，也继续处理其出边（某些下游可能经由其他路径激活）
        continue;
      }

      // ---- 执行节点 ----
      context.logs.push(`[Execute] ${node.type} (${nodeId})`);

      // 收集上游输入
      const upstreamInput = this.collectUpstreamInput(nodeId, nodeOutputs, context);
      const effectiveInput = upstreamInput || input;
      context.results.set(`${nodeId}.input`, effectiveInput);

      // 调用执行器
      const executor = this.executors.get(node.type);
      let result: NodeExecutionResult;

      if (executor) {
        try {
          result = await executor(node, context);
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          context.logs.push(`  → ERROR: ${errorMsg}`);
          context.results.set(`${nodeId}.error`, errorMsg);
          result = { output: `[Error] ${errorMsg}` };
        }
      } else {
        context.logs.push(`  → SKIP: no executor for "${node.type}"`);
        result = { output: effectiveInput as string };
      }

      // 保存结果
      nodeOutputs.set(nodeId, result.output);
      sourceResults.set(nodeId, result);
      context.results.set(`${nodeId}.output`, result.output);
      completed.add(nodeId);
      executionState.path.push(nodeId);
      executionState.visited.add(nodeId);

      context.logs.push(
        `  → output: ${result.output.slice(0, 80)}${result.output.length > 80 ? '...' : ''}`,
      );
      if (result.branch) {
        context.logs.push(`  → branch: ${result.branch}`);
      }
      if (result.route) {
        context.logs.push(`  → route: ${result.route}`);
      }

      // ---- 确定活跃出边 ----
      const activeTargets = this.getActiveTargets(
        nodeId,
        result,
        context,
      );

      // 将活跃目标加入队列
      for (const targetId of activeTargets) {
        if (!completed.has(targetId) && !enqueued.has(targetId)) {
          queue.push(targetId);
          enqueued.add(targetId);
        }
      }
    }

    // ---- 标记所有未执行的节点为跳过 ----
    for (const nodeId of nodeIds) {
      if (!completed.has(nodeId)) {
        const alreadySkipped = executionState.skipped.some((s) => s.nodeId === nodeId);
        if (!alreadySkipped) {
          executionState.skipped.push({
            nodeId,
            reason: 'branch not taken / no active path',
          });
        }
      }
    }

    // ---- 确定图输出 ----
    // 查找没有出边的已执行节点，取最后一个的输出
    const terminalNodes = Array.from(completed).filter((nid) => {
      const outEdges = adjacency.get(nid) ?? [];
      return outEdges.length === 0 || outEdges.every((t) => !completed.has(t));
    });

    const lastTerminal = terminalNodes[terminalNodes.length - 1];
    const output = lastTerminal
      ? (nodeOutputs.get(lastTerminal) ?? input)
      : input;

    return { output, context };
  }

  // ---- 控制流辅助方法 ----

  /**
   * 判断节点是否应该执行。
   * 检查是否有至少一条生效的入边连接到该节点。
   */
  private shouldNodeExecute(
    nodeId: string,
    entryNodes: string[],
    completed: Set<string>,
    sourceResults: Map<string, NodeExecutionResult>,
    context: ExecutionContext,
  ): boolean {
    // 入口节点始终执行
    if (entryNodes.includes(nodeId)) return true;

    const incomingEdges = this.getIncomingEdges(nodeId);

    // 没有入边 → 入口节点（应该已经被 entryNodes 覆盖）
    if (incomingEdges.length === 0) return true;

    // 检查是否至少有一条入边的源节点已完成，且该边是活跃的
    for (const edge of incomingEdges) {
      const sourceId = edge.sourceNodeId;
      if (!completed.has(sourceId)) continue;

      const sourceResult = sourceResults.get(sourceId);

      // 检查边是否活跃
      if (this.isEdgeActive(edge, sourceResult, context)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 获取节点的活跃出边目标列表。
   * 考虑：sourceResult.branch / sourceResult.route / edge.condition
   */
  private getActiveTargets(
    nodeId: string,
    result: NodeExecutionResult,
    context: ExecutionContext,
  ): string[] {
    const outEdges = this.getOutgoingEdges(nodeId);
    const targets: string[] = [];

    for (const edge of outEdges) {
      if (this.isEdgeActive(edge, result, context)) {
        targets.push(edge.targetNodeId);
      }
    }

    return [...new Set(targets)]; // 去重
  }

  /**
   * 判断一条边在给定源结果下是否活跃。
   *
   * 规则：
   *  1. 如果源节点有 branch (IfNode):
   *     → 只激活 sourcePort 匹配 branch 的边
   *  2. 如果源节点有 route (SwitchNode):
   *     → 只激活 sourcePort 匹配 route 的边
   *  3. 如果边有 condition:
   *     → 求值 condition，仅 truthy 时激活
   *  4. 否则 → 活跃
   */
  private isEdgeActive(
    edge: ExecutionEdge,
    sourceResult: NodeExecutionResult | undefined,
    context: ExecutionContext,
  ): boolean {
    // IfNode: 分支匹配
    if (sourceResult?.branch && edge.sourcePortId) {
      if (edge.sourcePortId !== sourceResult.branch) {
        return false;
      }
    }
    // IfNode: 无 sourcePort 但有 branch — 激活无 port 的边
    else if (sourceResult?.branch) {
      // 有 branch 决策时，没有指定 port 的边默认激活（作为 fallback）
    }

    // SwitchNode: 路由匹配
    if (sourceResult?.route && edge.sourcePortId) {
      if (edge.sourcePortId !== sourceResult.route) {
        return false;
      }
    }

    // 边条件求值
    if (edge.condition) {
      const condResult = this.evaluateEdgeCondition(edge, context);
      if (!condResult) {
        context.executionState.skipped.push({
          nodeId: edge.targetNodeId,
          reason: `condition "${edge.condition}" = false on edge ${edge.id}`,
        });
        return false;
      }
    }

    return true;
  }

  /**
   * 求值边上的条件表达式。
   * 支持的引用：
   *   $input          → 图初始输入
   *   $source         → 源节点输出
   *   $source.output  → 同义
   *   $context.<key>  → context.results
   */
  private evaluateEdgeCondition(
    edge: ExecutionEdge,
    context: ExecutionContext,
  ): boolean {
    const expr = (edge.condition ?? '').trim();
    if (!expr) return true;
    if (expr === 'true') return true;
    if (expr === 'false') return false;

    const sourceOutput = context.results.get(`${edge.sourceNodeId}.output`) as string ?? '';
    const graphInput = context.input;

    try {
      const resolved = expr
        .replace(/\$input/g, JSON.stringify(graphInput))
        .replace(/\$source\.output/g, JSON.stringify(sourceOutput))
        .replace(/\$source/g, JSON.stringify(sourceOutput))
        .replace(/\$context\.(\w+)/g, (_match, key) => {
          const val = context.results.get(key);
          if (val === undefined || val === null) return 'null';
          return typeof val === 'string' ? JSON.stringify(val) : String(val);
        });

      const fn = new Function(`return (${resolved})`);
      return Boolean(fn());
    } catch {
      return false;
    }
  }

  /**
   * 收集节点的上游输入（所有已完成入边源节点的输出）。
   */
  private collectUpstreamInput(
    nodeId: string,
    nodeOutputs: Map<string, string>,
    _context: ExecutionContext,
  ): string {
    const incomingEdges = this.getIncomingEdges(nodeId);
    const parts: string[] = [];

    for (const edge of incomingEdges) {
      const srcOutput = nodeOutputs.get(edge.sourceNodeId);
      if (srcOutput) {
        parts.push(srcOutput);
      }
    }

    return parts.join('\n');
  }

  // ==========================================
  // 调试输出
  // ==========================================

  /**
   * 生成人类可读的执行路径报告。
   *
   * 格式：
   *   ======== EXECUTION PATH ========
   *   character
   *   ↓
   *   if_node (condition=true)
   *   ↓
   *   provider_fast
   *
   *   Skipped:
   *   - provider_slow
   */
  formatExecutionPath(state: ExecutionState, nodes: Map<string, ExecutionNode>): string {
    const lines: string[] = ['======== EXECUTION PATH ========'];

    for (const nodeId of state.path) {
      const node = nodes.get(nodeId);
      const label = node
        ? (node.config.label as string) || node.type
        : nodeId;
      lines.push(label);
      lines.push('↓');
    }

    // 移除最后的 ↓
    if (lines[lines.length - 1] === '↓') {
      lines.pop();
    }

    if (state.skipped.length > 0) {
      lines.push('');
      lines.push('Skipped:');
      for (const s of state.skipped) {
        const node = nodes.get(s.nodeId);
        const label = node
          ? (node.config.label as string) || node.type
          : s.nodeId;
        lines.push(`  - ${label} (${s.reason})`);
      }
    }

    return lines.join('\n');
  }

  // ==========================================
  // 序列化
  // ==========================================

  toJSON(): {
    nodes: Array<{ id: string; type: string; config: Record<string, unknown> }>;
    edges: Array<{
      id: string;
      sourceNodeId: string;
      targetNodeId: string;
      sourcePortId?: string;
      targetPortId?: string;
      condition?: string;
      retry?: { maxAttempts: number; delayMs: number };
    }>;
  } {
    return {
      nodes: this.getAllNodes().map((n) => ({
        id: n.id,
        type: n.type,
        config: n.config,
      })),
      edges: this.getAllEdges().map((e) => ({
        id: e.id,
        sourceNodeId: e.sourceNodeId,
        targetNodeId: e.targetNodeId,
        sourcePortId: e.sourcePortId,
        targetPortId: e.targetPortId,
        condition: e.condition,
        retry: e.retry,
      })),
    };
  }

  fromJSON(json: ReturnType<ExecutionGraph['toJSON']>): void {
    this.nodeMap.clear();
    this.edgeMap.clear();

    for (const n of json.nodes) {
      this.addNode(n.type, n.config, n.id);
    }

    for (const e of json.edges) {
      this.addEdge(
        e.sourceNodeId,
        e.targetNodeId,
        e.sourcePortId,
        e.targetPortId,
        e.id,
        e.condition,
        e.retry,
      );
    }
  }

  // ==========================================
  // WorkflowDefinition 转换
  // ==========================================

  toWorkflowDefinition(): WorkflowDefinition {
    const nodes: WorkflowNode[] = [];
    const edges: WorkflowEdge[] = [];

    const sorted = this.topologicalSort();
    const LAYOUT = {
      startX: 250,
      startY: 100,
      spacingX: 350,
      spacingY: 200,
      columns: 3,
    };

    sorted.forEach((execNode, index) => {
      const schema = this.schemas.get(execNode.type) ?? execNode.schema;
      const col = index % LAYOUT.columns;
      const row = Math.floor(index / LAYOUT.columns);

      const ports: WorkflowPort[] = (schema?.ports ?? []).map((p, portIndex) => ({
        id: p.id,
        direction: p.direction,
        label: p.label,
        dataType: p.dataType,
        index: portIndex,
      }));

      const wfNode: WorkflowNode = {
        id: execNode.id,
        type: execNode.type,
        position: {
          x: LAYOUT.startX + col * LAYOUT.spacingX,
          y: LAYOUT.startY + row * LAYOUT.spacingY,
        },
        size: schema?.defaultSize,
        config: execNode.config,
        ui: schema ? { color: schema.categoryColor } : undefined,
        ports: ports.length > 0 ? ports : undefined,
      };

      nodes.push(wfNode);
    });

    for (const execEdge of this.getAllEdges()) {
      const wfEdge: WorkflowEdge = {
        id: execEdge.id,
        source: execEdge.sourceNodeId,
        sourcePort: execEdge.sourcePortId,
        target: execEdge.targetNodeId,
        targetPort: execEdge.targetPortId,
        condition: execEdge.condition,
        retry: execEdge.retry,
      };
      edges.push(wfEdge);
    }

    return {
      version: WORKFLOW_PROTOCOL_VERSION,
      metadata: this.workflowMetadata,
      viewport: this.workflowViewport,
      nodes,
      edges,
    };
  }

  fromWorkflowDefinition(def: WorkflowDefinition): void {
    this.nodeMap.clear();
    this.edgeMap.clear();
    this.workflowMetadata = def.metadata;
    this.workflowViewport = def.viewport;

    for (const wfNode of def.nodes) {
      this.addNode(wfNode.type, wfNode.config ?? {}, wfNode.id);
    }

    for (const wfEdge of def.edges) {
      this.addEdge(
        wfEdge.source,
        wfEdge.target,
        wfEdge.sourcePort,
        wfEdge.targetPort,
        wfEdge.id,
        wfEdge.condition,
        wfEdge.retry,
      );
    }
  }

  setViewport(viewport: WorkflowViewport): void {
    this.workflowViewport = viewport;
  }

  setMetadata(metadata: WorkflowDefinition['metadata']): void {
    this.workflowMetadata = metadata;
  }

  // ==========================================
  // 工具方法
  // ==========================================

  clear(): void {
    this.nodeMap.clear();
    this.edgeMap.clear();
    this.workflowMetadata = undefined;
    this.workflowViewport = undefined;
  }

  get nodeCount(): number {
    return this.nodeMap.size;
  }

  get edgeCount(): number {
    return this.edgeMap.size;
  }

  hasCycle(): boolean {
    const sorted = this.topologicalSort();
    return sorted.length !== this.nodeMap.size;
  }

  /** 获取内部节点 Map（供调试使用） */
  getNodeMap(): Map<string, ExecutionNode> {
    return this.nodeMap;
  }
}
