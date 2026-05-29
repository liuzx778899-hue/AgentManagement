export interface ModelInfo {
  name: string;
  type?: "chat" | "completion" | "embedding" | "vision";
  contextLength?: number;
  temperature?: number;
  maxTokens?: number;
  maxOutputTokens?: number;
  topP?: number;
}

export interface ModelProvider {
  id: string;
  name: string;
  apiKey?: string;
  apiKeyStatus: "configured" | "missing";
  apiFormat?: string;  // e.g. "OpenAI", "Anthropic", "DeepSeek"
  baseUrl?: string;     // e.g. "https://api.deepseek.com"
  models: ModelInfo[];
  defaultModel: string;
  enabled: boolean;
}