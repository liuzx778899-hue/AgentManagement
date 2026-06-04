/**
 * AgentManagement SDK - TypeScript Client
 *
 * Issue: #34
 */

/**
 * SDK 配置
 */
export interface AgentManagementClientConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
  headers?: Record<string, string>;
  /** 租户 ID（多租户隔离） */
  tenantId?: string;
}

/**
 * 创建任务请求选项
 */
export interface CreateTaskOptions {
  /** 幂等键（防止重复创建） */
  idempotencyKey?: string;
}

/**
 * SDK Client
 */
export class AgentManagementClient {
  private baseUrl: string;
  private apiKey?: string;
  private timeout: number;
  private headers: Record<string, string>;
  private tenantId?: string;

  constructor(config: AgentManagementClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.timeout = config.timeout || 30000;
    this.headers = config.headers || {};
    this.tenantId = config.tenantId;
  }

  /**
   * Tasks API
   */
  tasks = {
    /**
     * 创建任务
     */
    create: async (
      request: CreateTaskRequest,
      options?: CreateTaskOptions
    ): Promise<Task> => {
      const headers: Record<string, string> = {};
      if (options?.idempotencyKey) {
        headers['X-Idempotency-Key'] = options.idempotencyKey;
      }
      const response = await this.request('/tasks', {
        method: 'POST',
        body: JSON.stringify(request),
        headers,
      });
      return this.unwrapResponse(response);
    },

    /**
     * 获取任务
     */
    get: async (taskId: string): Promise<Task> => {
      const response = await this.request(`/tasks/${taskId}`);
      return this.unwrapResponse(response);
    },

    /**
     * 列出任务
     */
    list: async (filter?: TaskFilter): Promise<Task[]> => {
      const params = new URLSearchParams();
      if (filter?.projectId) params.set('projectId', filter.projectId);
      if (filter?.status) params.set('status', filter.status);
      const query = params.toString();
      const response = await this.request(`/tasks${query ? '?' + query : ''}`);
      return this.unwrapResponse(response);
    },

    /**
     * 启动任务
     */
    start: async (taskId: string): Promise<Task> => {
      const response = await this.request(`/tasks/${taskId}/start`, {
        method: 'POST',
      });
      return this.unwrapResponse(response);
    },

    /**
     * 取消任务
     */
    cancel: async (taskId: string): Promise<Task> => {
      const response = await this.request(`/tasks/${taskId}/cancel`, {
        method: 'POST',
      });
      return this.unwrapResponse(response);
    },

    /**
     * 获取日志（事件日志）
     */
    logs: async (taskId: string): Promise<EventLog[]> => {
      const response = await this.request(`/tasks/${taskId}/logs`);
      // Server returns { ok: true, logs: EventLog[] }
      return response.logs || [];
    },

    /**
     * 获取结果
     */
    result: async (taskId: string): Promise<TaskResult> => {
      const response = await this.request(`/tasks/${taskId}/result`);
      // Server returns { ok: true, data: TaskResult }
      return this.unwrapResponse(response);
    },
  };

  /**
   * Sessions API
   */
  sessions = {
    /**
     * 获取会话
     */
    get: async (sessionId: string): Promise<AgentRun> => {
      const response = await this.request(`/sessions/${sessionId}`);
      return response;
    },

    /**
     * 发送输入
     */
    input: async (sessionId: string, input: string): Promise<void> => {
      await this.request(`/sessions/${sessionId}/input`, {
        method: 'POST',
        body: JSON.stringify({ input }),
      });
    },

    /**
     * 停止会话
     */
    stop: async (sessionId: string): Promise<void> => {
      await this.request(`/sessions/${sessionId}/stop`, {
        method: 'POST',
      });
    },
  };

  /**
   * Agents API
   */
  agents = {
    /**
     * 列出 Agents
     */
    list: async (): Promise<Agent[]> => {
      const response = await this.request('/agents');
      return response.agents || [];
    },
  };

  /**
   * 统计信息
   */
  statistics = {
    get: async (): Promise<Statistics> => {
      const response = await this.request('/statistics');
      // Server returns { ok: true, data: Statistics }
      return this.unwrapResponse(response);
    },
  };

  /**
   * 健康检查
   */
  health = {
    check: async (): Promise<{ status: string; timestamp: string }> => {
      const response = await this.request('/health');
      return response;
    },
  };

  /**
   * 发送请求
   */
  private async request(
    path: string,
    options?: {
      method?: string;
      body?: string;
      headers?: Record<string, string>;
    }
  ): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    const method = options?.method || 'GET';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.headers,
      ...(options?.headers || {}),
    };

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    // 添加租户 ID
    if (this.tenantId) {
      headers['X-Tenant-Id'] = this.tenantId;
    }

    // 生成或使用用户提供的 Request ID
    if (!headers['X-Request-Id']) {
      headers['X-Request-Id'] = this.generateRequestId();
    }

    const response = await fetch(url, {
      method,
      headers,
      body: options?.body,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new AgentManagementError(error.error || 'Request failed', response.status);
    }

    return response.json();
  }

  /**
   * 解包响应数据
   * 服务端返回格式: { ok: true, data: T } 或直接返回 T
   */
  private unwrapResponse<T>(response: any): T {
    // 如果响应包含 ok 和 data 字段，提取 data
    if (response && typeof response === 'object' && 'ok' in response && 'data' in response) {
      return response.data;
    }
    // 否则直接返回（兼容未包装的响应）
    return response;
  }

  /**
   * 生成 Request ID
   */
  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * SDK Error
 */
export class AgentManagementError extends Error {
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'AgentManagementError';
    this.statusCode = statusCode;
  }
  statusCode: number;
}

// --- Types ---

export interface Task {
  id: string;
  projectId: string;
  goal: string;
  acceptanceCriteria: string[];
  status: 'draft' | 'queued' | 'running' | 'gate' | 'done' | 'failed';
  activeRunId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskRequest {
  projectId: string;
  goal: string;
  acceptanceCriteria?: string[];
  workflowTemplateId?: string;
}

export interface TaskFilter {
  projectId?: string;
  status?: string;
}

export interface TaskResult {
  status: string;
  artifacts?: Array<{ id: string; name: string; path: string }>;
  error?: string;
}

export interface EventLog {
  id: string;
  taskId: string;
  runId?: string;
  type: string;
  payload?: Record<string, unknown>;
  timestamp: string;
}

export interface AgentRun {
  id: string;
  taskId: string;
  roleId: string;
  modelProviderId: string;
  modelName: string;
  currentStepId: string;
  status: 'starting' | 'running' | 'waiting_gate' | 'done' | 'failed';
  log: string[];
  startedAt: string;
  finishedAt: string | null;
}

export interface Agent {
  id: string;
  name: string;
  roleId: string;
  runnerProviderId: string;
  enabled: boolean;
  status: 'idle' | 'busy' | 'disabled' | 'error';
}

export interface Statistics {
  tasks: { total: number };
  runs: { total: number; active: number; completed: number };
}

/**
 * 创建 Client 实例
 */
export function createClient(config: AgentManagementClientConfig): AgentManagementClient {
  return new AgentManagementClient(config);
}
