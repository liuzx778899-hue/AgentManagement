import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { gitRouter } from '../../../server/routes/git';

// Mock the service factory
vi.mock('../../../server/services/serviceFactory', () => ({
  getServices: vi.fn(),
}));

// Mock the useCases
vi.mock('../../../services/local/useCases', () => ({
  getGitStatus: vi.fn(),
  getBatchGitStatus: vi.fn(),
  listProjectWorktrees: vi.fn(),
}));

import { getServices } from '../../../server/services/serviceFactory';
import { getGitStatus, getBatchGitStatus, listProjectWorktrees } from '../../../services/local/useCases';

const mockGetServices = vi.mocked(getServices);
const mockGetGitStatus = vi.mocked(getGitStatus);
const mockGetBatchGitStatus = vi.mocked(getBatchGitStatus);
const mockListProjectWorktrees = vi.mocked(listProjectWorktrees);

describe('Git Router', () => {
  let app: express.Express;
  let mockGitAdapter: any;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/git', gitRouter);

    // Create mock git adapter
    mockGitAdapter = {
      getStatus: vi.fn(),
      listBranches: vi.fn(),
      listWorktrees: vi.fn(),
    };

    // Default mock for getServices
    mockGetServices.mockReturnValue({
      git: mockGitAdapter,
    } as any);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/git/status', () => {
    it('should get git status for a path', async () => {
      const mockStatus = {
        branch: 'main',
        ahead: 0,
        behind: 0,
        staged: 0,
        unstaged: 1,
        untracked: 2,
        lastCommitSha: 'abc123',
        lastCommitMessage: 'Test commit',
        lastCommitDate: '2024-01-01T00:00:00Z',
        isClean: false,
      };

      mockGetGitStatus.mockResolvedValueOnce({
        ok: true,
        data: {
          ...mockStatus,
          projectId: 'proj-1',
          repoPath: '/path/to/repo',
          fetchedAt: '2024-01-01T00:00:00Z',
        },
      });

      const response = await request(app)
        .get('/api/git/status')
        .query({ path: '/path/to/repo' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        ok: true,
      });

      expect(mockGetGitStatus).toHaveBeenCalled();
    });

    it('should require path parameter', async () => {
      const response = await request(app)
        .get('/api/git/status')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toMatchObject({
        ok: false,
        error: expect.objectContaining({
          message: expect.stringContaining('path'),
        }),
      });
    });

    it('should return error when git status fails', async () => {
      mockGetGitStatus.mockResolvedValueOnce({
        ok: false,
        error: {
          code: 'DIRECTORY_NOT_FOUND',
          message: 'Not a git repository',
          recoverable: false,
        },
      });

      const response = await request(app)
        .get('/api/git/status')
        .query({ path: '/invalid/path' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        ok: false,
      });
    });
  });

  describe('GET /api/git/branches', () => {
    it('should list branches', async () => {
      const mockBranches = ['main', 'develop', 'feature/test'];

      mockGitAdapter.listBranches.mockResolvedValueOnce({
        ok: true,
        data: mockBranches,
      });

      const response = await request(app)
        .get('/api/git/branches')
        .query({ path: '/path/to/repo' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        ok: true,
        data: mockBranches,
      });

      expect(mockGitAdapter.listBranches).toHaveBeenCalled();
    });

    it('should require path parameter', async () => {
      const response = await request(app)
        .get('/api/git/branches')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toMatchObject({
        ok: false,
      });
    });
  });

  describe('GET /api/git/worktrees', () => {
    it('should list worktrees', async () => {
      const mockWorktrees = [
        {
          path: '/path/to/repo',
          branch: 'main',
          commitSha: 'abc123',
          isMainWorktree: true,
        },
        {
          path: '/path/to/worktree-1',
          branch: 'feature/test',
          commitSha: 'def456',
          isMainWorktree: false,
        },
      ];

      mockListProjectWorktrees.mockResolvedValueOnce({
        ok: true,
        data: mockWorktrees,
      });

      const response = await request(app)
        .get('/api/git/worktrees')
        .query({ path: '/path/to/repo' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        ok: true,
        data: mockWorktrees,
      });

      expect(mockListProjectWorktrees).toHaveBeenCalled();
    });

    it('should require path parameter', async () => {
      const response = await request(app)
        .get('/api/git/worktrees')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toMatchObject({
        ok: false,
      });
    });
  });
});