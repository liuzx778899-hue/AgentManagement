import type { FileStoreAdapter } from '../adapters/fileStoreAdapter';
import type { LocalResult } from '../../../types/localEngineering';
import type { AppSettings } from '../../../types/settings';
import type { ModelProvider } from '../../../domain/model';

/**
 * 模型提供商配置
 */
export interface ModelProvidersConfig {
  providers: ModelProvider[];
  aiAssistantModel: { providerId: string; modelName: string } | null;
}

/**
 * 默认设置
 */
const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
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
 * 获取应用设置
 */
export async function getSettings(
  fileStore: FileStoreAdapter
): Promise<LocalResult<AppSettings>> {
  const result = await fileStore.readJson<AppSettings>(SETTINGS_PATH);

  if (!result.ok) {
    // Return defaults if file doesn't exist
    return {
      ok: true,
      data: DEFAULT_SETTINGS,
    };
  }

  // Merge with defaults to ensure all fields present
  return {
    ok: true,
    data: {
      ...DEFAULT_SETTINGS,
      ...result.data,
    },
  };
}

/**
 * 保存应用设置
 */
export async function saveSettings(
  fileStore: FileStoreAdapter,
  settings: Partial<AppSettings>
): Promise<LocalResult<void>> {
  const currentResult = await getSettings(fileStore);
  const current = currentResult.ok ? currentResult.data! : DEFAULT_SETTINGS;

  const result = await fileStore.writeJson(SETTINGS_PATH, {
    ...current,
    ...settings,
    updatedAt: new Date().toISOString(),
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
    };
  }

  return {
    ok: true,
    data: undefined,
    diagnostics: ['设置已保存'],
  };
}

/**
 * 获取模型提供商配置
 */
export async function getModelProviders(
  fileStore: FileStoreAdapter
): Promise<LocalResult<ModelProvidersConfig>> {
  const result = await fileStore.readJson<ModelProvidersConfig>(MODEL_PROVIDERS_PATH);

  if (!result.ok) {
    return {
      ok: true,
      data: {
        providers: [],
        aiAssistantModel: null,
      },
    };
  }

  return {
    ok: true,
    data: {
      providers: result.data?.providers || [],
      aiAssistantModel: result.data?.aiAssistantModel || null,
    },
  };
}

/**
 * 保存模型提供商配置
 */
export async function saveModelProviders(
  fileStore: FileStoreAdapter,
  config: ModelProvidersConfig
): Promise<LocalResult<void>> {
  const result = await fileStore.writeJson(MODEL_PROVIDERS_PATH, {
    providers: config.providers || [],
    aiAssistantModel: config.aiAssistantModel || null,
    updatedAt: new Date().toISOString(),
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
    };
  }

  return {
    ok: true,
    data: undefined,
    diagnostics: ['模型提供商配置已保存'],
  };
}
