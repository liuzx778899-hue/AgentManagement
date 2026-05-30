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
  // 可选的动态配置
  apiKey?: string;
  baseUrl?: string;
  apiFormat?: string; // 'OpenAI' | 'Anthropic' | 'DeepSeek' | etc.
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
  apiFormat?: string;
}

/**
 * LLM API 封装 Adapter
 */
export class LlmAdapter extends BaseAdapter {
  private providers: Map<string, ProviderConfig> = new Map();

  constructor(config: AdapterConfig) {
    super(config);
    // 默认配置从环境变量读取
    this.providers.set('anthropic', {
      apiKey: process.env.ANTHROPIC_API_KEY,
      apiFormat: 'Anthropic',
    });
    this.providers.set('openai', {
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: 'https://api.openai.com/v1',
      apiFormat: 'OpenAI',
    });
  }

  /**
   * 设置 Provider 配置
   */
  setProviderConfig(provider: string, config: ProviderConfig): void {
    const existing = this.providers.get(provider) || {};
    this.providers.set(provider, { ...existing, ...config });
  }

  /**
   * 根据 model 名称判断 provider
   */
  private getProviderForModel(model: string): string {
    if (model.startsWith('claude')) return 'anthropic';
    if (model.startsWith('gpt') || model.startsWith('o1') || model.startsWith('o3')) return 'openai';
    if (model.startsWith('gemini')) return 'google';
    if (model.startsWith('deepseek')) return 'deepseek';
    return 'unknown';
  }

  /**
   * 根据 apiFormat 确定 provider key
   */
  private getProviderKey(apiFormat?: string, model?: string): string {
    if (apiFormat) {
      const formatMap: Record<string, string> = {
        'Anthropic': 'anthropic',
        'OpenAI': 'openai',
        'DeepSeek': 'deepseek',
        'Google': 'google',
      };
      return formatMap[apiFormat] || apiFormat.toLowerCase();
    }
    if (model) {
      return this.getProviderForModel(model);
    }
    return 'unknown';
  }

  /**
   * 完成请求
   */
  async complete(config: CompleteConfig): Promise<LocalResult<CompleteResponse>> {
    const { messages, model, maxTokens = 4096, temperature = 0.7, apiKey, baseUrl, apiFormat } = config;

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

    // 确定使用哪个 provider 配置
    // 优先使用传入的动态配置
    const providerKey = this.getProviderKey(apiFormat, model);
    let providerConfig = this.providers.get(providerKey);

    // 如果传入了动态配置，创建临时配置
    const effectiveConfig: ProviderConfig = {
      apiKey: apiKey || providerConfig?.apiKey,
      baseUrl: baseUrl || providerConfig?.baseUrl,
      apiFormat: apiFormat || providerConfig?.apiFormat,
    };

    if (!effectiveConfig.apiKey) {
      return this.err('PERMISSION_DENIED', `未配置 ${providerKey} API Key`);
    }

    try {
      // 根据 apiFormat 选择调用方式
      const format = effectiveConfig.apiFormat || this.getApiFormatForModel(model);

      if (format === 'Anthropic') {
        return await this.callAnthropic(messages, model, maxTokens, temperature, effectiveConfig);
      }

      // OpenAI-compatible API (OpenAI, DeepSeek, etc.)
      return await this.callOpenAICompatible(messages, model, maxTokens, temperature, effectiveConfig);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return this.err('UNKNOWN', 'LLM 调用失败', errorMessage);
    }
  }

  /**
   * 根据模型名推断 API 格式
   */
  private getApiFormatForModel(model: string): string {
    if (model.startsWith('claude')) return 'Anthropic';
    if (model.startsWith('deepseek')) return 'DeepSeek';
    if (model.startsWith('gemini')) return 'Google';
    // 默认 OpenAI 兼容格式
    return 'OpenAI';
  }

  /**
   * 调用 Anthropic API
   */
  private async callAnthropic(
    messages: ChatMessage[],
    model: string,
    maxTokens: number,
    temperature: number,
    config: ProviderConfig
  ): Promise<LocalResult<CompleteResponse>> {
    const apiKey = config.apiKey!;
    const baseUrl = (config.baseUrl || 'https://api.anthropic.com/v1').replace(/\/$/, '');

    try {
      const response = await fetch(`${baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          temperature,
          messages: messages
            .filter(m => m.role !== 'system')
            .map(m => ({ role: m.role, content: m.content })),
          system: messages.find(m => m.role === 'system')?.content,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 401) {
          return this.err('PERMISSION_DENIED', 'API Key 无效');
        }
        return this.err('API_ERROR', `API 错误: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const content = data.content?.[0]?.text || '';

      return this.ok({
        content,
        model,
        usage: {
          inputTokens: data.usage?.input_tokens || 0,
          outputTokens: data.usage?.output_tokens || 0,
        },
        finishReason: data.stop_reason === 'end_turn' ? 'stop' : 'max_tokens',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return this.err('NETWORK_ERROR', `网络错误: ${errorMessage}`);
    }
  }

  /**
   * 调用 OpenAI 兼容 API (OpenAI, DeepSeek, etc.)
   */
  private async callOpenAICompatible(
    messages: ChatMessage[],
    model: string,
    maxTokens: number,
    temperature: number,
    config: ProviderConfig
  ): Promise<LocalResult<CompleteResponse>> {
    const apiKey = config.apiKey!;
    const baseUrl = (config.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          temperature,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 401) {
          return this.err('PERMISSION_DENIED', 'API Key 无效');
        }
        return this.err('API_ERROR', `API 错误: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      return this.ok({
        content,
        model: data.model || model,
        usage: {
          inputTokens: data.usage?.prompt_tokens || 0,
          outputTokens: data.usage?.completion_tokens || 0,
        },
        finishReason: data.choices?.[0]?.finish_reason === 'stop' ? 'stop' : 'max_tokens',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return this.err('NETWORK_ERROR', `网络错误: ${errorMessage}`);
    }
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