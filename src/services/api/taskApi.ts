/**
 * Task API client
 */
import { apiCall, type ApiResponse } from './client';
import type { Task } from '../../domain/task';

export interface CreateTaskInput {
  projectId: string;
  goal: string;
  workflowTemplateId: string;
  acceptanceCriteria?: string[];
  roleAssignment?: Record<string, string>;
  capabilityAuthorization?: string[];
  launchStrategy?: 'worktree' | 'direct';
  status?: 'draft' | 'queued' | 'running' | 'gate' | 'done' | 'failed';
}

export interface UpdateTaskInput {
  goal?: string;
  acceptanceCriteria?: string[];
  roleAssignment?: Record<string, string>;
  capabilityAuthorization?: string[];
  launchStrategy?: 'worktree' | 'direct';
  status?: 'draft' | 'queued' | 'running' | 'gate' | 'done' | 'failed';
  activeRunId?: string | null;
}

export interface CreateTasksFromWorkflowInput {
  projectId: string;
  workflowTemplateId: string;
}

export const taskApi = {
  list: () =>
    apiCall<Task[]>('GET', '/tasks'),

  listByProject: (projectId: string) =>
    apiCall<Task[]>('GET', `/tasks?projectId=${encodeURIComponent(projectId)}`),

  get: (id: string) =>
    apiCall<Task>('GET', `/tasks/${id}`),

  create: (input: CreateTaskInput) =>
    apiCall<Task>('POST', '/tasks', input),

  createFromWorkflow: (input: CreateTasksFromWorkflowInput) =>
    apiCall<Task[]>('POST', '/tasks/from-workflow', input),

  update: (id: string, input: UpdateTaskInput) =>
    apiCall<Task>('PUT', `/tasks/${id}`, input),

  delete: (id: string) =>
    apiCall<void>('DELETE', `/tasks/${id}`),
};
