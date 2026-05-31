import { Router, Request, Response, NextFunction } from 'express';
import { getServices } from '../services/serviceFactory';
import type { AgentRole } from '../../domain/workbench';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

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

/**
 * POST /api/roles
 * Create a new role
 */
rolesRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const role = req.body;

    if (!role || !role.name) {
      res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Role with name is required',
          recoverable: true,
        },
      });
      return;
    }

    // Generate ID if not provided
    const id = role.id || `role-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    const fullRole: AgentRole & { persistedAt: string } = {
      id,
      projectId: role.projectId || null,
      name: role.name,
      description: role.description || '',
      roleMarkdown: role.roleMarkdown || '',
      isBuiltIn: role.isBuiltIn ?? false,
      defaultCapabilities: role.defaultCapabilities || [],
      persistedAt: now,
    };

    // Ensure directory exists
    const rolesDir = join(process.cwd(), '.agentmanagement', 'roles');
    await mkdir(rolesDir, { recursive: true });

    // Write role to file
    const filePath = join(rolesDir, `${id}.json`);
    await writeFile(filePath, JSON.stringify(fullRole, null, 2), 'utf-8');

    res.json({ ok: true, data: fullRole });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/roles/batch
 * Create multiple roles at once
 */
rolesRouter.post('/batch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const roles = req.body;

    if (!Array.isArray(roles) || roles.length === 0) {
      res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Array of roles is required',
          recoverable: true,
        },
      });
      return;
    }

    // Ensure directory exists
    const rolesDir = join(process.cwd(), '.agentmanagement', 'roles');
    await mkdir(rolesDir, { recursive: true });

    const now = new Date().toISOString();
    const savedRoles: AgentRole[] = [];

    for (const role of roles) {
      if (!role.name) continue;

      const id = role.id || `role-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      const fullRole: AgentRole & { persistedAt: string } = {
        id,
        projectId: role.projectId || null,
        name: role.name,
        description: role.description || '',
        roleMarkdown: role.roleMarkdown || '',
        isBuiltIn: role.isBuiltIn ?? false,
        defaultCapabilities: role.defaultCapabilities || [],
        persistedAt: now,
      };

      const filePath = join(rolesDir, `${id}.json`);
      await writeFile(filePath, JSON.stringify(fullRole, null, 2), 'utf-8');
      savedRoles.push(fullRole);
    }

    res.json({ ok: true, data: savedRoles });
  } catch (err) {
    next(err);
  }
});