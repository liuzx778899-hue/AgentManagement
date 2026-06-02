import { useState, useEffect } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  Cpu,
  Key,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import type { ModelProvider, ModelInfo } from "../../domain/model";
import { IconBadge } from "../IconBadge";
import { settingsApi } from "../../services/api";

interface ModelConfigPanelProps {
  modelProviders: ModelProvider[];
  onAddProvider: (provider: Omit<ModelProvider, "id">) => void;
  onUpdateProvider: (providerId: string, updates: Partial<ModelProvider>) => void;
  onDeleteProvider: (providerId: string) => void;
  onAddModel: (providerId: string, modelInfo: ModelInfo) => void;
  onDeleteModel: (providerId: string, modelName: string) => void;
  onSetDefaultModel: (providerId: string, modelName: string) => void;
  onSave?: () => Promise<void>;
}

interface ConfirmDialogState {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

export function ModelConfigPanel({
  modelProviders,
  onAddProvider,
  onUpdateProvider,
  onDeleteProvider,
  onAddModel,
  onDeleteModel,
  onSetDefaultModel,
  onSave,
}: ModelConfigPanelProps) {
  // Model CRUD local state
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [newProviderName, setNewProviderName] = useState("");
  const [addingModelFor, setAddingModelFor] = useState<string | null>(null);
  const [newModelName, setNewModelName] = useState("");
  const [editingProviderDetail, setEditingProviderDetail] = useState<{ providerId: string; apiKey: string; apiFormat: string; baseUrl: string } | null>(null);

  // Connection testing state
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Saving state for inline save
  const [saving, setSaving] = useState(false);

  // Custom dialog state
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Show toast helper
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  // Show confirm dialog helper
  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({ open: true, title, message, onConfirm });
  };

  // Test connection handler
  const handleTestConnection = async () => {
    if (!editingProviderDetail) return;

    setTestingConnection(true);
    setTestResult(null);

    try {
      const result = await settingsApi.testConnection({
        providerId: editingProviderDetail.providerId,
        apiKey: editingProviderDetail.apiKey,
        baseUrl: editingProviderDetail.baseUrl,
        apiFormat: editingProviderDetail.apiFormat,
      });

      if (result.ok && result.data) {
        setTestResult(result.data);
      } else {
        setTestResult({ success: false, message: result.error?.message || '连接测试失败' });
      }
    } catch (error) {
      setTestResult({ success: false, message: '网络错误，请确保后端服务正在运行' });
    }

    setTestingConnection(false);
  };

  return (
    <div className="settings-panel">
      <div className="panel-header">
        <div className="panel-title">
          <IconBadge icon={Cpu} label="模型配置" />
          <h3>模型配置</h3>
        </div>
        <button className="btn primary" onClick={() => setShowAddProvider(true)}>
          <Plus size={16} />
          新增供应商
        </button>
      </div>
      <div className="panel-body">
        {showAddProvider && (
          <div className="add-provider-form">
            <div className="form-row">
              <input
                placeholder="供应商名称，例如：OpenAI"
                value={newProviderName}
                onChange={(e) => setNewProviderName(e.target.value)}
              />
              <button
                className="btn primary"
                onClick={() => {
                  if (newProviderName.trim()) {
                    onAddProvider({
                      name: newProviderName.trim(),
                      apiKeyStatus: "missing",
                      models: [],
                      defaultModel: "",
                      enabled: true,
                    });
                    setNewProviderName("");
                    setShowAddProvider(false);
                  }
                }}
              >
                <Check size={15} />
              </button>
              <button
                className="btn ghost"
                onClick={() => {
                  setShowAddProvider(false);
                  setNewProviderName("");
                }}
              >
                <X size={15} />
              </button>
            </div>
          </div>
        )}
        <div className="model-provider-list">
          {modelProviders.map((provider) => (
            <div key={provider.id} className={`provider-card${provider.enabled ? "" : " disabled"}`}>
              <div className="provider-card-header" onDoubleClick={(e) => { e.stopPropagation(); setEditingProviderDetail({ providerId: provider.id, apiKey: provider.apiKey || "", apiFormat: provider.apiFormat || "", baseUrl: provider.baseUrl || "" }); }} style={{ cursor: "pointer" }}>
                <div className="provider-card-left">
                  <span className="provider-avatar">{provider.name.slice(0, 1)}</span>
                  <div className="provider-card-name">
                    <strong>{provider.name}</strong>
                    <span className="provider-model-count">{provider.models.length} 个模型</span>
                  </div>
                </div>
                <div className="provider-card-right">
                  <button className="btn ghost btn-sm" onClick={(e) => { e.stopPropagation(); showConfirm('删除供应商', `确定删除供应商 ${provider.name}？`, () => onDeleteProvider(provider.id)); }} style={{ color: "var(--danger)" }} aria-label="删除供应商" title="删除供应商"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
                {editingProviderDetail && (() => {
          const p = modelProviders.find(x => x.id === editingProviderDetail.providerId);
          if (!p) return null;
          return (
            <div className="md-editor-overlay" onClick={() => setEditingProviderDetail(null)}>
              <div className="md-editor-panel md-editor-panel-wide" style={{ width: 780, maxHeight: "90vh" }} onClick={e => e.stopPropagation()}>
                <div className="md-editor-header">
                  <h3><Key size={16} /> {p.name} — 详细配置</h3>
                  <button className="btn ghost btn-sm" onClick={() => setEditingProviderDetail(null)}><X size={16} /></button>
                </div>
                <div style={{ padding: 20, overflow: "auto", flex: 1 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px", marginBottom: 20 }}>
                    <div className="form-field">
                      <label>API Key</label>
                      <input type="password" value={editingProviderDetail.apiKey} onChange={e => setEditingProviderDetail({ ...editingProviderDetail, apiKey: e.target.value })} placeholder="sk-..." />
                    </div>
                    <div className="form-field">
                      <label>接口地址</label>
                      <input value={editingProviderDetail.baseUrl} onChange={e => setEditingProviderDetail({ ...editingProviderDetail, baseUrl: e.target.value })} placeholder="https://api.example.com/v1" />
                    </div>
                    <div className="form-field">
                      <label>API 格式</label>
                      <select value={editingProviderDetail.apiFormat} onChange={e => setEditingProviderDetail({ ...editingProviderDetail, apiFormat: e.target.value })}>
                        <option value="">— 选择格式 —</option>
                        <option value="OpenAI">OpenAI</option>
                        <option value="Anthropic">Anthropic</option>
                        <option value="DeepSeek">DeepSeek</option>
                        <option value="Gemini">Gemini</option>
                        <option value="Qwen">Qwen (通义千问)</option>
                        <option value="GLM">GLM (智谱)</option>
                        <option value="Moonshot">Moonshot (月之暗面)</option>
                        <option value="Custom">自定义</option>
                      </select>
                    </div>
                    <div className="form-field">
                      <label>默认模型</label>
                      <select value={p.defaultModel || (p.models[0]?.name ?? "")} onChange={e => onSetDefaultModel(p.id, e.target.value)}>
                        <option value="">— 选择默认模型 —</option>
                        {p.models.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="settings-section-title" style={{ marginBottom: 8 }}>模型列表</div>
                  <div className="model-table">
                    <div className="model-table-header">
                      <span className="model-th model-th-name">名称</span>
                      <span className="model-th">类型</span>
                      <span className="model-th">上下文长度</span>
                      <span className="model-th">最大输出</span>
                      <span className="model-th">温度</span>
                      <span className="model-th">Top P</span>
                      <span className="model-th model-th-actions">操作</span>
                    </div>
                    {p.models.map((m) => (
                      <div key={m.name} className={`model-tr${m.name === p.defaultModel ? " default" : ""}`}>
                        <span className="model-td model-td-name">
                          {m.name}
                          {m.name === p.defaultModel && <span className="model-default-tag">默认</span>}
                        </span>
                        <span className="model-td model-td-value">
                          <select className="model-td-select" value={m.type ?? "chat"} onChange={e => {
                            const updated = p.models.map(x => x.name === m.name ? { ...x, type: e.target.value as ModelInfo["type"] } : x);
                            onUpdateProvider(p.id, { models: updated });
                          }}>
                            <option value="chat">chat</option>
                            <option value="completion">completion</option>
                            <option value="embedding">embedding</option>
                            <option value="vision">vision</option>
                          </select>
                        </span>
                        <span className="model-td model-td-value">
                          <input className="model-td-input" type="number" value={m.contextLength ?? 128000} onChange={e => {
                            const updated = p.models.map(x => x.name === m.name ? { ...x, contextLength: Number(e.target.value) } : x);
                            onUpdateProvider(p.id, { models: updated });
                          }} />
                        </span>
                        <span className="model-td model-td-value">
                          <input className="model-td-input" type="number" value={m.maxOutputTokens ?? m.maxTokens ?? 16384} onChange={e => {
                            const updated = p.models.map(x => x.name === m.name ? { ...x, maxOutputTokens: Number(e.target.value) } : x);
                            onUpdateProvider(p.id, { models: updated });
                          }} />
                        </span>
                        <span className="model-td model-td-value">
                          <input className="model-td-input" type="number" min={0} max={2} step={0.1} value={m.temperature ?? 0.7} onChange={e => {
                            const updated = p.models.map(x => x.name === m.name ? { ...x, temperature: Number(e.target.value) } : x);
                            onUpdateProvider(p.id, { models: updated });
                          }} />
                        </span>
                        <span className="model-td model-td-value">
                          <input className="model-td-input" type="number" min={0} max={1} step={0.05} value={m.topP ?? 1.0} onChange={e => {
                            const updated = p.models.map(x => x.name === m.name ? { ...x, topP: Number(e.target.value) } : x);
                            onUpdateProvider(p.id, { models: updated });
                          }} />
                        </span>
                        <span className="model-td model-td-actions">
                          {m.name !== p.defaultModel && (
                            <button className="model-inline-btn" onClick={() => onSetDefaultModel(p.id, m.name)}>设默认</button>
                          )}
                          {m.name !== p.defaultModel && (
                            <button className="model-inline-btn danger" onClick={() => { showConfirm('删除模型', `确定删除模型 ${m.name}？`, () => onDeleteModel(p.id, m.name)); }}>删除</button>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                  {addingModelFor === p.id ? (
                    <div className="model-row-add" style={{ marginTop: 8 }}>
                      <input className="model-inline-input" placeholder="模型名称" value={newModelName} onChange={e => setNewModelName(e.target.value)} autoFocus />
                      <button className="btn primary btn-sm" onClick={() => { if (newModelName.trim()) { onAddModel(p.id, { name: newModelName.trim(), contextLength: 128000, temperature: 0.7, maxTokens: 16384 }); setNewModelName(""); setAddingModelFor(null); } }}><Check size={12} /></button>
                      <button className="btn ghost btn-sm" onClick={() => { setAddingModelFor(null); setNewModelName(""); }}><X size={12} /></button>
                    </div>
                  ) : (
                    <div style={{ marginTop: 8 }}>
                      <button className="model-add-btn" onClick={() => setAddingModelFor(p.id)}><Plus size={13} /> 添加模型</button>
                    </div>
                  )}
                </div>
                <div className="md-editor-footer" style={{ justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <button className="btn btn-sm" style={{ color: "var(--success)" }} disabled={testingConnection} onClick={handleTestConnection}>
                      {testingConnection ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
                      {testingConnection ? "测试中..." : "测试连接"}
                    </button>
                    {testResult && (
                      <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                        {testResult.success ? <CheckCircle2 size={14} style={{ color: "var(--ok)" }} /> : <AlertCircle size={14} style={{ color: "var(--danger)" }} />}
                        <span style={{ color: testResult.success ? "var(--ok)" : "var(--danger)" }}>{testResult.message}</span>
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-sm" onClick={() => setEditingProviderDetail(null)}>取消</button>
                    <button className="btn primary btn-sm" disabled={saving} onClick={async () => {
                      setSaving(true);
                      onUpdateProvider(editingProviderDetail.providerId, {
                        apiKey: editingProviderDetail.apiKey,
                        apiFormat: editingProviderDetail.apiFormat,
                        baseUrl: editingProviderDetail.baseUrl,
                        apiKeyStatus: editingProviderDetail.apiKey ? "configured" : "missing"
                      });
                      // Also persist to file system
                      if (onSave) {
                        await onSave();
                      }
                      showToast("配置已保存", "success");
                      setEditingProviderDetail(null);
                      setSaving(false);
                    }}>{saving ? "保存中..." : "保存"}</button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Custom Confirm Dialog */}
      {confirmDialog?.open && (
        <div className="confirm-overlay" onClick={() => setConfirmDialog(null)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <div className="confirm-header">
              <AlertTriangle size={18} />
              <span>{confirmDialog.title}</span>
            </div>
            <div className="confirm-body">
              <p>{confirmDialog.message}</p>
            </div>
            <div className="confirm-footer">
              <button className="btn" onClick={() => setConfirmDialog(null)}>取消</button>
              <button className="btn danger" onClick={() => {
                confirmDialog.onConfirm();
                setConfirmDialog(null);
              }}>确认</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}