import { useState } from "react";
import { Check, Edit2, GitFork, Github, Gitlab, Key, Plus, Trash2, X, type LucideIcon } from "lucide-react";
import type { GitCredential, GitPlatform } from "../domain/workbench";
import { useWorkbenchState } from "../state/WorkbenchProvider";
import { IconBadge } from "./IconBadge";

interface GitAuthConfigProps {
  credentials: GitCredential[];
}

const PLATFORM_INFO: Record<GitPlatform, { label: string; defaultApiUrl: string }> = {
  github: { label: "GitHub", defaultApiUrl: "api.github.com" },
  gitlab: { label: "GitLab", defaultApiUrl: "gitlab.com" },
  gitee: { label: "Gitee", defaultApiUrl: "gitee.com" },
};

const PLATFORM_ICONS: Record<GitPlatform, LucideIcon> = {
  github: Github,
  gitlab: Gitlab,
  gitee: GitFork,
};

const PLATFORMS: GitPlatform[] = ["github", "gitlab", "gitee"];

export function GitAuthConfig({ credentials }: GitAuthConfigProps) {
  const { addGitCredential, deleteGitCredential } = useWorkbenchState();
  const [activePlatform, setActivePlatform] = useState<GitPlatform>("github");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newPlatform, setNewPlatform] = useState<GitPlatform>("github");
  const [newName, setNewName] = useState("");
  const [newToken, setNewToken] = useState("");
  const [newApiUrl, setNewApiUrl] = useState(PLATFORM_INFO.github.defaultApiUrl);

  const groupedCredentials = credentials.reduce(
    (acc, cred) => {
      if (!acc[cred.platform]) acc[cred.platform] = [];
      acc[cred.platform].push(cred);
      return acc;
    },
    {} as Record<GitPlatform, GitCredential[]>
  );

  const handlePlatformChange = (platform: GitPlatform) => {
    setNewPlatform(platform);
    setNewApiUrl(PLATFORM_INFO[platform].defaultApiUrl);
  };

  const handleAddCredential = () => {
    if (newName.trim() && newToken.trim()) {
      addGitCredential({ platform: newPlatform, name: newName, token: newToken, apiUrl: newApiUrl, verified: false });
      setShowAddModal(false);
      setNewName("");
      setNewToken("");
    }
  };

  const handleTestConnection = () => {
    alert("Phase 2 支持真实 API 调用");
  };

  const activeCredentials = groupedCredentials[activePlatform] || [];

  return (
    <div className="git-auth-config">
      <div className="git-auth-header">
        <div className="git-auth-title">
          <IconBadge icon={Key} label="Git 认证" />
          <div>
            <h3>Git 认证配置</h3>
            <span>管理 GitHub、GitLab、Gitee 平台的认证凭据。</span>
          </div>
        </div>
        <button className="btn primary" onClick={() => setShowAddModal(true)}>
          <Plus size={16} />
          添加认证
        </button>
      </div>

      <div className="tab-group git-platform-tabs" role="tablist" aria-label="Git 平台">
        {PLATFORMS.map((platform) => {
          const info = PLATFORM_INFO[platform];
          const PlatformIcon = PLATFORM_ICONS[platform];
          return (
            <button
              key={platform}
              className={`tab git-platform-tab${activePlatform === platform ? " active" : ""}`}
              onClick={() => setActivePlatform(platform)}
              role="tab"
              aria-selected={activePlatform === platform}
            >
              <PlatformIcon size={16} />
              <span>{info.label}</span>
            </button>
          );
        })}
      </div>

      <div className="credential-list">
        {activeCredentials.length === 0 ? (
          <div className="empty-credential">暂无认证配置</div>
        ) : (
          activeCredentials.map((cred) => (
            <div key={cred.id} className="credential-card">
              <div className="credential-info">
                <div className="credential-name">
                  <strong>{cred.name}</strong>
                  <span className={`status-dot ${cred.verified ? "ok" : "warn"}`} />
                  <span className="status-label">{cred.verified ? "已验证" : "未验证"}</span>
                </div>
                <div className="credential-detail">
                  <span className="api-url">{cred.apiUrl}</span>
                  <span className="token-preview">token: {cred.token}</span>
                </div>
              </div>
              <div className="credential-actions">
                <button className="btn ghost btn-sm" onClick={() => setEditingId(cred.id)}>
                  <Edit2 size={14} />
                </button>
                <button
                  className="btn ghost btn-sm"
                  style={{ color: "var(--danger)" }}
                  onClick={() => deleteGitCredential(cred.id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {editingId && (
        <div className="inline-note">
          当前仅为前端 MVP：编辑弹窗将在下一轮接入状态层。选中凭据：{editingId}
        </div>
      )}

      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>新增认证</h3>
            <div className="form-field">
              <label>平台</label>
              <select value={newPlatform} onChange={(e) => handlePlatformChange(e.target.value as GitPlatform)}>
                {Object.entries(PLATFORM_INFO).map(([key, info]) => (
                  <option key={key} value={key}>
                    {info.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>认证名称</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={`例如：个人 ${PLATFORM_INFO[newPlatform].label}`}
                autoFocus
              />
            </div>
            <div className="form-field">
              <label>Token</label>
              <input
                value={newToken}
                onChange={(e) => setNewToken(e.target.value)}
                placeholder="Personal Access Token"
                type="password"
              />
            </div>
            <div className="form-field">
              <label>API URL</label>
              <input
                value={newApiUrl}
                onChange={(e) => setNewApiUrl(e.target.value)}
                placeholder={PLATFORM_INFO[newPlatform].defaultApiUrl}
              />
            </div>
            <div className="modal-actions">
              <button className="btn ghost" onClick={handleTestConnection}>
                连接测试
              </button>
              <button
                className="btn ghost"
                onClick={() => {
                  setShowAddModal(false);
                  setNewName("");
                  setNewToken("");
                }}
              >
                <X size={16} />
                取消
              </button>
              <button className="btn primary" onClick={handleAddCredential}>
                <Check size={16} />
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
