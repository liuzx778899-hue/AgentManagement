/**
 * Runner API client
 */
import { apiCall, type ApiResponse } from './client';
import type { RunnerProcess, LogEntry } from '../../types/localEngineering';
import type { RunnerKind } from '../../domain/runner';

export const runnerApi = {
  start: (runnerId: string, kind: RunnerKind, cwd: string) =>
    apiCall<RunnerProcess>('POST', '/runner/start', { runnerId, kind, cwd }),

  stop: (processId: string) =>
    apiCall<void>('POST', '/runner/stop', { processId }),

  getLogs: (processId: string) =>
    apiCall<LogEntry[]>('GET', `/runner/logs/${processId}`),

  getStatus: (processId: string) =>
    apiCall<RunnerProcess>('GET', `/runner/status/${processId}`),

  list: () =>
    apiCall<RunnerProcess[]>('GET', '/runner/list'),
};
