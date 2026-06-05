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
import { workflowEventsRouter } from './workflowEvents';
import { workbenchRunsRouter } from './workbenchRuns';
import { createAgentServiceRouter } from './agent-service';
import { requestTracing } from '../middleware/requestTracing';

export function createRouter(): Router {
  const router = Router();

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
  router.use('/workflow-events', workflowEventsRouter);
  router.use('/workbench-runs', workbenchRunsRouter);

  // Agent Service API (v1) with request tracing
  router.use('/v1', requestTracing, createAgentServiceRouter());

  return router;
}