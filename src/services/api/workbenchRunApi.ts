/**
 * Workbench Run API Client
 *
 * 工作台运行会话 API
 */
import { apiCall, type ApiResponse } from './client';
import type { Task, AgentRun } from '../../domain/task';
import type { RunnerProcess, LogEntry } from '../../types/localEngineering';

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
export interface StartTaskInput {
  taskId: string;
  runnerKind?: 'claude-code' | 'codex-cli' | 'cursor-cli' | 'gemini-cli' | 'custom';
}

export const workbenchRunApi = {
  /**
   * 启动任务
   */
  startTask: (input: StartTaskInput) =>
    apiCall<WorkbenchRunSession>('POST', '/workbench-runs/start', input),

  /**
   * 停止任务
   */
  stopTask: (taskId: string) =>
    apiCall<WorkbenchRunSession>('POST', '/workbench-runs/stop', { taskId }),

  /**
   * 获取任务运行会话
   */
  getSession: (taskId: string) =>
    apiCall<WorkbenchRunSession>('GET', `/workbench-runs/session/${taskId}`),

  /**
   * 获取任务日志
   */
  getLogs: (taskId: string) =>
    apiCall<LogEntry[]>('GET', `/workbench-runs/logs/${taskId}`),
};