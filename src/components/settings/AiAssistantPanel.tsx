import { useState, useEffect, useCallback } from "react";
import { Save, RotateCcw, Bot, Loader2, AlertCircle, CheckCircle2, Sparkles } from "lucide-react";
import { IconBadge } from "../IconBadge";
import { useLocalServices } from "../../hooks/useLocalServices";
import { useWorkbenchState } from "../../App";

const DEFAULT_SYSTEM_PROMPT = `你是 AgentManagement 工程助手。

职责：
- 分析项目状态、检查配置完整性
- 帮助设计工作流程、生成角色定义

回答要求：
- 简洁直接，不超过3句话
- 有具体建议，不给模糊回答
- 中文回答`;

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

export function AiAssistantPanel() {
  const services = useLocalServices();
  const { data, setAiAssistantModel } = useWorkbenchState();
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // AI Assistant model config state
  const [aiProviderId, setAiProviderId] = useState<string>(
    data.aiAssistantModel?.providerId || data.modelProviders.find(p => p.enabled)?.id || ""
  );
  const aiProvider = data.modelProviders.find(p => p.id === aiProviderId);
  const [aiModelName, setAiModelName] = useState<string>(
    data.aiAssistantModel?.modelName || aiProvider?.models[0]?.name || ""
  );
  const [modelSaving, setModelSaving] = useState(false);
  const [modelSaved, setModelSaved] = useState(false);

  const loadConfig = useCallback(async () => {
    console.log('[AiAssistantPanel] loadConfig called, services.getAiAssistantConfig:', !!services.getAiAssistantConfig);

    if (!services.getAiAssistantConfig) {
      console.log('[AiAssistantPanel] getAiAssistantConfig not available, using defaults');
      setLoading(false);
      return;
    }

    try {
      console.log('[AiAssistantPanel] Loading config...');
      const result = await services.getAiAssistantConfig();
      console.log('[AiAssistantPanel] Config loaded:', result);

      if (result.ok && result.data) {
        // 只有当返回的值为空时才使用默认值
        const loadedPrompt = result.data.systemPrompt;
        if (loadedPrompt && loadedPrompt.trim()) {
          setSystemPrompt(loadedPrompt);
        }
      }
    } catch (err) {
      console.error('[AiAssistantPanel] Failed to load config:', err);
      // Keep default prompt on error
    } finally {
      setLoading(false);
      console.log('[AiAssistantPanel] Loading complete');
    }
  }, [services]);

  useEffect(() => {
    // Load immediately, with a fallback timeout
    const timeoutId = setTimeout(() => {
      console.log('[AiAssistantPanel] Timeout reached, forcing loading false');
      setLoading(false);
    }, 3000);

    loadConfig().finally(() => {
      clearTimeout(timeoutId);
    });
  }, [loadConfig]);

  const handleSave = async () => {
    if (!services.saveAiAssistantConfig) {
      setError('服务不可用');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const result = await services.saveAiAssistantConfig({ systemPrompt });
      if (result.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        setError(result.error?.message || '保存失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    }

    setSaving(false);
  };

  const handleReset = () => {
    setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
    setError(null);
  };

  // Auto-hide model saved message
  useEffect(() => {
    if (modelSaved) {
      const timer = setTimeout(() => setModelSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [modelSaved]);

  // Update model name when provider changes
  useEffect(() => {
    const provider = data.modelProviders.find(p => p.id === aiProviderId);
    if (provider && provider.models.length > 0) {
      if (!provider.models.find(m => m.name === aiModelName)) {
        setAiModelName(provider.models[0].name);
      }
    }
  }, [aiProviderId, data.modelProviders, aiModelName]);

  const handleSaveModel = async () => {
    setModelSaving(true);
    setAiAssistantModel(aiProviderId, aiModelName);

    // Save to file
    if (services.saveModelProviders) {
      await services.saveModelProviders({
        providers: data.modelProviders,
        aiAssistantModel: { providerId: aiProviderId, modelName: aiModelName },
      });
    }

    setModelSaving(false);
    setModelSaved(true);
  };

  if (loading) {
    return (
      <div className="settings-panel ai-assistant-panel">
        <div className="panel-header">
          <div className="panel-title">
            <IconBadge icon={Bot} label="AI 助手配置" />
            <h3>AI 助手配置</h3>
          </div>
        </div>
        <div className="panel-body">
          <div className="loading-indicator" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '20px' }}>
            <Loader2 size={20} className="spin" />
            <span>加载配置...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-panel ai-assistant-panel">
      <div className="panel-header">
        <div className="panel-title">
          <IconBadge icon={Bot} label="AI 助手配置" />
          <h3>AI 助手配置</h3>
        </div>
        <div className="panel-actions">
          <button
            className="btn secondary"
            onClick={handleReset}
            disabled={saving}
          >
            <RotateCcw size={14} />
            重置默认
          </button>
          <button
            className="btn primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
            {saving ? '保存中...' : '保存配置'}
          </button>
        </div>
      </div>

      {saved && <div className="save-success-msg">已保存</div>}
      {error && (
        <div className="save-error-msg" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      <div className="panel-body">
        {/* AI Assistant Model Config */}
        <div className="form-section">
          <div className="form-section-header">
            <Sparkles size={16} style={{ marginRight: 8 }} />
            <label>默认模型</label>
            <span className="form-hint">选择 AI 工程助手使用的模型供应商和模型</span>
          </div>
          <div className="ai-config-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div className="form-field">
              <label>供应商</label>
              <select value={aiProviderId} onChange={e => setAiProviderId(e.target.value)}>
                <option value="">— 选择供应商 —</option>
                {data.modelProviders.filter(p => p.enabled).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>模型</label>
              <select value={aiModelName} onChange={e => setAiModelName(e.target.value)} disabled={!aiProviderId || !aiProvider?.models.length}>
                <option value="">— 选择模型 —</option>
                {aiProvider?.models.map(m => (
                  <option key={m.name} value={m.name}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="btn primary btn-sm" disabled={modelSaving} onClick={handleSaveModel}>
              {modelSaving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
              {modelSaving ? "保存中..." : "保存模型配置"}
            </button>
            {modelSaved && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--ok)', fontSize: '13px' }}>
                <CheckCircle2 size={14} />
                已保存
              </span>
            )}
          </div>
        </div>

        <div className="form-section">
          <div className="form-section-header">
            <label>系统提示词 (System Prompt)</label>
            <span className="form-hint">定义 AI 助手的角色、能力和行为准则</span>
          </div>
          <textarea
            className="system-prompt-textarea"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={16}
            placeholder="输入系统提示词..."
            style={{ width: '100%', padding: '12px', fontSize: '14px', fontFamily: 'monospace' }}
          />
        </div>

        <div className="form-section">
          <h4>提示词编写建议</h4>
          <ul className="tips-list">
            <li><strong>角色定义：</strong>明确助手的身份和核心职责</li>
            <li><strong>能力说明：</strong>列出助手可以做什么，不能做什么</li>
            <li><strong>行为准则：</strong>定义回答风格、语言偏好等</li>
            <li><strong>限制条件：</strong>说明需要避免的情况或行为</li>
          </ul>
        </div>
      </div>
    </div>
  );
}