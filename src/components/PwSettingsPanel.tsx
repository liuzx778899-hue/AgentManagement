import { useState, useEffect } from "react";
import { FolderGit2, Settings, X } from "lucide-react";
import type { Project } from "../domain/project";
import type { WorkbenchData } from "../domain/workbench";
import type { GitPlatform } from "../domain/git";
import { useWorkbenchState } from "../state/WorkbenchProvider";

interface PwSettingsPanelProps {
  show: boolean;
  onClose: () => void;
  project: Project | undefined;
  data: WorkbenchData;
}

export function PwSettingsPanel({ show, onClose, project, data }: PwSettingsPanelProps) {
  const { updateProject } = useWorkbenchState();

  // Repo config state
  const [repoPlatform, setRepoPlatform] = useState<GitPlatform>("github");
  const [repoCredId, setRepoCredId] = useState("");
  const [repoOwner, setRepoOwner] = useState("");
  const [repoName, setRepoName] = useState("");
  const [repoSyncEnabled, setRepoSyncEnabled] = useState(false);

  // Sync repo config state when project changes
  useEffect(() => {
    if (project?.remoteRepo) {
      setRepoPlatform(project.remoteRepo.platform);
      setRepoCredId(project.remoteRepo.credentialId);
      setRepoOwner(project.remoteRepo.repoOwner);
      setRepoName(project.remoteRepo.repoName);
      setRepoSyncEnabled(project.remoteRepo.syncEnabled);
    }
  }, [project]);

  if (!show || !project) return null;

  const handleSaveRepo = () => {
    if (repoCredId && repoOwner && repoName) {
      updateProject(project.id, {
        remoteRepo: {
          platform: repoPlatform,
          credentialId: repoCredId,
          repoOwner,
          repoName,
          defaultBranch: project.defaultBranch,
          syncEnabled: repoSyncEnabled,
          syncStatus: project.remoteRepo?.syncStatus ?? "idle",
          lastSyncAt: project.remoteRepo?.lastSyncAt,
        },
      });
      onClose();
    }
  };

  return (
    <div className="pw-settings-overlay" onClick={onClose}>
      <div className="pw-settings-panel" onClick={(e) => e.stopPropagation()}>
        <header className="pw-settings-header">
          <div className="pw-settings-title">
            <Settings size={16} />
            <strong>项目设置 — {project.name}</strong>
          </div>
          <button className="btn ghost btn-sm" onClick={onClose} type="button">
            <X size={16} /> 关闭
          </button>
        </header>
        <div className="pw-settings-body">
          {/* 基本信息 */}
          <div className="pw-settings-section">
            <div className="pw-settings-section-title">基本信息</div>
            <div className="pw-settings-info-grid">
              <div className="pw-settings-info-item">
                <span className="pw-settings-info-label">仓库路径</span>
                <code className="pw-settings-info-val">{project.repoPath}</code>
              </div>
              <div className="pw-settings-info-item">
                <span className="pw-settings-info-label">默认分支</span>
                <span className="pw-badge pw-badge-b">{project.defaultBranch}</span>
              </div>
              <div className="pw-settings-info-item">
                <span className="pw-settings-info-label">技术栈</span>
                <span className="pw-badge pw-badge-v">{project.settings.detectedStack}</span>
              </div>
              <div className="pw-settings-info-item">
                <span className="pw-settings-info-label">范围</span>
                <span className="pw-badge">{project.scope === "personal" ? "个人" : "团队"}</span>
              </div>
            </div>
          </div>
          {/* 命令配置 */}
          <div className="pw-settings-section">
            <div className="pw-settings-section-title">命令配置</div>
            <div className="pw-settings-form-grid">
              <div className="pw-settings-field">
                <label>安装命令</label>
                <input defaultValue={project.settings.installCommand} />
              </div>
              <div className="pw-settings-field">
                <label>测试命令</label>
                <input defaultValue={project.settings.testCommand} />
              </div>
              <div className="pw-settings-field">
                <label>构建命令</label>
                <input defaultValue={project.settings.buildCommand} />
              </div>
              <div className="pw-settings-field">
                <label>预览命令</label>
                <input defaultValue={project.settings.previewCommand} />
              </div>
            </div>
          </div>
          {/* 远程仓库 */}
          <div className="pw-settings-section">
            <div className="pw-settings-section-title">
              <FolderGit2 size={12} />
              远程仓库
            </div>
            <div className="pw-settings-form-grid">
              <div className="pw-settings-field">
                <label>平台</label>
                <select value={repoPlatform} onChange={(e) => { setRepoPlatform(e.target.value as GitPlatform); setRepoCredId(""); }}>
                  <option value="github">GitHub</option>
                  <option value="gitlab">GitLab</option>
                  <option value="gitee">Gitee</option>
                </select>
              </div>
              <div className="pw-settings-field">
                <label>凭证</label>
                <select value={repoCredId} onChange={(e) => setRepoCredId(e.target.value)}>
                  <option value="">— 选择凭证 —</option>
                  {data.gitCredentials.filter(c => c.platform === repoPlatform).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="pw-settings-field">
                <label>Owner</label>
                <input value={repoOwner} onChange={(e) => setRepoOwner(e.target.value)} placeholder="仓库所有者" />
              </div>
              <div className="pw-settings-field">
                <label>Repo</label>
                <input value={repoName} onChange={(e) => setRepoName(e.target.value)} placeholder="仓库名称" />
              </div>
            </div>
            <div className="pw-settings-checkbox">
              <input type="checkbox" checked={repoSyncEnabled} onChange={(e) => setRepoSyncEnabled(e.target.checked)} />
              <span>启用同步</span>
            </div>
            {project.remoteRepo && (
              <div className="pw-settings-status">
                同步状态: <span className={`pw-badge ${project.remoteRepo.syncStatus === "success" ? "pw-badge-g" : project.remoteRepo.syncStatus === "failed" ? "pw-badge-o" : "pw-badge-b"}`}>{project.remoteRepo.syncStatus}</span>
                {project.remoteRepo.lastSyncAt && <span> · 上次: {project.remoteRepo.lastSyncAt}</span>}
              </div>
            )}
            <div className="pw-settings-actions">
              <button
                className="btn primary btn-sm"
                onClick={handleSaveRepo}
                disabled={!repoCredId || !repoOwner || !repoName}
                type="button"
              >
                保存仓库配置
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
