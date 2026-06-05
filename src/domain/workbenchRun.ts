/**
 * Workbench Run Session - Issue #28
 *
 * 工作台运行会话，聚合 Task、AgentRun、RunnerProcess 和日志
 */

import type { Task, AgentRun } from './task';
import type { RunnerProcess, LogEntry } from '../types/localEngineering';

export type { RunnerProcess, LogEntry };

export interface WorkbenchRunSession {
  task: Task;
  agentRun: AgentRun | null;
  process: RunnerProcess | null;
  logs: LogEntry[];
}

export interface StartTaskInput {
  taskId: string;
}

export interface StopTaskResult {
  taskId: string;
  status: 'done' | 'failed' | 'stopped';
  exitCode?: number;
  errorMessage?: string;
}
