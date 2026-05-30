import { Router, Request, Response, NextFunction } from 'express';
import { getServices } from '../services/serviceFactory';
import { getGitStatus, listProjectWorktrees } from '../../services/local/useCases';

export const gitRouter = Router();

/**
 * GET /api/git/status
 * Get Git status for a repository path
 * Query params: ?path=/repo/path
 */
gitRouter.get('/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { path } = req.query;

    if (!path || typeof path !== 'string') {
      res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'path query parameter is required',
          recoverable: true,
        },
      });
      return;
    }

    const services = getServices();

    // Use getGitStatus with projectId as 'unknown' since we don't have project context
    const result = await getGitStatus(services.git, 'unknown', path);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/git/branches
 * List all branches in a repository
 * Query params: ?path=/repo/path
 */
gitRouter.get('/branches', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { path } = req.query;

    if (!path || typeof path !== 'string') {
      res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'path query parameter is required',
          recoverable: true,
        },
      });
      return;
    }

    const services = getServices();
    const result = await services.git.listBranches(path);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/git/worktrees
 * List all worktrees in a repository
 * Query params: ?path=/repo/path
 */
gitRouter.get('/worktrees', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { path } = req.query;

    if (!path || typeof path !== 'string') {
      res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'path query parameter is required',
          recoverable: true,
        },
      });
      return;
    }

    const result = await listProjectWorktrees(getServices().git, path);
    res.json(result);
  } catch (err) {
    next(err);
  }
});