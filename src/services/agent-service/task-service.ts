/**
 * Task Service - Agent Service MVP 核心任务管理
 *
 * Issue: #33
 */

import type { Task, AgentRun } from '../../domain/task';

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
    roleAssignment: {},
    capabilityAuthorization: [],
    launchStrategy: 'direct',
    status: 'draft',
    activeRunId: null,
    createdAt: now,
    updatedAt: now,
  };

  tasks.set(id, task);
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
export function listTasks(projectId?: string): Task[] {
  const all = Array.from(tasks.values());
  return projectId ? all.filter(t => t.projectId === projectId) : all;
}

/**
 * 更新任务状态
 */
export function updateTaskStatus(id: string, status: TaskStatus): Task | undefined {
  const task = tasks.get(id);
  if (!task) return undefined;

  const updated = { ...task, status, updatedAt: new Date().toISOString() };
  tasks.set(id, updated);
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
    taskId: id,
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

  const updatedTask: Task = {
    ...task,
    status: 'running',
    activeRunId: runId,
    updatedAt: now,
  };
  tasks.set(id, updatedTask);

  // 模拟进度
  simulateRunProgress(runId);

  return { task: updatedTask, run };
}

/**
 * 取消任务
 */
export function cancelTask(id: string): Task | undefined {
  const task = tasks.get(id);
  if (!task) return undefined;

  if (task.activeRunId) {
    const run = runs.get(task.activeRunId);
    if (run) {
      runs.set(task.activeRunId, {
        ...run,
        status: 'failed',
        finishedAt: new Date().toISOString(),
      });
    }
  }

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
 * 模拟 Run 进度
 */
async function simulateRunProgress(runId: string): Promise<void> {
  // 更新为 running
  const run = runs.get(runId);
  if (run) {
    runs.set(runId, { ...run, status: 'running' });
  }

  // 添加日志
  const logs = [
    `[${new Date().toISOString()}] Starting agent...`,
    `[${new Date().toISOString()}] Loading config...`,
    `[${new Date().toISOString()}] Processing task...`,
    `[${new Date().toISOString()}] Task completed.`,
  ];

  for (const log of logs) {
    const currentRun = runs.get(runId);
    if (currentRun) {
      runs.set(runId, { ...currentRun, log: [...currentRun.log, log] });
    }
    await new Promise(r => setTimeout(r, 500));
  }

  // 完成
  const finalRun = runs.get(runId);
  if (finalRun) {
    runs.set(runId, {
      ...finalRun,
      status: 'done',
      finishedAt: new Date().toISOString(),
    });
  }

  // 更新关联任务
  const task = Array.from(tasks.values()).find(t => t.activeRunId === runId);
  if (task) {
    updateTaskStatus(task.id, 'done');
  }
}

/**
 * 获取统计
 */
export function getStatistics() {
  return {
    tasks: { total: tasks.size },
    runs: { total: runs.size },
  };
}
