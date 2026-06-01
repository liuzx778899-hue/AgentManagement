/**
 * Project API client
 */
import { apiCall, type ApiResponse } from './client';
import type { Project } from '../../domain/project';

export interface CreateProjectInput {
  name: string;
  repoPath: string;
  defaultBranch: string;
  worktreeRoot: string;
  workflowTemplateId?: string;
}

export interface UpdateProjectInput {
  name?: string;
  repoPath?: string;
  defaultBranch?: string;
  worktreeRoot?: string;
  workflowTemplateId?: string;
}

export interface ImportProjectInput {
  path: string;
  name?: string;
  sourceType?: 'claude-code' | 'codex' | 'generic' | 'mixed' | 'ai-briefing';
  detectSettings?: boolean;
}

export const projectApi = {
  list: () =>
    apiCall<Project[]>('GET', '/projects'),

  get: (id: string) =>
    apiCall<Project>('GET', `/projects/${id}`),

  create: (input: CreateProjectInput) =>
    apiCall<Project>('POST', '/projects', input),

  import: (input: ImportProjectInput) =>
    apiCall<Project>('POST', '/projects/import', input),

  update: (id: string, input: UpdateProjectInput) =>
    apiCall<Project>('PUT', `/projects/${id}`, input),

  delete: (id: string) =>
    apiCall<void>('DELETE', `/projects/${id}`),
};
