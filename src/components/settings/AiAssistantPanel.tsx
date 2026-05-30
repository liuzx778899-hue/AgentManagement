import { useState, useEffect } from "react";
import { Save, RotateCcw, Bot, Loader2 } from "lucide-react";
import { IconBadge } from "../IconBadge";
import { useLocalServices } from "../../hooks/useLocalServices";

const DEFAULT_SYSTEM_PROMPT = `你是 AgentManagement 的智能工程助手。

你的核心职责：
- 帮助用户分析项目状态和进度
- 建议下一步任务的优先级
- 检查项目配置是否完整
- 回答工程相关问题
- 协助用户完成工作流程

你的能力：
- 可以查看项目列表、角色、工作流模板、记忆等数据
- 可以帮助生成角色定义、项目文档、工作流模板
- 可以检查配置完整性和潜在问题

回答原则：
- 简洁明了，直接回答问题
- 提供具体可行的建议
- 如果不确定，坦诚说明
- 使用中文回答`;

export function AiAssistantPanel() {
  const services = useLocalServices();
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 加载已保存的配置
  useEffect(() => {
    async function loadConfig() {
      if (!services.getAiAssistantConfig) return;

      setLoading(true);
      const result = await services.getAiAssistantConfig();
      if (result.ok && result.data) {
        setSystemPrompt(result.data.systemPrompt || DEFAULT_SYSTEM_PROMPT);
      }
      setLoading(false);
    }

    loadConfig();
  }, [services]);

  const handleSave = async () => {
    if (!services.saveAiAssistantConfig) {
      setError('服务不可用');
      return;
    }

    setSaving(true);
    setError(null);

    const result = await services.saveAiAssistantConfig({ systemPrompt });
    if (result.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      setError(result.error?.message || '保存失败');
    }

    setSaving(false);
  };

  const handleReset = () => {
    setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
  };

  if (loading) {
    return (
      <div className="panel-body">
        <div className="loading-indicator">
          <Loader2 size={20} className="spin" />
          <span>加载配置...</span>
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
      {error && <div className="save-error-msg">{error}</div>}

      <div className="panel-body">
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
