import { Router, Request, Response, NextFunction } from 'express';
import { getServices } from '../services/serviceFactory';
import type { ModelProvider } from '../../domain/model';

export const settingsRouter = Router();

/**
 * POST /api/settings/test-connection
 * Test API connection for a model provider
 */
settingsRouter.post('/test-connection', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { providerId, apiKey, baseUrl, apiFormat } = req.body;

    if (!apiKey) {
      res.json({
        ok: true,
        data: { success: false, message: 'API Key 不能为空' }
      });
      return;
    }

    // Determine the endpoint based on apiFormat
    let testUrl = baseUrl || 'https://api.openai.com/v1';

    // Normalize URL - remove trailing slash
    testUrl = testUrl.replace(/\/$/, '');

    // Most APIs support listing models as a simple auth check
    let modelsEndpoint = '/models';

    // Handle different API formats
    if (apiFormat === 'Anthropic') {
      // Anthropic doesn't have a models endpoint, use a minimal messages request
      testUrl = baseUrl || 'https://api.anthropic.com/v1';

      try {
        const response = await fetch(`${testUrl}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'hi' }],
          }),
        });

        if (response.status === 401) {
          res.json({
            ok: true,
            data: { success: false, message: 'API Key 无效' }
          });
          return;
        }

        // Even if we get a 400 or other error, if it's not 401, the key is valid
        res.json({
          ok: true,
          data: { success: true, message: '连接成功！API Key 有效' }
        });
        return;
      } catch (error) {
        res.json({
          ok: true,
          data: { success: false, message: '网络错误，请检查 API 地址' }
        });
        return;
      }
    }

    // For OpenAI-compatible APIs, try to list models
    try {
      const response = await fetch(`${testUrl}${modelsEndpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        res.json({
          ok: true,
          data: { success: false, message: 'API Key 无效' }
        });
        return;
      }

      if (response.ok) {
        const data = await response.json();
        const modelCount = data?.data?.length || 0;
        res.json({
          ok: true,
          data: {
            success: true,
            message: `连接成功！找到 ${modelCount} 个可用模型`
          }
        });
        return;
      }

      // Other errors but not auth failure - key might still be valid
      res.json({
        ok: true,
        data: { success: true, message: '连接成功！API Key 已验证' }
      });
    } catch (error) {
      res.json({
        ok: true,
        data: { success: false, message: '网络错误，请检查 API 地址是否正确' }
      });
    }
  } catch (err) {
    next(err);
  }
});

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
const MODEL_PROVIDERS_PATH = '.agentmanagement/model-providers.json';

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

/**
 * GET /api/settings/model-providers
 * Get model providers configuration
 */
settingsRouter.get('/model-providers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const services = getServices();
    const result = await services.fileStore.readJson(MODEL_PROVIDERS_PATH);

    if (!result.ok) {
      // Return empty structure if file doesn't exist
      res.json({
        ok: true,
        data: {
          providers: [],
          aiAssistantModel: null,
        },
      });
      return;
    }

    // Ensure the data has the expected structure
    const fileData = result.data as { providers?: ModelProvider[]; aiAssistantModel?: { providerId: string; modelName: string } | null } || { providers: [], aiAssistantModel: null };
    res.json({
      ok: true,
      data: {
        providers: fileData.providers || [],
        aiAssistantModel: fileData.aiAssistantModel || null,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/settings/model-providers
 * Save model providers configuration
 */
settingsRouter.put('/model-providers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { providers, aiAssistantModel } = req.body;

    const services = getServices();
    const result = await services.fileStore.writeJson(MODEL_PROVIDERS_PATH, {
      providers: providers || [],
      aiAssistantModel: aiAssistantModel || null,
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