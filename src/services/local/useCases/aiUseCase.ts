import type { LlmAdapter } from '../adapters/llmAdapter';
import type { LocalResult } from '../../../types/localEngineering';

/**
 * AI 对话输入
 */
export interface AiChatInput {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  model: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * AI 对话响应
 */
export interface AiChatResponse {
  content: string;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * AI 流式响应
 */
export type AiStreamResponse = AsyncGenerator<string>;

/**
 * 发送 AI 对话请求
 */
export async function sendAiChat(
  llmAdapter: LlmAdapter,
  input: AiChatInput
): Promise<LocalResult<AiChatResponse>> {
  const result = await llmAdapter.complete({
    messages: input.messages,
    model: input.model,
    maxTokens: input.maxTokens,
    temperature: input.temperature,
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
    };
  }

  const data = result.data!;
  return {
    ok: true,
    data: {
      content: data.content,
      model: data.model,
      usage: data.usage,
    },
  };
}

/**
 * 流式 AI 对话请求
 */
export async function streamAiChat(
  llmAdapter: LlmAdapter,
  input: AiChatInput
): Promise<LocalResult<AiStreamResponse>> {
  const result = await llmAdapter.streamComplete({
    messages: input.messages,
    model: input.model,
    maxTokens: input.maxTokens,
    temperature: input.temperature,
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
    };
  }

  return {
    ok: true,
    data: result.data!,
  };
}

/**
 * 验证 API Key
 */
export async function validateApiKey(
  llmAdapter: LlmAdapter,
  provider: string,
  apiKey: string
): Promise<LocalResult<{ valid: boolean }>> {
  return llmAdapter.validateApiKey(provider, apiKey);
}

/**
 * 列出可用模型
 */
export async function listAvailableModels(
  llmAdapter: LlmAdapter,
  provider?: string
): Promise<LocalResult<Array<{ id: string; name: string; provider: string; contextWindow?: number }>>> {
  return llmAdapter.listModels(provider);
}
