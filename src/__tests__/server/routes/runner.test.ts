import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { runnerRouter } from '../../../server/routes/runner';
import type { RunnerProcess, LogEntry, ProcessState } from '../../../types/localEngineering';
import type { RunnerKind } from '../../../domain/runner';

// Mock the service factory
vi.mock('../../../server/services/serviceFactory', () => ({
  getServices: vi.fn(),
}));

// Mock the useCases
vi.mock('../../../services/local/useCases', () => ({
  startRunnerProcess: vi.fn(),
  stopRunnerProcess: vi.fn(),
  getProcessLogs: vi.fn(),
  getProcessStatus: vi.fn(),
  listRunningProcesses: vi.fn(),
}));

import { getServices } from '../../../server/services/serviceFactory';
import {
  startRunnerProcess,
  stopRunnerProcess,
  getProcessLogs,
  getProcessStatus,
  listRunningProcesses,
} from '../../../services/local/useCases';

const mockGetServices = vi.mocked(getServices);
const mockStartRunnerProcess = vi.mocked(startRunnerProcess);
const mockStopRunnerProcess = vi.mocked(stopRunnerProcess);
const mockGetProcessLogs = vi.mocked(getProcessLogs);
const mockGetProcessStatus = vi.mocked(getProcessStatus);
const mockListRunningProcesses = vi.mocked(listRunningProcesses);

describe('Runner Router', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/runner', runnerRouter);

    // Default mock for getServices
    mockGetServices.mockReturnValue({
      processRunner: {},
    } as any);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /api/runner/start', () => {
    it('should start a runner process', async () => {
      const mockProcess = {
        id: 'process-123',
        runnerId: 'runner-1',
        state: 'running' as const,
        logs: [],
        runnerKind: 'claude-code' as const,
      };

      mockStartRunnerProcess.mockResolvedValueOnce({
        ok: true,
        data: mockProcess,
      });

      const response = await request(app)
        .post('/api/runner/start')
        .send({
          runnerId: 'runner-1',
          kind: 'claude-code',
          cwd: '/path/to/repo',
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        ok: true,
        data: mockProcess,
      });

      expect(mockStartRunnerProcess).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          runnerId: 'runner-1',
          runnerKind: 'claude-code',
          cwd: '/path/to/repo',
        })
      );
    });

    it('should return error when start fails', async () => {
      mockStartRunnerProcess.mockResolvedValueOnce({
        ok: false,
        error: {
          code: 'COMMAND_NOT_FOUND',
          message: 'claude command not found',
          recoverable: true,
        },
      });

      const response = await request(app)
        .post('/api/runner/start')
        .send({
          runnerId: 'runner-1',
          kind: 'claude-code',
          cwd: '/path/to/repo',
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        ok: false,
        error: {
          code: 'COMMAND_NOT_FOUND',
          message: 'claude command not found',
          recoverable: true,
        },
      });
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/runner/start')
        .send({
          kind: 'claude-code',
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toMatchObject({
        ok: false,
        error: expect.objectContaining({
          message: expect.stringContaining('runnerId'),
        }),
      });
    });
  });

  describe('POST /api/runner/stop', () => {
    it('should stop a running process', async () => {
      mockStopRunnerProcess.mockResolvedValueOnce({
        ok: true,
        data: {
          id: 'process-123',
          runnerId: 'runner-1',
          state: 'stopped',
          logs: [],
        },
      });

      const response = await request(app)
        .post('/api/runner/stop')
        .send({ processId: 'process-123' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        ok: true,
      });

      expect(mockStopRunnerProcess).toHaveBeenCalledWith(
        expect.anything(),
        'process-123'
      );
    });

    it('should return error when process not found', async () => {
      mockStopRunnerProcess.mockResolvedValueOnce({
        ok: false,
        error: {
          code: 'DIRECTORY_NOT_FOUND',
          message: 'Process not found',
          recoverable: false,
        },
      });

      const response = await request(app)
        .post('/api/runner/stop')
        .send({ processId: 'invalid-id' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        ok: false,
      });
    });

    it('should validate processId is required', async () => {
      const response = await request(app)
        .post('/api/runner/stop')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toMatchObject({
        ok: false,
      });
    });
  });

  describe('GET /api/runner/logs/:processId', () => {
    it('should get process logs', async () => {
      const mockLogs = [
        { timestamp: '2024-01-01T00:00:00Z', stream: 'stdout' as const, content: 'Starting...' },
        { timestamp: '2024-01-01T00:00:01Z', stream: 'stderr' as const, content: 'Warning...' },
      ];

      mockGetProcessLogs.mockResolvedValueOnce({
        ok: true,
        data: mockLogs,
      });

      const response = await request(app)
        .get('/api/runner/logs/process-123')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        ok: true,
        data: mockLogs,
      });

      expect(mockGetProcessLogs).toHaveBeenCalledWith(
        expect.anything(),
        'process-123'
      );
    });

    it('should return error when process not found', async () => {
      mockGetProcessLogs.mockResolvedValueOnce({
        ok: false,
        error: {
          code: 'DIRECTORY_NOT_FOUND',
          message: 'Process not found',
          recoverable: false,
        },
      });

      const response = await request(app)
        .get('/api/runner/logs/invalid-id')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        ok: false,
      });
    });
  });

  describe('GET /api/runner/status/:processId', () => {
    it('should get process status', async () => {
      const mockStatus = {
        id: 'process-123',
        runnerId: 'runner-1',
        state: 'running' as const,
        pid: 12345,
        logs: [],
      };

      mockGetProcessStatus.mockResolvedValueOnce({
        ok: true,
        data: mockStatus,
      });

      const response = await request(app)
        .get('/api/runner/status/process-123')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        ok: true,
        data: mockStatus,
      });

      expect(mockGetProcessStatus).toHaveBeenCalledWith(
        expect.anything(),
        'process-123'
      );
    });
  });

  describe('GET /api/runner/list', () => {
    it('should list all running processes', async () => {
      const mockProcesses = [
        { id: 'process-1', runnerId: 'runner-1', state: 'running' as const, logs: [] },
        { id: 'process-2', runnerId: 'runner-2', state: 'running' as const, logs: [] },
      ];

      mockListRunningProcesses.mockResolvedValueOnce({
        ok: true,
        data: mockProcesses,
      });

      const response = await request(app)
        .get('/api/runner/list')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        ok: true,
        data: mockProcesses,
      });

      expect(mockListRunningProcesses).toHaveBeenCalledWith(expect.anything());
    });

    it('should return empty array when no processes', async () => {
      mockListRunningProcesses.mockResolvedValueOnce({
        ok: true,
        data: [],
      });

      const response = await request(app)
        .get('/api/runner/list')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        ok: true,
        data: [],
      });
    });
  });
});
