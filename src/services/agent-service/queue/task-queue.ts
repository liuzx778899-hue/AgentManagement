/**
 * Task Queue - 内存任务队列
 *
 * Issue: #33
 */

import type {
  Task,
  TaskStatus,
  TaskPriority,
  CreateTaskRequest,
  TaskFilter,
} from '../../domain/task';

/**
 * 队列任务项
 */
interface QueuedTask {
  task: Task;
  enqueuedAt: string;
  priority: TaskPriority;
  retryCount: number;
}

/**
 * Task Queue - FIFO 任务队列，支持优先级
 */
export class TaskQueue {
  private queue: QueuedTask[] = [];
  private tasks: Map<string, Task> = new Map();
  private processing: Map<string, Task> = new Map();

  /**
   * 创建并入队任务
   */
  enqueue(request: CreateTaskRequest): Task {
    const id = this.generateId();
    const now = new Date().toISOString();

    const task: Task = {
      id,
      projectId: request.projectId,
      goal: request.goal,
      acceptanceCriteria: request.acceptanceCriteria || [],
      status: 'queued',
      priority: request.priority || 'medium',
      sourceType: request.sourceType || 'api',
      inputs: request.inputs,
      executionConfig: request.executionConfig,
      relations: request.relations,
      workflowTemplateId: request.workflowTemplateId,
      roleAssignment: request.roleAssignment,
      capabilityAuthorization: request.capabilityAuthorization,
      createdAt: now,
      updatedAt: now,
      tags: request.tags,
    };

    this.tasks.set(id, task);

    const queuedTask: QueuedTask = {
      task,
      enqueuedAt: now,
      priority: task.priority || 'medium',
      retryCount: 0,
    };

    // 按优先级插入
    this.insertByPriority(queuedTask);

    return task;
  }

  /**
   * 按优先级插入队列
   */
  private insertByPriority(item: QueuedTask): void {
    const priorityOrder: Record<TaskPriority, number> = {
      urgent: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    const priority = priorityOrder[item.priority] ?? 2;

    let inserted = false;
    for (let i = 0; i < this.queue.length; i++) {
      const itemPriority = priorityOrder[this.queue[i].priority] ?? 2;
      if (priority < itemPriority) {
        this.queue.splice(i, 0, item);
        inserted = true;
        break;
      }
    }

    if (!inserted) {
      this.queue.push(item);
    }
  }

  /**
   * 领取任务（从队列取出）
   */
  dequeue(): Task | undefined {
    const item = this.queue.shift();
    if (!item) return undefined;

    const task = {
      ...item.task,
      status: 'pending' as TaskStatus,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.tasks.set(task.id, task);
    this.processing.set(task.id, task);

    return task;
  }

  /**
   * 查看队首任务（不移除）
   */
  peek(): Task | undefined {
    return this.queue[0]?.task;
  }

  /**
   * 获取任务
   */
  get(id: string): Task | undefined {
    return this.tasks.get(id) || this.processing.get(id);
  }

  /**
   * 更新任务状态
   */
  updateStatus(id: string, status: TaskStatus, error?: string): Task | undefined {
    const task = this.tasks.get(id) || this.processing.get(id);
    if (!task) return undefined;

    const updated: Task = {
      ...task,
      status,
      error: error ? {
        code: 'TASK_ERROR',
        message: error,
        timestamp: new Date().toISOString(),
        retryable: status === 'failed',
      } : task.error,
      updatedAt: new Date().toISOString(),
    };

    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      updated.endedAt = new Date().toISOString();
      this.processing.delete(id);
    }

    this.tasks.set(id, updated);
    return updated;
  }

  /**
   * 取消任务
   */
  cancel(id: string): Task | undefined {
    // 从队列中移除
    const index = this.queue.findIndex(item => item.task.id === id);
    if (index >= 0) {
      this.queue.splice(index, 1);
    }

    return this.updateStatus(id, 'cancelled');
  }

  /**
   * 重新入队（重试）
   */
  requeue(id: string): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;

    if (task.status !== 'failed') {
      return undefined;
    }

    const now = new Date().toISOString();
    const queuedTask: QueuedTask = {
      task: {
        ...task,
        status: 'queued',
        updatedAt: now,
        executionCount: (task.executionCount || 0) + 1,
      },
      enqueuedAt: now,
      priority: task.priority || 'medium',
      retryCount: (this.queue.find(item => item.task.id === id)?.retryCount || 0) + 1,
    };

    this.processing.delete(id);
    this.insertByPriority(queuedTask);

    return queuedTask;
  }

  /**
   * 列出队列中的任务
   */
  listQueue(): Task[] {
    return this.queue.map(item => item.task);
  }

  /**
   * 列出处理中的任务
   */
  listProcessing(): Task[] {
    return Array.from(this.processing.values());
  }

  /**
   * 列出所有任务
   */
  list(filter?: TaskFilter): Task[] {
    let tasks = [
      ...this.queue.map(item => item.task),
      ...Array.from(this.processing.values()),
      ...Array.from(this.tasks.values()).filter(t => !this.processing.has(t.id)),
    ];

    // 去重
    const taskMap = new Map<string, Task>();
    for (const task of tasks) {
      taskMap.set(task.id, task);
    }
    tasks = Array.from(taskMap.values());

    if (filter) {
      if (filter.projectId) {
        tasks = tasks.filter(t => t.projectId === filter.projectId);
      }
      if (filter.status) {
        const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
        tasks = tasks.filter(t => statuses.includes(t.status));
      }
      if (filter.priority) {
        tasks = tasks.filter(t => t.priority === filter.priority);
      }
      if (filter.search) {
        const search = filter.search.toLowerCase();
        tasks = tasks.filter(t =>
          t.goal.toLowerCase().includes(search)
        );
      }
    }

    return tasks;
  }

  /**
   * 获取队列长度
   */
  get length(): number {
    return this.queue.length;
  }

  /**
   * 获取处理中任务数
   */
  get processingCount(): number {
    return this.processing.size;
  }

  /**
   * 清空队列
   */
  clear(): void {
    this.queue = [];
    this.processing.clear();
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取统计信息
   */
  getStatistics(): {
    queued: number;
    processing: number;
    completed: number;
    failed: number;
    total: number;
  } {
    const allTasks = Array.from(this.tasks.values());
    return {
      queued: this.queue.length,
      processing: this.processing.size,
      completed: allTasks.filter(t => t.status === 'completed').length,
      failed: allTasks.filter(t => t.status === 'failed').length,
      total: allTasks.length,
    };
  }
}

// 单例实例
export const taskQueue = new TaskQueue();