import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { projectsRouter } from '../../../server/routes/projects';

// Mock the service factory
vi.mock('../../../server/services/serviceFactory', () => ({
  getServices: vi.fn(),
}));

import { getServices } from '../../../server/services/serviceFactory';

const mockGetServices = vi.mocked(getServices);

describe('Projects Router', () => {
  let app: express.Express;
  let mockProjectRepository: any;
  let mockGitAdapter: any;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/projects', projectsRouter);

    // Create mock repository
    mockProjectRepository = {
      listAll: vi.fn(),
      load: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    // Create mock git adapter
    mockGitAdapter = {
      getStatus: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          branch: 'main',
          ahead: 0,
          behind: 0,
          staged: 0,
          unstaged: 0,
          untracked: 0,
          isClean: true,
        },
      }),
    };

    // Default mock for getServices
    mockGetServices.mockReturnValue({
      repositories: {
        project: mockProjectRepository,
        memory: {},
        workflow: {},
      },
      git: mockGitAdapter,
    } as any);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/projects', () => {
    it('should list all projects', async () => {
      const mockProjects = [
        {
          id: 'proj-1',
          name: 'Project 1',
          repoPath: '/path/1',
          defaultBranch: 'main',
          worktreeRoot: '/worktrees/1',
          scope: 'personal',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'proj-2',
          name: 'Project 2',
          repoPath: '/path/2',
          defaultBranch: 'main',
          worktreeRoot: '/worktrees/2',
          scope: 'team',
          createdAt: '2024-01-02T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
        },
      ];

      mockProjectRepository.listAll.mockResolvedValueOnce({
        ok: true,
        data: mockProjects,
      });

      const response = await request(app)
        .get('/api/projects')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        ok: true,
        data: mockProjects,
      });

      expect(mockProjectRepository.listAll).toHaveBeenCalled();
    });

    it('should return empty array when no projects', async () => {
      mockProjectRepository.listAll.mockResolvedValueOnce({
        ok: true,
        data: [],
      });

      const response = await request(app)
        .get('/api/projects')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        ok: true,
        data: [],
      });
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should get a project by id', async () => {
      const mockProject = {
        id: 'proj-1',
        name: 'Project 1',
        repoPath: '/path/1',
        defaultBranch: 'main',
        worktreeRoot: '/worktrees/1',
        scope: 'personal',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockProjectRepository.load.mockResolvedValueOnce({
        ok: true,
        data: mockProject,
      });

      const response = await request(app)
        .get('/api/projects/proj-1')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        ok: true,
        data: mockProject,
      });

      expect(mockProjectRepository.load).toHaveBeenCalledWith('proj-1');
    });

    it('should return 404 when project not found', async () => {
      mockProjectRepository.load.mockResolvedValueOnce({
        ok: false,
        error: {
          code: 'DIRECTORY_NOT_FOUND',
          message: 'Project not found',
          recoverable: false,
        },
      });

      const response = await request(app)
        .get('/api/projects/nonexistent')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        ok: false,
      });
    });
  });

  describe('POST /api/projects', () => {
    it('should create a new project', async () => {
      const newProject = {
        id: 'proj-new',
        name: 'New Project',
        repoPath: '/path/new',
        defaultBranch: 'main',
        worktreeRoot: '/worktrees/new',
        scope: 'personal',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockProjectRepository.save.mockResolvedValueOnce({
        ok: true,
        data: newProject,
      });

      const response = await request(app)
        .post('/api/projects')
        .send({
          name: 'New Project',
          repoPath: '/path/new',
          worktreeRoot: '/worktrees/new',
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        ok: true,
      });

      expect(mockProjectRepository.save).toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/projects')
        .send({ name: 'Test' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toMatchObject({
        ok: false,
        error: expect.objectContaining({
          message: expect.stringContaining('repoPath'),
        }),
      });
    });
  });

  describe('POST /api/projects/import', () => {
    it('should import an existing project', async () => {
      const importedProject = {
        id: 'proj-imported',
        name: 'Imported Project',
        repoPath: '/path/imported',
        defaultBranch: 'main',
        worktreeRoot: '/worktrees/imported',
        scope: 'personal',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockProjectRepository.save.mockResolvedValueOnce({
        ok: true,
        data: importedProject,
      });

      const response = await request(app)
        .post('/api/projects/import')
        .send({ path: '/path/to/import' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        ok: true,
      });

      expect(mockProjectRepository.save).toHaveBeenCalled();
    });

    it('should validate path is required', async () => {
      const response = await request(app)
        .post('/api/projects/import')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toMatchObject({
        ok: false,
      });
    });
  });

  describe('PUT /api/projects/:id', () => {
    it('should update a project', async () => {
      const updatedProject = {
        id: 'proj-1',
        name: 'Updated Name',
        repoPath: '/path/1',
        defaultBranch: 'main',
        worktreeRoot: '/worktrees/1',
        scope: 'personal',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      };

      mockProjectRepository.update.mockResolvedValueOnce({
        ok: true,
        data: updatedProject,
      });

      const response = await request(app)
        .put('/api/projects/proj-1')
        .send({ name: 'Updated Name' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        ok: true,
      });

      expect(mockProjectRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'proj-1', name: 'Updated Name' })
      );
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('should delete a project', async () => {
      mockProjectRepository.delete.mockResolvedValueOnce({
        ok: true,
        data: undefined,
      });

      const response = await request(app)
        .delete('/api/projects/proj-1')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        ok: true,
      });

      expect(mockProjectRepository.delete).toHaveBeenCalledWith('proj-1');
    });

    it('should return error when delete fails', async () => {
      mockProjectRepository.delete.mockResolvedValueOnce({
        ok: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: 'Cannot delete project',
          recoverable: false,
        },
      });

      const response = await request(app)
        .delete('/api/projects/proj-1')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        ok: false,
      });
    });
  });
});
