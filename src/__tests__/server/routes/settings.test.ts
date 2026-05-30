import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { settingsRouter } from '../../../server/routes/settings';

// Mock the service factory
vi.mock('../../../server/services/serviceFactory', () => ({
  getServices: vi.fn(),
}));

import { getServices } from '../../../server/services/serviceFactory';

const mockGetServices = vi.mocked(getServices);

describe('Settings Router', () => {
  let app: express.Express;
  let mockFileStore: any;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/settings', settingsRouter);

    // Create mock file store
    mockFileStore = {
      readJson: vi.fn(),
      writeJson: vi.fn(),
    };

    // Default mock for getServices
    mockGetServices.mockReturnValue({
      fileStore: mockFileStore,
    } as any);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/settings', () => {
    it('should get app settings', async () => {
      const mockSettings = {
        theme: 'dark',
        language: 'en',
        notifications: true,
        autoSave: true,
      };

      mockFileStore.readJson.mockResolvedValueOnce({
        ok: true,
        data: mockSettings,
      });

      const response = await request(app)
        .get('/api/settings')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        ok: true,
        data: expect.objectContaining(mockSettings),
      });

      expect(mockFileStore.readJson).toHaveBeenCalled();
    });

    it('should return default settings when no settings file', async () => {
      mockFileStore.readJson.mockResolvedValueOnce({
        ok: false,
        error: {
          code: 'DIRECTORY_NOT_FOUND',
          message: 'Settings file not found',
          recoverable: false,
        },
      });

      const response = await request(app)
        .get('/api/settings')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        ok: true,
        data: expect.objectContaining({
          theme: 'system',
        }),
      });
    });
  });

  describe('PUT /api/settings', () => {
    it('should save app settings', async () => {
      const newSettings = {
        theme: 'light',
        language: 'zh',
        notifications: false,
      };

      mockFileStore.writeJson.mockResolvedValueOnce({
        ok: true,
        data: undefined,
      });

      const response = await request(app)
        .put('/api/settings')
        .send(newSettings)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        ok: true,
      });

      expect(mockFileStore.writeJson).toHaveBeenCalled();
    });

    it('should return error when save fails', async () => {
      mockFileStore.writeJson.mockResolvedValueOnce({
        ok: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: 'Cannot write settings',
          recoverable: false,
        },
      });

      const response = await request(app)
        .put('/api/settings')
        .send({ theme: 'dark' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        ok: false,
      });
    });
  });
});