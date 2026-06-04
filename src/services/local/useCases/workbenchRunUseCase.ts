/**
 * Workbench Run Use Case
 *
 * 编排工作台 Runner 启动、日志轮询和状态同步
 *
 * 关系：
 * Task.activeRunId -> AgentRun.id
 * AgentRun.processId -> RunnerProcess.id
 */
import type { ProcessRunnerAdapter } from '../adapters/processRunnerAdapter';
import type { LocalResult, LogEntry, RunnerProcess } from '../../../types/localEngineering';
import type { Task, AgentRun } from '../../../domain/task';
import type { Project } from '../../../domain/project';
import type { Workflow } from '../../../domain/workflow';
import type { RunnerKind } from '../../../domain/runner';
import { startRunnerProcess, stopRunnerProcess, getProcessStatus, getProcessLogs } from './runnerUseCase';

/**
 * 工作台运行会话
 */
export interface WorkbenchRunSession {
  task: Task;
  agentRun: AgentRun | null;
  process: RunnerProcess | null;
  logs: LogEntry[];
}

/**
 * 启动任务配置
 */
export interface StartTaskConfig {
  taskId: string;
  projectId: string;
  project: Project;
  workflow: Workflow;
  runnerKind: RunnerKind;
  cwd: string;
  env?: Record<string, string>;
}

/**
 * AgentRun 存储（简化版，实际应该持久化）
 */
const agentRuns = new Map<string, AgentRun>();
const taskRunIndex = new Map<string, string>(); // taskId -> agentRunId

/**
 * 生成 AgentRun ID
 */
function generateRunId(): string {
  return `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 启动任务
 *
 * 流程：
 * 1. 检查是否已有 running session
 * 2. 获取 Task、Project、Workflow 配置
 * 3. 解析角色、Runner、模型配置
 * 4. 启动 Runner 进程
 * 5. 创建 AgentRun
 * 6. 更新 Task.activeRunId
 * 7. 返回 WorkbenchRunSession
 */
export async function startWorkbenchTask(
  adapter: ProcessRunnerAdapter,
  config: StartTaskConfig,
  existingTask: Task
): Promise<LocalResult<WorkbenchRunSession>> {
  const { taskId, projectId, project, workflow, runnerKind, cwd, env } = config;

  // 检查是否已有 running session
  const existingRunId = taskRunIndex.get(taskId);
  if (existingRunId) {
    const existingRun = agentRuns.get(existingRunId);
    if (existingRun && existingRun.status === 'running') {
      // 已有运行中的 session，返回现有状态
      const processResult = await getProcessStatus(adapter, existingRun.processId);
      const logsResult = await getProcessLogs(adapter, existingRun.processId);
      return {
        ok: true,
        data: {
          task: existingTask,
          agentRun: existingRun,
          process: processResult.ok ? processResult.data! : null,
          logs: logsResult.ok ? logsResult.data! : [],
        },
        diagnostics: ['复用现有 running session'],
      };
    }
    // 标记旧 run 为 stale
    if (existingRun) {
      existingRun.status = 'stale';
      agentRuns.set(existingRunId, existingRun);
    }
  }

  // 获取第一个步骤的配置
  const firstStep = workflow.steps?.[0];
  if (!firstStep) {
    return {
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'Workflow 没有步骤',
        recoverable: false,
      },
    };
  }

  // 解析 Runner ID
  const runnerId = `runner-${firstStep.roleId}`;
  const roleId = firstStep.roleId;

  // 构建环境变量
  const runId = generateRunId();
  const runEnv: Record<string, string> = {
    ...env,
    AGENT_PROJECT_ID: projectId,
    AGENT_TASK_ID: taskId,
    AGENT_RUN_ID: runId,
    AGENT_ROLE_ID: roleId,
    AGENT_WORKFLOW_TEMPLATE_ID: workflow.id,
    AGENT_WORKFLOW_STEP_ID: firstStep.id,
  };

  // 启动 Runner 进程
  const startResult = await startRunnerProcess(adapter, {
    runnerId,
    runnerKind,
    command: '', // 使用默认命令
    args: [],
    cwd,
    env: runEnv,
    stepContext: {
      stepId: firstStep.id,
      workflowId: workflow.id,
      projectId,
    },
  });

  if (!startResult.ok) {
    return {
      ok: false,
      error: startResult.error,
      diagnostics: ['Runner 启动失败'],
    };
  }

  const process = startResult.data!;

  // 创建 AgentRun
  const agentRun: AgentRun = {
    id: runId,
    projectId,
    taskId,
    workflowTemplateId: workflow.id,
    workflowStepId: firstStep.id,
    roleId,
    runnerId,
    processId: process.id,
    modelProviderId: 'default',
    modelName: 'claude-sonnet-4-6',
    currentStepId: firstStep.id,
    status: 'running',
    log: [],
    startedAt: new Date().toISOString(),
    finishedAt: null,
  };

  // 存储
  agentRuns.set(runId, agentRun);
  taskRunIndex.set(taskId, runId);

  // 返回 session
  return {
    ok: true,
    data: {
      task: existingTask,
      agentRun,
      process,
      logs: [],
    },
    diagnostics: ['Runner 启动成功', `Process ID: ${process.id}`],
  };
}

/**
 * 停止任务
 */
export async function stopWorkbenchTask(
  adapter: ProcessRunnerAdapter,
  taskId: string,
  existingTask: Task
): Promise<LocalResult<WorkbenchRunSession>> {
  const runId = taskRunIndex.get(taskId);
  if (!runId) {
    return {
      ok: false,
      error: {
        code: 'TASK_NOT_FOUND',
        message: '没有运行中的 session',
        recoverable: false,
      },
    };
  }

  const agentRun = agentRuns.get(runId);
  if (!agentRun) {
    return {
      ok: false,
      error: {
        code: 'TASK_NOT_FOUND',
        message: 'AgentRun 不存在',
        recoverable: false,
      },
    };
  }

  // 停止进程
  const stopResult = await stopRunnerProcess(adapter, agentRun.processId);

  // 更新状态
  agentRun.status = 'stopped';
  agentRun.finishedAt = new Date().toISOString();
  if (stopResult.ok && stopResult.data) {
    agentRun.exitCode = stopResult.data.exitCode;
  }
  agentRuns.set(runId, agentRun);

  // 获取最终日志
  const logsResult = await getProcessLogs(adapter, agentRun.processId);

  return {
    ok: true,
    data: {
      task: existingTask,
      agentRun,
      process: stopResult.ok ? stopResult.data! : null,
      logs: logsResult.ok ? logsResult.data! : [],
    },
    diagnostics: ['任务已停止'],
  };
}

/**
 * 获取任务运行会话
 */
export async function getWorkbenchSession(
  adapter: ProcessRunnerAdapter,
  taskId: string,
  existingTask: Task
): Promise<LocalResult<WorkbenchRunSession>> {
  const runId = taskRunIndex.get(taskId);
  if (!runId) {
    return {
      ok: true,
      data: {
        task: existingTask,
        agentRun: null,
        process: null,
        logs: [],
      },
    };
  }

  const agentRun = agentRuns.get(runId);
  if (!agentRun) {
    return {
      ok: true,
      data: {
        task: existingTask,
        agentRun: null,
        process: null,
        logs: [],
      },
    };
  }

  // 获取进程状态
  const processResult = await getProcessStatus(adapter, agentRun.processId);
  const logsResult = await getProcessLogs(adapter, agentRun.processId);

  // 同步状态
  if (processResult.ok && processResult.data) {
    const process = processResult.data;
    if (process.state === 'stopped' || process.state === 'failed') {
      if (agentRun.status === 'running') {
        agentRun.status = process.state === 'stopped' ? 'done' : 'failed';
        agentRun.finishedAt = new Date().toISOString();
        agentRun.exitCode = process.exitCode;
        agentRuns.set(runId, agentRun);
      }
    }
  }

  return {
    ok: true,
    data: {
      task: existingTask,
      agentRun,
      process: processResult.ok ? processResult.data! : null,
      logs: logsResult.ok ? logsResult.data! : [],
    },
  };
}

/**
 * 获取任务日志
 */
export async function getWorkbenchLogs(
  adapter: ProcessRunnerAdapter,
  taskId: string
): Promise<LocalResult<LogEntry[]>> {
  const runId = taskRunIndex.get(taskId);
  if (!runId) {
    return {
      ok: true,
      data: [],
    };
  }

  const agentRun = agentRuns.get(runId);
  if (!agentRun) {
    return {
      ok: true,
      data: [],
    };
  }

  return getProcessLogs(adapter, agentRun.processId);
}

/**
 * 列出所有运行中的 AgentRun
 */
export function listRunningAgentRuns(): AgentRun[] {
  return Array.from(agentRuns.values()).filter(run => run.status === 'running');
}

/**
 * 获取指定项目的 AgentRun
 */
export function listProjectAgentRuns(projectId: string): AgentRun[] {
  return Array.from(agentRuns.values()).filter(run => run.projectId === projectId);
}
