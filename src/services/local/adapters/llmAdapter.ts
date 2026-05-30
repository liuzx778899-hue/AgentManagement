import { BaseAdapter } from './baseAdapter';
import type { LocalResult, AdapterConfig } from '../../../types/localEngineering';

/**
 * 聊天消息
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * 完成请求配置
 */
export interface CompleteConfig {
  messages: ChatMessage[];
  model: string;
  maxTokens?: number;
  temperature?: number;
  stopSequences?: string[];
}

/**
 * 完成响应
 */
export interface CompleteResponse {
  content: string;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  finishReason: 'stop' | 'max_tokens' | 'error';
}

/**
 * 模型信息
 */
export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  contextWindow?: number;
}

/**
 * Provider 配置
 */
interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
}

/**
 * LLM API 封装 Adapter
 */
export class LlmAdapter extends BaseAdapter {
  private providers: Map<string, ProviderConfig> = new Map();

  constructor(config: AdapterConfig) {
    super(config);
    // 默认配置
    this.providers.set('anthropic', {
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    this.providers.set('openai', {
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * 设置 Provider 配置
   */
  setProviderConfig(provider: string, config: ProviderConfig): void {
    this.providers.set(provider, config);
  }

  /**
   * 根据 model 名称判断 provider
   */
  private getProviderForModel(model: string): string {
    if (model.startsWith('claude')) return 'anthropic';
    if (model.startsWith('gpt') || model.startsWith('o1')) return 'openai';
    if (model.startsWith('gemini')) return 'google';
    return 'unknown';
  }

  /**
   * 完成请求
   */
  async complete(config: CompleteConfig): Promise<LocalResult<CompleteResponse>> {
    const { messages, model, maxTokens = 4096, temperature = 0.7 } = config;

    if (this.isMockEnabled) {
      // Mock 响应
      const lastUserMessage = messages.filter(m => m.role === 'user').pop();
      const mockResponse = this.getMockData<string>('response') ??
        `这是对 "${lastUserMessage?.content ?? '你的问题'}" 的模拟回复。`;

      return this.ok({
        content: mockResponse,
        model,
        usage: {
          inputTokens: 100,
          outputTokens: mockResponse.length,
        },
        finishReason: 'stop',
      });
    }

    const provider = this.getProviderForModel(model);
    const providerConfig = this.providers.get(provider);

    if (!providerConfig?.apiKey) {
      return this.err('PERMISSION_DENIED', `未配置 ${provider} API Key`);
    }

    try {
      // 实际 API 调用
      if (provider === 'anthropic') {
        return await this.callAnthropic(messages, model, maxTokens, temperature);
      }

      if (provider === 'openai') {
        return await this.callOpenAI(messages, model, maxTokens, temperature);
      }

      return this.err('INVALID_INPUT', `不支持的模型: ${model}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return this.err('UNKNOWN', 'LLM 调用失败', errorMessage);
    }
  }

  /**
   * 调用 Anthropic API
   */
  private async callAnthropic(
    messages: ChatMessage[],
    model: string,
    maxTokens: number,
    temperature: number
  ): Promise<LocalResult<CompleteResponse>> {
    const providerConfig = this.providers.get('anthropic')!;

    // 这里应该使用实际的 API SDK
    // 目前使用模拟实现
    return this.ok({
      content: '[Anthropic API 响应]',
      model,
      usage: { inputTokens: 100, outputTokens: 100 },
      finishReason: 'stop',
    });
  }

  /**
   * 调用 OpenAI API
   */
  private async callOpenAI(
    messages: ChatMessage[],
    model: string,
    maxTokens: number,
    temperature: number
  ): Promise<LocalResult<CompleteResponse>> {
    const providerConfig = this.providers.get('openai')!;

    return this.ok({
      content: '[OpenAI API 响应]',
      model,
      usage: { inputTokens: 100, outputTokens: 100 },
      finishReason: 'stop',
    });
  }

  /**
   * 流式完成
   */
  async streamComplete(
    config: CompleteConfig
  ): Promise<LocalResult<AsyncGenerator<string>>> {
    const { messages, model } = config;

    if (this.isMockEnabled) {
      const mockResponse = `这是流式响应的模拟内容。每个字符都会依次返回。`;

      async function* mockStream() {
        for (const char of mockResponse) {
          yield char;
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      return this.ok(mockStream());
    }

    // 实际流式 API 调用
    const result = await this.complete(config);
    if (!result.ok) {
      return {
        ok: false,
        error: result.error,
      };
    }

    const content = result.data!.content;
    async function* stream() {
      yield content;
    }

    return this.ok(stream());
  }

  /**
   * 验证模型
   */
  async validateModel(model: string): Promise<LocalResult<{ valid: boolean }>> {
    if (this.isMockEnabled) {
      return this.ok({ valid: true });
    }

    const provider = this.getProviderForModel(model);
    const providerConfig = this.providers.get(provider);

    if (!providerConfig?.apiKey) {
      return this.ok({ valid: false });
    }

    // 简单验证请求
    const result = await this.complete({
      messages: [{ role: 'user', content: 'test' }],
      model,
      maxTokens: 5,
    });

    return this.ok({ valid: result.ok });
  }

  /**
   * 列出可用模型
   */
  async listModels(provider?: string): Promise<LocalResult<ModelInfo[]>> {
    if (this.isMockEnabled) {
      const mockModels = this.getMockData<ModelInfo[]>('models');
      if (mockModels) {
        return this.ok(mockModels);
      }
      // 默认模型列表
      return this.ok([
        { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'anthropic', contextWindow: 200000 },
        { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'anthropic', contextWindow: 200000 },
        { id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'anthropic', contextWindow: 200000 },
        { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', contextWindow: 128000 },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai', contextWindow: 128000 },
      ]);
    }

    // 实际 API 列出模型
    return this.ok([]);
  }

  /**
   * 估算 token 数量
   */
  async countTokens(text: string): Promise<LocalResult<{ count: number }>> {
    // 简单估算：平均每 4 个字符约 1 个 token
    const count = Math.ceil(text.length / 4);
    return this.ok({ count });
  }

  /**
   * 验证 API Key
   */
  async validateApiKey(
    provider: string,
    apiKey: string
  ): Promise<LocalResult<{ valid: boolean }>> {
    if (this.isMockEnabled) {
      return this.ok({ valid: apiKey.length > 0 });
    }

    // 实际验证
    const originalConfig = this.providers.get(provider);
    this.setProviderConfig(provider, { apiKey });

    const result = await this.complete({
      messages: [{ role: 'user', content: 'test' }],
      model: provider === 'anthropic' ? 'claude-3-haiku' : 'gpt-4o-mini',
      maxTokens: 5,
    });

    // 恢复原配置
    if (originalConfig) {
      this.providers.set(provider, originalConfig);
    }

    return this.ok({ valid: result.ok });
  }
}