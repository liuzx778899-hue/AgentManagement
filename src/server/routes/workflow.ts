import { Router, Request, Response, NextFunction } from 'express';
import { getServices } from '../services/serviceFactory';
import {
  createWorkflowRun,
  pauseWorkflowRun,
  resumeWorkflowRun,
  cancelWorkflowRun,
  getWorkflowRunStatus,
  getWorkflowRun,
  listProjectWorkflowRuns,
} from '../../services/local/useCases';
import type { Workflow, WorkflowStep } from '../../domain/workflow';

export const workflowRouter = Router();

// Mock workflow templates (in real implementation, these would come from a repository)
const workflowTemplates: Record<string, Workflow> = {
  'default': {
    id: 'default',
    name: 'Default Workflow',
    version: '1.0',
    description: 'Standard workflow for project development',
    status: 'active',
    steps: [
      { id: 'step-1', order: 0, name: 'Planning', roleId: 'planner', modelProviderId: 'anthropic', modelName: 'claude-3', inputs: [], outputs: [], gateMode: 'auto', failureStrategy: 'stop', projectOverride: false },
      { id: 'step-2', order: 1, name: 'Implementation', roleId: 'implementer', modelProviderId: 'anthropic', modelName: 'claude-3', inputs: [], outputs: [], gateMode: 'auto', failureStrategy: 'stop', projectOverride: false },
      { id: 'step-3', order: 2, name: 'Review', roleId: 'reviewer', modelProviderId: 'anthropic', modelName: 'claude-3', inputs: [], outputs: [], gateMode: 'manual', gateType: 'manual', failureStrategy: 'stop', projectOverride: false },
      { id: 'step-4', order: 3, name: 'Testing', roleId: 'tester', modelProviderId: 'anthropic', modelName: 'claude-3', inputs: [], outputs: [], gateMode: 'auto', failureStrategy: 'stop', projectOverride: false },
    ],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
};

/**
 * POST /api/workflow/run
 * Start a workflow run
 */
workflowRouter.post('/run', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, templateId, triggeredBy } = req.body;

    // Validate required fields
    if (!projectId) {
      res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'projectId is required',
          recoverable: true,
        },
      });
      return;
    }

    if (!templateId) {
      res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'templateId is required',
          recoverable: true,
        },
      });
      return;
    }

    // Get project
    const services = getServices();
    const projectResult = await services.repositories.project.load(projectId);

    if (!projectResult.ok || !projectResult.data) {
      res.json({
        ok: false,
        error: {
          code: 'DIRECTORY_NOT_FOUND',
          message: 'Project not found',
          recoverable: false,
        },
      });
      return;
    }

    // Get workflow template
    const workflow = workflowTemplates[templateId] || workflowTemplates['default'];

    // Create workflow run
    const result = await createWorkflowRun({
      workflow,
      project: projectResult.data,
      triggeredBy: triggeredBy || 'user',
    });

    if (result.ok && result.data) {
      res.json({
        ok: true,
        data: {
          runId: result.data.id,
          state: result.data.state,
          currentStep: result.data.currentStepId,
        },
      });
    } else {
      res.json(result);
    }
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/workflow/pause
 * Pause a workflow run
 */
workflowRouter.post('/pause', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { runId } = req.body;

    if (!runId) {
      res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'runId is required',
          recoverable: true,
        },
      });
      return;
    }

    const result = await pauseWorkflowRun(runId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/workflow/resume
 * Resume a workflow run
 */
workflowRouter.post('/resume', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { runId } = req.body;

    if (!runId) {
      res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'runId is required',
          recoverable: true,
        },
      });
      return;
    }

    const result = await resumeWorkflowRun(runId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/workflow/cancel
 * Cancel a workflow run
 */
workflowRouter.post('/cancel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { runId, reason } = req.body;

    if (!runId) {
      res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'runId is required',
          recoverable: true,
        },
      });
      return;
    }

    const result = await cancelWorkflowRun(runId, reason);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/workflow/status/:runId
 * Get workflow run status
 */
workflowRouter.get('/status/:runId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const runId = req.params.runId as string;
    const result = await getWorkflowRunStatus(runId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/workflow/run/:runId
 * Get workflow run details
 */
workflowRouter.get('/run/:runId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const runId = req.params.runId as string;
    const result = await getWorkflowRun(runId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/workflow/list/:projectId
 * List workflow runs for a project
 */
workflowRouter.get('/list/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const result = await listProjectWorkflowRuns(projectId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});