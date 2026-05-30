/**
 * Tests for Workflow API client
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { workflowApi } from '../../../services/api/workflowApi';
import * as client from '../../../services/api/client';

// Mock the client module
vi.mock('../../../services/api/client', () => ({
  apiCall: vi.fn(),
  checkServerAvailable: vi.fn(),
  resetServerAvailability: vi.fn(),
}));

describe('Workflow API', () => {
  const mockApiCall = vi.mocked(client.apiCall);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('run', () => {
    it('should call POST /workflow/run with projectId and templateId', async () => {
      mockApiCall.mockResolvedValueOnce({ ok: true, data: { runId: 'run-1' } });

      const result = await workflowApi.run('proj-1', 'template-1');

      expect(mockApiCall).toHaveBeenCalledWith('POST', '/workflow/run', {
        projectId: 'proj-1',
        templateId: 'template-1',
      });
      expect(result).toEqual({ ok: true, data: { runId: 'run-1' } });
    });
  });

  describe('pause', () => {
    it('should call POST /workflow/pause with runId', async () => {
      mockApiCall.mockResolvedValueOnce({ ok: true });

      const result = await workflowApi.pause('run-1');

      expect(mockApiCall).toHaveBeenCalledWith('POST', '/workflow/pause', {
        runId: 'run-1',
      });
      expect(result).toEqual({ ok: true });
    });
  });

  describe('resume', () => {
    it('should call POST /workflow/resume with runId', async () => {
      mockApiCall.mockResolvedValueOnce({ ok: true });

      const result = await workflowApi.resume('run-1');

      expect(mockApiCall).toHaveBeenCalledWith('POST', '/workflow/resume', {
        runId: 'run-1',
      });
      expect(result).toEqual({ ok: true });
    });
  });

  describe('cancel', () => {
    it('should call POST /workflow/cancel with runId', async () => {
      mockApiCall.mockResolvedValueOnce({ ok: true });

      const result = await workflowApi.cancel('run-1');

      expect(mockApiCall).toHaveBeenCalledWith('POST', '/workflow/cancel', {
        runId: 'run-1',
      });
      expect(result).toEqual({ ok: true });
    });
  });

  describe('getStatus', () => {
    it('should call GET /workflow/status/:runId', async () => {
      const mockRun = {
        id: 'run-1',
        workflowId: 'wf-1',
        workflowVersion: '1.0',
        projectId: 'proj-1',
        projectName: 'Test Project',
        state: 'running' as const,
        currentStepId: 'step-1',
        currentStepIndex: 0,
        steps: [],
        triggeredBy: 'user-1',
        startedAt: '2024-01-01T00:00:00Z',
      };
      mockApiCall.mockResolvedValueOnce({ ok: true, data: mockRun });

      const result = await workflowApi.getStatus('run-1');

      expect(mockApiCall).toHaveBeenCalledWith('GET', '/workflow/status/run-1');
      expect(result).toEqual({ ok: true, data: mockRun });
    });
  });
});