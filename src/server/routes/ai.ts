import { Router, Request, Response, NextFunction } from 'express';
import { getServices } from '../services/serviceFactory';
import type { ChatMessage } from '../../services/local/adapters/llmAdapter';

export const aiRouter = Router();

/**
 * POST /api/ai/chat
 * 与 AI 助手进行对话
 */
aiRouter.post('/chat', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { messages, modelId, context } = req.body;

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

    // 构建 system prompt
    const systemPrompt = `你是 AgentManagement 的工程助手。
${context ? `当前上下文：\n${context}` : ''}

你可以帮助用户：
- 分析项目状态和进度
- 建议下一步任务优先级
- 检查项目配置
- 回答工程相关问题`;

    // 调用 LLM
    const result = await services.llm.complete({
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m: { role: string; content: string }) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ],
      model: modelId || 'claude-3-haiku',
      temperature: 0.7,
      maxTokens: 2000,
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
