/**
 * Event Log Service - 事件日志服务
 *
 * Issue: #33
 */

import type {
  WorkflowEvent,
  WorkflowEventType,
  CreateWorkflowEventRequest,
  WorkflowEventFilter,
} from '../../domain/workflowEvent';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Event Log Service - 事件持久化与查询
 */
export class EventLogService {
  private events: Map<string, WorkflowEvent> = new Map();
  private eventLogPath?: string;
  private subscribers: Map<string, (event: WorkflowEvent) => void> = new Map();

  constructor(eventLogPath?: string) {
    this.eventLogPath = eventLogPath;
    if (eventLogPath) {
      this.ensureLogDirectory();
    }
  }

  /**
   * 发送事件
   */
  async emit(request: CreateWorkflowEventRequest): Promise<WorkflowEvent> {
    const eventId = this.generateId();
    const now = new Date().toISOString();

    const event: WorkflowEvent = {
      eventId,
      type: request.type,
      source: request.source || 'system',
      priority: request.priority || 'medium',
      projectId: request.projectId,
      workflowInstanceId: request.workflowInstanceId,
      workflowTemplateId: request.workflowTemplateId,
      stepId: request.stepId,
      taskId: request.taskId,
      agentRunId: request.agentRunId,
      sourceRoleId: request.sourceRoleId,
      targetRoleIds: request.targetRoleIds,
      summary: request.summary,
      detail: request.detail,
      payload: request.payload,
      createdAt: now,
      metadata: request.metadata,
    };

    // 内存存储
    this.events.set(eventId, event);

    // 文件追加
    if (this.eventLogPath) {
      await this.appendToFile(event);
    }

    // 通知订阅者
    this.notifySubscribers(event);

    return event;
  }

  /**
   * 获取事件
   */
  get(eventId: string): WorkflowEvent | undefined {
    return this.events.get(eventId);
  }

  /**
   * 列出事件
   */
  list(filter?: WorkflowEventFilter): WorkflowEvent[] {
    let events = Array.from(this.events.values());

    if (filter) {
      if (filter.projectId) {
        events = events.filter(e => e.projectId === filter.projectId);
      }
      if (filter.workflowInstanceId) {
        events = events.filter(e => e.workflowInstanceId === filter.workflowInstanceId);
      }
      if (filter.taskId) {
        events = events.filter(e => e.taskId === filter.taskId);
      }
      if (filter.type) {
        const types = Array.isArray(filter.type) ? filter.type : [filter.type];
        events = events.filter(e => types.includes(e.type));
      }
      if (filter.createdAfter) {
        events = events.filter(e => e.createdAt >= filter.createdAfter!);
      }
      if (filter.createdBefore) {
        events = events.filter(e => e.createdAt <= filter.createdBefore!);
      }
    }

    // 按时间倒序排列
    return events.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /**
   * 订阅事件
   */
  subscribe(
    subscriberId: string,
    callback: (event: WorkflowEvent) => void,
    eventTypes?: WorkflowEventType[]
  ): () => void {
    this.subscribers.set(subscriberId, callback);

    // 返回取消订阅函数
    return () => {
      this.subscribers.delete(subscriberId);
    };
  }

  /**
   * 通知订阅者
   */
  private notifySubscribers(event: WorkflowEvent): void {
    for (const callback of this.subscribers.values()) {
      try {
        callback(event);
      } catch (error) {
        console.error('Event subscriber error:', error);
      }
    }
  }

  /**
   * 追加到文件
   */
  private async appendToFile(event: WorkflowEvent): Promise<void> {
    if (!this.eventLogPath) return;

    const line = JSON.stringify(event) + '\n';
    await fs.promises.appendFile(this.eventLogPath, line, 'utf-8');
  }

  /**
   * 确保日志目录存在
   */
  private ensureLogDirectory(): void {
    if (!this.eventLogPath) return;

    const dir = path.dirname(this.eventLogPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取统计信息
   */
  getStatistics(): {
    total: number;
    byType: Record<string, number>;
    bySource: Record<string, number>;
  } {
    const events = Array.from(this.events.values());
    const byType: Record<string, number> = {};
    const bySource: Record<string, number> = {};

    for (const event of events) {
      byType[event.type] = (byType[event.type] || 0) + 1;
      bySource[event.source] = (bySource[event.source] || 0) + 1;
    }

    return {
      total: events.length,
      byType,
      bySource,
    };
  }

  /**
   * 清理过期事件
   */
  cleanupExpired(maxAgeMs: number): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, event] of this.events) {
      const age = now - new Date(event.createdAt).getTime();
      if (age > maxAgeMs) {
        this.events.delete(id);
        cleaned++;
      }
    }

    return cleaned;
  }
}

// 单例实例
export const eventLogService = new EventLogService();