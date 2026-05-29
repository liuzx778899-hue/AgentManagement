# 项目管理 V2 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 将 ProjectManagement 重构为看板首页 + 项目详情面板，Issues/PR/CI 移入详情内。

**架构：** ProjectManagement 重写为页面容器，新增 ProjectCard（看板卡片）和 ProjectDetail（详情面板）两个组件。IssueList/PullRequestList/CiPipelinePanel 复用到详情面板。ExistingProjectImport/NewProjectWizard 改为弹窗触发。

**技术栈：** React + TypeScript + CSS（项目 tokens），lucide-react 图标，Vitest + Testing Library

**效果参考：** `mockups/project-management-v2.html`

---

## 文件清单

| 操作 | 文件 | 说明 |
|------|------|------|
| MODIFY | `src/components/ProjectManagement.tsx` | 重写为看板容器 |
| NEW | `src/components/ProjectCard.tsx` | 项目看板卡片 |
| NEW | `src/components/ProjectDetail.tsx` | 项目详情面板 |
| MODIFY | `src/styles.css` | 新增看板/卡片/详情面板 CSS |
| NEW | `src/__tests__/project-management-v2.test.tsx` | 新测试 |

---

### Task 1: ProjectCard 组件

**文件：**
- 创建：`src/components/ProjectCard.tsx`

- [ ] **Step 1: 创建 ProjectCard 组件**

```typescript
import { Activity, AlertCircle, CheckCircle2, FolderGit2, GitBranch } from "lucide-react";
import type { Project, WorkbenchData } from "../domain/workbench";

interface ProjectCardProps {
  project: Project;
  data: WorkbenchData;
  onClick: () => void;
}

export function ProjectCard({ project, data, onClick }: ProjectCardProps) {
  const projectTasks = data.tasks.filter((t) => t.projectId === project.id);
  const doneTasks = projectTasks.filter((t) => t.status === "done").length;
  const runningTasks = projectTasks.filter((t) => t.status === "running" || t.status === "gate").length;
  const gateCount = data.manualGates.filter(
    (g) => g.status === "waiting" && projectTasks.some((t) => t.id === g.taskId)
  ).length;
  const progress = projectTasks.length > 0
    ? Math.round((doneTasks / projectTasks.length) * 100)
    : 0;

  const initials = project.name.slice(0, 2).toUpperCase();

  return (
    <div className="project-card" onClick={onClick} title={`打开 ${project.name} 详情`}>
      <div className="project-card-top">
        <div className="project-card-avatar">{initials}</div>
        <div className="project-card-info">
          <div className="project-card-name">{project.name}</div>
          <div className="project-card-meta">
            <span className="project-card-meta-item">
              <GitBranch size={12} />
              {project.defaultBranch}
            </span>
            <span className="badge violet">{project.settings.detectedStack}</span>
          </div>
          <div className="project-card-progress">
            <div className="project-card-progress-header">
              <span className="project-card-progress-label">任务进度</span>
              <span className="project-card-progress-val">
                {doneTasks}/{projectTasks.length}
              </span>
            </div>
            <div className="project-card-progress-bar">
              <div
                className="project-card-progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="project-card-bottom">
        <div className={`project-card-stat ${runningTasks > 0 ? "running" : ""}`}>
          <Activity size={13} />
          <span>{runningTasks} 运行中</span>
        </div>
        <div className={`project-card-stat ${gateCount > 0 ? "warn" : ""}`}>
          <AlertCircle size={13} />
          <span>{gateCount} 等待决策</span>
        </div>
        <div className={`project-card-stat ${doneTasks > 0 ? "ok" : ""}`}>
          <CheckCircle2 size={13} />
          <span>{doneTasks} 已完成</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 构建验证**

```powershell
npm --cache .npm-cache run build
```

预期：PASS（组件未引用，无 TS 错误）。


### Task 2: ProjectDetail 组件

**文件：**
- 创建：`src/components/ProjectDetail.tsx`

- [ ] **Step 1: 创建 ProjectDetail 组件**

```typescript
import { useState } from "react";
import {
  AlertCircle,
  GitBranch,
  GitPullRequest,
  MessageSquare,
  Settings,
  TrendingUp,
  X,
} from "lucide-react";
import type { Project, WorkbenchData } from "../domain/workbench";
import { IssueList } from "./IssueList";
import { PullRequestList } from "./PullRequestList";
import { CiPipelinePanel } from "./CiPipelinePanel";

interface ProjectDetailProps {
  project: Project;
  data: WorkbenchData;
  onClose: () => void;
}

type DetailTab = "issues" | "prs" | "ci" | "workflow" | "settings";

export function ProjectDetail({ project, data, onClose }: ProjectDetailProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>("issues");

  const tabs: { key: DetailTab; label: string; icon: React.ReactNode }[] = [
    { key: "issues", label: "Issues", icon: <AlertCircle size={14} /> },
    { key: "prs", label: "Pull Requests", icon: <GitPullRequest size={14} /> },
    { key: "ci", label: "CI/CD", icon: <TrendingUp size={14} /> },
    { key: "workflow", label: "工作流与角色", icon: <GitBranch size={14} /> },
    { key: "settings", label: "设置", icon: <Settings size={14} /> },
  ];

  // Filter issues/PRs/pipelines for this project
  const projectIssues = data.repoIssues.filter((i) =>
    project.remoteRepo
      ? i.repoOwner === project.remoteRepo.repoOwner &&
        i.repoName === project.remoteRepo.repoName
      : false
  );
  const projectPRs = data.repoPullRequests.filter((pr) =>
    project.remoteRepo
      ? pr.repoOwner === project.remoteRepo.repoOwner &&
        pr.repoName === project.remoteRepo.repoName
      : false
  );
  const projectPipelines = data.ciPipelines.filter((p) =>
    project.remoteRepo
      ? p.repoOwner === project.remoteRepo.repoOwner &&
        p.repoName === project.remoteRepo.repoName
      : false
  );

  const initials = project.name.slice(0, 2).toUpperCase();
  const template = data.workflowTemplates.find((t) => t.id === project.workflowTemplateId);

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
        <div className="detail-header">
          <div className="detail-header-avatar">{initials}</div>
          <div className="detail-header-info">
            <div className="detail-header-name">{project.name}</div>
            <div className="detail-header-meta">
              <span>{project.defaultBranch}</span>
              <span>·</span>
              <span>{project.settings.detectedStack}</span>
              <span>·</span>
              <span>{project.repoPath}</span>
            </div>
          </div>
          <button className="btn ghost btn-sm" onClick={onClose} title="关闭">
            <X size={16} />
          </button>
        </div>

        <div className="detail-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`detail-tab${activeTab === tab.key ? " active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
              type="button"
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="detail-body">
          {activeTab === "issues" && (
            <IssueList issues={projectIssues} />
          )}
          {activeTab === "prs" && (
            <PullRequestList pullRequests={projectPRs} />
          )}
          {activeTab === "ci" && (
            <CiPipelinePanel pipelines={projectPipelines} />
          )}
          {activeTab === "workflow" && (
            <div className="detail-section">
              <h4>绑定工作流</h4>
              <p className="detail-section-value">{template?.name ?? "未绑定"} v{template?.version ?? "—"}</p>
              <h4 style={{ marginTop: 16 }}>项目角色</h4>
              <div className="detail-mini-list">
                {data.roles.map((role) => (
                  <div key={role.id} className="detail-mini-item">
                    <span className="detail-mini-avatar">{role.name.slice(0, 2)}</span>
                    <div className="item-left">
                      <div className="item-title">{role.name}</div>
                      <div className="item-sub">{role.description}</div>
                    </div>
                    <span className="badge violet">{role.isBuiltIn ? "内置" : "自定义"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {activeTab === "settings" && (
            <div className="detail-section">
              <h4>项目配置</h4>
              <div className="detail-settings-grid">
                <div className="detail-setting-row">
                  <span className="detail-setting-label">安装命令</span>
                  <code>{project.settings.installCommand}</code>
                </div>
                <div className="detail-setting-row">
                  <span className="detail-setting-label">测试命令</span>
                  <code>{project.settings.testCommand}</code>
                </div>
                <div className="detail-setting-row">
                  <span className="detail-setting-label">构建命令</span>
                  <code>{project.settings.buildCommand}</code>
                </div>
                <div className="detail-setting-row">
                  <span className="detail-setting-label">预览命令</span>
                  <code>{project.settings.previewCommand}</code>
                </div>
                <div className="detail-setting-row">
                  <span className="detail-setting-label">Worktree 根</span>
                  <code>{project.worktreeRoot}</code>
                </div>
                <div className="detail-setting-row">
                  <span className="detail-setting-label">风险摘要</span>
                  <span style={{ color: "var(--muted)", fontSize: 13 }}>{project.settings.riskSummary}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 构建验证**

```powershell
npm --cache .npm-cache run build
```

预期：PASS。


### Task 3: 重写 ProjectManagement 为看板容器

**文件：**
- 修改：`src/components/ProjectManagement.tsx`

- [ ] **Step 1: 重写 ProjectManagement**

```typescript
import { useState, useMemo } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Download,
  FolderGit2,
  Plus,
  TrendingUp,
  Users,
} from "lucide-react";
import type { WorkbenchData } from "../domain/workbench";
import { ProjectCard } from "./ProjectCard";
import { ProjectDetail } from "./ProjectDetail";
import { ExistingProjectImport } from "./ExistingProjectImport";
import { NewProjectWizard } from "./NewProjectWizard";

interface ProjectManagementProps {
  data: WorkbenchData;
}

type ModalMode = "import" | "new" | null;

export function ProjectManagement({ data }: ProjectManagementProps) {
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [detailProjectId, setDetailProjectId] = useState<string | null>(null);

  const detailProject = useMemo(
    () => data.projects.find((p) => p.id === detailProjectId) ?? null,
    [data, detailProjectId]
  );

  const runningAgents = data.agentRuns.filter(
    (r) => r.status === "running" || r.status === "waiting_gate"
  ).length;
  const waitingGates = data.manualGates.filter((g) => g.status === "waiting").length;
  const doneTasks = data.tasks.filter((t) => t.status === "done").length;

  // Recent tasks across all projects
  const recentTasks = [...data.tasks]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  return (
    <div className="pm-v2-page">
      {/* Header */}
      <div className="pm-v2-header">
        <div className="pm-v2-header-left">
          <h2>项目看板</h2>
          <span>共 {data.projects.length} 个项目，{data.projects.filter((p) =>
            data.tasks.some((t) => t.projectId === p.id && (t.status === "running" || t.status === "gate"))
          ).length} 个活跃</span>
        </div>
        <div className="pm-v2-header-actions">
          <button className="btn btn-sm" onClick={() => setModalMode("import")} type="button">
            <Download size={14} /> 导入项目
          </button>
          <button className="btn primary btn-sm" onClick={() => setModalMode("new")} type="button">
            <Plus size={14} /> 新建项目
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="pm-v2-stats">
        <div className="pm-v2-stat-card">
          <div className="pm-v2-stat-icon blue">
            <FolderGit2 size={20} />
          </div>
          <div className="pm-v2-stat-info">
            <span className="pm-v2-stat-value">{data.projects.length}</span>
            <span className="pm-v2-stat-label">项目总数</span>
          </div>
        </div>
        <div className="pm-v2-stat-card">
          <div className="pm-v2-stat-icon green">
            <TrendingUp size={20} />
          </div>
          <div className="pm-v2-stat-info">
            <span className="pm-v2-stat-value">{runningAgents}</span>
            <span className="pm-v2-stat-label">运行中 Agent</span>
          </div>
        </div>
        <div className="pm-v2-stat-card">
          <div className="pm-v2-stat-icon orange">
            <AlertCircle size={20} />
          </div>
          <div className="pm-v2-stat-info">
            <span className="pm-v2-stat-value">{waitingGates}</span>
            <span className="pm-v2-stat-label">等待人工决策</span>
          </div>
        </div>
        <div className="pm-v2-stat-card">
          <div className="pm-v2-stat-icon violet">
            <CheckCircle2 size={20} />
          </div>
          <div className="pm-v2-stat-info">
            <span className="pm-v2-stat-value">{doneTasks}</span>
            <span className="pm-v2-stat-label">已完成任务</span>
          </div>
        </div>
      </div>

      {/* Project Board */}
      <div className="pm-v2-section">
        <h3 className="pm-v2-section-title">
          <Users size={14} /> 全部项目
        </h3>
        <div className="pm-v2-project-grid">
          {data.projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              data={data}
              onClick={() => setDetailProjectId(project.id)}
            />
          ))}
        </div>
      </div>

      {/* Recent Tasks */}
      <div className="pm-v2-section">
        <h3 className="pm-v2-section-title">
          <Activity size={14} /> 近期任务
        </h3>
        <div className="pm-v2-task-list">
          {recentTasks.length === 0 ? (
            <div className="empty-state">暂无任务</div>
          ) : (
            recentTasks.map((task) => {
              const project = data.projects.find((p) => p.id === task.projectId);
              const role = data.roles.find((r) => r.id === Object.values(task.roleAssignment)[0]);
              const statusLabel =
                task.status === "running" ? "运行中" :
                task.status === "gate" ? "等待决策" :
                task.status === "done" ? "已完成" :
                task.status === "failed" ? "失败" : task.status;
              const statusClass =
                task.status === "running" ? "running" :
                task.status === "gate" ? "gate" :
                task.status === "done" ? "done" :
                task.status === "failed" ? "failed" : "";
              return (
                <div key={task.id} className="pm-v2-task-item">
                  <span className={`pm-v2-task-status ${statusClass}`} />
                  <div className="pm-v2-task-info">
                    <span className="pm-v2-task-goal">{task.goal}</span>
                    <span className="pm-v2-task-project">{project?.name}</span>
                  </div>
                  <span className="pm-v2-task-role">
                    {role ? <span className="badge violet">{role.name}</span> : null}
                    <span className={`badge ${task.status === "running" ? "blue" : task.status === "gate" ? "orange" : task.status === "done" ? "green" : ""}`}>
                      {statusLabel}
                    </span>
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Import/New Modal */}
      {modalMode && (
        <div className="detail-overlay" onClick={() => setModalMode(null)}>
          <div className="pm-v2-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pm-v2-modal-header">
              <h3>{modalMode === "import" ? "导入项目" : "新建项目"}</h3>
              <button className="btn ghost btn-sm" onClick={() => setModalMode(null)} type="button">
                ✕
              </button>
            </div>
            <div className="pm-v2-modal-body">
              {modalMode === "import" && <ExistingProjectImport data={data} />}
              {modalMode === "new" && <NewProjectWizard data={data} />}
            </div>
          </div>
        </div>
      )}

      {/* Project Detail Overlay */}
      {detailProject && (
        <ProjectDetail
          project={detailProject}
          data={data}
          onClose={() => setDetailProjectId(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: 构建验证**

```powershell
npm --cache .npm-cache run build
```

预期：PASS。


### Task 4: CSS 样式

**文件：**
- 修改：`src/styles.css`

- [ ] **Step 1: 添加 PM V2 CSS**

找到项目管理相关 CSS 部分，替换/新增：

```css
/* ==============================
   Project Management V2
   ============================== */

.pm-v2-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px 32px;
  height: 100%;
  overflow-y: auto;
}

/* Header */
.pm-v2-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.pm-v2-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.pm-v2-header-left h2 {
  font-size: 16px;
  font-weight: 700;
  margin: 0;
}
.pm-v2-header-left span {
  color: var(--muted);
  font-size: 13px;
}
.pm-v2-header-actions {
  display: flex;
  gap: 8px;
}

/* Stats */
.pm-v2-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}
.pm-v2-stat-card {
  padding: 16px 18px;
  border: 1px solid var(--line-soft);
  border-radius: var(--radius);
  background: var(--surface);
  display: flex;
  align-items: center;
  gap: 14px;
}
.pm-v2-stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.pm-v2-stat-icon.blue { background: rgba(79, 140, 255, 0.12); color: var(--primary); }
.pm-v2-stat-icon.green { background: rgba(81, 214, 161, 0.10); color: var(--ok); }
.pm-v2-stat-icon.orange { background: rgba(242, 184, 91, 0.12); color: var(--warn); }
.pm-v2-stat-icon.violet { background: rgba(182, 151, 255, 0.12); color: var(--violet); }
.pm-v2-stat-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.pm-v2-stat-value {
  font-size: 22px;
  font-weight: 800;
  font-family: var(--mono);
}
.pm-v2-stat-label {
  font-size: 11.5px;
  color: var(--faint);
  font-weight: 600;
}

/* Section */
.pm-v2-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.pm-v2-section-title {
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
}

/* Project Grid */
.pm-v2-project-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

/* Project Card */
.project-card {
  border: 1px solid var(--line-soft);
  border-radius: var(--radius);
  background: var(--surface);
  overflow: hidden;
  cursor: pointer;
  transition: border-color 120ms, box-shadow 120ms;
}
.project-card:hover {
  border-color: var(--line);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}
.project-card-top {
  padding: 18px 20px;
  display: flex;
  align-items: flex-start;
  gap: 14px;
}
.project-card-avatar {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(79, 140, 255, 0.25), rgba(124, 219, 181, 0.15));
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 18px;
  color: var(--primary);
  flex-shrink: 0;
}
.project-card-info {
  flex: 1;
  min-width: 0;
}
.project-card-name {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 4px;
}
.project-card-meta {
  display: flex;
  gap: 10px;
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 10px;
}
.project-card-meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}
.project-card-progress-header {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  margin-bottom: 4px;
}
.project-card-progress-label {
  color: var(--muted);
}
.project-card-progress-val {
  color: var(--primary-2);
  font-weight: 700;
  font-family: var(--mono);
}
.project-card-progress-bar {
  height: 4px;
  background: var(--surface-3);
  border-radius: 2px;
  overflow: hidden;
}
.project-card-progress-fill {
  height: 100%;
  background: var(--primary-2);
  border-radius: 2px;
}
.project-card-bottom {
  padding: 12px 20px;
  border-top: 1px solid var(--line-soft);
  background: rgba(17, 20, 25, 0.3);
  display: flex;
  align-items: center;
  gap: 16px;
}
.project-card-stat {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--muted);
}
.project-card-stat.running { color: var(--primary); }
.project-card-stat.warn { color: var(--warn); }
.project-card-stat.ok { color: var(--ok); }

/* Task List */
.pm-v2-task-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.pm-v2-task-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border: 1px solid var(--line-soft);
  border-radius: 8px;
  background: var(--surface);
  transition: border-color 120ms;
}
.pm-v2-task-item:hover {
  border-color: var(--line);
}
.pm-v2-task-status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.pm-v2-task-status.running { background: var(--primary); box-shadow: 0 0 8px rgba(79, 140, 255, 0.4); }
.pm-v2-task-status.gate { background: var(--warn); box-shadow: 0 0 8px rgba(242, 184, 91, 0.4); }
.pm-v2-task-status.done { background: var(--ok); }
.pm-v2-task-status.failed { background: var(--danger); }
.pm-v2-task-info {
  flex: 1;
  min-width: 0;
}
.pm-v2-task-goal {
  font-size: 13px;
  font-weight: 600;
  display: block;
}
.pm-v2-task-project {
  font-size: 11px;
  color: var(--faint);
  margin-top: 1px;
  display: block;
}
.pm-v2-task-role {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

/* Modal for import/new */
.pm-v2-modal {
  width: 90vw;
  max-width: 800px;
  max-height: 85vh;
  overflow-y: auto;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 12px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
}
.pm-v2-modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--line-soft);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.pm-v2-modal-header h3 {
  font-size: 15px;
  font-weight: 700;
  margin: 0;
}
.pm-v2-modal-body {
  padding: 20px;
}

/* ====== Detail Overlay & Panel ====== */
.detail-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
}
.detail-panel {
  width: 90vw;
  max-width: 1000px;
  height: 85vh;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 12px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.detail-header {
  padding: 16px 24px;
  border-bottom: 1px solid var(--line-soft);
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
}
.detail-header-avatar {
  width: 42px;
  height: 42px;
  border-radius: 9px;
  background: linear-gradient(135deg, rgba(79, 140, 255, 0.3), rgba(124, 219, 181, 0.15));
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 16px;
  color: var(--primary);
}
.detail-header-info {
  flex: 1;
}
.detail-header-name {
  font-size: 16px;
  font-weight: 700;
}
.detail-header-meta {
  font-size: 12px;
  color: var(--muted);
  display: flex;
  gap: 6px;
}
.detail-tabs {
  padding: 0 24px;
  border-bottom: 1px solid var(--line-soft);
  display: flex;
  gap: 0;
  flex-shrink: 0;
}
.detail-tab {
  padding: 10px 16px;
  border: none;
  background: none;
  color: var(--muted);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color 120ms, border-color 120ms;
  display: flex;
  align-items: center;
  gap: 6px;
}
.detail-tab:hover {
  color: var(--text);
}
.detail-tab.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}
.detail-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

/* Detail mini list */
.detail-mini-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.detail-mini-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border: 1px solid var(--line-soft);
  border-radius: 7px;
  background: rgba(32, 36, 43, 0.4);
}
.detail-mini-avatar {
  width: 30px;
  height: 30px;
  border-radius: 7px;
  background: linear-gradient(135deg, rgba(182, 151, 255, 0.35), rgba(79, 140, 255, 0.25));
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 800;
  color: var(--violet);
  flex-shrink: 0;
}
.detail-section {
  padding: 0;
}
.detail-section h4 {
  font-size: 13px;
  font-weight: 700;
  color: var(--muted);
  margin-bottom: 8px;
}
.detail-section-value {
  font-size: 13px;
  color: var(--text);
}
.detail-settings-grid {
  display: grid;
  gap: 8px;
}
.detail-setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border: 1px solid var(--line-soft);
  border-radius: 7px;
  background: rgba(32, 36, 43, 0.4);
}
.detail-setting-label {
  font-size: 13px;
  color: var(--muted);
  font-weight: 500;
}
.detail-setting-row code {
  font-family: var(--mono);
  font-size: 12px;
  color: #cfdaeb;
  background: none;
}

/* Responsive */
@media (max-width: 1024px) {
  .pm-v2-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .pm-v2-project-grid {
    grid-template-columns: 1fr;
  }
  .detail-panel {
    width: 95vw;
    height: 90vh;
  }
}

@media (max-width: 760px) {
  .pm-v2-page {
    padding: 16px;
  }
  .pm-v2-stats {
    grid-template-columns: 1fr;
  }
  .detail-tabs {
    overflow-x: auto;
    padding: 0 12px;
  }
  .detail-tab {
    flex-shrink: 0;
    font-size: 12px;
    padding: 8px 12px;
  }
}
```

- [ ] **Step 2: 构建验证**

```powershell
npm --cache .npm-cache run build
```

预期：PASS。


### Task 5: 测试

**文件：**
- 创建：`src/__tests__/project-management-v2.test.tsx`

- [ ] **Step 1: 编写测试**

```typescript
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { ProjectManagement } from "../components/ProjectManagement";
import { WorkbenchContext } from "../App";
import { workbenchData } from "../data/fixtures";

function mockProvider() {
  const mockState = {
    data: workbenchData,
    updateGateStatus: () => {},
    reassignAgentRun: () => {},
    addMemory: () => {},
    updateMemory: () => {},
    deleteMemory: () => {},
    createTask: () => {},
    addProject: () => {},
    updateWorkflowStep: () => {},
    addModelProvider: () => {},
    updateModelProvider: () => {},
    deleteModelProvider: () => {},
    addProviderModel: () => {},
    deleteProviderModel: () => {},
    setDefaultProviderModel: () => {},
  };
  function Wrapper({ children }: { children: ReactNode }) {
    return <WorkbenchContext.Provider value={mockState}>{children}</WorkbenchContext.Provider>;
  }
  return Wrapper;
}

describe("Project Management V2", () => {
  it("renders dashboard header with stats", () => {
    const Wrapper = mockProvider();
    render(<ProjectManagement data={workbenchData} />, { wrapper: Wrapper });
    expect(screen.getByText("项目看板")).toBeInTheDocument();
    expect(screen.getByText("项目总数")).toBeInTheDocument();
    expect(screen.getByText("运行中 Agent")).toBeInTheDocument();
    expect(screen.getByText("等待人工决策")).toBeInTheDocument();
    expect(screen.getByText("已完成任务")).toBeInTheDocument();
  });

  it("renders import and new project buttons", () => {
    const Wrapper = mockProvider();
    render(<ProjectManagement data={workbenchData} />, { wrapper: Wrapper });
    expect(screen.getByRole("button", { name: /导入项目/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /新建项目/ })).toBeInTheDocument();
  });

  it("renders project cards with names", () => {
    const Wrapper = mockProvider();
    render(<ProjectManagement data={workbenchData} />, { wrapper: Wrapper });
    expect(screen.getByText("Agent Management")).toBeInTheDocument();
  });

  it("shows progress bars on project cards", () => {
    const Wrapper = mockProvider();
    render(<ProjectManagement data={workbenchData} />, { wrapper: Wrapper });
    const progressBars = document.querySelectorAll(".project-card-progress-bar");
    expect(progressBars.length).toBeGreaterThanOrEqual(1);
  });

  it("renders recent tasks section", () => {
    const Wrapper = mockProvider();
    render(<ProjectManagement data={workbenchData} />, { wrapper: Wrapper });
    expect(screen.getByText("近期任务")).toBeInTheDocument();
  });

  it("clicking project card opens detail panel", () => {
    const Wrapper = mockProvider();
    render(<ProjectManagement data={workbenchData} />, { wrapper: Wrapper });
    // Before click: no detail panel
    expect(screen.queryByText("绑定工作流")).not.toBeInTheDocument();
    // Click project card
    const projectCards = document.querySelectorAll(".project-card");
    fireEvent.click(projectCards[0]);
    // After click: detail panel visible with tabs
    expect(screen.getByText("Issues")).toBeInTheDocument();
    expect(screen.getByText("Pull Requests")).toBeInTheDocument();
    expect(screen.getByText("CI/CD")).toBeInTheDocument();
  });

  it("close button dismisses detail panel", () => {
    const Wrapper = mockProvider();
    render(<ProjectManagement data={workbenchData} />, { wrapper: Wrapper });
    // Open detail
    const projectCards = document.querySelectorAll(".project-card");
    fireEvent.click(projectCards[0]);
    expect(screen.getByText("Issues")).toBeInTheDocument();
    // Click close (X button in detail header)
    const closeBtn = screen.getByRole("button", { name: "关闭" });
    fireEvent.click(closeBtn);
    // Detail closed
    expect(screen.queryByText("Issues")).not.toBeInTheDocument();
  });

  it("clicking overlay backdrop closes detail", () => {
    const Wrapper = mockProvider();
    render(<ProjectManagement data={workbenchData} />, { wrapper: Wrapper });
    // Open detail
    fireEvent.click(document.querySelectorAll(".project-card")[0]);
    expect(screen.getByText("Issues")).toBeInTheDocument();
    // Click overlay
    fireEvent.click(document.querySelector(".detail-overlay")!);
    // Detail closed
    expect(screen.queryByText("Issues")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行测试**

```powershell
npm --cache .npm-cache test -- project-management-v2
```

预期：8 个测试通过。

- [ ] **Step 3: 全量测试**

```powershell
npm --cache .npm-cache test
npm --cache .npm-cache run build
```

预期：全部通过。
