import { Router, Request, Response, NextFunction } from 'express';
import { getServices } from '../services/serviceFactory';

export const settingsRouter = Router();

// Default settings
const DEFAULT_SETTINGS = {
  theme: 'system' as const,
  language: 'en',
  notifications: true,
  autoSave: true,
  editorFontSize: 14,
  editorFontFamily: 'monospace',
  runner: {
    defaultTimeout: 300000,
    autoRestart: false,
  },
  git: {
    autoFetch: true,
    fetchInterval: 60000,
  },
};

const SETTINGS_PATH = '.agentmanagement/settings.json';

/**
 * GET /api/settings
 * Get app settings
 */
settingsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const services = getServices();
    const result = await services.fileStore.readJson(SETTINGS_PATH);

    if (!result.ok) {
      // Return default settings if file doesn't exist
      res.json({
        ok: true,
        data: DEFAULT_SETTINGS,
      });
      return;
    }

    // Merge with defaults to ensure all fields are present
    const settings = {
      ...DEFAULT_SETTINGS,
      ...(result.data || {}),
    };

    res.json({
      ok: true,
      data: settings,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/settings
 * Save app settings
 */
settingsRouter.put('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = req.body;

    const services = getServices();
    const result = await services.fileStore.writeJson(SETTINGS_PATH, {
      ...DEFAULT_SETTINGS,
      ...(settings || {}),
      updatedAt: new Date().toISOString(),
    });

    if (!result.ok) {
      res.json(result);
      return;
    }

    res.json({
      ok: true,
    });
  } catch (err) {
    next(err);
  }
});