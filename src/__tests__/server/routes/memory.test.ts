import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { memoryRouter } from '../../../server/routes/memory';

// Mock the service factory
vi.mock('../../../server/services/serviceFactory', () => ({
  getServices: vi.fn(),
}));

import { getServices } from '../../../server/services/serviceFactory';

const mockGetServices = vi.mocked(getServices);

describe('Memory Router', () => {
  let app: express.Express;
  let mockMemoryRepository: any;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/memory', memoryRouter);

    // Create mock repository
    mockMemoryRepository = {
      listByProject: vi.fn(),
      listByRole: vi.fn(),
      listAll: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      load: vi.fn(),
    };

    // Default mock for getServices
    mockGetServices.mockReturnValue({
      repositories: {
        project: {},
        memory: mockMemoryRepository,
        workflow: {},
      },
    } as any);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/memory', () => {
    it('should list memories by project', async () => {
      const mockMemories = [
        {
          id: 'mem-1',
          projectId: 'proj-1',
          title: 'Memory 1',
          kind: 'project',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'mem-2',
          projectId: 'proj-1',
          title: 'Memory 2',
          kind: 'task',
          createdAt: '2024-01-02T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
        },
      ];

      mockMemoryRepository.listByProject.mockResolvedValueOnce({
        ok: true,
        data: mockMemories,
      });

      const response = await request(app)
        .get('/api/memory')
        .query({ projectId: 'proj-1' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        ok: true,
        data: mockMemories,
      });

      expect(mockMemoryRepository.listByProject).toHaveBeenCalledWith('proj-1');
    });

    it('should return empty array when no memories', async () => {
      mockMemoryRepository.listByProject.mockResolvedValueOnce({
        ok: true,
        data: [],
      });

      const response = await request(app)
        .get('/api/memory')
        .query({ projectId: 'proj-1' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        ok: true,
        data: [],
      });
    });

    it('should return all memories when no projectId', async () => {
      mockMemoryRepository.listAll.mockResolvedValueOnce({
        ok: true,
        data: [],
      });

      const response = await request(app)
        .get('/api/memory')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        ok: true,
        data: [],
      });

      expect(mockMemoryRepository.listAll).toHaveBeenCalled();
    });
  });

  describe('POST /api/memory', () => {
    it('should create a new memory', async () => {
      const newMemory = {
        id: 'mem-new',
        projectId: 'proj-1',
        title: 'New Memory',
        content: 'Some content',
        kind: 'project',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockMemoryRepository.save.mockResolvedValueOnce({
        ok: true,
        data: newMemory,
      });

      const response = await request(app)
        .post('/api/memory')
        .send({
          projectId: 'proj-1',
          title: 'New Memory',
          content: 'Some content',
          kind: 'project',
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        ok: true,
      });

      expect(mockMemoryRepository.save).toHaveBeenCalled();
    });

    it('should validate title is required', async () => {
      const response = await request(app)
        .post('/api/memory')
        .send({ projectId: 'proj-1' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toMatchObject({
        ok: false,
        error: expect.objectContaining({
          message: expect.stringContaining('title'),
        }),
      });
    });
  });

  describe('PUT /api/memory/:id', () => {
    it('should update a memory', async () => {
      const updatedMemory = {
        id: 'mem-1',
        projectId: 'proj-1',
        title: 'Updated Title',
        content: 'Updated content',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      };

      mockMemoryRepository.update.mockResolvedValueOnce({
        ok: true,
        data: updatedMemory,
      });

      const response = await request(app)
        .put('/api/memory/mem-1')
        .send({ title: 'Updated Title', content: 'Updated content' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        ok: true,
      });

      expect(mockMemoryRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'mem-1', title: 'Updated Title' })
      );
    });

    it('should return error when memory not found', async () => {
      mockMemoryRepository.update.mockResolvedValueOnce({
        ok: false,
        error: {
          code: 'DIRECTORY_NOT_FOUND',
          message: 'Memory not found',
          recoverable: false,
        },
      });

      const response = await request(app)
        .put('/api/memory/nonexistent')
        .send({ title: 'Updated' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        ok: false,
      });
    });
  });

  describe('DELETE /api/memory/:id', () => {
    it('should delete a memory', async () => {
      mockMemoryRepository.delete.mockResolvedValueOnce({
        ok: true,
        data: undefined,
      });

      const response = await request(app)
        .delete('/api/memory/mem-1')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        ok: true,
      });

      expect(mockMemoryRepository.delete).toHaveBeenCalledWith('mem-1');
    });

    it('should return error when delete fails', async () => {
      mockMemoryRepository.delete.mockResolvedValueOnce({
        ok: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: 'Cannot delete memory',
          recoverable: false,
        },
      });

      const response = await request(app)
        .delete('/api/memory/mem-1')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        ok: false,
      });
    });
  });

  describe('GET /api/memory/search', () => {
    it('should search memories by keyword', async () => {
      // Since there's no search function in memoryRepository, we'll use listByProject
      // and filter in the route
      const mockMemories = [
        { id: 'mem-1', title: 'Test Memory', content: 'This contains keyword' },
        { id: 'mem-2', title: 'Another Memory', content: 'No keyword here' },
      ];

      mockMemoryRepository.listByProject.mockResolvedValueOnce({
        ok: true,
        data: mockMemories,
      });

      const response = await request(app)
        .get('/api/memory/search')
        .query({ keyword: 'keyword', projectId: 'proj-1' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        ok: true,
      });
    });

    it('should require keyword parameter', async () => {
      const response = await request(app)
        .get('/api/memory/search')
        .query({ projectId: 'proj-1' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toMatchObject({
        ok: false,
      });
    });
  });
});