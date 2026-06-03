/**
 * Workflow API client
 */
import { apiCall, type ApiResponse } from './client';
import type { WorkflowRun } from '../../services/local/useCases/workflowExecutionUseCase';
import type { WorkflowTemplate } from '../../domain/workbench';

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

  getRun: (runId: string) =>
    apiCall<WorkflowRun>('GET', `/workflow/run/${runId}`),

  listTemplates: () =>
    apiCall<WorkflowTemplate[]>('GET', '/workflow/templates'),

  createTemplate: (template: Omit<WorkflowTemplate, 'id' | 'createdAt' | 'updatedAt'>) =>
    apiCall<WorkflowTemplate>('POST', '/workflow/templates', template),

  updateTemplate: (templateId: string, updates: Partial<WorkflowTemplate>) =>
    apiCall<WorkflowTemplate>('PUT', `/workflow/templates/${templateId}`, updates),

  deleteTemplate: (templateId: string) =>
    apiCall<void>('DELETE', `/workflow/templates/${templateId}`),
};
