import { Router, Request, Response, NextFunction } from 'express';
import { getServices } from '../services/serviceFactory';
import type { Memory, MemoryKind } from '../../domain/memory';
import { randomUUID } from 'crypto';

export const memoryRouter = Router();

/**
 * GET /api/memory
 * List memories (optionally filtered by projectId)
 * Query params: ?projectId=xxx
 */
memoryRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.query;
    const services = getServices();

    if (projectId && typeof projectId === 'string' && projectId !== 'all') {
      const result = await services.repositories.memory.listByProject(projectId);
      res.json(result);
    } else {
      // Return all memories if no projectId specified or projectId is 'all'
      const result = await services.repositories.memory.listAll();
      res.json(result);
    }
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/memory
 * Create a new memory
 */
memoryRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, roleId, taskId, title, content, kind, scope, type } = req.body;

    // Validate required fields
    if (!title) {
      res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'title is required',
          recoverable: true,
        },
      });
      return;
    }

    const now = new Date().toISOString();
    const memory: Memory = {
      id: randomUUID(),
      projectId,
      roleId: roleId || null,
      taskId: taskId || null,
      title,
      content,
      body: content,
      kind: kind as MemoryKind || 'project',
      scope: scope || 'project',
      type: type || 'note',
      status: 'pending_confirmation',
      citation: [],
      createdAt: now,
      updatedAt: now,
    };

    const services = getServices();
    const result = await services.repositories.memory.save(memory);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/memory/:id
 * Update a memory
 */
memoryRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id;
    const updates = req.body;

    const services = getServices();
    const result = await services.repositories.memory.update({
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
 * DELETE /api/memory/:id
 * Delete a memory
 */
memoryRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const services = getServices();
    const result = await services.repositories.memory.delete(id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/memory/search
 * Search memories by keyword
 * Query params: ?keyword=xxx&projectId=xxx
 */
memoryRouter.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawQ = req.query.q ?? req.query.keyword;
    const keyword = typeof rawQ === 'string' ? rawQ : '';
    const { projectId } = req.query;

    if (!keyword) {
      res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'keyword query parameter is required',
          recoverable: true,
        },
      });
      return;
    }

    const services = getServices();

    // Get memories from project if projectId is provided
    if (projectId && typeof projectId === 'string') {
      const listResult = await services.repositories.memory.listByProject(projectId);

      if (!listResult.ok) {
        res.json(listResult);
        return;
      }

      // Filter by keyword (case-insensitive search in title and content)
      const keywordLower = keyword.toLowerCase();
      const filtered = listResult.data!.filter((memory: any) =>
        memory.title?.toLowerCase().includes(keywordLower) ||
        memory.content?.toLowerCase().includes(keywordLower) ||
        memory.body?.toLowerCase().includes(keywordLower)
      );

      res.json({
        ok: true,
        data: filtered,
      });
    } else {
      // No projectId - return empty for now (could implement global search later)
      res.json({
        ok: true,
        data: [],
      });
    }
  } catch (err) {
    next(err);
  }
});