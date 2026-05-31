import { useEffect, useState } from "react";
import { Settings as SettingsIcon, Key, MessageSquare, Loader2 } from "lucide-react";
import type { WorkbenchData } from "../domain/workbench";
import { useWorkbenchState } from "../App";
import { useLocalServices } from "../hooks/useLocalServices";
import { IconBadge } from "./IconBadge";
import { CapabilityCenter } from "./CapabilityCenter";
import { ImAdapterSettings } from "./ImAdapterSettings";
import { GitAuthConfig } from "./GitAuthConfig";
import {
  UserPanel,
  ProjectPanel,
  ModelConfigPanel,
  CliRunnerPanel,
  AiAssistantPanel,
  settingsTabs,
} from "./settings/index";
import type { SettingsTab } from "./settings/index";

interface SettingsProps {
  data: WorkbenchData;
}

export function Settings({ data }: SettingsProps) {
  const {
    addModelProvider,
    updateModelProvider,
    deleteModelProvider,
    addProviderModel,
    deleteProviderModel,
    setDefaultProviderModel,
    updateRunner,
    setDefaultRunner,
  } = useWorkbenchState();
  const services = useLocalServices();
  const [activeTab, setActiveTab] = useState<SettingsTab>("user");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (saved) {
      const timer = setTimeout(() => setSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [saved]);

  // Runner callbacks via reducer
  const handleToggleRunner = (runnerId: string) => {
    const runner = data.runnerProfiles?.find((r) => r.id === runnerId);
    if (runner) {
      updateRunner(runnerId, { enabled: !runner.enabled });
    }
  };

  const handleSetDefaultRunner = (runnerId: string | undefined) => {
    setDefaultRunner(runnerId);
  };

  const handleSaveModelProviders = async () => {
    if (!services.saveModelProviders) {
      setError('服务不可用');
      return;
    }

    const result = await services.saveModelProviders({
      providers: data.modelProviders,
      aiAssistantModel: data.aiAssistantModel,
    });

    if (!result.ok) {
      setError(result.error?.message || '保存模型配置失败');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      if (!services.saveSettings || !services.saveModelProviders) {
        throw new Error('服务不可用');
      }

      // 保存一般设置
      const settingsResult = await services.saveSettings({
        theme: 'system',
        language: 'zh-CN',
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
      });

      // 保存模型配置
      const modelProvidersResult = await services.saveModelProviders({
        providers: data.modelProviders,
        aiAssistantModel: data.aiAssistantModel,
      });

      if (settingsResult.ok && modelProvidersResult.ok) {
        setSaved(true);
      } else {
        setError(settingsResult.error?.message || modelProvidersResult.error?.message || '保存失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    }

    setSaving(false);
  };

  return (
    <div className="settings-page">
      <header className="settings-header">
        <div className="settings-title">
          <IconBadge icon={SettingsIcon} label="设置中心" />
          <div>
            <h1>设置中心</h1>
            <span>管理用户偏好、项目配置、模型供应商和能力授权。</span>
          </div>
        </div>
        <button className="btn primary" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 size={14} className="spin" /> : null}
          {saving ? '保存中...' : '保存配置'}
        </button>
        {saved && <span className="settings-saved-msg">已保存</span>}
        {error && <span className="settings-error-msg">{error}</span>}
      </header>

      <div className="settings-layout">
        <nav className="settings-nav">
          {settingsTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                className={`settings-nav-item${isActive ? " active" : ""}`}
                onClick={() => setActiveTab(tab.key)}
                aria-current={isActive ? "page" : undefined}
              >
                <span className={`settings-nav-icon${isActive ? " active" : ""}`}>
                  <Icon size={18} strokeWidth={1.8} />
                </span>
                <span className="settings-nav-text">
                  <span className="settings-nav-label">{tab.label}</span>
                  <span className="settings-nav-desc">{tab.desc}</span>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="settings-content">
          {activeTab === "user" && <UserPanel />}

          {activeTab === "project" && (
            <ProjectPanel
              projects={data.projects}
              gitCredentials={data.gitCredentials}
            />
          )}

          {activeTab === "models" && (
            <ModelConfigPanel
              modelProviders={data.modelProviders}
              onAddProvider={addModelProvider}
              onUpdateProvider={updateModelProvider}
              onDeleteProvider={deleteModelProvider}
              onAddModel={addProviderModel}
              onDeleteModel={deleteProviderModel}
              onSetDefaultModel={setDefaultProviderModel}
              onSave={handleSaveModelProviders}
            />
          )}

          {activeTab === "capabilities" && (
            <CapabilityCenter
              mcpServers={data.mcpServers}
              skills={data.skills}
              plugins={data.plugins}
              agents={data.agents}
            />
          )}

          {activeTab === "ai-assistant" && <AiAssistantPanel />}

          {activeTab === "cli-runners" && (
            <CliRunnerPanel
              runnerProfiles={data.runnerProfiles}
              defaultRunner={data.defaultRunner}
              onToggleRunner={handleToggleRunner}
              onSetDefaultRunner={handleSetDefaultRunner}
            />
          )}

          {activeTab === "im-adapters" && (
            <div className="settings-panel im-panel">
              <div className="panel-header">
                <div className="panel-title">
                  <IconBadge icon={MessageSquare} label="IM 适配器" />
                  <h3>IM 适配器</h3>
                </div>
                <span className="badge green">{data.imAdapters.filter((a) => a.enabled).length} 个已启用</span>
              </div>
              <div className="panel-body no-pad">
                <ImAdapterSettings adapters={data.imAdapters} />
              </div>
            </div>
          )}

          {activeTab === "git-auth" && (
            <div className="settings-panel git-panel">
              <div className="panel-header">
                <div className="panel-title">
                  <IconBadge icon={Key} label="Git 认证" />
                  <h3>Git 认证</h3>
                </div>
                <span className="badge green">{data.gitCredentials.filter((c) => c.verified).length} 个已验证</span>
              </div>
              <div className="panel-body no-pad">
                <GitAuthConfig credentials={data.gitCredentials} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
