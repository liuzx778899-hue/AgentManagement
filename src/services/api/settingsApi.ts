/**
 * Settings API client
 */
import { apiCall, type ApiResponse } from './client';
import type { AppSettings } from '../../types/settings';

export const settingsApi = {
  get: () =>
    apiCall<AppSettings>('GET', '/settings'),

  save: (settings: Partial<AppSettings>) =>
    apiCall<AppSettings>('PUT', '/settings', settings),
};