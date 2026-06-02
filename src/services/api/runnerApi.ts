/**
 * Runner API client
 */
import { apiCall, type ApiResponse } from './client';
import type { RunnerProcess, LogEntry } from '../../types/localEngineering';
import type { RunnerKind } from '../../domain/runner';

export interface RunnerStartParams {
  runnerId: string;
  kind: RunnerKind;
  cwd: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  timeout?: number;
}

export const runnerApi = {
  start: (params: RunnerStartParams) =>
    apiCall<RunnerProcess>('POST', '/runner/start', params),

  stop: (processId: string) =>
    apiCall<void>('POST', '/runner/stop', { processId }),

  getLogs: (processId: string) =>
    apiCall<LogEntry[]>('GET', `/runner/logs/${processId}`),

  getStatus: (processId: string) =>
    apiCall<RunnerProcess>('GET', `/runner/status/${processId}`),

  list: () =>
    apiCall<RunnerProcess[]>('GET', '/runner/list'),
};
