/**
 * Agent Registry Service - Agent 注册与配置管理
 *
 * Issue: #33
 */

import type {
  Agent,
  AgentStatus,
  AgentKind,
  CreateAgentRequest,
  UpdateAgentRequest,
  AgentFilter,
  AgentRegistryEntry,
} from '../../../domain/agent';

/**
 * Agent Registry - 内存 Agent 注册表
 */
export class AgentRegistry {
  private agents: Map<string, Agent> = new Map();
  private heartbeats: Map<string, string> = new Map();

  /**
   * 注册 Agent
   */
  register(request: CreateAgentRequest): Agent {
    const id = this.generateId();
    const now = new Date().toISOString();

    const agent: Agent = {
      id,
      name: request.name,
      description: request.description,
      roleId: request.roleId,
      runnerProviderId: request.runnerProviderId,
      modelProviderId: request.modelProviderId,
      modelName: request.modelName,
      config: request.config,
      capabilityIds: request.capabilityIds || [],
      status: 'idle',
      enabled: request.enabled ?? true,
      isBuiltIn: false,
      createdAt: now,
      updatedAt: now,
      tags: request.tags,
    };

    this.agents.set(id, agent);
    this.heartbeats.set(id, now);

    return agent;
  }

  /**
   * 获取 Agent
   */
  get(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  /**
   * 更新 Agent
   */
  update(id: string, request: UpdateAgentRequest): Agent | undefined {
    const agent = this.agents.get(id);
    if (!agent) return undefined;

    const updated: Agent = {
      ...agent,
      ...request,
      updatedAt: new Date().toISOString(),
    };

    this.agents.set(id, updated);
    return updated;
  }

  /**
   * 删除 Agent
   */
  delete(id: string): boolean {
    return this.agents.delete(id);
  }

  /**
   * 启用/禁用 Agent
   */
  setEnabled(id: string, enabled: boolean): Agent | undefined {
    const agent = this.agents.get(id);
    if (!agent) return undefined;

    const updated: Agent = {
      ...agent,
      enabled,
      status: enabled ? 'idle' : 'disabled',
      updatedAt: new Date().toISOString(),
    };

    this.agents.set(id, updated);
    return updated;
  }

  /**
   * 更新 Agent 状态
   */
  setStatus(id: string, status: AgentStatus): Agent | undefined {
    const agent = this.agents.get(id);
    if (!agent) return undefined;

    const updated: Agent = {
      ...agent,
      status,
      updatedAt: new Date().toISOString(),
    };

    this.agents.set(id, updated);
    return updated;
  }

  /**
   * 记录心跳
   */
  heartbeat(id: string): void {
    this.heartbeats.set(id, new Date().toISOString());
  }

  /**
   * 列出所有 Agent
   */
  list(filter?: AgentFilter): Agent[] {
    let agents = Array.from(this.agents.values());

    if (filter) {
      if (filter.roleId) {
        agents = agents.filter(a => a.roleId === filter.roleId);
      }
      if (filter.kind) {
        agents = agents.filter(a => a.config.kind === filter.kind);
      }
      if (filter.status) {
        agents = agents.filter(a => a.status === filter.status);
      }
      if (filter.enabled !== undefined) {
        agents = agents.filter(a => a.enabled === filter.enabled);
      }
      if (filter.tags && filter.tags.length > 0) {
        agents = agents.filter(a =>
          filter.tags!.some(tag => a.tags?.includes(tag))
        );
      }
      if (filter.search) {
        const search = filter.search.toLowerCase();
        agents = agents.filter(a =>
          a.name.toLowerCase().includes(search) ||
          a.description?.toLowerCase().includes(search)
        );
      }
    }

    return agents;
  }

  /**
   * 获取注册表条目
   */
  getRegistryEntry(id: string): AgentRegistryEntry | undefined {
    const agent = this.agents.get(id);
    if (!agent) return undefined;

    return {
      agentId: agent.id,
      name: agent.name,
      kind: agent.config.kind,
      roleId: agent.roleId,
      status: agent.status,
      enabled: agent.enabled,
      lastHeartbeat: this.heartbeats.get(id),
      registeredAt: agent.createdAt,
    };
  }

  /**
   * 获取所有注册表条目
   */
  listRegistryEntries(): AgentRegistryEntry[] {
    return Array.from(this.agents.keys()).map(id => this.getRegistryEntry(id)!);
  }

  /**
   * 清理过期 Agent
   */
  cleanupExpired(timeoutMs: number): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, heartbeat] of this.heartbeats) {
      const agent = this.agents.get(id);
      if (agent && !agent.isBuiltIn) {
        const elapsed = now - new Date(heartbeat).getTime();
        if (elapsed > timeoutMs) {
          this.agents.delete(id);
          this.heartbeats.delete(id);
          cleaned++;
        }
      }
    }

    return cleaned;
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取统计信息
   */
  getStatistics(): {
    total: number;
    byStatus: Record<AgentStatus, number>;
    byKind: Record<AgentKind, number>;
  } {
    const agents = Array.from(this.agents.values());

    const byStatus: Record<AgentStatus, number> = {
      idle: 0,
      busy: 0,
      disabled: 0,
      error: 0,
    };

    const byKind: Record<AgentKind, number> = {
      'claude-code-cli': 0,
      'codex-cli': 0,
      'gemini-cli': 0,
      'cursor-agent': 0,
      'custom-shell': 0,
      'mcp-server': 0,
      'http-endpoint': 0,
    };

    for (const agent of agents) {
      byStatus[agent.status]++;
      byKind[agent.config.kind]++;
    }

    return {
      total: agents.length,
      byStatus,
      byKind,
    };
  }
}

// 单例实例
export const agentRegistry = new AgentRegistry();