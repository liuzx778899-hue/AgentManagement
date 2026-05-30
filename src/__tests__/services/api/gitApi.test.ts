/**
 * Tests for Git API client
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { gitApi } from '../../../services/api/gitApi';
import * as client from '../../../services/api/client';

// Mock the client module
vi.mock('../../../services/api/client', () => ({
  apiCall: vi.fn(),
  checkServerAvailable: vi.fn(),
  resetServerAvailability: vi.fn(),
}));

describe('Git API', () => {
  const mockApiCall = vi.mocked(client.apiCall);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getStatus', () => {
    it('should call GET /git/status with encoded path', async () => {
      const mockStatus = {
        branch: 'main',
        ahead: 0,
        behind: 0,
        staged: 0,
        unstaged: 0,
        untracked: 0,
        isClean: true,
      };
      mockApiCall.mockResolvedValueOnce({ ok: true, data: mockStatus });

      const result = await gitApi.getStatus('/path/to/repo');

      expect(mockApiCall).toHaveBeenCalledWith(
        'GET',
        '/git/status?path=%2Fpath%2Fto%2Frepo'
      );
      expect(result).toEqual({ ok: true, data: mockStatus });
    });

    it('should handle paths with special characters', async () => {
      mockApiCall.mockResolvedValueOnce({ ok: true, data: { branch: 'main' } });

      await gitApi.getStatus('/path/with spaces/repo');

      expect(mockApiCall).toHaveBeenCalledWith(
        'GET',
        expect.stringContaining('/git/status?path=')
      );
    });
  });

  describe('getBranches', () => {
    it('should call GET /git/branches with encoded path', async () => {
      const branches = ['main', 'develop', 'feature/test'];
      mockApiCall.mockResolvedValueOnce({ ok: true, data: branches });

      const result = await gitApi.getBranches('/path/to/repo');

      expect(mockApiCall).toHaveBeenCalledWith(
        'GET',
        '/git/branches?path=%2Fpath%2Fto%2Frepo'
      );
      expect(result).toEqual({ ok: true, data: branches });
    });
  });

  describe('getWorktrees', () => {
    it('should call GET /git/worktrees with encoded path', async () => {
      const worktrees = [
        { path: '/path/to/worktree-1', branch: 'main', commitSha: 'abc123', isMainWorktree: true },
        { path: '/path/to/worktree-2', branch: 'feature', commitSha: 'def456', isMainWorktree: false },
      ];
      mockApiCall.mockResolvedValueOnce({ ok: true, data: worktrees });

      const result = await gitApi.getWorktrees('/path/to/repo');

      expect(mockApiCall).toHaveBeenCalledWith(
        'GET',
        '/git/worktrees?path=%2Fpath%2Fto%2Frepo'
      );
      expect(result).toEqual({ ok: true, data: worktrees });
    });
  });
});