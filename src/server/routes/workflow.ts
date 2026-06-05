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
import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export const workflowRouter = Router();

/**
 * GET /api/workflow/templates
 * List all workflow templates
 */
workflowRouter.get('/templates', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const templates: Workflow[] = [];
    const templatesDir = join(process.cwd(), '.agentmanagement', 'workflows');

    try {
      const files = await readdir(templatesDir);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        try {
          const content = await readFile(join(templatesDir, file), 'utf-8');
          const template = JSON.parse(content);
          if (!template.deleted) {
            templates.push(template);
          }
        } catch {
          // Skip invalid files
        }
      }
    } catch {
      // Directory doesn't exist
    }

    res.json({ ok: true, data: templates });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/workflow/templates
 * Create or update a workflow template
 */
workflowRouter.post('/templates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const template = req.body;

    if (!template || !template.name) {
      res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Template with name is required',
          recoverable: true,
        },
      });
      return;
    }

    // Generate ID if not provided
    const id = template.id || `workflow-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    const fullTemplate: Workflow = {
      ...template,
      id,
      createdAt: template.createdAt || now,
      updatedAt: now,
    };

    // Ensure directory exists
    const templatesDir = join(process.cwd(), '.agentmanagement', 'workflows');
    await mkdir(templatesDir, { recursive: true });

    // Write template to file
    const filePath = join(templatesDir, `${id}.json`);
    await writeFile(filePath, JSON.stringify(fullTemplate, null, 2), 'utf-8');

    res.json({ ok: true, data: fullTemplate });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/workflow/templates/:id
 * Update an existing workflow template
 */
workflowRouter.put('/templates/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id;
    const updates = req.body;

    if (!id) {
      res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Template ID is required',
          recoverable: true,
        },
      });
      return;
    }

    const templatesDir = join(process.cwd(), '.agentmanagement', 'workflows');
    const filePath = join(templatesDir, `${id}.json`);

    // Read existing template
    let existing: Workflow | null = null;
    try {
      const content = await readFile(filePath, 'utf-8');
      existing = JSON.parse(content);
    } catch {
      // File doesn't exist
    }

    if (!existing) {
      res.status(404).json({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Template not found',
          recoverable: false,
        },
      });
      return;
    }

    // Merge updates
    const updated: Workflow = {
      ...existing,
      ...updates,
      id, // Ensure ID doesn't change
      updatedAt: new Date().toISOString(),
    };

    await writeFile(filePath, JSON.stringify(updated, null, 2), 'utf-8');

    res.json({ ok: true, data: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/workflow/templates/:id
 * Delete a workflow template (soft delete)
 */
workflowRouter.delete('/templates/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id;

    if (!id) {
      res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Template ID is required',
          recoverable: true,
        },
      });
      return;
    }

    const templatesDir = join(process.cwd(), '.agentmanagement', 'workflows');
    const filePath = join(templatesDir, `${id}.json`);

    // Read and mark as deleted
    let existing: Workflow | null = null;
    try {
      const content = await readFile(filePath, 'utf-8');
      existing = JSON.parse(content);
    } catch {
      // File doesn't exist
    }

    if (!existing) {
      res.status(404).json({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Template not found',
          recoverable: false,
        },
      });
      return;
    }

    // Soft delete
    const deleted = { ...existing, deleted: true, deletedAt: new Date().toISOString() };
    await writeFile(filePath, JSON.stringify(deleted, null, 2), 'utf-8');

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Mock workflow templates (in real implementation, these would come from a repository)
const workflowTemplates: Record<string, Workflow> = {
  'default': {
    id: 'default',
    name: 'Default Workflow',
    version: '1.0',
    description: 'Standard workflow for project development',
    status: 'active',
    steps: [
      { id: 'step-1', order: 0, name: 'Planning', assignments: [{ id: 'asgn-1', order: 1, roleId: 'planner', modelProviderId: 'anthropic', modelName: 'claude-3', goal: 'Planning', acceptanceCriteria: [], inputs: [], outputs: [] }], inputs: [], outputs: [], gateMode: 'auto', failureStrategy: 'stop', projectOverride: false },
      { id: 'step-2', order: 1, name: 'Implementation', assignments: [{ id: 'asgn-2', order: 1, roleId: 'implementer', modelProviderId: 'anthropic', modelName: 'claude-3', goal: 'Implementation', acceptanceCriteria: [], inputs: [], outputs: [] }], inputs: [], outputs: [], gateMode: 'auto', failureStrategy: 'stop', projectOverride: false },
      { id: 'step-3', order: 2, name: 'Review', assignments: [{ id: 'asgn-3', order: 1, roleId: 'reviewer', modelProviderId: 'anthropic', modelName: 'claude-3', goal: 'Review', acceptanceCriteria: [], inputs: [], outputs: [] }], inputs: [], outputs: [], gateMode: 'manual', gateType: 'manual', failureStrategy: 'stop', projectOverride: false },
      { id: 'step-4', order: 3, name: 'Testing', assignments: [{ id: 'asgn-4', order: 1, roleId: 'tester', modelProviderId: 'anthropic', modelName: 'claude-3', goal: 'Testing', acceptanceCriteria: [], inputs: [], outputs: [] }], inputs: [], outputs: [], gateMode: 'auto', failureStrategy: 'stop', projectOverride: false },
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