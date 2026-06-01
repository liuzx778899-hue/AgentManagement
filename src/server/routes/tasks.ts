import { Router, Request, Response, NextFunction } from 'express';
import { getServices } from '../services/serviceFactory';
import { createTask, createTasksFromWorkflow, updateTask, deleteTask, listTasks, listTasksByProject } from '../../services/local/useCases/taskUseCase';
import { randomUUID } from 'crypto';
import type { Task } from '../../domain/task';

export const tasksRouter = Router();

/**
 * GET /api/tasks
 * List all tasks, optionally filtered by projectId
 */
tasksRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.query;
    const services = getServices();

    let result;
    if (projectId && typeof projectId === 'string') {
      result = await listTasksByProject(services.repositories.task, projectId);
    } else {
      result = await listTasks(services.repositories.task);
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/tasks/:id
 * Get a task by ID
 */
tasksRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const services = getServices();
    const result = await services.repositories.task.load(id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/tasks
 * Create a new task
 */
tasksRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, goal, workflowTemplateId, acceptanceCriteria, roleAssignment, capabilityAuthorization, launchStrategy, status } = req.body;

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

    if (!goal) {
      res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'goal is required',
          recoverable: true,
        },
      });
      return;
    }

    if (!workflowTemplateId) {
      res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'workflowTemplateId is required',
          recoverable: true,
        },
      });
      return;
    }

    const services = getServices();
    const result = await createTask(services.repositories.task, {
      projectId,
      goal,
      workflowTemplateId,
      acceptanceCriteria,
      roleAssignment,
      capabilityAuthorization,
      launchStrategy,
      status,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/tasks/from-workflow
 * Create tasks from workflow template
 */
tasksRouter.post('/from-workflow', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, workflowTemplateId } = req.body;

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

    if (!workflowTemplateId) {
      res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'workflowTemplateId is required',
          recoverable: true,
        },
      });
      return;
    }

    const services = getServices();
    const result = await createTasksFromWorkflow(
      services.repositories.task,
      services.repositories.workflow,
      { projectId, workflowTemplateId }
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/tasks/:id
 * Update a task
 */
tasksRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id;
    const updates = req.body;

    const services = getServices();
    const result = await updateTask(services.repositories.task, {
      id,
      ...updates,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/tasks/:id
 * Delete a task
 */
tasksRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const services = getServices();
    const result = await deleteTask(services.repositories.task, id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
