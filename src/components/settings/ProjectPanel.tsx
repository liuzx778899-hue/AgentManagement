import { useMemo, useState } from "react";
import { GitBranch, FolderCog } from "lucide-react";
import type { Project, GitCredential, GitPlatform } from "../../domain/workbench";
import { useWorkbenchState } from "../../App";
import { IconBadge } from "../IconBadge";

interface ProjectPanelProps {
  projects: Project[];
  gitCredentials: GitCredential[];
}

export function ProjectPanel({ projects, gitCredentials }: ProjectPanelProps) {
  const { updateProject } = useWorkbenchState();
  const [activeProjectId, setActiveProjectId] = useState(projects[0]?.id ?? "");
  const activeProject = useMemo(() => projects.find((p) => p.id === activeProjectId), [projects, activeProjectId]);

  // Remote repo config state
  const [repoPlatform, setRepoPlatform] = useState<GitPlatform>(activeProject?.remoteRepo?.platform ?? "github");
  const [repoCredId, setRepoCredId] = useState(activeProject?.remoteRepo?.credentialId ?? "");
  const [repoOwner, setRepoOwner] = useState(activeProject?.remoteRepo?.repoOwner ?? "");
  const [repoName, setRepoName] = useState(activeProject?.remoteRepo?.repoName ?? "");
  const [repoSyncEnabled, setRepoSyncEnabled] = useState(activeProject?.remoteRepo?.syncEnabled ?? false);

  return (
    <div className="settings-panel">
      <div className="panel-header">
        <div className="panel-title">
          <IconBadge icon={FolderCog} label="项目设置" />
          <h3>项目设置</h3>
        </div>
        <select
          value={activeProjectId}
          onChange={(e) => setActiveProjectId(e.target.value)}
          className="project-select"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div className="panel-body">
        {activeProject && (
          <>
            <div className="settings-section">
              <div className="settings-section-title">基本信息</div>
              <div className="project-info">
                <div className="info-row">
                  <strong>仓库路径</strong>
                  <code>{activeProject.repoPath}</code>
                </div>
                <div className="info-row">
                  <strong>默认分支</strong>
                  <span className="badge blue">{activeProject.defaultBranch}</span>
                </div>
                <div className="info-row">
                  <strong>范围</strong>
                  <span className="badge">{activeProject.scope === "personal" ? "个人" : "团队"}</span>
                </div>
                <div className="info-row">
                  <strong>技术栈</strong>
                  <span className="badge violet">{activeProject.settings.detectedStack}</span>
                </div>
              </div>
            </div>
            <div className="settings-section">
              <div className="settings-section-title">命令配置</div>
              <div className="form-grid">
                <div className="form-field">
                  <label>安装命令</label>
                  <input defaultValue={activeProject.settings.installCommand} />
                </div>
                <div className="form-field">
                  <label>测试命令</label>
                  <input defaultValue={activeProject.settings.testCommand} />
                </div>
                <div className="form-field">
                  <label>构建命令</label>
                  <input defaultValue={activeProject.settings.buildCommand} />
                </div>
                <div className="form-field">
                  <label>预览命令</label>
                  <input defaultValue={activeProject.settings.previewCommand} />
                </div>
              </div>
            </div>
            <div className="settings-section">
              <div className="settings-section-title">风险评估</div>
              <div className="form-field">
                <label>风险摘要</label>
                <textarea defaultValue={activeProject.settings.riskSummary} rows={3} />
              </div>
            </div>
            <div className="remote-repo-section">
              <h4><GitBranch size={14} /> 远程仓库</h4>
              <div className="remote-repo-form">
                <label>平台</label>
                <select value={repoPlatform} onChange={(e) => { setRepoPlatform(e.target.value as GitPlatform); setRepoCredId(""); }}>
                  <option value="github">GitHub</option>
                  <option value="gitlab">GitLab</option>
                  <option value="gitee">Gitee</option>
                </select>
                <label>凭证</label>
                <select value={repoCredId} onChange={(e) => setRepoCredId(e.target.value)}>
                  <option value="">— 选择凭证 —</option>
                  {gitCredentials.filter(c => c.platform === repoPlatform).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <label>Owner</label>
                <input value={repoOwner} onChange={(e) => setRepoOwner(e.target.value)} placeholder="仓库所有者" />
                <label>Repo</label>
                <input value={repoName} onChange={(e) => setRepoName(e.target.value)} placeholder="仓库名称" />
                <label>启用同步</label>
                <label className="checkbox-label">
                  <input type="checkbox" checked={repoSyncEnabled} onChange={(e) => setRepoSyncEnabled(e.target.checked)} />
                  <span>自动同步分支和提交</span>
                </label>
              </div>
              {activeProject.remoteRepo && (
                <div className="remote-repo-status">
                  同步状态: <span className={`badge ${activeProject.remoteRepo.syncStatus === "success" ? "green" : activeProject.remoteRepo.syncStatus === "failed" ? "red" : activeProject.remoteRepo.syncStatus === "syncing" ? "blue" : ""}`}>{activeProject.remoteRepo.syncStatus}</span>
                  {activeProject.remoteRepo.lastSyncAt && <> · 上次: {activeProject.remoteRepo.lastSyncAt}</>}
                </div>
              )}
              <div style={{ marginTop: 12 }}>
                <button className="btn primary btn-sm" onClick={() => {
                  if (activeProject) {
                    updateProject(activeProject.id, {
                      remoteRepo: {
                        platform: repoPlatform,
                        credentialId: repoCredId,
                        repoOwner,
                        repoName,
                        defaultBranch: activeProject.defaultBranch,
                        syncEnabled: repoSyncEnabled,
                        syncStatus: activeProject.remoteRepo?.syncStatus ?? "idle",
                        lastSyncAt: activeProject.remoteRepo?.lastSyncAt,
                      },
                    });
                    alert("远程仓库配置已保存");
                  }
                }}>保存仓库配置</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
