import { Router, Request, Response, NextFunction } from 'express';
import { getServices } from '../services/serviceFactory';
import type { Project } from '../../domain/project';
import { randomUUID } from 'crypto';
import { importProject, type ImportProjectConfig } from '../../services/local/useCases/projectUseCase';

export const projectsRouter = Router();

/**
 * GET /api/projects
 * List all projects
 */
projectsRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const services = getServices();
    const result = await services.repositories.project.listAll();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/projects/:id
 * Get a project by ID
 */
projectsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const services = getServices();
    const result = await services.repositories.project.load(id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/projects
 * Create a new project
 */
projectsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, repoPath, defaultBranch, worktreeRoot, scope, settings, workflowTemplateId } = req.body;

    // Validate required fields
    if (!name) {
      res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'name is required',
          recoverable: true,
        },
      });
      return;
    }

    if (!repoPath) {
      res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'repoPath is required',
          recoverable: true,
        },
      });
      return;
    }

    const now = new Date().toISOString();
    const project: Project = {
      id: randomUUID(),
      name,
      repoPath,
      defaultBranch: defaultBranch || 'main',
      worktreeRoot: worktreeRoot || `${repoPath}/.worktrees`,
      scope: scope || 'personal',
      desktopIntegrationStatus: 'deferred',
      permissions: {
        permissionLevel: 'owner',
      },
      settings: settings || {
        installCommand: 'npm install',
        testCommand: 'npm test',
        buildCommand: 'npm run build',
        previewCommand: 'npm run preview',
        detectedStack: '',
        riskSummary: '',
      },
      workflowTemplateId: workflowTemplateId || 'default',
      createdAt: now,
      updatedAt: now,
    };

    const services = getServices();
    const result = await services.repositories.project.save(project);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/projects/import
 * Import an existing project using the importProject UseCase
 */
projectsRouter.post('/import', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { path, name, sourceType, detectSettings } = req.body;

    // Validate required fields
    if (!path) {
      res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'path is required',
          recoverable: true,
        },
      });
      return;
    }

    // Extract project name from path if not provided
    const projectName = name || path.split('/').pop() || 'Imported Project';

    const services = getServices();

    // Create the import config for the UseCase
    const config: ImportProjectConfig = {
      name: projectName,
      repoPath: path,
      sourceType: sourceType || 'generic',
      detectSettings: detectSettings !== false, // Default to true
    };

    // Call the importProject UseCase
    const result = await importProject(
      services.repositories.project,
      services.git,
      config
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/projects/:id
 * Update a project
 */
projectsRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id;
    const updates = req.body;

    const services = getServices();
    const result = await services.repositories.project.update({
      id,
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/projects/:id
 * Delete a project
 */
projectsRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const services = getServices();
    const result = await services.repositories.project.delete(id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
