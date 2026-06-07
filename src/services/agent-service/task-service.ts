/**
 * Task Service - Agent Service MVP 核心任务管理
 *
 * Issue: #33
 */

import type { Task, AgentRun, EventLog, AuditEntry } from '../../domain/task';
import { logEvent, getTaskEvents } from './event-log';
import { logAudit } from './audit-log';
import { saveResult, getResult, type TaskResult } from './resultStore';
import { getRunnerAdapter, type RunResult } from './runnerAdapter';

// Re-export for convenience
export type { TaskResult as StoredTaskResult } from './resultStore';

// 内存存储
const tasks = new Map<string, Task>();
const runs = new Map<string, AgentRun>();

type TaskStatus = Task['status'];
type AgentRunStatus = AgentRun['status'];

/**
 * 创建任务
 */
export function createTask(input: {
  projectId: string;
  goal: string;
  acceptanceCriteria?: string[];
  workflowTemplateId?: string;
}): Task {
  const id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  const task: Task = {
    id,
    projectId: input.projectId,
    goal: input.goal,
    acceptanceCriteria: input.acceptanceCriteria || [],
    workflowTemplateId: input.workflowTemplateId || '',
    workflowStepId: '',
    assignmentId: '',
    priority: 0,
    dependsOnTaskIds: [],
    notifyTaskIds: [],
    roleAssignment: {},
    capabilityAuthorization: [],
    launchStrategy: 'direct',
    status: 'queued',
    activeRunId: null,
    createdAt: now,
    updatedAt: now,
  };

  tasks.set(id, task);

  // 记录审计日志
  logAudit({
    action: 'create_task',
    resourceId: id,
    resourceType: 'task',
    details: {
      projectId: input.projectId,
      goal: input.goal,
    },
  });

  // 记录事件日志
  logEvent({
    taskId: id,
    type: 'task_created',
    payload: {
      projectId: input.projectId,
      goal: input.goal,
    },
  });

  return task;
}

/**
 * 获取任务
 */
export function getTask(id: string): Task | undefined {
  return tasks.get(id);
}

/**
 * 列出任务
 */
export function listTasks(projectId?: string, status?: TaskStatus): Task[] {
  const all = Array.from(tasks.values());
  let filtered = projectId ? all.filter(t => t.projectId === projectId) : all;
  if (status) {
    filtered = filtered.filter(t => t.status === status);
  }
  return filtered;
}

/**
 * 更新任务状态
 */
export function updateTaskStatus(id: string, status: TaskStatus): Task | undefined {
  const task = tasks.get(id);
  if (!task) return undefined;

  const updated = { ...task, status, updatedAt: new Date().toISOString() };
  tasks.set(id, updated);

  // 记录审计日志
  logAudit({
    action: 'update_status',
    resourceId: id,
    resourceType: 'task',
    details: {
      previousStatus: task.status,
      newStatus: status,
    },
  });

  return updated;
}

/**
 * 启动任务
 */
export function startTask(id: string): { task: Task; run: AgentRun } | undefined {
  const task = tasks.get(id);
  if (!task) return undefined;

  const runId = `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  const run: AgentRun = {
    id: runId,
    projectId: task.projectId,
    taskId: id,
    workflowTemplateId: task.workflowTemplateId,
    roleId: Object.values(task.roleAssignment)[0] || 'default-role',
    modelProviderId: 'default-provider',
    modelName: 'default-model',
    currentStepId: 'step-1',
    status: 'starting',
    log: [],
    startedAt: now,
    finishedAt: null,
  };

  runs.set(runId, run);

  const previousStatus = task.status;
  const updatedTask: Task = {
    ...task,
    status: 'running',
    activeRunId: runId,
    updatedAt: now,
  };
  tasks.set(id, updatedTask);

  // 记录审计日志 - 启动任务
  logAudit({
    action: 'start_task',
    resourceId: id,
    resourceType: 'task',
    details: {
      previousStatus,
      runId,
    },
  });

  // 记录审计日志 - 创建运行
  logAudit({
    action: 'create_run',
    resourceId: runId,
    resourceType: 'run',
    details: {
      taskId: id,
    },
  });

  // 记录事件日志 - 任务启动
  logEvent({
    taskId: id,
    runId,
    type: 'task_started',
    payload: {
      runId,
    },
  });

  // 记录事件日志 - 运行启动
  logEvent({
    taskId: id,
    runId,
    type: 'run_started',
    payload: {
      roleId: run.roleId,
      modelProviderId: run.modelProviderId,
      modelName: run.modelName,
    },
  });

  // 使用 Runner Adapter 启动运行
  startRunWithAdapter(runId, id);

  return { task: updatedTask, run };
}

/**
 * 取消任务
 */
export function cancelTask(id: string): Task | undefined {
  const task = tasks.get(id);
  if (!task) return undefined;

  const runId = task.activeRunId;

  if (runId) {
    const run = runs.get(runId);
    if (run) {
      runs.set(runId, {
        ...run,
        status: 'failed',
        finishedAt: new Date().toISOString(),
      });

      // 记录审计日志 - 停止运行
      logAudit({
        action: 'stop_run',
        resourceId: runId,
        resourceType: 'run',
        details: {
          reason: 'task_cancelled',
        },
      });
    }
  }

  // 记录事件日志
  logEvent({
    taskId: id,
    runId: runId || undefined,
    type: 'task_cancelled',
    payload: {
      previousStatus: task.status,
    },
  });

  // 记录审计日志
  logAudit({
    action: 'cancel_task',
    resourceId: id,
    resourceType: 'task',
    details: {
      previousStatus: task.status,
    },
  });

  return updateTaskStatus(id, 'failed');
}

/**
 * 获取 AgentRun
 */
export function getAgentRun(id: string): AgentRun | undefined {
  return runs.get(id);
}

/**
 * 列出 AgentRun
 */
export function listAgentRuns(taskId?: string): AgentRun[] {
  const all = Array.from(runs.values());
  return taskId ? all.filter(r => r.taskId === taskId) : all;
}

/**
 * 获取任务日志（从 EventLog）
 */
export function getTaskLogs(taskId: string): EventLog[] {
  return getTaskEvents(taskId);
}

/**
 * 获取任务结果
 */
export function getTaskResult(taskId: string): TaskResult | undefined {
  return getResult(taskId);
}

/**
 * 使用 Runner Adapter 启动运行
 */
function startRunWithAdapter(runId: string, taskId: string): void {
  const run = runs.get(runId);
  if (!run) return;

  const adapter = getRunnerAdapter();

  adapter.start(
    runId,
    taskId,
    {
      runnerId: 'mock-runner',
      roleId: run.roleId,
      modelProviderId: run.modelProviderId,
      modelName: run.modelName,
    },
    {
      onLog: (id, log) => {
        const currentRun = runs.get(id);
        if (currentRun) {
          runs.set(id, { ...currentRun, log: [...currentRun.log, log] });
        }
      },
      onStatusChange: (id, status) => {
        const currentRun = runs.get(id);
        if (currentRun) {
          runs.set(id, { ...currentRun, status, finishedAt: status === 'done' ? new Date().toISOString() : null });
        }
      },
      onComplete: (id, _result) => {
        // Update task status
        const task = Array.from(tasks.values()).find(t => t.activeRunId === id);
        if (task) {
          logEvent({
            taskId: task.id,
            runId: id,
            type: 'task_completed',
            payload: {},
          });
          updateTaskStatus(task.id, 'done');
        }
      },
    }
  );
}

/**
 * 获取统计
 */
export function getStatistics() {
  const allRuns = Array.from(runs.values());
  return {
    tasks: { total: tasks.size },
    runs: {
      total: runs.size,
      active: allRuns.filter(r => r.status === 'running' || r.status === 'starting').length,
      completed: allRuns.filter(r => r.status === 'done').length,
    },
  };
}

/**
 * 停止运行（会话）
 */
export function stopRun(runId: string): AgentRun | undefined {
  const run = runs.get(runId);
  if (!run) return undefined;

  // 停止 Runner Adapter
  const adapter = getRunnerAdapter();
  adapter.stop(runId);

  const now = new Date().toISOString();

  // 更新 Run 状态
  const updatedRun: AgentRun = {
    ...run,
    status: 'failed',
    finishedAt: now,
  };
  runs.set(runId, updatedRun);

  // 记录事件日志
  logEvent({
    taskId: run.taskId,
    runId,
    type: 'run_failed',
    payload: { reason: 'session_stopped' },
  });

  // 记录审计日志
  logAudit({
    action: 'stop_run',
    resourceId: runId,
    resourceType: 'run',
    details: { reason: 'session_stopped' },
  });

  // 如果关联的任务还在运行，更新为 failed
  const task = Array.from(tasks.values()).find(t => t.activeRunId === runId);
  if (task && task.status === 'running') {
    updateTaskStatus(task.id, 'failed');
  }

  return updatedRun;
}