/**
 * Tests for Settings API client
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { settingsApi } from '../../../services/api/settingsApi';
import * as client from '../../../services/api/client';

// Mock the client module
vi.mock('../../../services/api/client', () => ({
  apiCall: vi.fn(),
  checkServerAvailable: vi.fn(),
  resetServerAvailability: vi.fn(),
}));

describe('Settings API', () => {
  const mockApiCall = vi.mocked(client.apiCall);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockSettings = {
    theme: 'dark' as const,
    language: 'en',
    notifications: true,
    autoSave: true,
    editorFontSize: 14,
    editorFontFamily: 'monospace',
    runner: {
      defaultTimeout: 300000,
      autoRestart: false,
    },
    git: {
      autoFetch: true,
      fetchInterval: 60000,
    },
  };

  describe('get', () => {
    it('should call GET /settings', async () => {
      mockApiCall.mockResolvedValueOnce({ ok: true, data: mockSettings });

      const result = await settingsApi.get();

      expect(mockApiCall).toHaveBeenCalledWith('GET', '/settings');
      expect(result).toEqual({ ok: true, data: mockSettings });
    });
  });

  describe('save', () => {
    it('should call PUT /settings with partial settings', async () => {
      const partialSettings = { theme: 'light' as const };
      mockApiCall.mockResolvedValueOnce({ ok: true, data: { ...mockSettings, ...partialSettings } });

      const result = await settingsApi.save(partialSettings);

      expect(mockApiCall).toHaveBeenCalledWith('PUT', '/settings', partialSettings);
      expect(result).toEqual({
        ok: true,
        data: { ...mockSettings, theme: 'light' },
      });
    });

    it('should handle full settings update', async () => {
      const fullSettings = {
        ...mockSettings,
        editorFontSize: 16,
        language: 'zh',
      };
      mockApiCall.mockResolvedValueOnce({ ok: true, data: fullSettings });

      const result = await settingsApi.save(fullSettings);

      expect(mockApiCall).toHaveBeenCalledWith('PUT', '/settings', fullSettings);
      expect(result).toEqual({ ok: true, data: fullSettings });
    });
  });
});