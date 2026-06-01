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

  // ============================================
  // 补充测试：Templates API
  // ============================================
  describe('listTemplates', () => {
    it('should call GET /workflow/templates', async () => {
      const mockTemplates = [
        { id: 'wf-1', name: 'Development Flow', version: '1.0', steps: [] },
        { id: 'wf-2', name: 'Release Flow', version: '1.0', steps: [] },
      ];
      mockApiCall.mockResolvedValueOnce({ ok: true, data: mockTemplates });

      const result = await workflowApi.listTemplates();

      expect(mockApiCall).toHaveBeenCalledWith('GET', '/workflow/templates');
      expect(result).toEqual({ ok: true, data: mockTemplates });
    });
  });

  describe('createTemplate', () => {
    it('should call POST /workflow/templates with template data', async () => {
      const newTemplate = {
        name: 'New Template',
        version: 1,
        status: 'draft' as const,
        steps: [],
      };

      mockApiCall.mockResolvedValueOnce({
        ok: true,
        data: { id: 'wf-new', ...newTemplate, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
      });

      const result = await workflowApi.createTemplate(newTemplate);

      expect(mockApiCall).toHaveBeenCalledWith('POST', '/workflow/templates', newTemplate);
      expect(result.ok).toBe(true);
      expect(result.data?.id).toBe('wf-new');
    });
  });

  describe('updateTemplate', () => {
    it('should call PUT /workflow/templates/:templateId with updates', async () => {
      const updates = { name: 'Updated Template Name' };

      mockApiCall.mockResolvedValueOnce({
        ok: true,
        data: { id: 'wf-1', name: 'Updated Template Name', updatedAt: '2024-01-02T00:00:00Z' },
      });

      const result = await workflowApi.updateTemplate('wf-1', updates);

      expect(mockApiCall).toHaveBeenCalledWith('PUT', '/workflow/templates/wf-1', updates);
      expect(result.ok).toBe(true);
    });
  });

  describe('deleteTemplate', () => {
    it('should call DELETE /workflow/templates/:templateId', async () => {
      mockApiCall.mockResolvedValueOnce({ ok: true });

      const result = await workflowApi.deleteTemplate('wf-1');

      expect(mockApiCall).toHaveBeenCalledWith('DELETE', '/workflow/templates/wf-1');
      expect(result.ok).toBe(true);
    });
  });

  // ============================================
  // 补充测试：错误处理
  // ============================================
  describe('Error handling', () => {
    it('should propagate error from apiCall', async () => {
      mockApiCall.mockResolvedValueOnce({
        ok: false,
        error: {
          code: 'DIRECTORY_NOT_FOUND',
          message: 'Run not found',
          recoverable: false,
        },
      });

      const result = await workflowApi.getStatus('invalid-run');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('DIRECTORY_NOT_FOUND');
    });

    it('should handle network error', async () => {
      mockApiCall.mockResolvedValueOnce({
        ok: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Failed to connect to server',
          recoverable: true,
        },
      });

      const result = await workflowApi.run('proj-1', 'wf-1');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('NETWORK_ERROR');
      expect(result.error?.recoverable).toBe(true);
    });

    it('should handle validation error', async () => {
      mockApiCall.mockResolvedValueOnce({
        ok: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'projectId is required',
          recoverable: true,
        },
      });

      const result = await workflowApi.run('', 'wf-1');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('INVALID_INPUT');
    });

    it('should handle template not found error', async () => {
      mockApiCall.mockResolvedValueOnce({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Template not found',
          recoverable: false,
        },
      });

      const result = await workflowApi.updateTemplate('non-existent', { name: 'New' });

      expect(result.ok).toBe(false);
      expect(result.error?.recoverable).toBe(false);
    });
  });
});