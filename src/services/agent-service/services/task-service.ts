/**
 * Task Service - 任务管理服务
 *
 * Issue: #33
 */

import type {
  Task,
  TaskStatus,
  CreateTaskRequest,
  TaskFilter,
} from '../../../domain/task';
import { taskQueue } from '../queue/task-queue';
import { mockRunnerAdapter } from '../adapters/mock-runner-adapter';
import { eventLogService } from './event-log-service';
import { auditLogService } from './audit-log-service';
import type { AuditEventType } from '../../../domain/audit';

/**
 * Task Service - 任务管理核心服务
 */
export class TaskService {
  /**
   * 创建任务
   */
  async createTask(request: CreateTaskRequest): Promise<Task> {
    // 入队任务
    const task = taskQueue.enqueue(request);

    // 记录审计
    await auditLogService.log({
      eventType: 'task.created' as AuditEventType,
      result: 'success',
      actor: {
        type: 'api',
        id: 'system',
      },
      resource: {
        type: 'task',
        id: task.id,
        name: task.goal,
      },
      projectId: task.projectId,
      taskId: task.id,
      description: `Task created: ${task.goal}`,
    });

    // 记录事件
    await eventLogService.emit({
      type: 'task.created',
      source: 'task',
      projectId: task.projectId,
      taskId: task.id,
      summary: `Task created: ${task.goal}`,
      payload: {
        task: {
          id: task.id,
          goal: task.goal,
          status: task.status,
        },
      },
    });

    return task;
  }

  /**
   * 获取任务
   */
  getTask(taskId: string): Task | undefined {
    return taskQueue.get(taskId);
  }

  /**
   * 启动任务
   */
  async startTask(taskId: string): Promise<Task> {
    const task = taskQueue.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    if (task.status !== 'queued' && task.status !== 'pending') {
      throw new Error(`Task ${taskId} is not in a startable state: ${task.status}`);
    }

    // 更新状态为运行中
    const updated = taskQueue.updateStatus(taskId, 'running');
    if (!updated) {
      throw new Error(`Failed to update task ${taskId} status`);
    }

    // 启动 Mock Runner Session
    const session = await mockRunnerAdapter.startSession({
      taskId,
      runnerId: 'mock-runner',
    });

    // 更新任务的 activeRunId
    updated.activeRunId = session.id;
    updated.startedAt = new Date().toISOString();

    // 记录审计
    await auditLogService.log({
      eventType: 'task.started' as AuditEventType,
      result: 'success',
      actor: {
        type: 'api',
        id: 'system',
      },
      resource: {
        type: 'task',
        id: taskId,
      },
      projectId: task.projectId,
      taskId,
      runnerSessionId: session.id,
      description: `Task started: ${task.goal}`,
    });

    // 记录事件
    await eventLogService.emit({
      type: 'task.started',
      source: 'task',
      projectId: task.projectId,
      taskId,
      summary: `Task started: ${task.goal}`,
    });

    return updated;
  }

  /**
   * 取消任务
   */
  async cancelTask(taskId: string): Promise<Task> {
    const task = taskQueue.cancel(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    // 停止关联的 Runner Session
    if (task.activeRunId) {
      await mockRunnerAdapter.stopSession(task.activeRunId);
    }

    // 记录审计
    await auditLogService.log({
      eventType: 'task.cancelled' as AuditEventType,
      result: 'success',
      actor: {
        type: 'api',
        id: 'system',
      },
      resource: {
        type: 'task',
        id: taskId,
      },
      projectId: task.projectId,
      taskId,
      description: `Task cancelled: ${task.goal}`,
    });

    // 记录事件
    await eventLogService.emit({
      type: 'task.cancelled',
      source: 'task',
      projectId: task.projectId,
      taskId,
      summary: `Task cancelled: ${task.goal}`,
    });

    return task;
  }

  /**
   * 重试任务
   */
  async retryTask(taskId: string): Promise<Task> {
    const task = taskQueue.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    if (task.status !== 'failed') {
      throw new Error(`Task ${taskId} is not in a retryable state: ${task.status}`);
    }

    // 重新入队
    const queued = taskQueue.requeue(taskId);
    if (!queued) {
      throw new Error(`Failed to requeue task ${taskId}`);
    }

    // 记录审计
    await auditLogService.log({
      eventType: 'task.retried' as AuditEventType,
      result: 'success',
      actor: {
        type: 'api',
        id: 'system',
      },
      resource: {
        type: 'task',
        id: taskId,
      },
      projectId: task.projectId,
      taskId,
      description: `Task retried: ${task.goal}`,
    });

    return queued;
  }

  /**
   * 列出任务
   */
  listTasks(filter?: TaskFilter): Task[] {
    return taskQueue.list(filter);
  }

  /**
   * 获取任务日志
   */
  getTaskLogs(taskId: string): string[] {
    const task = taskQueue.get(taskId);
    if (!task || !task.activeRunId) {
      return [];
    }

    const events = mockRunnerAdapter.getEvents(task.activeRunId);
    return events
      .filter(e => e.type === 'log')
      .map(e => e.logContent || '');
  }

  /**
   * 获取任务事件
   */
  getTaskEvents(taskId: string) {
    const task = taskQueue.get(taskId);
    if (!task || !task.activeRunId) {
      return [];
    }

    return mockRunnerAdapter.getEvents(task.activeRunId);
  }

  /**
   * 获取任务结果
   */
  getTaskResult(taskId: string): {
    status: TaskStatus;
    artifacts?: Array<{ id: string; name: string; path: string }>;
    error?: string;
  } {
    const task = taskQueue.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    const artifacts: Array<{ id: string; name: string; path: string }> = [];

    if (task.activeRunId) {
      const events = mockRunnerAdapter.getEvents(task.activeRunId);
      for (const event of events) {
        if (event.type === 'artifact_created' && event.artifact) {
          artifacts.push(event.artifact);
        }
      }
    }

    return {
      status: task.status,
      artifacts,
      error: task.error?.message,
    };
  }

  /**
   * 获取队列统计
   */
  getQueueStatistics() {
    return taskQueue.getStatistics();
  }

  /**
   * 处理完成的任务
   */
  async processCompletedSession(sessionId: string): Promise<void> {
    const events = mockRunnerAdapter.getEvents(sessionId);
    const session = mockRunnerAdapter.getSession(sessionId);

    if (!session) return;

    const lastEvent = events[events.length - 1];
    if (!lastEvent) return;

    if (lastEvent.type === 'completed') {
      await taskQueue.updateStatus(session.taskId, 'completed');

      await eventLogService.emit({
        type: 'task.completed',
        source: 'task',
        projectId: session.taskId,
        taskId: session.taskId,
        summary: `Task completed successfully`,
      });
    } else if (lastEvent.type === 'failed') {
      await taskQueue.updateStatus(session.taskId, 'failed', lastEvent.errorMessage);

      await eventLogService.emit({
        type: 'task.failed',
        source: 'task',
        projectId: session.taskId,
        taskId: session.taskId,
        summary: `Task failed: ${lastEvent.errorMessage}`,
        payload: {
          task: {
            id: session.taskId,
            error: lastEvent.errorMessage,
          },
        },
      });
    }
  }
}

// 单例实例
export const taskService = new TaskService();