/**
 * Roles API client
 */
import { apiCall } from './client';
import type { AgentRole } from '../../domain/workbench';

export const rolesApi = {
  list: () =>
    apiCall<AgentRole[]>('GET', '/roles'),
};