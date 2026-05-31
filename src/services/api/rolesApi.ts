/**
 * Roles API client
 */
import { apiCall } from './client';
import type { AgentRole } from '../../domain/workbench';

export const rolesApi = {
  list: () =>
    apiCall<AgentRole[]>('GET', '/roles'),

  create: (role: Omit<AgentRole, 'id'>) =>
    apiCall<AgentRole>('POST', '/roles', role),

  createBatch: (roles: Array<Omit<AgentRole, 'id'> & { id?: string }>) =>
    apiCall<AgentRole[]>('POST', '/roles/batch', roles),
};