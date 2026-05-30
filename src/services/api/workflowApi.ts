/**
 * Workflow API client
 */
import { apiCall, type ApiResponse } from './client';
import type { WorkflowRun } from '../../services/local/useCases/workflowExecutionUseCase';

export const workflowApi = {
  run: (projectId: string, templateId: string) =>
    apiCall<{ runId: string }>('POST', '/workflow/run', { projectId, templateId }),

  pause: (runId: string) =>
    apiCall<void>('POST', '/workflow/pause', { runId }),

  resume: (runId: string) =>
    apiCall<void>('POST', '/workflow/resume', { runId }),

  cancel: (runId: string) =>
    apiCall<void>('POST', '/workflow/cancel', { runId }),

  getStatus: (runId: string) =>
    apiCall<WorkflowRun>('GET', `/workflow/status/${runId}`),
};
