import { Router, Request, Response, NextFunction } from 'express';
import { readFile } from 'fs/promises';
import { join } from 'path';

export const capabilitiesRouter = Router();

/**
 * GET /api/capabilities/mcp-servers
 * List all MCP servers
 */
capabilitiesRouter.get('/mcp-servers', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const filePath = join(process.cwd(), '.agentmanagement', 'capabilities', 'mcp-servers.json');
    const content = await readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    res.json({ ok: true, data });
  } catch (error) {
    res.json({ ok: true, data: [] });
  }
});

/**
 * GET /api/capabilities/skills
 * List all skills
 */
capabilitiesRouter.get('/skills', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const filePath = join(process.cwd(), '.agentmanagement', 'capabilities', 'skills.json');
    const content = await readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    res.json({ ok: true, data });
  } catch (error) {
    res.json({ ok: true, data: [] });
  }
});

/**
 * GET /api/capabilities/plugins
 * List all plugins
 */
capabilitiesRouter.get('/plugins', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const filePath = join(process.cwd(), '.agentmanagement', 'capabilities', 'plugins.json');
    const content = await readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    res.json({ ok: true, data });
  } catch (error) {
    res.json({ ok: true, data: [] });
  }
});

/**
 * GET /api/capabilities/agents
 * List all agents
 */
capabilitiesRouter.get('/agents', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const filePath = join(process.cwd(), '.agentmanagement', 'capabilities', 'agents.json');
    const content = await readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    res.json({ ok: true, data });
  } catch (error) {
    res.json({ ok: true, data: [] });
  }
});

/**
 * GET /api/capabilities/all
 * Get all capabilities in one request
 */
capabilitiesRouter.get('/all', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const capabilitiesDir = join(process.cwd(), '.agentmanagement', 'capabilities');

    const readJsonFile = async (filename: string) => {
      try {
        const filePath = join(capabilitiesDir, filename);
        const content = await readFile(filePath, 'utf-8');
        return JSON.parse(content);
      } catch {
        return [];
      }
    };

    const [mcpServers, skills, plugins, agents] = await Promise.all([
      readJsonFile('mcp-servers.json'),
      readJsonFile('skills.json'),
      readJsonFile('plugins.json'),
      readJsonFile('agents.json'),
    ]);

    res.json({
      ok: true,
      data: {
        mcpServers,
        skills,
        plugins,
        agents,
      },
    });
  } catch (error) {
    next(error);
  }
});
