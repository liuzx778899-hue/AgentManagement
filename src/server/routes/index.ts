import { Router } from 'express';
import { runnerRouter } from './runner';
import { projectsRouter } from './projects';
import { workflowRouter } from './workflow';
import { gitRouter } from './git';
import { memoryRouter } from './memory';
import { settingsRouter } from './settings';
import { aiRouter } from './ai';
import { rolesRouter } from './roles';
import { capabilitiesRouter } from './capabilities';
import { tasksRouter } from './tasks';
import { agentServiceRouter } from './agent-service';

export function createRouter(): Router {
  const router = Router();

  console.log('[Router] Importing routes...');
  console.log('[Router] aiRouter type:', typeof aiRouter, 'stack:', (aiRouter as any).stack?.length);

  // Mount all route handlers
  router.use('/runner', runnerRouter);
  router.use('/projects', projectsRouter);
  router.use('/workflow', workflowRouter);
  router.use('/git', gitRouter);
  router.use('/memory', memoryRouter);
  router.use('/settings', settingsRouter);
  router.use('/ai', aiRouter);
  router.use('/roles', rolesRouter);
  router.use('/capabilities', capabilitiesRouter);
  router.use('/tasks', tasksRouter);

  // Agent Service API (v1)
  router.use('/v1', agentServiceRouter);

  console.log('[Router] Final router stack length:', (router as any).stack?.length);

  return router;
}