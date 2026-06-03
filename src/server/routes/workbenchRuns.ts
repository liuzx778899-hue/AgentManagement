/**
 * Workbench Runs API Routes
 *
 * Provides the REST API for workbench run lifecycle management.
 * Bridges workflow execution with real runner process control.
 *
 * Route ordering matters: static paths before dynamic :runId params.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { getServices } from '../services/serviceFactory';
import {
  startWorkbenchRun,
  getWorkbenchRunView,
  getWorkbenchRunProgress,
  advanceWorkbenchStepRun,
  handleWorkbenchGateRun,
  stopWorkbenchRun,
  pauseWorkbenchRunAction,
  resumeWorkbenchRunAction,
  listProjectWorkbenchRuns,
  getWorkbenchRunLogs,
} from '../../services/local/useCases';
import type { RunnerKind } from '../../domain/runner';

export const workbenchRunsRouter = Router();

// ---------------------------------------------------------------------------
// Static paths (must be registered BEFORE :runId routes)
// ---------------------------------------------------------------------------

/**
 * POST /api/workbench-runs/start
 * Start a new workbench run
 */
workbenchRunsRouter.post('/start', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      projectId,
      taskId,
      workflowId,
      triggeredBy,
      runnerKind,
      cwd,
      command,
      args,
      env,
    } = req.body;

    // Validate required fields
    if (!projectId) {
      res.status(400).json({
        ok: false,
        error: { code: 'INVALID_INPUT', message: 'projectId is required', recoverable: true },
      });
      return;
    }
    if (!taskId) {
      res.status(400).json({
        ok: false,
        error: { code: 'INVALID_INPUT', message: 'taskId is required', recoverable: true },
      });
      return;
    }
    if (!workflowId) {
      res.status(400).json({
        ok: false,
        error: { code: 'INVALID_INPUT', message: 'workflowId is required', recoverable: true },
      });
      return;
    }
    if (!cwd) {
      res.status(400).json({
        ok: false,
        error: { code: 'INVALID_INPUT', message: 'cwd is required', recoverable: true },
      });
      return;
    }

    const services = getServices();

    // Load project
    const projectResult = await services.repositories.project.load(projectId);
    if (!projectResult.ok || !projectResult.data) {
      res.json({
        ok: false,
        error: { code: 'DIRECTORY_NOT_FOUND', message: 'Project not found', recoverable: false },
      });
      return;
    }

    // Load workflow
    const workflowResult = await services.repositories.workflow.load(workflowId);
    if (!workflowResult.ok || !workflowResult.data) {
      res.json({
        ok: false,
        error: { code: 'WORKFLOW_NOT_FOUND', message: 'Workflow not found', recoverable: false },
      });
      return;
    }

    // Load task
    const taskResult = await services.repositories.task.load(taskId);
    if (!taskResult.ok || !taskResult.data) {
      res.json({
        ok: false,
        error: { code: 'TASK_NOT_FOUND', message: 'Task not found', recoverable: false },
      });
      return;
    }

    const result = await startWorkbenchRun(services.processRunner, {
      workflow: workflowResult.data,
      project: projectResult.data,
      task: taskResult.data,
      triggeredBy: triggeredBy || 'user',
      runnerKind: (runnerKind || 'claude-code') as RunnerKind,
      cwd,
      command,
      args,
      env,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/workbench-runs/project/:projectId
 * List all workbench runs for a project
 *
 * IMPORTANT: Must be before /:runId to avoid "project" being captured as runId.
 */
workbenchRunsRouter.get('/project/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const result = await listProjectWorkbenchRuns(projectId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Dynamic :runId routes
// ---------------------------------------------------------------------------

/**
 * GET /api/workbench-runs/:runId
 * Get workbench run status
 */
workbenchRunsRouter.get('/:runId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const runId = req.params.runId as string;
    const services = getServices();

    const result = await getWorkbenchRunView(services.processRunner, runId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/workbench-runs/:runId/progress
 * Get workbench run progress
 */
workbenchRunsRouter.get('/:runId/progress', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const runId = req.params.runId as string;
    const result = await getWorkbenchRunProgress(runId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/workbench-runs/:runId/logs
 * Get logs for the active runner process of a workbench run
 */
workbenchRunsRouter.get('/:runId/logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const runId = req.params.runId as string;
    const services = getServices();

    const result = await getWorkbenchRunLogs(services.processRunner, runId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/workbench-runs/:runId/advance
 * Advance to the next step
 */
workbenchRunsRouter.post('/:runId/advance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const runId = req.params.runId as string;
    const { completedStepId, outputArtifacts, error, workflowId } = req.body;

    if (!completedStepId) {
      res.status(400).json({
        ok: false,
        error: { code: 'INVALID_INPUT', message: 'completedStepId is required', recoverable: true },
      });
      return;
    }
    if (!workflowId) {
      res.status(400).json({
        ok: false,
        error: { code: 'INVALID_INPUT', message: 'workflowId is required', recoverable: true },
      });
      return;
    }

    const services = getServices();

    // Load workflow for step lookup
    const workflowResult = await services.repositories.workflow.load(workflowId);
    if (!workflowResult.ok || !workflowResult.data) {
      res.json({
        ok: false,
        error: { code: 'WORKFLOW_NOT_FOUND', message: 'Workflow not found', recoverable: false },
      });
      return;
    }

    const result = await advanceWorkbenchStepRun(services.processRunner, {
      runId,
      completedStepId,
      outputArtifacts,
      error,
      workflow: workflowResult.data,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/workbench-runs/:runId/gate
 * Handle gate decision
 */
workbenchRunsRouter.post('/:runId/gate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const runId = req.params.runId as string;
    const { decision, decidedBy, reason, workflowId } = req.body;

    if (!decision || (decision !== 'approve' && decision !== 'reject')) {
      res.status(400).json({
        ok: false,
        error: { code: 'INVALID_INPUT', message: 'decision must be "approve" or "reject"', recoverable: true },
      });
      return;
    }
    if (!decidedBy) {
      res.status(400).json({
        ok: false,
        error: { code: 'INVALID_INPUT', message: 'decidedBy is required', recoverable: true },
      });
      return;
    }
    if (!workflowId) {
      res.status(400).json({
        ok: false,
        error: { code: 'INVALID_INPUT', message: 'workflowId is required', recoverable: true },
      });
      return;
    }

    const services = getServices();

    // Load workflow for step lookup
    const workflowResult = await services.repositories.workflow.load(workflowId);
    if (!workflowResult.ok || !workflowResult.data) {
      res.json({
        ok: false,
        error: { code: 'WORKFLOW_NOT_FOUND', message: 'Workflow not found', recoverable: false },
      });
      return;
    }

    const result = await handleWorkbenchGateRun(services.processRunner, workflowResult.data, {
      runId,
      decision,
      decidedBy,
      reason,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/workbench-runs/:runId/stop
 * Stop a workbench run
 */
workbenchRunsRouter.post('/:runId/stop', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const runId = req.params.runId as string;
    const { reason } = req.body;

    const services = getServices();

    const result = await stopWorkbenchRun(services.processRunner, {
      runId,
      reason,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/workbench-runs/:runId/pause
 * Pause a workbench run
 */
workbenchRunsRouter.post('/:runId/pause', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const runId = req.params.runId as string;
    const services = getServices();

    const result = await pauseWorkbenchRunAction(services.processRunner, runId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/workbench-runs/:runId/resume
 * Resume a paused workbench run
 */
workbenchRunsRouter.post('/:runId/resume', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const runId = req.params.runId as string;
    const { workflowId, cwd } = req.body;

    if (!workflowId) {
      res.status(400).json({
        ok: false,
        error: { code: 'INVALID_INPUT', message: 'workflowId is required', recoverable: true },
      });
      return;
    }

    const services = getServices();

    // Load workflow for step lookup
    const workflowResult = await services.repositories.workflow.load(workflowId);
    if (!workflowResult.ok || !workflowResult.data) {
      res.json({
        ok: false,
        error: { code: 'WORKFLOW_NOT_FOUND', message: 'Workflow not found', recoverable: false },
      });
      return;
    }

    const result = await resumeWorkbenchRunAction(
      services.processRunner,
      workflowResult.data,
      runId,
      cwd,
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
});
