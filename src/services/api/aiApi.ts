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

export const aiApi = {
  chat: (messages: ChatMessage[], context?: string, modelId?: string): Promise<ApiResponse<ChatResponse>> =>
    apiCall<ChatResponse>('POST', '/ai/chat', { messages, context, modelId }),
};