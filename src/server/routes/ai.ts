import { Router, Request, Response, NextFunction } from 'express';
import { getServices } from '../services/serviceFactory';
import type { ChatMessage, CompleteConfig } from '../../services/local/adapters/llmAdapter';
import type { ModelProvider } from '../../domain/model';

export const aiRouter = Router();

const MODEL_PROVIDERS_PATH = '.agentmanagement/model-providers.json';
const AI_ASSISTANT_CONFIG_PATH = '.agentmanagement/ai-assistant-config.json';

/**
 * 默认的系统提示词
 */
const DEFAULT_SYSTEM_PROMPT = `你是 AgentManagement 工程助手。

职责：
- 分析项目状态、检查配置完整性
- 帮助设计工作流程、生成角色定义

回答要求：
- 简洁直接，不超过3句话
- 有具体建议，不给模糊回答
- 中文回答`;

/**
 * POST /api/ai/chat
 * 与 AI 助手进行对话
 */
aiRouter.post('/chat', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { messages, modelId, context, providerId, modelName } = req.body;

    // 验证请求
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'messages 必须是非空数组',
        },
      });
      return;
    }

    const services = getServices();

    // 检查 LLM 服务是否可用
    if (!services.llm) {
      res.status(503).json({
        ok: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'LLM 服务不可用',
        },
      });
      return;
    }

    // 读取模型配置和助手配置
    let providerConfig: { apiKey?: string; baseUrl?: string; apiFormat?: string } = {};
    let actualModel = modelId || 'glm-5';
    let systemPrompt = DEFAULT_SYSTEM_PROMPT;

    console.log('[AI Route] Request:', { providerId, modelName, modelId });

    // 如果指定了 providerId 和 modelName，从配置文件读取
    if (providerId && modelName) {
      const configResult = await services.fileStore.readJson(MODEL_PROVIDERS_PATH);

      if (configResult.ok && configResult.data) {
        const providers = (configResult.data as { providers?: ModelProvider[] }).providers || [];
        const provider = providers.find(p => p.id === providerId);

        if (provider) {
          providerConfig = {
            apiKey: provider.apiKey,
            baseUrl: provider.baseUrl,
            apiFormat: provider.apiFormat,
          };
          actualModel = modelName;
          console.log('[AI Route] Found provider config:', {
            id: provider.id,
            name: provider.name,
            apiFormat: provider.apiFormat,
            baseUrl: provider.baseUrl,
            hasApiKey: !!provider.apiKey,
          });
        }
      }
    }

    // 读取助手自定义配置（包括系统提示词）
    const assistantConfigResult = await services.fileStore.readJson(AI_ASSISTANT_CONFIG_PATH);
    if (assistantConfigResult.ok && assistantConfigResult.data) {
      const config = assistantConfigResult.data as { systemPrompt?: string };
      if (config.systemPrompt && config.systemPrompt.trim()) {
        systemPrompt = config.systemPrompt;
        console.log('[AI Route] Using custom system prompt');
      }
    }

    // 构建完整的 system prompt
    const fullSystemPrompt = context
      ? `${systemPrompt}\n\n当前上下文：\n${context}`
      : systemPrompt;

    // 构建 LLM 调用配置
    const llmConfig: CompleteConfig = {
      messages: [
        { role: 'system', content: fullSystemPrompt },
        ...messages.map((m: { role: string; content: string }) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ],
      model: actualModel,
      temperature: 0.7,
      maxTokens: 2000,
      apiKey: providerConfig.apiKey,
      baseUrl: providerConfig.baseUrl,
      apiFormat: providerConfig.apiFormat,
    };

    // 调用 LLM
    const result = await services.llm.complete(llmConfig);

    console.log('[AI Route] LLM result:', {
      ok: result.ok,
      hasData: !!result.data,
      contentLength: result.data?.content?.length,
      error: result.error,
    });

    if (!result.ok) {
      res.status(500).json({
        ok: false,
        error: {
          code: 'LLM_ERROR',
          message: result.error?.message || 'LLM 调用失败',
        },
      });
      return;
    }

    res.json({
      ok: true,
      data: {
        content: result.data!.content,
        model: result.data!.model,
        usage: result.data!.usage,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/ai/assistant-config
 * 获取 AI 助手配置
 */
aiRouter.get('/assistant-config', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const services = getServices();
    const result = await services.fileStore.readJson(AI_ASSISTANT_CONFIG_PATH);

    if (!result.ok) {
      res.json({
        ok: true,
        data: {
          systemPrompt: DEFAULT_SYSTEM_PROMPT,
        },
      });
      return;
    }

    res.json({
      ok: true,
      data: {
        systemPrompt: (result.data as { systemPrompt?: string })?.systemPrompt || DEFAULT_SYSTEM_PROMPT,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/ai/assistant-config
 * 保存 AI 助手配置
 */
aiRouter.put('/assistant-config', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { systemPrompt } = req.body;

    const services = getServices();
    const result = await services.fileStore.writeJson(AI_ASSISTANT_CONFIG_PATH, {
      systemPrompt: systemPrompt || DEFAULT_SYSTEM_PROMPT,
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
