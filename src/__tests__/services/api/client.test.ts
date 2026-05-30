/**
 * Tests for API client
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiCall, checkServerAvailable, resetServerAvailability } from '../../../services/api/client';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetServerAvailability();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkServerAvailable', () => {
    it('should return true when server is healthy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      });

      const result = await checkServerAvailable();
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/health',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should return false when server is not responding', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await checkServerAvailable();
      expect(result).toBe(false);
    });

    it('should cache the result', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      });

      await checkServerAvailable();
      await checkServerAvailable();

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should reset cache when resetServerAvailability is called', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      });

      await checkServerAvailable();
      resetServerAvailability();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      });

      await checkServerAvailable();

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('apiCall', () => {
    it('should return error when server is unavailable', async () => {
      // First call will fail for health check
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await apiCall('GET', '/test');

      expect(result).toEqual({
        ok: false,
        error: {
          code: 'SERVER_UNAVAILABLE',
          message: 'Local API server not running. Start it with: npm run dev:server',
          recoverable: true,
        },
      });
    });

    it('should make GET request when server is available', async () => {
      // Health check
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      });

      // API call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, data: { id: '1', name: 'Test' } }),
      });

      const result = await apiCall<{ id: string; name: string }>('GET', '/test');

      expect(result).toEqual({
        ok: true,
        data: { id: '1', name: 'Test' },
      });
      expect(mockFetch).toHaveBeenLastCalledWith(
        'http://localhost:3001/api/test',
        expect.objectContaining({
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should make POST request with body when server is available', async () => {
      // Health check
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      });

      // API call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, data: { id: '1' } }),
      });

      const result = await apiCall<{ id: string }>('POST', '/test', {
        name: 'New Item',
      });

      expect(result).toEqual({
        ok: true,
        data: { id: '1' },
      });
      expect(mockFetch).toHaveBeenLastCalledWith(
        'http://localhost:3001/api/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'New Item' }),
        })
      );
    });

    it('should handle network errors gracefully', async () => {
      // Health check succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      });

      // API call fails
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await apiCall('GET', '/test');

      expect(result).toEqual({
        ok: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Connection refused',
          recoverable: true,
        },
      });
    });

    it('should handle unknown errors', async () => {
      // Health check succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      });

      // API call fails with non-Error
      mockFetch.mockRejectedValueOnce('Unknown error string');

      const result = await apiCall('GET', '/test');

      expect(result).toEqual({
        ok: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Network error',
          recoverable: true,
        },
      });
    });
  });
});
