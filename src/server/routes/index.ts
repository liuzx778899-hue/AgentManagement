import { Router } from 'express';
import { runnerRouter } from './runner';
import { projectsRouter } from './projects';
import { workflowRouter } from './workflow';
import { gitRouter } from './git';
import { memoryRouter } from './memory';
import { settingsRouter } from './settings';
import { aiRouter } from './ai';

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

  return router;
}