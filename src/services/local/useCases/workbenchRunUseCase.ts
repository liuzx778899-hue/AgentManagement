/**
 * Workbench Run UseCase - Issue #28
 *
 * 工作台任务启动编排层，负责：
 * 1. 解析 Task/Project/WorkflowTemplate 配置
 * 2. 启动 Runner 进程
 * 3. 创建 AgentRun 记录
 * 4. 更新 Task 状态
 */

import type { Project } from '../../../domain/project';
import type { WorkflowTemplate, WorkflowStep } from '../../../domain/workbench';
import type { Task, AgentRun } from '../../../domain/task';
import type { RunnerProfile } from '../../../domain/runner';
import type { WorkbenchRunSession, StopTaskResult } from '../../../domain/workbenchRun';
import type { RunnerProcess, LogEntry } from '../../../types/localEngineering';
import type { ProcessRunnerAdapter } from '../adapters/processRunnerAdapter';
import type { ProcessStartConfig } from '../adapters/processRunnerAdapter';
import { randomUUID } from 'crypto';

export interface WorkbenchRunUseCaseDeps {
  projectRepo: any;
  taskRepo: any;
  workflowRepo: any;
  agentRunRepo: any;
  processRunner: ProcessRunnerAdapter;
}

/**
 * 启动任务编排
 */
export async function startTask(
  deps: WorkbenchRunUseCaseDeps,
  taskId: string
): Promise<WorkbenchRunSession> {
  const { taskRepo, projectRepo, workflowRepo, agentRunRepo, processRunner } = deps;

  // 1. 加载 Task
  const taskResult = await taskRepo.load(taskId);
  if (!taskResult.ok || !taskResult.data) {
    throw new Error(`Task not found: ${taskId}`);
  }
  const task = taskResult.data;

  // 2. 检查是否已有 running session
  if (task.activeRunId) {
    const existingRunResult = await agentRunRepo.load(task.activeRunId);
    if (existingRunResult.ok && existingRunResult.data && existingRunResult.data.status === 'running') {
      // 返回现有 session，不重复启动
      const existingRun = existingRunResult.data;
      let process: RunnerProcess | null = null;
      if (existingRun.processId) {
        const processResult = await processRunner.getStatus(existingRun.processId);
        if (processResult.ok && processResult.data) {
          process = processResult.data;
        }
      }
      const logs: LogEntry[] = process?.logs ?? [];
      return { task, agentRun: existingRun, process, logs };
    } else if (existingRunResult.ok && existingRunResult.data) {
      // 标记旧 run 为 stale
      await agentRunRepo.update(existingRunResult.data.id, { status: 'stale' });
    }
  }

  // 3. 加载 Project
  const projectResult = await projectRepo.load(task.projectId);
  if (!projectResult.ok || !projectResult.data) {
    throw new Error(`Project not found: ${task.projectId}`);
  }
  const project = projectResult.data;

  // 4. 加载 WorkflowTemplate
  const workflowResult = await workflowRepo.load(task.workflowTemplateId);
  if (!workflowResult.ok || !workflowResult.data) {
    throw new Error(`Workflow not found: ${task.workflowTemplateId}`);
  }
  const workflow = workflowResult.data;

  // 5. 解析当前步骤和角色配置
  const stepId = task.workflowStepId ?? workflow.steps[0]?.id;
  const step = workflow.steps.find((s: WorkflowStep) => s.id === stepId) ?? workflow.steps[0];
  if (!step) {
    throw new Error('Workflow has no steps');
  }

  // 从 assignments 获取配置
  const assignment = step.assignments?.[0];
  if (!assignment) {
    throw new Error(`Step ${step.id} has no assignments`);
  }

  // 6. 构建启动上下文
  const runnerId = assignment.runnerId ?? 'runner-claude-code';

  // 7. 构建环境变量
  const env: Record<string, string> = {
    AGENT_PROJECT_ID: task.projectId,
    AGENT_TASK_ID: task.id,
    AGENT_WORKFLOW_TEMPLATE_ID: workflow.id,
    AGENT_WORKFLOW_STEP_ID: step.id,
    AGENT_ASSIGNMENT_ID: assignment.id,
    AGENT_ROLE_ID: assignment.roleId,
  };

  // 8. 启动 Runner 进程
  const now = new Date().toISOString();
  const startConfig: ProcessStartConfig = {
    runnerId,
    command: runnerId.includes('claude') ? 'claude' :
             runnerId.includes('codex') ? 'codex' :
             runnerId.includes('cursor') ? 'cursor' :
             runnerId.includes('gemini') ? 'gemini' : 'bash',
    args: [`--task=${task.id}`],
    cwd: project.repoPath,
    env,
  };

  const processResult = await processRunner.start(startConfig);

  if (!processResult.ok || !processResult.data) {
    // 启动失败，创建 failed AgentRun
    const failedRun: AgentRun = {
      id: randomUUID(),
      projectId: task.projectId,
      taskId: task.id,
      workflowTemplateId: workflow.id,
      workflowStepId: step.id,
      assignmentId: assignment.id,
      roleId: assignment.roleId,
      modelProviderId: assignment.modelProviderId,
      modelName: assignment.modelName,
      runnerId,
      currentStepId: step.id,
      status: 'failed',
      log: [`Failed to start runner: ${processResult.error?.message ?? 'Unknown error'}`],
      startedAt: now,
      finishedAt: now,
      errorMessage: processResult.error?.message,
      exitCode: 1,
    };
    await agentRunRepo.save(failedRun);
    await taskRepo.update(task.id, { status: 'failed', activeRunId: failedRun.id });
    return { task: { ...task, status: 'failed', activeRunId: failedRun.id }, agentRun: failedRun, process: null, logs: [] };
  }

  const runnerProcess = processResult.data;

  // 9. 创建 AgentRun 记录
  const agentRun: AgentRun = {
    id: randomUUID(),
    projectId: task.projectId,
    taskId: task.id,
    workflowTemplateId: workflow.id,
    workflowStepId: step.id,
    assignmentId: assignment.id,
    roleId: assignment.roleId,
    modelProviderId: assignment.modelProviderId,
    modelName: assignment.modelName,
    runnerId,
    processId: runnerProcess.id,
    currentStepId: step.id,
    status: 'running',
    log: [],
    startedAt: now,
    finishedAt: null,
  };

  await agentRunRepo.save(agentRun);

  // 10. 更新 Task 状态
  await taskRepo.update(task.id, { status: 'running', activeRunId: agentRun.id });

  return {
    task: { ...task, status: 'running', activeRunId: agentRun.id },
    agentRun,
    process: runnerProcess,
    logs: [],
  };
}

/**
 * 获取运行会话
 */
export async function getSession(
  deps: WorkbenchRunUseCaseDeps,
  taskId: string
): Promise<WorkbenchRunSession | null> {
  const { taskRepo, agentRunRepo, processRunner } = deps;

  const taskResult = await taskRepo.load(taskId);
  if (!taskResult.ok || !taskResult.data) return null;
  const task = taskResult.data;

  if (!task.activeRunId) {
    return { task, agentRun: null, process: null, logs: [] };
  }

  const agentRunResult = await agentRunRepo.load(task.activeRunId);
  if (!agentRunResult.ok || !agentRunResult.data) {
    return { task, agentRun: null, process: null, logs: [] };
  }
  const agentRun = agentRunResult.data;

  if (!agentRun.processId) {
    return { task, agentRun, process: null, logs: [] };
  }

  const processResult = await processRunner.getStatus(agentRun.processId);
  const process = processResult.ok && processResult.data ? processResult.data : null;
  const logs: LogEntry[] = process?.logs ?? [];

  return { task, agentRun, process, logs };
}

/**
 * 停止任务
 */
export async function stopTask(
  deps: WorkbenchRunUseCaseDeps,
  taskId: string,
  result?: StopTaskResult
): Promise<void> {
  const { taskRepo, agentRunRepo, processRunner } = deps;

  const taskResult = await taskRepo.load(taskId);
  if (!taskResult.ok || !taskResult.data) return;
  const task = taskResult.data;

  if (!task.activeRunId) return;

  const agentRunResult = await agentRunRepo.load(task.activeRunId);
  if (!agentRunResult.ok || !agentRunResult.data) return;
  const agentRun = agentRunResult.data;

  // 停止进程
  if (agentRun.processId) {
    await processRunner.stop(agentRun.processId);
  }

  // 更新 AgentRun 状态
  const finalStatus = result?.status ?? 'stopped';
  const now = new Date().toISOString();
  await agentRunRepo.update(agentRun.id, {
    status: finalStatus,
    finishedAt: now,
    exitCode: result?.exitCode,
    errorMessage: result?.errorMessage,
  });

  // 更新 Task 状态
  const taskStatus = finalStatus === 'done' ? 'done' :
                     finalStatus === 'failed' ? 'failed' : 'queued';
  await taskRepo.update(task.id, { status: taskStatus, activeRunId: null });
}

/**
 * 同步进程状态
 */
export async function syncProcessState(
  deps: WorkbenchRunUseCaseDeps,
  taskId: string
): Promise<void> {
  const { taskRepo, agentRunRepo, processRunner } = deps;

  const taskResult = await taskRepo.load(taskId);
  if (!taskResult.ok || !taskResult.data) return;
  const task = taskResult.data;

  if (!task.activeRunId) return;

  const agentRunResult = await agentRunRepo.load(task.activeRunId);
  if (!agentRunResult.ok || !agentRunResult.data) return;
  const agentRun = agentRunResult.data;

  if (agentRun.status !== 'running') return;

  if (!agentRun.processId) {
    // 进程丢失，标记为 stale
    await agentRunRepo.update(agentRun.id, { status: 'stale' });
    await taskRepo.update(task.id, { status: 'queued', activeRunId: null });
    return;
  }

  const processResult = await processRunner.getStatus(agentRun.processId);
  if (!processResult.ok || !processResult.data) {
    await agentRunRepo.update(agentRun.id, { status: 'stale' });
    await taskRepo.update(task.id, { status: 'queued', activeRunId: null });
    return;
  }

  const process = processResult.data;
  if (process.state === 'stopped' || process.state === 'failed') {
    const now = new Date().toISOString();
    const finalStatus = process.exitCode === 0 ? 'done' : 'failed';
    await agentRunRepo.update(agentRun.id, {
      status: finalStatus,
      finishedAt: now,
      exitCode: process.exitCode,
    });
    const taskStatus = finalStatus === 'done' ? 'done' : 'failed';
    await taskRepo.update(task.id, { status: taskStatus, activeRunId: null });
  }
}
