import { Router, Request, Response, NextFunction } from 'express';
import { getServices } from '../services/serviceFactory';
import type { AgentRole } from '../../domain/workbench';

export const rolesRouter = Router();

/**
 * GET /api/roles
 * List all roles
 */
rolesRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const services = getServices();
    const result = await services.repositories.role.listAll();
    res.json(result);
  } catch (err) {
    next(err);
  }
});