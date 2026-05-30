/**
 * Memory API client
 */
import { apiCall, type ApiResponse } from './client';
import type { Memory } from '../../domain/memory';
import type { MemoryKind, MemoryScope } from '../../domain/memory';

export interface CreateMemoryInput {
  kind: MemoryKind;
  scope: MemoryScope;
  projectId: string;
  roleId?: string | null;
  taskId?: string | null;
  title: string;
  body: string;
}

export interface UpdateMemoryInput {
  title?: string;
  body?: string;
  scope?: MemoryScope;
}

export const memoryApi = {
  list: (projectId: string) =>
    apiCall<Memory[]>('GET', `/memory?projectId=${projectId}`),

  create: (input: CreateMemoryInput) =>
    apiCall<Memory>('POST', '/memory', input),

  update: (id: string, input: UpdateMemoryInput) =>
    apiCall<Memory>('PUT', `/memory/${id}`, input),

  delete: (id: string) =>
    apiCall<void>('DELETE', `/memory/${id}`),

  search: (keyword: string, projectId?: string) => {
    const query = projectId
      ? `keyword=${encodeURIComponent(keyword)}&projectId=${projectId}`
      : `keyword=${encodeURIComponent(keyword)}`;
    return apiCall<Memory[]>('GET', `/memory/search?${query}`);
  },
};