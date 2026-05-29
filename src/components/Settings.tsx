import { useEffect, useState } from "react";
import { Settings as SettingsIcon, Key, MessageSquare } from "lucide-react";
import type { WorkbenchData } from "../domain/workbench";
import { useWorkbenchState } from "../App";
import { IconBadge } from "./IconBadge";
import { CapabilityCenter } from "./CapabilityCenter";
import { ImAdapterSettings } from "./ImAdapterSettings";
import { GitAuthConfig } from "./GitAuthConfig";
import {
  UserPanel,
  ProjectPanel,
  ModelConfigPanel,
  CliRunnerPanel,
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
    setAiAssistantModel,
    updateRunner,
    setDefaultRunner,
  } = useWorkbenchState();
  const [activeTab, setActiveTab] = useState<SettingsTab>("user");
  const [saved, setSaved] = useState(false);
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
        <button className="btn primary" onClick={() => { setSaved(true); }}>保存配置</button>
        {saved && <span className="settings-saved-msg">已保存</span>}
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
              aiAssistantModel={data.aiAssistantModel}
              onAddProvider={addModelProvider}
              onUpdateProvider={updateModelProvider}
              onDeleteProvider={deleteModelProvider}
              onAddModel={addProviderModel}
              onDeleteModel={deleteProviderModel}
              onSetDefaultModel={setDefaultProviderModel}
              onSetAiAssistantModel={setAiAssistantModel}
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
