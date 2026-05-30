import { apiCall, type ApiResponse } from './client';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponse {
  content: string;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface AiChatOptions {
  context?: string;
  modelId?: string;
  providerId?: string;
  modelName?: string;
}

export const aiApi = {
  chat: (
    messages: ChatMessage[],
    options?: AiChatOptions
  ): Promise<ApiResponse<ChatResponse>> =>
    apiCall<ChatResponse>('POST', '/ai/chat', {
      messages,
      context: options?.context,
      modelId: options?.modelId,
      providerId: options?.providerId,
      modelName: options?.modelName,
    }),
};