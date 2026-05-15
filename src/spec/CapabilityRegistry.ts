// ============================================================
// CapabilityRegistry — 统一能力注册表
//
// 注册：Node / Skill / CharacterAdapter / MemoryProvider / NarrativeHook
// 所有 Workflow 节点通过此注册表发现和调用。
// ============================================================

import type { NodeRegistration } from "./NodeSpec";
import type { NodeMetadata } from "./NodeMetadata";
import type { RuntimeSkill } from "./SkillSpec";

// ---- 注册项类型 ----

/** 记忆提供者 */
export interface MemoryProvider {
  id: string;
  name: string;
  retrieve(query: string, maxResults?: number): Promise<Array<{ content: string; importance: number }>>;
}

/** 叙事钩子 */
export interface NarrativeHook {
  id: string;
  name: string;
  onArcStart?(arcId: string): void;
  onArcProgress?(arcId: string, phase: string): void;
  onArcResolve?(arcId: string): void;
}

// ---- CapabilityRegistry ----

export class CapabilityRegistry {
  private nodes: Map<string, NodeRegistration> = new Map();
  private skills: Map<string, RuntimeSkill> = new Map();
  private memoryProviders: Map<string, MemoryProvider> = new Map();
  private narrativeHooks: Map<string, NarrativeHook> = new Map();

  // ========== Node ==========

  registerNode(reg: NodeRegistration): void {
    if (this.nodes.has(reg.type)) {
      console.warn(`[CapabilityRegistry] 节点 "${reg.type}" 已注册，覆盖`);
    }
    this.nodes.set(reg.type, reg);
  }

  getNode(type: string): NodeRegistration | undefined {
    return this.nodes.get(type);
  }

  getAllNodes(): NodeRegistration[] {
    return Array.from(this.nodes.values());
  }

  getNodeCount(): number {
    return this.nodes.size;
  }

  // ========== Skill ==========

  registerSkill(skill: RuntimeSkill): void {
    if (this.skills.has(skill.id)) {
      console.warn(`[CapabilityRegistry] 技能 "${skill.id}" 已注册，覆盖`);
    }
    this.skills.set(skill.id, skill);
  }

  getSkill(id: string): RuntimeSkill | undefined {
    return this.skills.get(id);
  }

  getActiveSkills(): RuntimeSkill[] {
    return Array.from(this.skills.values()).filter((s) => s.enabled !== false);
  }

  /** 匹配技能（按触发条件） */
  matchSkills(input: string): RuntimeSkill[] {
    const lower = input.toLowerCase();
    return this.getActiveSkills().filter((s) => {
      if (!s.trigger?.keywords) return false;
      return s.trigger.keywords.some((kw) => lower.includes(kw.toLowerCase()));
    }).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  // ========== Memory Provider ==========

  registerMemoryProvider(provider: MemoryProvider): void {
    this.memoryProviders.set(provider.id, provider);
  }

  getMemoryProvider(id: string): MemoryProvider | undefined {
    return this.memoryProviders.get(id);
  }

  getAllMemoryProviders(): MemoryProvider[] {
    return Array.from(this.memoryProviders.values());
  }

  // ========== Narrative Hook ==========

  registerNarrativeHook(hook: NarrativeHook): void {
    this.narrativeHooks.set(hook.id, hook);
  }

  onArcStart(arcId: string): void {
    for (const hook of this.narrativeHooks.values()) {
      hook.onArcStart?.(arcId);
    }
  }

  onArcProgress(arcId: string, phase: string): void {
    for (const hook of this.narrativeHooks.values()) {
      hook.onArcProgress?.(arcId, phase);
    }
  }

  onArcResolve(arcId: string): void {
    for (const hook of this.narrativeHooks.values()) {
      hook.onArcResolve?.(arcId);
    }
  }

  // ========== Summary ==========

  getSummary(): Record<string, number> {
    return {
      nodes: this.nodes.size,
      skills: this.skills.size,
      memoryProviders: this.memoryProviders.size,
      narrativeHooks: this.narrativeHooks.size,
    };
  }
}
