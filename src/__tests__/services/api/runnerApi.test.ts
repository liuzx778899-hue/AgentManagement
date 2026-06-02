/**
 * Tests for Runner API client
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runnerApi } from '../../../services/api/runnerApi';
import * as client from '../../../services/api/client';

// Mock the client module
vi.mock('../../../services/api/client', () => ({
  apiCall: vi.fn(),
  checkServerAvailable: vi.fn(),
  resetServerAvailability: vi.fn(),
}));

describe('Runner API', () => {
  const mockApiCall = vi.mocked(client.apiCall);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('start', () => {
    it('should call POST /runner/start with correct params', async () => {
      mockApiCall.mockResolvedValueOnce({
        ok: true,
        data: {
          id: 'proc-1',
          runnerId: 'runner-1',
          state: 'running',
          logs: [],
        },
      });

      const result = await runnerApi.start({ runnerId: 'runner-1', kind: 'claude-code', cwd: '/path/to/cwd' });

      expect(mockApiCall).toHaveBeenCalledWith('POST', '/runner/start', {
        runnerId: 'runner-1',
        kind: 'claude-code',
        cwd: '/path/to/cwd',
      });
      expect(result).toEqual({
        ok: true,
        data: {
          id: 'proc-1',
          runnerId: 'runner-1',
          state: 'running',
          logs: [],
        },
      });
    });
  });

  describe('stop', () => {
    it('should call POST /runner/stop with processId', async () => {
      mockApiCall.mockResolvedValueOnce({ ok: true });

      await runnerApi.stop('proc-1');

      expect(mockApiCall).toHaveBeenCalledWith('POST', '/runner/stop', {
        processId: 'proc-1',
      });
    });
  });

  describe('getLogs', () => {
    it('should call GET /runner/logs/:processId', async () => {
      const logs = [
        { timestamp: '2024-01-01T00:00:00Z', stream: 'stdout' as const, content: 'Hello' },
        { timestamp: '2024-01-01T00:00:01Z', stream: 'stderr' as const, content: 'Error' },
      ];
      mockApiCall.mockResolvedValueOnce({ ok: true, data: logs });

      const result = await runnerApi.getLogs('proc-1');

      expect(mockApiCall).toHaveBeenCalledWith('GET', '/runner/logs/proc-1');
      expect(result).toEqual({ ok: true, data: logs });
    });
  });

  describe('getStatus', () => {
    it('should call GET /runner/status/:processId', async () => {
      const status = {
        id: 'proc-1',
        runnerId: 'runner-1',
        state: 'running' as const,
        logs: [],
      };
      mockApiCall.mockResolvedValueOnce({ ok: true, data: status });

      const result = await runnerApi.getStatus('proc-1');

      expect(mockApiCall).toHaveBeenCalledWith('GET', '/runner/status/proc-1');
      expect(result).toEqual({ ok: true, data: status });
    });
  });

  describe('list', () => {
    it('should call GET /runner/list', async () => {
      const processes = [
        { id: 'proc-1', runnerId: 'runner-1', state: 'running' as const, logs: [] },
        { id: 'proc-2', runnerId: 'runner-2', state: 'stopped' as const, logs: [] },
      ];
      mockApiCall.mockResolvedValueOnce({ ok: true, data: processes });

      const result = await runnerApi.list();

      expect(mockApiCall).toHaveBeenCalledWith('GET', '/runner/list');
      expect(result).toEqual({ ok: true, data: processes });
    });
  });
});