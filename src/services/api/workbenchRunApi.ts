/**
 * Workbench Run API Client - Issue #28
 *
 * 工作台任务运行会话 API
 */

import { apiCall, type ApiResponse } from './client';
import type { WorkbenchRunSession, StopTaskResult } from '../../domain/workbenchRun';

export const workbenchRunApi = {
  /**
   * 启动任务
   */
  startTask: (taskId: string) =>
    apiCall<WorkbenchRunSession>('POST', '/workbench-runs/start', { taskId }),

  /**
   * 停止任务
   */
  stopTask: (taskId: string, result?: StopTaskResult) =>
    apiCall<void>('POST', '/workbench-runs/stop', { taskId, result }),

  /**
   * 获取运行会话
   */
  getSession: (taskId: string) =>
    apiCall<WorkbenchRunSession>('GET', `/workbench-runs/session/${taskId}`),

  /**
   * 获取日志
   */
  getLogs: (taskId: string, since?: string) =>
    apiCall<{ logs: { timestamp: string; stream: 'stdout' | 'stderr'; content: string }[] }>(
      'GET',
      since ? `/workbench-runs/logs/${taskId}?since=${encodeURIComponent(since)}` : `/workbench-runs/logs/${taskId}`
    ),
};
