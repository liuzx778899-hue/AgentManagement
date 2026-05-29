import { useState } from "react";
import {
  AlertCircle,
  Bell,
  Bot,
  Building2,
  Check,
  CheckCircle,
  KeyRound,
  MessageSquare,
  MessageSquareText,
  Plus,
  Power,
  Send,
  Trash2,
  Wifi,
  X,
} from "lucide-react";
import type { ImAdapter, ImEventType, ImPlatform, ImMessageTemplate, ImRouteRule } from "../domain/workbench";
import type { LucideIcon } from "lucide-react";
import { useWorkbenchState } from "../state/WorkbenchProvider";

interface ImAdapterSettingsProps {
  adapters: ImAdapter[];
}

// Default templates for new adapters
const DEFAULT_TEMPLATES: Record<ImEventType, ImMessageTemplate> = {
  gate_approval: {
    title: "🔔 {{taskName}} 需要审批",
    body: "步骤「{{stepName}}」已完成，由 {{roleName}} 执行。请决定：继续 / 重跑 / 改派 / 终止",
    buttons: ["同意继续", "重跑", "改派", "终止"],
  },
  task_complete: {
    title: "✅ {{taskName}} 已完成",
    body: "任务目标：{{goal}}\n验收标准：{{criteria}}\n执行角色：{{roleName}}\n完成时间：{{completedAt}}",
    buttons: ["查看详情"],
  },
  agent_error: {
    title: "⚠️ {{taskName}} 执行异常",
    body: "步骤「{{stepName}}」执行失败。\n错误信息：{{errorMessage}}\n角色：{{roleName}}\n建议：手动介入或重试",
    buttons: ["重试", "跳过", "查看日志"],
  },
  direct_chat: {
    title: "{{userMessage}}",
    body: "{{agentResponse}}\n回复「详情」查看完整内容",
    buttons: ["继续", "终止对话"],
  },
};

// Default route rules for new adapters
const DEFAULT_ROUTE_RULES: ImRouteRule[] = [
  { eventType: "gate_approval", enabled: true, targetRoleIds: [], requireResponse: true },
  { eventType: "task_complete", enabled: true, targetRoleIds: [], requireResponse: false },
  { eventType: "agent_error", enabled: true, targetRoleIds: [], requireResponse: true },
  { eventType: "direct_chat", enabled: false, targetRoleIds: [], requireResponse: false },
];

const PLATFORM_INFO: Record<ImPlatform, { label: string; webhookPlaceholder: string }> = {
  feishu: { label: "飞书", webhookPlaceholder: "https://open.feishu.cn/open-apis/bot/v2/hook/xxx" },
  dingtalk: { label: "钉钉", webhookPlaceholder: "https://oapi.dingtalk.com/robot/send?access_token=xxx" },
  wechat: {
    label: "企业微信",
    webhookPlaceholder: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx",
  },
  telegram: { label: "Telegram", webhookPlaceholder: "https://api.telegram.org/bot<token>/sendMessage" },
};

const PLATFORM_ICONS: Record<ImPlatform, LucideIcon> = {
  feishu: Building2,
  dingtalk: CheckCircle,
  wechat: MessageSquareText,
  telegram: Send,
};

const EVENT_TYPES: { key: ImEventType; label: string; icon: LucideIcon }[] = [
  { key: "gate_approval", label: "Gate 审批通知", icon: CheckCircle },
  { key: "task_complete", label: "任务完成通知", icon: CheckCircle },
  { key: "agent_error", label: "Agent 异常通知", icon: AlertCircle },
  { key: "direct_chat", label: "直接对话", icon: MessageSquareText },
];

export function ImAdapterSettings({ adapters }: ImAdapterSettingsProps) {
  const { addImAdapter, updateImAdapter, deleteImAdapter, toggleImAdapterRoute } = useWorkbenchState();
  const [selectedId, setSelectedId] = useState<string | null>(adapters[0]?.id ?? null);
  const [activeEventTab, setActiveEventTab] = useState<ImEventType>("gate_approval");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPlatform, setNewPlatform] = useState<ImPlatform>("feishu");
  const [newName, setNewName] = useState("");

  const selected = adapters.find((a) => a.id === selectedId);
  const selectedPlatform = selected ? PLATFORM_INFO[selected.platform] : null;
  const SelectedPlatformIcon = selected ? PLATFORM_ICONS[selected.platform] ?? Bot : Bot;
  const enabledRules = selected?.routeRules.filter((r) => r.enabled).length ?? 0;
  const activeTemplate = selected?.templates[activeEventTab];

  const handleAddAdapter = () => {
    if (newName.trim()) {
      addImAdapter({
        name: newName,
        platform: newPlatform,
        enabled: true,
        webhookUrl: "",
        appId: "",
        appSecret: "未配置",
        verifyToken: "",
        templates: DEFAULT_TEMPLATES,
        routeRules: DEFAULT_ROUTE_RULES,
      });
      setShowAddModal(false);
      setNewName("");
    }
  };

  return (
    <div className="im-adapter-settings">
      <div className="im-adapter-list">
        <div className="list-header">
          <div>
            <h3>适配器列表</h3>
            <p>选择一个 IM 通道，配置通知模板、连接信息和路由规则。</p>
          </div>
          <button className="btn primary btn-sm" onClick={() => setShowAddModal(true)} type="button">
            <Plus size={14} />
            新增
          </button>
        </div>

        <div className="tab-group adapter-tabs">
          {adapters.map((adapter) => {
            const PlatformIcon = PLATFORM_ICONS[adapter.platform] ?? Bot;
            return (
              <button
                key={adapter.id}
                className={`tab adapter-tab${selectedId === adapter.id ? " active" : ""}${!adapter.enabled ? " disabled" : ""}`}
                onClick={() => setSelectedId(adapter.id)}
                type="button"
              >
                <PlatformIcon size={16} />
                <span>{adapter.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="im-adapter-editor">
        {selected && selectedPlatform ? (
          <>
            <div className="im-current-card">
              <div className="im-current-main">
                <div className="im-current-icon">
                  <SelectedPlatformIcon size={22} />
                </div>
                <div className="im-current-copy">
                  <div className="im-current-title-row">
                    <h3>{selected.name}</h3>
                    <span className={`status-pill ${selected.enabled ? "ok" : "warn"}`}>
                      <span className={`status-dot ${selected.enabled ? "ok" : "warn"}`} />
                      {selected.enabled ? "已启用" : "已禁用"}
                    </span>
                  </div>
                  <div className="im-current-meta">
                    <span>{selectedPlatform.label}</span>
                    <span>{enabledRules} 条路由启用</span>
                    <span>{selected.webhookUrl ? "Webhook 已配置" : "Webhook 未配置"}</span>
                  </div>
                </div>
              </div>
              <div className="editor-actions">
                <button
                  className={`btn ${selected.enabled ? "primary" : "ghost"}`}
                  onClick={() => updateImAdapter(selected.id, { enabled: !selected.enabled })}
                  type="button"
                >
                  <Power size={16} />
                  {selected.enabled ? "已启用" : "启用"}
                </button>
                <button
                  aria-label="删除适配器"
                  className="btn ghost danger"
                  onClick={() => {
                    deleteImAdapter(selected.id);
                    setSelectedId(adapters.find(a => a.id !== selected.id)?.id ?? null);
                  }}
                  type="button"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="editor-body im-editor-body">
              <section className="editor-section im-section-card im-basic-section">
                <div className="section-heading">
                  <KeyRound size={16} />
                  <h4>基础信息</h4>
                </div>
                <div className="form-grid im-form-grid">
                  <div className="form-field">
                    <label>适配器名称</label>
                    <input defaultValue={selected.name} />
                  </div>
                  <div className="form-field">
                    <label>平台类型</label>
                    <input value={selectedPlatform.label} disabled />
                  </div>
                  <div className="form-field span-2">
                    <label>Webhook URL</label>
                    <input defaultValue={selected.webhookUrl} placeholder={selectedPlatform.webhookPlaceholder} />
                  </div>
                  <div className="form-field">
                    <label>App ID</label>
                    <input defaultValue={selected.appId} placeholder="可选" />
                  </div>
                  <div className="form-field">
                    <label>验证 Token</label>
                    <input defaultValue={selected.verifyToken} placeholder="可选" />
                  </div>
                  <div className="form-field">
                    <label>App Secret</label>
                    <div className="secret-field">
                      <span className={`status-dot ${selected.appSecret !== "未配置" ? "ok" : "warn"}`} />
                      <span>{selected.appSecret || "未配置"}</span>
                    </div>
                  </div>
                  <div className="form-field">
                    <label>连接测试</label>
                    <button className="btn ghost im-test-btn" onClick={() => alert("连接成功")} type="button">
                      <Wifi size={15} />
                      测试连接
                    </button>
                  </div>
                </div>
              </section>

              <section className="editor-section im-section-card im-template-section">
                <div className="section-heading">
                  <Bell size={16} />
                  <h4>通知模板</h4>
                </div>
                <div className="tab-group im-event-tabs">
                  {EVENT_TYPES.map((et) => {
                    const Icon = et.icon;
                    return (
                      <button
                        key={et.key}
                        className={`tab${activeEventTab === et.key ? " active" : ""}`}
                        onClick={() => setActiveEventTab(et.key)}
                        type="button"
                      >
                        <Icon size={16} />
                        <span>{et.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="template-editor">
                  <div className="form-field">
                    <label>标题模板</label>
                    <input defaultValue={activeTemplate?.title} placeholder="支持 {{taskName}}、{{stepName}} 等变量" />
                  </div>
                  <div className="form-field">
                    <label>正文模板</label>
                    <textarea
                      defaultValue={activeTemplate?.body}
                      rows={5}
                      placeholder="支持多行文本和变量"
                    />
                  </div>
                  <div className="form-field">
                    <label>可回复按钮</label>
                    <input defaultValue={activeTemplate?.buttons.join(", ")} placeholder="按钮1, 按钮2, 按钮3" />
                  </div>
                  <div className="template-preview">
                    <strong>消息预览</strong>
                    <div className="terminal">
                      <div className="preview-title">{activeTemplate?.title || "（无标题）"}</div>
                      <div className="preview-body">{activeTemplate?.body || "（无正文）"}</div>
                      {activeTemplate && activeTemplate.buttons.length > 0 && (
                        <div className="preview-buttons">
                          {activeTemplate.buttons.map((buttonLabel, index) => (
                            <span key={index} className="preview-btn">
                              {buttonLabel}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <section className="editor-section im-section-card im-route-section">
                <div className="section-heading">
                  <MessageSquare size={16} />
                  <h4>路由规则</h4>
                </div>
                <div className="route-rules">
                  {EVENT_TYPES.map((et) => {
                    const rule = selected.routeRules.find((r) => r.eventType === et.key) || {
                      eventType: et.key,
                      enabled: false,
                      targetRoleIds: [],
                      requireResponse: false,
                    };
                    return (
                      <div key={et.key} className={`route-rule${rule.enabled ? " active" : ""}`}>
                        <div className="rule-header">
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={rule.enabled}
                              onChange={() => toggleImAdapterRoute(selected.id, et.key, !rule.enabled)}
                            />
                            <span>{et.label}</span>
                          </label>
                          <label className="checkbox-label small">
                            <input
                              type="checkbox"
                              checked={rule.requireResponse}
                              onChange={() => {
                                const updatedRule = selected.routeRules.find(r => r.eventType === et.key);
                                if (updatedRule) {
                                  const newRules = selected.routeRules.map(r =>
                                    r.eventType === et.key ? { ...r, requireResponse: !r.requireResponse } : r
                                  );
                                  updateImAdapter(selected.id, { routeRules: newRules });
                                }
                              }}
                            />
                            <span>需要回复</span>
                          </label>
                        </div>
                        <div className="rule-targets">
                          <span className="rule-label">通知角色</span>
                          <div className="role-badges">
                            {rule.targetRoleIds.length > 0 ? (
                              rule.targetRoleIds.map((roleId) => (
                                <span key={roleId} className="badge violet">
                                  {roleId}
                                </span>
                              ))
                            ) : (
                              <span className="empty-hint">未选择角色</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <MessageSquare size={48} />
            <p>选择或新增一个 IM 适配器</p>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>新增 IM 适配器</h3>
            <div className="form-field">
              <label>平台类型</label>
              <select value={newPlatform} onChange={(e) => setNewPlatform(e.target.value as ImPlatform)}>
                {Object.entries(PLATFORM_INFO).map(([key, info]) => (
                  <option key={key} value={key}>
                    {info.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>适配器名称</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={`例如：公司${PLATFORM_INFO[newPlatform].label}群`}
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button
                className="btn ghost"
                onClick={() => {
                  setShowAddModal(false);
                  setNewName("");
                }}
                type="button"
              >
                <X size={16} />
                取消
              </button>
              <button className="btn primary" onClick={handleAddAdapter} type="button">
                <Check size={16} />
                确认新增
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
