/**
 * Mock Runner Adapter - 模拟 Runner 执行器
 *
 * 用于 MVP 阶段验证任务流程，不执行真实命令
 *
 * Issue: #33
 */

import type {
  RunnerSession,
  RunnerSessionStatus,
  RunnerEvent,
  StartRunnerSessionRequest,
} from '../../domain/runner';
import type { Task } from '../../domain/task';

/**
 * Mock Runner 配置
 */
export interface MockRunnerConfig {
  /** 模拟延迟（毫秒） */
  delayMs?: number;
  /** 是否模拟成功 */
  success?: boolean;
  /** 是否生成日志 */
  generateLogs?: boolean;
  /** 是否生成产物 */
  generateArtifacts?: boolean;
}

/**
 * Mock Runner Adapter - 模拟任务执行
 */
export class MockRunnerAdapter {
  private sessions: Map<string, RunnerSession> = new Map();
  private events: Map<string, RunnerEvent[]> = new Map();
  private config: MockRunnerConfig;

  constructor(config: MockRunnerConfig = {}) {
    this.config = {
      delayMs: 2000,
      success: true,
      generateLogs: true,
      generateArtifacts: true,
      ...config,
    };
  }

  /**
   * 启动 Runner Session
   */
  async startSession(request: StartRunnerSessionRequest): Promise<RunnerSession> {
    const sessionId = this.generateId();
    const now = new Date().toISOString();

    const session: RunnerSession = {
      id: sessionId,
      taskId: request.taskId,
      runnerId: request.runnerId,
      runnerKind: 'claude-code',
      status: 'starting',
      worktreePath: request.worktreePath,
      workingDirectory: request.workingDirectory,
      env: request.env,
      args: request.args,
      startedAt: now,
    };

    this.sessions.set(sessionId, session);
    this.events.set(sessionId, []);

    // 模拟启动过程
    await this.simulateStartup(sessionId);

    return session;
  }

  /**
   * 模拟启动过程
   */
  private async simulateStartup(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // 记录启动事件
    this.addEvent(sessionId, {
      eventId: this.generateEventId(),
      sessionId,
      taskId: session.taskId,
      type: 'started',
      timestamp: new Date().toISOString(),
      source: 'runner',
    });

    // 更新状态为运行中
    this.updateSessionStatus(sessionId, 'running');

    // 生成模拟日志
    if (this.config.generateLogs) {
      await this.generateMockLogs(sessionId);
    }

    // 模拟执行完成
    if (this.config.success) {
      await this.simulateSuccess(sessionId);
    } else {
      await this.simulateFailure(sessionId);
    }
  }

  /**
   * 生成模拟日志
   */
  private async generateMockLogs(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const logs = [
      `[${new Date().toISOString()}] Starting task execution...`,
      `[${new Date().toISOString()}] Loading configuration...`,
      `[${new Date().toISOString()}] Initializing environment...`,
      `[${new Date().toISOString()}] Processing task: ${session.taskId}`,
      `[${new Date().toISOString()}] Analyzing requirements...`,
      `[${new Date().toISOString()}] Generating solution...`,
      `[${new Date().toISOString()}] Running validation...`,
      `[${new Date().toISOString()}] Task execution complete.`,
    ];

    for (const log of logs) {
      await new Promise(resolve => setTimeout(resolve, this.config.delayMs! / logs.length));

      this.addEvent(sessionId, {
        eventId: this.generateEventId(),
        sessionId,
        taskId: session.taskId,
        type: 'log',
        timestamp: new Date().toISOString(),
        logContent: log,
        logLevel: 'info',
        source: 'runner',
      });
    }
  }

  /**
   * 模拟成功完成
   */
  private async simulateSuccess(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const now = new Date().toISOString();

    // 添加产物创建事件
    if (this.config.generateArtifacts) {
      this.addEvent(sessionId, {
        eventId: this.generateEventId(),
        sessionId,
        taskId: session.taskId,
        type: 'artifact_created',
        timestamp: now,
        artifact: {
          id: `artifact-${Date.now()}`,
          name: 'output.md',
          type: 'document',
          path: '/tmp/output.md',
        },
        source: 'runner',
      });
    }

    // 记录完成事件
    this.addEvent(sessionId, {
      eventId: this.generateEventId(),
      sessionId,
      taskId: session.taskId,
      type: 'completed',
      timestamp: now,
      source: 'runner',
    });

    // 更新会话状态
    this.updateSessionStatus(sessionId, 'completed', now);
  }

  /**
   * 模拟失败
   */
  private async simulateFailure(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const now = new Date().toISOString();

    // 记录错误事件
    this.addEvent(sessionId, {
      eventId: this.generateEventId(),
      sessionId,
      taskId: session.taskId,
      type: 'error',
      timestamp: now,
      errorMessage: 'Simulated failure for testing purposes',
      errorCode: 'MOCK_FAILURE',
      source: 'runner',
    });

    // 记录失败事件
    this.addEvent(sessionId, {
      eventId: this.generateEventId(),
      sessionId,
      taskId: session.taskId,
      type: 'failed',
      timestamp: now,
      errorMessage: 'Task execution failed',
      errorCode: 'EXEC_FAILED',
      source: 'runner',
    });

    // 更新会话状态
    this.updateSessionStatus(sessionId, 'failed', now, 'Task execution failed');
  }

  /**
   * 发送输入
   */
  async sendInput(sessionId: string, input: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    this.addEvent(sessionId, {
      eventId: this.generateEventId(),
      sessionId,
      taskId: session.taskId,
      type: 'input_received',
      timestamp: new Date().toISOString(),
      payload: { input },
      source: 'user',
    });
  }

  /**
   * 停止 Session
   */
  async stopSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const now = new Date().toISOString();

    this.addEvent(sessionId, {
      eventId: this.generateEventId(),
      sessionId,
      taskId: session.taskId,
      type: 'stopped',
      timestamp: now,
      source: 'system',
    });

    this.updateSessionStatus(sessionId, 'completed', now);
  }

  /**
   * 获取 Session
   */
  getSession(sessionId: string): RunnerSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * 获取事件流
   */
  getEvents(sessionId: string): RunnerEvent[] {
    return this.events.get(sessionId) || [];
  }

  /**
   * 获取所有事件
   */
  getAllEvents(): Map<string, RunnerEvent[]> {
    return this.events;
  }

  /**
   * 更新 Session 状态
   */
  private updateSessionStatus(
    sessionId: string,
    status: RunnerSessionStatus,
    endedAt?: string,
    error?: string
  ): RunnerSession | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;

    const updated: RunnerSession = {
      ...session,
      status,
      endedAt,
      exitCode: status === 'completed' ? 0 : status === 'failed' ? 1 : undefined,
      error,
    };

    this.sessions.set(sessionId, updated);

    // 记录状态变化事件
    this.addEvent(sessionId, {
      eventId: this.generateEventId(),
      sessionId,
      taskId: session.taskId,
      type: 'state_changed',
      timestamp: new Date().toISOString(),
      previousStatus: session.status,
      newStatus: status,
      source: 'system',
    });

    return updated;
  }

  /**
   * 添加事件
   */
  private addEvent(sessionId: string, event: RunnerEvent): void {
    const events = this.events.get(sessionId) || [];
    events.push(event);
    this.events.set(sessionId, events);
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成事件 ID
   */
  private generateEventId(): string {
    return `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 清理完成的会话
   */
  cleanupCompleted(maxAgeMs: number): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, session] of this.sessions) {
      if (
        (session.status === 'completed' || session.status === 'failed' || session.status === 'cancelled') &&
        session.endedAt
      ) {
        const age = now - new Date(session.endedAt).getTime();
        if (age > maxAgeMs) {
          this.sessions.delete(id);
          this.events.delete(id);
          cleaned++;
        }
      }
    }

    return cleaned;
  }

  /**
   * 获取统计信息
   */
  getStatistics(): {
    total: number;
    byStatus: Record<RunnerSessionStatus, number>;
  } {
    const sessions = Array.from(this.sessions.values());

    const byStatus: Record<RunnerSessionStatus, number> = {
      queued: 0,
      starting: 0,
      running: 0,
      paused: 0,
      resuming: 0,
      stopping: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      timeout: 0,
    };

    for (const session of sessions) {
      byStatus[session.status]++;
    }

    return {
      total: sessions.length,
      byStatus,
    };
  }
}

// 单例实例
export const mockRunnerAdapter = new MockRunnerAdapter();