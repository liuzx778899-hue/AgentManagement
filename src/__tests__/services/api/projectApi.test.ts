/**
 * Tests for Project API client
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { projectApi } from '../../../services/api/projectApi';
import * as client from '../../../services/api/client';

// Mock the client module
vi.mock('../../../services/api/client', () => ({
  apiCall: vi.fn(),
  checkServerAvailable: vi.fn(),
  resetServerAvailability: vi.fn(),
}));

describe('Project API', () => {
  const mockApiCall = vi.mocked(client.apiCall);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockProject = {
    id: 'proj-1',
    name: 'Test Project',
    repoPath: '/path/to/repo',
    defaultBranch: 'main',
    worktreeRoot: '/path/to/worktrees',
    scope: 'personal' as const,
    desktopIntegrationStatus: 'deferred' as const,
    permissions: { permissionLevel: 'owner' as const },
    settings: {
      installCommand: 'npm install',
      testCommand: 'npm test',
      buildCommand: 'npm run build',
      previewCommand: 'npm run preview',
      detectedStack: 'Node.js',
      riskSummary: 'Low risk',
    },
    workflowTemplateId: 'template-1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  describe('list', () => {
    it('should call GET /projects', async () => {
      mockApiCall.mockResolvedValueOnce({ ok: true, data: [mockProject] });

      const result = await projectApi.list();

      expect(mockApiCall).toHaveBeenCalledWith('GET', '/projects');
      expect(result).toEqual({ ok: true, data: [mockProject] });
    });
  });

  describe('get', () => {
    it('should call GET /projects/:id', async () => {
      mockApiCall.mockResolvedValueOnce({ ok: true, data: mockProject });

      const result = await projectApi.get('proj-1');

      expect(mockApiCall).toHaveBeenCalledWith('GET', '/projects/proj-1');
      expect(result).toEqual({ ok: true, data: mockProject });
    });
  });

  describe('create', () => {
    it('should call POST /projects with input', async () => {
      const input = {
        name: 'New Project',
        repoPath: '/path/to/new',
        defaultBranch: 'main',
        worktreeRoot: '/path/to/worktrees',
      };
      mockApiCall.mockResolvedValueOnce({ ok: true, data: mockProject });

      const result = await projectApi.create(input);

      expect(mockApiCall).toHaveBeenCalledWith('POST', '/projects', input);
      expect(result).toEqual({ ok: true, data: mockProject });
    });
  });

  describe('import', () => {
    it('should call POST /projects/import with path', async () => {
      mockApiCall.mockResolvedValueOnce({ ok: true, data: mockProject });

      const result = await projectApi.import({ path: '/path/to/import' });

      expect(mockApiCall).toHaveBeenCalledWith('POST', '/projects/import', {
        path: '/path/to/import',
      });
      expect(result).toEqual({ ok: true, data: mockProject });
    });
  });

  describe('update', () => {
    it('should call PUT /projects/:id with input', async () => {
      const input = { name: 'Updated Name' };
      mockApiCall.mockResolvedValueOnce({ ok: true, data: mockProject });

      const result = await projectApi.update('proj-1', input);

      expect(mockApiCall).toHaveBeenCalledWith('PUT', '/projects/proj-1', input);
      expect(result).toEqual({ ok: true, data: mockProject });
    });
  });

  describe('delete', () => {
    it('should call DELETE /projects/:id', async () => {
      mockApiCall.mockResolvedValueOnce({ ok: true });

      const result = await projectApi.delete('proj-1');

      expect(mockApiCall).toHaveBeenCalledWith('DELETE', '/projects/proj-1');
      expect(result).toEqual({ ok: true });
    });
  });
});