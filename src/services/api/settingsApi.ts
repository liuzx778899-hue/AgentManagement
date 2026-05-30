/**
 * Settings API client
 */
import { apiCall, type ApiResponse } from './client';
import type { AppSettings } from '../../types/settings';
import type { ModelProvider } from '../../domain/model';

interface ModelProvidersData {
  providers: ModelProvider[];
  aiAssistantModel?: { providerId: string; modelName: string } | null;
}

export const settingsApi = {
  get: () =>
    apiCall<AppSettings>('GET', '/settings'),

  save: (settings: Partial<AppSettings>) =>
    apiCall<AppSettings>('PUT', '/settings', settings),

  getModelProviders: () =>
    apiCall<ModelProvidersData>('GET', '/settings/model-providers'),

  saveModelProviders: (data: ModelProvidersData) =>
    apiCall<void>('PUT', '/settings/model-providers', data),
};