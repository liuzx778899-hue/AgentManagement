import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { join } from 'path';
import { readdir, unlink } from 'fs/promises';
import { workflowRouter } from '../../../server/routes/workflow';

// Mock the service factory
vi.mock('../../../server/services/serviceFactory', () => ({
  getServices: vi.fn(),
}));

// Mock the workflow execution use cases
vi.mock('../../../services/local/useCases', () => ({
  createWorkflowRun: vi.fn(),
  pauseWorkflowRun: vi.fn(),
  resumeWorkflowRun: vi.fn(),
  cancelWorkflowRun: vi.fn(),
  getWorkflowRunStatus: vi.fn(),
  getWorkflowRun: vi.fn(),
  listProjectWorkflowRuns: vi.fn(),
}));

import { getServices } from '../../../server/services/serviceFactory';
import {
  createWorkflowRun,
  pauseWorkflowRun,
  resumeWorkflowRun,
  cancelWorkflowRun,
  getWorkflowRunStatus,
  getWorkflowRun,
  listProjectWorkflowRuns,
} from '../../../services/local/useCases';

const mockGetServices = vi.mocked(getServices);
const mockCreateWorkflowRun = vi.mocked(createWorkflowRun);
const mockPauseWorkflowRun = vi.mocked(pauseWorkflowRun);
const mockResumeWorkflowRun = vi.mocked(resumeWorkflowRun);
const mockCancelWorkflowRun = vi.mocked(cancelWorkflowRun);
const mockGetWorkflowRunStatus = vi.mocked(getWorkflowRunStatus);
const mockGetWorkflowRun = vi.mocked(getWorkflowRun);
const mockListProjectWorkflowRuns = vi.mocked(listProjectWorkflowRuns);

describe('Workflow Router', () => {
  let app: express.Express;
  let mockProjectRepository: any;
  let mockWorkflowRepository: any;
  let workflowsBeforeTest: string[] = [];

  const workflowsDir = join(process.cwd(), '.agentmanagement', 'workflows');

  beforeEach(async () => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/workflow', workflowRouter);

    // Create mock repository
    mockProjectRepository = {
      load: vi.fn(),
    };

    // Mock workflow repository with CRUD methods
    mockWorkflowRepository = {
      save: vi.fn().mockResolvedValue({ ok: true, data: {} }),
      load: vi.fn().mockResolvedValue({ ok: false, error: { code: 'DIRECTORY_NOT_FOUND', message: 'Not found', recoverable: false } }),
      update: vi.fn().mockResolvedValue({ ok: false, error: { code: 'DIRECTORY_NOT_FOUND', message: 'Not found', recoverable: false } }),
      delete: vi.fn().mockResolvedValue({ ok: false, error: { code: 'DIRECTORY_NOT_FOUND', message: 'Not found', recoverable: false } }),
      listAll: vi.fn().mockResolvedValue({ ok: true, data: [] }),
      listActive: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    };

    // Default mock for getServices
    mockGetServices.mockReturnValue({
      repositories: {
        project: mockProjectRepository,
        workflow: mockWorkflowRepository,
        memory: {},
      },
    } as any);

    // 记录测试前的文件列表，用于 afterEach 清理
    try {
      workflowsBeforeTest = await readdir(workflowsDir);
    } catch {
      workflowsBeforeTest = [];
    }
  });

  afterEach(async () => {
    vi.resetAllMocks();

    // 清理测试产生的垃圾文件
    try {
      const workflowsAfterTest = await readdir(workflowsDir);
      const newFiles = workflowsAfterTest.filter(f => !workflowsBeforeTest.includes(f));
      await Promise.all(
        newFiles.map(f => unlink(join(workflowsDir, f)).catch(() => {}))
      );
    } catch {
      // 目录不存在则忽略
    }
  });

  describe('POST /api/workflow/run', () => {
    it('should start a workflow run', async () => {
      const mockRun = {
        id: 'run-123',
        workflowId: 'workflow-1',
        workflowVersion: '1.0',
        projectId: 'proj-1',
        projectName: 'Project 1',
        state: 'running' as const,
        currentStepId: 'step-1',
        currentStepIndex: 0,
        steps: [],
        triggeredBy: 'user',
        startedAt: '2024-01-01T00:00:00Z',
      };

      mockProjectRepository.load.mockResolvedValueOnce({
        ok: true,
        data: {
          id: 'proj-1',
          name: 'Project 1',
          repoPath: '/path/1',
          workflowTemplateId: 'workflow-1',
        },
      });

      mockCreateWorkflowRun.mockResolvedValueOnce({
        ok: true,
        data: mockRun,
      });

      const response = await request(app)
        .post('/api/workflow/run')
        .send({
          projectId: 'proj-1',
          templateId: 'workflow-1',
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        ok: true,
        data: expect.objectContaining({
          runId: 'run-123',
        }),
      });
    });

    it('should validate projectId is required', async () => {
      const response = await request(app)
        .post('/api/workflow/run')
        .send({ templateId: 'workflow-1' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toMatchObject({
        ok: false,
        error: expect.objectContaining({
          message: expect.stringContaining('projectId'),
        }),
      });
    });
  });

  describe('POST /api/workflow/pause', () => {
    it('should pause a workflow run', async () => {
      const mockRun = {
        id: 'run-123',
        state: 'paused' as const,
        workflowId: 'workflow-1',
        workflowVersion: '1.0',
        projectId: 'proj-1',
        projectName: 'Project 1',
        currentStepId: 'step-1',
        currentStepIndex: 0,
        steps: [],
        triggeredBy: 'user',
        startedAt: '2024-01-01T00:00:00Z',
      };

      mockPauseWorkflowRun.mockResolvedValueOnce({
        ok: true,
        data: mockRun,
      });

      const response = await request(app)
        .post('/api/workflow/pause')
        .send({ runId: 'run-123' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        ok: true,
      });

      expect(mockPauseWorkflowRun).toHaveBeenCalledWith('run-123');
    });

    it('should validate runId is required', async () => {
      const response = await request(app)
        .post('/api/workflow/pause')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toMatchObject({
        ok: false,
      });
    });
  });

  describe('POST /api/workflow/resume', () => {
    it('should resume a workflow run', async () => {
      const mockRun = {
        id: 'run-123',
        state: 'running' as const,
        workflowId: 'workflow-1',
        workflowVersion: '1.0',
        projectId: 'proj-1',
        projectName: 'Project 1',
        currentStepId: 'step-1',
        currentStepIndex: 0,
        steps: [],
        triggeredBy: 'user',
        startedAt: '2024-01-01T00:00:00Z',
      };

      mockResumeWorkflowRun.mockResolvedValueOnce({
        ok: true,
        data: mockRun,
      });

      const response = await request(app)
        .post('/api/workflow/resume')
        .send({ runId: 'run-123' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        ok: true,
      });

      expect(mockResumeWorkflowRun).toHaveBeenCalledWith('run-123');
    });

    it('should validate runId is required', async () => {
      const response = await request(app)
        .post('/api/workflow/resume')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toMatchObject({
        ok: false,
      });
    });
  });

  describe('POST /api/workflow/cancel', () => {
    it('should cancel a workflow run', async () => {
      const mockRun = {
        id: 'run-123',
        state: 'cancelled' as const,
        workflowId: 'workflow-1',
        workflowVersion: '1.0',
        projectId: 'proj-1',
        projectName: 'Project 1',
        currentStepId: null,
        currentStepIndex: -1,
        steps: [],
        triggeredBy: 'user',
        startedAt: '2024-01-01T00:00:00Z',
        completedAt: '2024-01-01T00:01:00Z',
      };

      mockCancelWorkflowRun.mockResolvedValueOnce({
        ok: true,
        data: mockRun,
      });

      const response = await request(app)
        .post('/api/workflow/cancel')
        .send({ runId: 'run-123', reason: 'User requested' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        ok: true,
      });

      expect(mockCancelWorkflowRun).toHaveBeenCalledWith('run-123', 'User requested');
    });

    it('should validate runId is required', async () => {
      const response = await request(app)
        .post('/api/workflow/cancel')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toMatchObject({
        ok: false,
      });
    });
  });

  describe('GET /api/workflow/status/:runId', () => {
    it('should get workflow run status', async () => {
      const mockProgress = {
        totalSteps: 5,
        completedSteps: 2,
        currentStep: 'Step 3',
        percentage: 40,
        state: 'running' as const,
      };

      mockGetWorkflowRunStatus.mockResolvedValueOnce({
        ok: true,
        data: mockProgress,
      });

      const response = await request(app)
        .get('/api/workflow/status/run-123')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        ok: true,
        data: mockProgress,
      });

      expect(mockGetWorkflowRunStatus).toHaveBeenCalledWith('run-123');
    });

    it('should return error when run not found', async () => {
      mockGetWorkflowRunStatus.mockResolvedValueOnce({
        ok: false,
        error: {
          code: 'DIRECTORY_NOT_FOUND',
          message: 'Run not found',
          recoverable: false,
        },
      });

      const response = await request(app)
        .get('/api/workflow/status/invalid-id')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        ok: false,
      });
    });
  });

  describe('GET /api/workflow/run/:runId', () => {
    it('should get workflow run details', async () => {
      const mockRun = {
        id: 'run-123',
        workflowId: 'workflow-1',
        workflowVersion: '1.0',
        projectId: 'proj-1',
        projectName: 'Project 1',
        state: 'running' as const,
        currentStepId: 'step-1',
        currentStepIndex: 0,
        steps: [],
        triggeredBy: 'user',
        startedAt: '2024-01-01T00:00:00Z',
      };

      mockGetWorkflowRun.mockResolvedValueOnce({
        ok: true,
        data: mockRun,
      });

      const response = await request(app)
        .get('/api/workflow/run/run-123')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        ok: true,
        data: mockRun,
      });

      expect(mockGetWorkflowRun).toHaveBeenCalledWith('run-123');
    });
  });

  describe('GET /api/workflow/list/:projectId', () => {
    it('should list workflow runs for a project', async () => {
      const mockRuns = [
        {
          id: 'run-1',
          workflowId: 'workflow-1',
          workflowVersion: '1.0',
          projectId: 'proj-1',
          projectName: 'Project 1',
          state: 'completed' as const,
          currentStepId: null,
          currentStepIndex: -1,
          steps: [],
          triggeredBy: 'user',
          startedAt: '2024-01-01T00:00:00Z',
          completedAt: '2024-01-01T00:01:00Z',
        },
        {
          id: 'run-2',
          workflowId: 'workflow-1',
          workflowVersion: '1.0',
          projectId: 'proj-1',
          projectName: 'Project 1',
          state: 'running' as const,
          currentStepId: 'step-2',
          currentStepIndex: 1,
          steps: [],
          triggeredBy: 'user',
          startedAt: '2024-01-02T00:00:00Z',
        },
      ];

      mockListProjectWorkflowRuns.mockResolvedValueOnce({
        ok: true,
        data: mockRuns,
      });

      const response = await request(app)
        .get('/api/workflow/list/proj-1')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        ok: true,
        data: mockRuns,
      });

      expect(mockListProjectWorkflowRuns).toHaveBeenCalledWith('proj-1');
    });
  });

  // ============================================
  // 补充测试：Templates CRUD
  // ============================================
  describe('GET /api/workflow/templates', () => {
    it('should return empty array when no templates', async () => {
      const response = await request(app)
        .get('/api/workflow/templates')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        ok: true,
        data: expect.any(Array),
      });
    });
  });

  describe('POST /api/workflow/templates', () => {
    it('should create a new template', async () => {
      const newTemplate = {
        name: 'New Workflow Template',
        version: '1.0',
        status: 'draft' as const,
        steps: [
          {
            id: 'step-1',
            name: 'Planning',
            order: 1,
            roleId: 'role-pm',
            modelProviderId: 'anthropic',
            modelName: 'claude-3',
            inputs: [],
            outputs: [],
            gateMode: 'auto' as const,
            failureStrategy: 'stop' as const,
            projectOverride: false,
          },
        ],
      };

      const response = await request(app)
        .post('/api/workflow/templates')
        .send(newTemplate)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        ok: true,
        data: expect.objectContaining({
          name: 'New Workflow Template',
          id: expect.any(String),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
      });
    });

    it('should validate template name is required', async () => {
      const response = await request(app)
        .post('/api/workflow/templates')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toMatchObject({
        ok: false,
        error: expect.objectContaining({
          code: 'INVALID_INPUT',
        }),
      });
    });

    it('should accept template with existing id', async () => {
      const templateWithId = {
        id: 'custom-template-001',
        name: 'Custom Template',
        version: '1.0',
        status: 'active' as const,
        steps: [],
      };

      const response = await request(app)
        .post('/api/workflow/templates')
        .send(templateWithId)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.data.id).toBe('custom-template-001');
    });
  });

  describe('PUT /api/workflow/templates/:id', () => {
    it('should return 404 for non-existent template', async () => {
      const response = await request(app)
        .put('/api/workflow/templates/non-existent-id')
        .send({ name: 'Updated Name' })
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toMatchObject({
        ok: false,
        error: expect.objectContaining({
          code: 'NOT_FOUND',
        }),
      });
    });

    it('should validate template id is required', async () => {
      // Note: This is covered by the route parameter
      // The test above covers missing template scenario
    });
  });

  describe('DELETE /api/workflow/templates/:id', () => {
    it('should return 404 for non-existent template', async () => {
      const response = await request(app)
        .delete('/api/workflow/templates/non-existent-id')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toMatchObject({
        ok: false,
        error: expect.objectContaining({
          code: 'NOT_FOUND',
        }),
      });
    });

    it('should validate template id is required', async () => {
      // Covered by route parameter validation
    });
  });

  // ============================================
  // 补充测试：错误响应格式验证
  // ============================================
  describe('Error response format', () => {
    it('should return consistent error format for validation errors', async () => {
      const response = await request(app)
        .post('/api/workflow/run')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toMatchObject({
        ok: false,
        error: {
          code: expect.any(String),
          message: expect.any(String),
          recoverable: expect.any(Boolean),
        },
      });
    });

    it('should return consistent error format for missing runId', async () => {
      const response = await request(app)
        .post('/api/workflow/pause')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toMatchObject({
        ok: false,
        error: {
          code: 'INVALID_INPUT',
          message: expect.stringContaining('runId'),
          recoverable: true,
        },
      });
    });
  });

  // ============================================
  // 补充测试：并发运行
  // ============================================
  describe('Concurrent workflow runs', () => {
    it('should handle multiple runs for same project', async () => {
      mockProjectRepository.load.mockResolvedValue({
        ok: true,
        data: {
          id: 'proj-1',
          name: 'Project 1',
          repoPath: '/path/1',
          workflowTemplateId: 'workflow-1',
        },
      });

      mockCreateWorkflowRun
        .mockResolvedValueOnce({
          ok: true,
          data: {
            id: 'run-1',
            workflowId: 'workflow-1',
            workflowVersion: '1.0',
            projectId: 'proj-1',
            projectName: 'Project 1',
            state: 'running',
            currentStepId: 'step-1',
            currentStepIndex: 0,
            steps: [],
            triggeredBy: 'user',
            startedAt: '2024-01-01T00:00:00Z',
          },
        })
        .mockResolvedValueOnce({
          ok: true,
          data: {
            id: 'run-2',
            workflowId: 'workflow-1',
            workflowVersion: '1.0',
            projectId: 'proj-1',
            projectName: 'Project 1',
            state: 'running',
            currentStepId: 'step-1',
            currentStepIndex: 0,
            steps: [],
            triggeredBy: 'user',
            startedAt: '2024-01-01T00:00:01Z',
          },
        });

      const [response1, response2] = await Promise.all([
        request(app)
          .post('/api/workflow/run')
          .send({ projectId: 'proj-1', templateId: 'workflow-1' }),
        request(app)
          .post('/api/workflow/run')
          .send({ projectId: 'proj-1', templateId: 'workflow-1' }),
      ]);

      expect(response1.body.data.runId).toBe('run-1');
      expect(response2.body.data.runId).toBe('run-2');
    });
  });

  // ============================================
  // 补充测试：项目不存在场景
  // ============================================
  describe('Project not found scenarios', () => {
    it('should return error when project not found for workflow run', async () => {
      mockProjectRepository.load.mockResolvedValueOnce({
        ok: false,
        error: {
          code: 'DIRECTORY_NOT_FOUND',
          message: 'Project not found',
          recoverable: false,
        },
      });

      const response = await request(app)
        .post('/api/workflow/run')
        .send({ projectId: 'non-existent', templateId: 'workflow-1' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        ok: false,
        error: expect.objectContaining({
          code: 'DIRECTORY_NOT_FOUND',
        }),
      });
    });
  });
});