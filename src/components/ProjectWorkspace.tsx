import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  FileText,
  FolderGit2,
  GitBranch as GitBranchIcon,
  Grid3X3,
  History,
  RefreshCw,
  Send,
  Settings,
  ShieldCheck,
  Activity,
  Brain,
} from "lucide-react";
import type { WorkbenchData } from "../domain/workbench";
import type { WorkflowStep } from "../domain/workflow";
import { useWorkbenchState } from "../App";
import { GateDecisionPanel } from "./GateDecisionPanel";
import { AgentSettingsPanel } from "./AgentSettingsPanel";
import { PwContextPanel } from "./PwContextPanel";
import { PwSettingsPanel } from "./PwSettingsPanel";
import { PwProgressDashboard } from "./PwProgressDashboard";
import { PwMemoryPanel } from "./PwMemoryPanel";
import { PwIssuesPanel, PwCiPanel, PwBranchPanel, PwCommitPanel } from "./PwGitPanels";
import { PwProjectMdPanel } from "./PwProjectMdPanel";
import { PwRunnerPanel } from "./PwRunnerPanel";
import type { RunnerProfile } from "../domain/runner";

interface ProjectWorkspaceProps {
  data: WorkbenchData;
  projectId: string;
  onBack: () => void;
}

type AgentRole = "pm" | "design" | "fe" | "review" | "qa";

// Single source of truth for agent roles
const AGENT_ROLES: Record<AgentRole, { id: string; label: string; fullName: string }> = {
  pm: { id: "role-001", label: "产品经理", fullName: "产品经理" },
  design: { id: "role-002", label: "设计师", fullName: "UI/UX 设计师" },
  fe: { id: "role-003", label: "前端工程师", fullName: "前端工程师" },
  review: { id: "role-004", label: "审查员", fullName: "代码审查员" },
  qa: { id: "role-005", label: "测试工程师", fullName: "测试工程师" },
};

const AGENT_AVATARS: Record<AgentRole, { label: string; color: string }> = {
  pm: { label: "产", color: "pm" },
  design: { label: "设", color: "design" },
  fe: { label: "前", color: "fe" },
  review: { label: "审", color: "review" },
  qa: { label: "测", color: "qa" },
};

// Mock chat messages for demo
const MOCK_CHAT_MESSAGES = [
  {
    id: "1",
    role: "agent" as const,
    agentType: "pm" as AgentRole,
    name: "产品经理 (Agent)",
    content:
      "我已完成了项目需求分析。V1 范围是个人本地 Web MVP，核心页面包括：项目接入、任务创建、工作流编辑、人工决策、记忆管理。",
    extra: "验收标准：5 个页面可完整走通流程，支持工作流步骤编辑和人工决策闭环。",
    memory: "已自动写入项目记忆 — \"V1产品需求规格\"",
    time: "06:30",
  },
  {
    id: "2",
    role: "user" as const,
    name: "我",
    content: "同意需求分析结果。请继续推进 UI/UX 设计阶段，参考 ui-ux-pro-max 设计规范。",
    time: "06:32",
  },
  {
    id: "3",
    role: "agent" as const,
    agentType: "pm" as AgentRole,
    name: "产品经理 (Agent)",
    content: "收到。已将你的反馈记录为项目记忆，后续步骤会参考此决策。任务已转交给 UI/UX 设计师。",
    time: "06:33",
  },
];

// Build document index from real files via Vite glob imports
// NOTE: Eager glob imports for MVP fixtures-based approach. In production, use lazy loading with Suspense.
const specModules = import.meta.glob("/docs/superpowers/specs/*.md", {
  eager: true,
  query: "?url",
});
const planModules = import.meta.glob("/docs/superpowers/plans/*.md", {
  eager: true,
  query: "?url",
});
const statusModules = import.meta.glob("/docs/superpowers/status/*.md", {
  eager: true,
  query: "?url",
});
const mockupModules = import.meta.glob("/mockups/*.html", {
  eager: true,
  query: "?url",
});

type DocType = "doc" | "spec" | "plan" | "mockup";

type DocEntry = {
  name: string;
  type: DocType;
  badge: string;
  date: string | null;
};

function extractName(path: string): string {
  return path.split("/").pop() ?? path;
}

function extractDate(filename: string): string | null {
  const m = filename.match(/^(\d{4}-\d{2}-\d{2})-/);
  return m ? m[1] : null;
}

function buildDocIndex(): DocEntry[] {
  const docs: DocEntry[] = [];
  for (const path of Object.keys(specModules)) {
    const name = extractName(path);
    docs.push({ name, type: "spec", badge: "设计", date: extractDate(name) });
  }
  for (const path of Object.keys(planModules)) {
    const name = extractName(path);
    docs.push({ name, type: "plan", badge: "计划", date: extractDate(name) });
  }
  for (const path of Object.keys(statusModules)) {
    const name = extractName(path);
    docs.push({ name, type: "doc", badge: "检查点", date: extractDate(name) });
  }
  for (const path of Object.keys(mockupModules)) {
    const name = extractName(path);
    docs.push({ name, type: "mockup", badge: "效果", date: extractDate(name) });
  }
  return docs;
}

const DOCUMENTS: DocEntry[] = buildDocIndex();

const DOC_CATEGORIES: { type: DocType; label: string; dotClass: string }[] = [
  { type: "spec", label: "设计", dotClass: "spec" },
  { type: "plan", label: "计划", dotClass: "plan" },
  { type: "doc", label: "检查点", dotClass: "doc" },
  { type: "mockup", label: "效果", dotClass: "mockup" },
];

// Mock logs for demo
const MOCK_LOGS = [
  { time: "06:00", status: "info" as const, message: "Agent 启动" },
  { time: "06:30", status: "ok" as const, message: "步骤完成：需求分析" },
  { time: "07:15", status: "ok" as const, message: "步骤完成：UI/UX 设计" },
  { time: "08:30", status: "ok" as const, message: "步骤完成：前端开发" },
  { time: "08:30", status: "warn" as const, message: "等待决策 — 代码审查" },
  { time: "08:31", status: "info" as const, message: "Diff: 2 files · Test: 21/0 passed" },
];

// SVG ring progress constants - module scope for stability
const RING_RADIUS = 30;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function ProjectWorkspace({ data, projectId, onBack }: ProjectWorkspaceProps) {
  const { updateProject } = useWorkbenchState();
  const [activeAgent, setActiveAgent] = useState<AgentRole>("pm");
  const [chatInput, setChatInput] = useState("");
  const [showGatePanel, setShowGatePanel] = useState(false);
  const [showAgentSettings, setShowAgentSettings] = useState(false);
  const [expandedDocType, setExpandedDocType] = useState<DocType | null>("spec");
  const [showProjectMd, setShowProjectMd] = useState(false);
  const [showProgressDashboard, setShowProgressDashboard] = useState(false);
  const [showMemoryPanel, setShowMemoryPanel] = useState(false);
  const [showGitPanel, setShowGitPanel] = useState(false);
  const [showIssuesPanel, setShowIssuesPanel] = useState(false);
  const [showCiPanel, setShowCiPanel] = useState(false);
  const [selectedModelKey, setSelectedModelKey] = useState<string>("DeepSeek / v4-pro");
  const [selectedRunnerId, setSelectedRunnerId] = useState<string | undefined>(undefined);
  const [showContextPanel, setShowContextPanel] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showBranchPanel, setShowBranchPanel] = useState(false);
  const [showCommitPanel, setShowCommitPanel] = useState(false);

  // Git sync state (initialized after project is available)
  const [syncStatus, setSyncStatus] = useState<string>("idle");
  const [lastSyncAt, setLastSyncAt] = useState<string | undefined>(undefined);

  const project = data.projects.find((p) => p.id === projectId);

  const activeRoleData = useMemo(() => {
    return data.roles.find((r) => r.id === AGENT_ROLES[activeAgent].id);
  }, [activeAgent, data.roles]);

  const projectMd = useMemo(() => {
    if (project?.projectMarkdown?.trim()) return project.projectMarkdown;
    if (!project) return "";
    return `# ${project.name}

**仓库：** ${project.repoPath}
**分支：** ${project.defaultBranch}
**技术栈：** ${project.settings.detectedStack || "未检测"}

## 命令
- 安装：\`${project.settings.installCommand}\`
- 测试：\`${project.settings.testCommand}\`
- 构建：\`${project.settings.buildCommand}\`
- 预览：\`${project.settings.previewCommand}\`

## ⚠️ 风险摘要
${project.settings.riskSummary || "尚未评估"}`;
  }, [project]);

  // Group documents by type, sorted by date new→old (null dates last)
  const docsByType = useMemo(() => {
    const map: Record<DocType, DocEntry[]> = { spec: [], plan: [], doc: [], mockup: [] };
    for (const doc of DOCUMENTS) {
      map[doc.type].push(doc);
    }
    for (const arr of Object.values(map)) {
      arr.sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return b.date.localeCompare(a.date);
      });
    }
    return map;
  }, []);

  // Find current task for this project
  const currentTask = useMemo(() => {
    return data.tasks.find(
      (t) => t.projectId === projectId && (t.status === "running" || t.status === "gate")
    );
  }, [data.tasks, projectId]);

  // Find active run
  const activeRun = useMemo(() => {
    if (!currentTask?.activeRunId) return null;
    return data.agentRuns.find((r) => r.id === currentTask.activeRunId);
  }, [data.agentRuns, currentTask]);

  // Get workflow template
  const template = useMemo(() => {
    if (!currentTask) return null;
    return data.workflowTemplates.find((t) => t.id === currentTask.workflowTemplateId);
  }, [data.workflowTemplates, currentTask]);

  // Find waiting gate
  const waitingGate = useMemo(() => {
    return data.manualGates.find((g) => g.status === "waiting" && g.taskId === currentTask?.id);
  }, [data.manualGates, currentTask]);

  // Calculate stats
  const stats = useMemo(() => {
    const runningAgents = data.agentRuns.filter(
      (r) => r.status === "running" && data.tasks.find((t) => t.id === r.taskId)?.projectId === projectId
    ).length;
    const waitingGates = data.manualGates.filter(
      (g) => g.status === "waiting" && data.tasks.find((t) => t.id === g.taskId)?.projectId === projectId
    ).length;
    const completedSteps = template
      ? template.steps.filter((step) => {
          const stepRun = data.agentRuns.find(
            (r) => r.currentStepId === step.id && r.status === "done"
          );
          return stepRun;
        }).length
      : 0;
    const projectMemories = data.memories.filter(
      (m) => m.kind === "project" && m.projectId === projectId
    ).length;
    return { runningAgents, waitingGates, completedSteps, projectMemories };
  }, [data, projectId, template]);

  // Total steps for progress calculation
  const totalSteps = template?.steps.length ?? 5;
  const progressPct = totalSteps > 0 ? Math.round((stats.completedSteps / totalSteps) * 100) : 0;

  // Determine step status
  const getStepStatus = (step: WorkflowStep): "done" | "active" | "pending" => {
    if (!activeRun) return "pending";
    if (activeRun.currentStepId === step.id) return "active";
    // Check if this step was already completed
    const stepOrder = template?.steps.findIndex((s) => s.id === step.id) ?? 0;
    const currentStepOrder = template?.steps.findIndex((s) => s.id === activeRun.currentStepId) ?? -1;
    if (stepOrder < currentStepOrder) return "done";
    return "pending";
  };

  // Get role name for step
  const getRoleName = (roleId: string): string => {
    const role = data.roles.find((r) => r.id === roleId);
    return role?.name ?? "未知角色";
  };

  // Filter issues by current project's remote repo
  const projectIssues = useMemo(() => {
    if (!project?.remoteRepo) return [];
    return data.repoIssues.filter(
      (issue) =>
        issue.platform === project.remoteRepo?.platform &&
        issue.repoOwner === project.remoteRepo?.repoOwner &&
        issue.repoName === project.remoteRepo?.repoName
    );
  }, [data.repoIssues, project?.remoteRepo]);

  // Filter CI pipelines by current project's remote repo
  const projectCiPipelines = useMemo(() => {
    if (!project?.remoteRepo) return [];
    return data.ciPipelines.filter(
      (ci) =>
        ci.platform === project.remoteRepo?.platform &&
        ci.repoOwner === project.remoteRepo?.repoOwner &&
        ci.repoName === project.remoteRepo?.repoName
    );
  }, [data.ciPipelines, project?.remoteRepo]);

  // Find git status for current project
  const gitStatus = useMemo(() => {
    return data.gitStatuses.find((s) => s.projectId === projectId);
  }, [data.gitStatuses, projectId]);

  // Filter branches for current project
  const projectBranches = useMemo(() => {
    return data.gitBranches.filter((b) => b.projectId === projectId);
  }, [data.gitBranches, projectId]);

  // Filter commits for current project
  const projectCommits = useMemo(() => {
    return data.repoCommits.filter((c) => c.projectId === projectId);
  }, [data.repoCommits, projectId]);

  // Git sync handler
  const handleSync = () => {
    if (!project?.remoteRepo?.syncEnabled) return;
    setSyncStatus("syncing");
    // Simulated sync - in Phase 2 would call real Git API
    setTimeout(() => {
      const now = new Date().toISOString();
      setSyncStatus("success");
      setLastSyncAt(now);
      // Update project data via reducer
      if (project?.remoteRepo) {
        updateProject(projectId, {
          remoteRepo: {
            ...project.remoteRepo,
            syncStatus: "success",
            lastSyncAt: now,
          },
        });
      }
    }, 1500);
  };

  // SVG ring progress - use module-level constants
  const ringOffset = RING_CIRCUMFERENCE - (progressPct / 100) * RING_CIRCUMFERENCE;

  if (!project) {
    return (
      <div className="project-workspace-page">
        <div className="pw-empty">
          <FolderGit2 size={48} />
          <h2>项目未找到</h2>
          <p>请选择一个有效的项目</p>
          <button className="btn primary" onClick={onBack}>
            <ArrowLeft size={16} /> 返回项目看板
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="project-workspace-page">
      {/* Top Bar */}
      <header className="pw-topbar">
        <div className="pw-topbar-left">
          <button className="pw-back-btn" onClick={onBack} title="返回项目管理">
            <ArrowLeft size={18} />
          </button>
          <div className="pw-project-info">
            <div className="pw-project-avatar">
              {project.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <span className="pw-project-name">{project.name}</span>
              <span className="pw-project-meta">
                {project.defaultBranch} · {project.settings.detectedStack || "未检测"}
              </span>
            </div>
          </div>
          <div className="pw-project-actions">
            <button
              className="pw-quick-btn-sm"
              onClick={() => setShowSettingsPanel(true)}
              type="button"
              title="项目设置"
            >
              <Settings size={14} />
              <span>设置</span>
            </button>
            <button
              className="pw-quick-btn-sm"
              onClick={() => setShowProjectMd(true)}
              type="button"
              title="项目指令"
            >
              <FileText size={14} />
              <span>项目指令</span>
            </button>
          </div>
        </div>
        <div className="pw-topbar-right">
          <button
            className={`pw-quick-btn ${waitingGate ? "has-alert" : ""}`}
            onClick={() => setShowGatePanel(true)}
          >
            <ShieldCheck size={14} />
            <span>人工决策</span>
            {waitingGate && <span className="pw-alert-dot" />}
          </button>
          <button
            className="pw-quick-btn pw-memory-btn"
            onClick={() => setShowMemoryPanel(true)}
            type="button"
            title="查看项目记忆"
          >
            <Brain size={14} />
            <span>项目记忆</span>
          </button>
          <span className="pw-topbar-divider" />
          {/* Git Panel Button */}
          <div style={{ position: "relative" }}>
            <button
              className="pw-quick-btn"
              onClick={() => setShowGitPanel(!showGitPanel)}
              type="button"
              title="Git 操作"
            >
              <FolderGit2 size={14} />
              <span>Git</span>
              {syncStatus === "syncing" && <RefreshCw size={12} className="spin" />}
              {syncStatus === "success" && <span className="pw-sync-ok">✓</span>}
              {syncStatus === "failed" && <span className="pw-sync-fail">✗</span>}
            </button>
            {showGitPanel && (
              <div className="pw-git-menu">
                <button
                  className="pw-git-menu-item"
                  onClick={() => { setShowGitPanel(false); setShowBranchPanel(true); }}
                  type="button"
                >
                  <GitBranchIcon size={14} />
                  <span>分支</span>
                  <span className="pw-badge-count">{projectBranches.length}</span>
                </button>
                <button
                  className="pw-git-menu-item"
                  onClick={() => { setShowGitPanel(false); setShowCommitPanel(true); }}
                  type="button"
                >
                  <History size={14} />
                  <span>提交</span>
                  <span className="pw-badge-count">{projectCommits.length}</span>
                </button>
                <div className="pw-git-menu-divider" />
                <button
                  className="pw-git-menu-item"
                  onClick={() => { if (project?.remoteRepo) { setShowGitPanel(false); setShowIssuesPanel(true); }}}
                  disabled={!project?.remoteRepo}
                  type="button"
                >
                  <Grid3X3 size={14} />
                  <span>Issues</span>
                  {project?.remoteRepo && <span className="pw-badge-count">{projectIssues.length}</span>}
                </button>
                <button
                  className="pw-git-menu-item"
                  onClick={() => { if (project?.remoteRepo) { setShowGitPanel(false); setShowCiPanel(true); }}}
                  disabled={!project?.remoteRepo}
                  type="button"
                >
                  <Activity size={14} />
                  <span>CI</span>
                  {project?.remoteRepo && <span className="pw-badge-count">{projectCiPipelines.length}</span>}
                </button>
                {project?.remoteRepo?.syncEnabled && (
                  <>
                    <div className="pw-git-menu-divider" />
                    <button
                      className={`pw-git-menu-item ${syncStatus === "syncing" ? "syncing" : ""}`}
                      onClick={() => { handleSync(); }}
                      disabled={syncStatus === "syncing"}
                      type="button"
                    >
                      <RefreshCw size={14} className={syncStatus === "syncing" ? "spin" : ""} />
                      <span>{syncStatus === "syncing" ? "同步中..." : "同步 Git"}</span>
                    </button>
                    {lastSyncAt && (
                      <span className="pw-git-sync-meta">
                        上次: {new Date(lastSyncAt).toLocaleString("zh-CN")}
                      </span>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main 2-column layout */}
      <div className="pw-main">
        {/* LEFT: Progress + Panels */}
        <div className="pw-left-col">
          {/* Progress Overview Card */}
          <div className="pw-progress-card">
            {/* Ring Progress - clickable */}
            <div
              className="pw-progress-ring"
              onClick={() => setShowProgressDashboard(true)}
              title="点击查看总体进度仪表盘"
            >
              <svg width="76" height="76" viewBox="0 0 76 76">
                <circle
                  cx="38" cy="38" r={RING_RADIUS}
                  fill="none"
                  stroke="var(--line-soft)"
                  strokeWidth="8"
                />
                <circle
                  cx="38" cy="38" r={RING_RADIUS}
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={ringOffset}
                  style={{ transition: "stroke-dashoffset 0.3s ease" }}
                />
              </svg>
              <div className="pw-progress-ring-text">
                <div className="pw-progress-ring-pct">{progressPct}%</div>
              </div>
            </div>

            {/* Progress Bars - 2 column grid */}
            <div className="pw-progress-detail">
            <div className="pw-progress-bars">
              <div className="pw-progress-bar-row">
                <span className="pw-progress-bar-label">已完成</span>
                <div className="pw-progress-bar-track">
                  <div
                    className="pw-progress-bar-fill ok"
                    style={{ width: `${(stats.completedSteps / totalSteps) * 100}%` }}
                  />
                </div>
                <span className="pw-progress-bar-val" style={{ color: "var(--ok)" }}>{stats.completedSteps}/{totalSteps}</span>
              </div>
              <div className="pw-progress-bar-row">
                <span className="pw-progress-bar-label">运行中</span>
                <div className="pw-progress-bar-track">
                  <div
                    className="pw-progress-bar-fill running"
                    style={{ width: `${stats.runningAgents > 0 ? 100 : 0}%` }}
                  />
                </div>
                <span className="pw-progress-bar-val" style={{ color: "var(--primary)" }}>{stats.runningAgents}</span>
              </div>
              <div className="pw-progress-bar-row">
                <span className="pw-progress-bar-label">待决策</span>
                <div className="pw-progress-bar-track">
                  <div
                    className="pw-progress-bar-fill warn"
                    style={{ width: `${stats.waitingGates > 0 ? 100 : 0}%` }}
                  />
                </div>
                <span className="pw-progress-bar-val" style={{ color: "var(--amber, #f0b35a)" }}>{stats.waitingGates}</span>
              </div>
              <div className="pw-progress-bar-row">
                <span className="pw-progress-bar-label">记忆</span>
                <div className="pw-progress-bar-track">
                  <div
                    className="pw-progress-bar-fill violet"
                    style={{ width: `${Math.min(stats.projectMemories * 20, 100)}%` }}
                  />
                </div>
                <span className="pw-progress-bar-val" style={{ color: "var(--violet)" }}>{stats.projectMemories}</span>
              </div>
            </div>

            {/* Current Stage Banner */}
            <div className="pw-current-stage">
              <span className="pw-pulse-dot" />
              <span className="pw-current-stage-text">
                <strong>步骤 {Math.min(stats.completedSteps + 1, totalSteps)}</strong> · {template?.steps[Math.min(stats.completedSteps, totalSteps - 1)]?.name ?? "进行中"}
                {stats.waitingGates > 0 && " — 等待人工决策"}
              </span>
            </div>
            </div>
          </div>

          {/* Git Status Card */}
          {gitStatus && (
            <div className="pw-git-status-card">
              <div className="pw-git-status-header">
                <FolderGit2 size={14} />
                <span className="pw-git-branch-name">{gitStatus.branch}</span>
                <div className="pw-git-ahead-behind">
                  <span className="pw-git-ahead">↑{gitStatus.ahead}</span>
                  <span className="pw-git-behind">↓{gitStatus.behind}</span>
                </div>
              </div>
              <div className="pw-git-status-stats">
                <div className="pw-git-stat">
                  <span className="pw-git-stat-val changed">{gitStatus.changedFiles}</span>
                  <span className="pw-git-stat-label">改动</span>
                </div>
                <div className="pw-git-stat">
                  <span className="pw-git-stat-val untracked">{gitStatus.untracked}</span>
                  <span className="pw-git-stat-label">未跟踪</span>
                </div>
              </div>
              <div className="pw-git-last-commit">
                <code className="pw-git-sha">{gitStatus.lastCommitSha}</code>
                <span className="pw-git-msg">{gitStatus.lastCommitMessage.length > 40 ? gitStatus.lastCommitMessage.slice(0, 40) + "…" : gitStatus.lastCommitMessage}</span>
              </div>
            </div>
          )}

          {/* CLI Runner Panel */}
          <PwRunnerPanel
            projectId={projectId}
            projectPath={project.repoPath}
            runnerProfiles={data.runnerProfiles.filter((r) => r.enabled)}
          />

          {/* 4-Panel Grid: TODO + Stepper + Docs + Log */}
          <div className="pw-panels-grid">
            {/* TODO List */}
            <div className="pw-panel-card">
              <div className="pw-panel-header">
                <span className="pw-panel-header-title">
                  <span className="pw-panel-dot blue" /> 待办清单
                </span>
                <span style={{ fontSize: 10, color: "var(--faint)" }}>{stats.completedSteps} / {totalSteps} 完成</span>
              </div>
              <div className="pw-panel-body">
                <div className="pw-todo-list">
                  {template?.steps.map((step) => {
                    const status = getStepStatus(step);
                    const roleName = getRoleName(step.roleId);
                    return (
                      <div key={step.id} className={`pw-todo-item ${status}`}>
                        <div className={`pw-todo-check ${status === "done" ? "done" : ""}`} />
                        <div className="pw-todo-text">
                          <div className={`pw-todo-title ${status === "done" ? "done" : ""}`}>{step.name}</div>
                          <div className="pw-todo-meta">
                            <span>{roleName}</span>
                            <span>步骤 {template.steps.indexOf(step) + 1}</span>
                          </div>
                        </div>
                        {status === "done" && <span className="pw-todo-badge green">✓</span>}
                        {status === "active" && <span className="pw-todo-badge amber">决策中</span>}
                        {status === "pending" && <span className="pw-todo-badge faint">待开始</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Current Task + Workflow Stepper */}
            <div className="pw-panel-card pw-task-panel">
              <div className="pw-panel-header">
                <span className="pw-panel-header-title">
                  <span className="pw-panel-dot green" /> 当前任务：{currentTask?.goal ?? "无"}
                </span>
              </div>
              <div className="pw-panel-body pw-task-body">
                {template && (
                  <div className="pw-stepper-scroll">
                    {template.steps.map((step, index) => {
                      const status = getStepStatus(step);
                      return (
                        <div key={step.id} className="pw-step-wrap">
                          <div className={`pw-step-node ${status}`}>
                            <div className="pw-step-num">
                              {status === "done" ? "✓" : String(index + 1).padStart(2, "0")}
                            </div>
                            <div className="pw-step-name">{step.name}</div>
                            <div className="pw-step-role">{getRoleName(step.roleId)}</div>
                            {status === "active" && step.gateMode === "manual" && (
                              <span className="pw-step-gate manual">等待决策</span>
                            )}
                            {status === "active" && step.gateMode === "auto" && (
                              <span className="pw-step-gate auto">自动</span>
                            )}
                          </div>
                          {index < template.steps.length - 1 && (
                            <div className={`pw-step-conn${status === "done" ? " done" : ""}${status === "active" ? " active-conn" : ""}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Document Index Panel */}
            <div className="pw-panel-card pw-doc-panel-v2">
              <div className="pw-panel-header">
                <span className="pw-panel-header-title">
                  <FileText size={12} />
                  协同文件 & 设计文档
                </span>
              </div>

              {/* Category tabs */}
              <div className="pw-doc-categories">
                {DOC_CATEGORIES.map((cat) => {
                  const count = docsByType[cat.type].length;
                  const isActive = expandedDocType === cat.type;
                  return (
                    <button
                      key={cat.type}
                      className={`pw-doc-cat ${isActive ? "active" : ""}${count === 0 ? " empty" : ""}`}
                      onClick={() => setExpandedDocType(isActive ? null : cat.type)}
                      disabled={count === 0}
                      type="button"
                    >
                      <span className={`pw-doc-dot ${cat.dotClass}`} />
                      <span>{cat.label}</span>
                      <span className="pw-doc-count">{count}</span>
                      {isActive ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                    </button>
                  );
                })}
              </div>

              {/* Expanded file list */}
              {expandedDocType && (
                <div className="pw-doc-list">
                  {docsByType[expandedDocType].map((doc) => (
                    <div key={doc.name} className="pw-doc-row">
                      <span className={`pw-doc-dot ${doc.type}`} />
                      <span className="pw-doc-name">{doc.name}</span>
                      {doc.date && <span className="pw-doc-date">{doc.date}</span>}
                      <span className={`pw-doc-badge ${doc.type}`}>{doc.badge}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Agent Run Log */}
            <div className="pw-panel-card pw-log-panel-v2">
              <div className="pw-panel-header">
                <span className="pw-panel-header-title">
                  <span className="pw-panel-dot amber" />
                  Agent 运行日志
                </span>
              </div>
              <div className="pw-panel-body">
                <div className="pw-log-list">
                  {MOCK_LOGS.map((log) => (
                    <div key={`${log.time}-${log.message}`}>
                      <span className="pw-log-time">{log.time}</span>
                      {log.status === "ok" && <span className="pw-log-ok">✓</span>}
                      {log.status === "warn" && <span className="pw-log-warn">⚠</span>}
                      <span className="pw-log-msg">{log.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Agent Chat */}
        <div className="pw-right-col">
          {/* Agent list */}
          <div className="pw-agent-list">
            {(["pm", "design", "fe", "review", "qa"] as AgentRole[]).map((role) => {
              const avatar = AGENT_AVATARS[role];
              const isOnline =
                activeRun &&
                template?.steps.find((s) => s.id === activeRun.currentStepId)?.roleId ===
                  AGENT_ROLES[role].id;
              return (
                <button
                  key={role}
                  className={`pw-agent-item ${activeAgent === role ? "active" : ""}`}
                  onClick={() => setActiveAgent(role)}
                >
                  <div className={`pw-agent-avatar ${avatar.color}`}>
                    {avatar.label}
                  </div>
                  <span>{AGENT_ROLES[role].label}</span>
                  <span className={`pw-agent-dot ${isOnline ? "online" : ""}`} />
                </button>
              );
            })}
          </div>

          {/* Active Agent Info */}
          <div className="pw-agent-info">
            <div className="pw-agent-left">
              <div
                className={`pw-agent-avatar ${AGENT_AVATARS[activeAgent].color}`}
                onDoubleClick={() => setShowAgentSettings(true)}
                title="双击编辑 Agent 设置"
                style={{ cursor: "pointer" }}
              >
                {AGENT_AVATARS[activeAgent].label}
              </div>
              <div className="pw-agent-info-text">
                <strong>{AGENT_ROLES[activeAgent].label}</strong>
                <span className="pw-agent-status">在线 · 步骤 1 已完成</span>
              </div>
            </div>
            <div
              className="pw-context-bar"
              onDoubleClick={() => setShowContextPanel(true)}
              title="双击查看 Context 详情"
              style={{ cursor: "pointer" }}
            >
              <div className="pw-context-header">
                <span className="pw-context-label">Context</span>
                <span className="pw-context-pct">45%</span>
              </div>
              <div className="pw-context-track">
                <div className="pw-context-fill" style={{ width: "45%" }} />
              </div>
              <span className="pw-context-files">12 文件</span>
            </div>
          </div>

          {/* Chat area */}
          <div className="pw-chat-area">
            {MOCK_CHAT_MESSAGES.filter(
              (msg) => msg.role === "user" || msg.agentType === activeAgent
            ).map((msg) => (
              <div key={msg.id} className={`pw-chat-msg ${msg.role}`}>
                <div className={`pw-chat-avatar ${msg.role}`}>
                  {msg.role === "agent"
                    ? AGENT_AVATARS[msg.agentType].label
                    : "我"}
                </div>
                <div className="pw-chat-bubble">
                  <div className={`pw-chat-name ${msg.role}`}>{msg.name}</div>
                  <div>{msg.content}</div>
                  {msg.extra && (
                    <div style={{ marginTop: 6 }}>
                      <strong>验收标准：</strong> {msg.extra}
                    </div>
                  )}
                  {msg.memory && (
                    <div className="pw-memory-save">
                      <FileText size={12} />
                      {msg.memory}
                    </div>
                  )}
                  <div className="pw-chat-time">{msg.time}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Chat input */}
          <div className="pw-chat-input-area">
            <input
              placeholder={`与${AGENT_ROLES[activeAgent].label}对话...`}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && chatInput.trim()) {
                  setChatInput("");
                }
              }}
            />
            <button className="btn primary pw-send-btn">
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Context Detail Panel Overlay */}
      <PwContextPanel
        show={showContextPanel}
        onClose={() => setShowContextPanel(false)}
        projectName={project?.name ?? ""}
        activeAgentLabel={AGENT_ROLES[activeAgent].label}
      />

      {/* Project Settings Overlay */}
      <PwSettingsPanel
        show={showSettingsPanel}
        onClose={() => setShowSettingsPanel(false)}
        project={project}
        data={data}
      />

      {/* Gate Decision Panel Overlay */}
      {showGatePanel && (
        <GateDecisionPanel data={data} onClose={() => setShowGatePanel(false)} />
      )}

      {/* Agent Settings Panel */}
      {showAgentSettings && activeRoleData && (
        <AgentSettingsPanel
          role={activeRoleData}
          data={data}
          selectedModelKey={selectedModelKey}
          selectedRunnerId={selectedRunnerId}
          onClose={() => setShowAgentSettings(false)}
          onSaveModel={(key) => setSelectedModelKey(key)}
          onSaveRunner={(id) => setSelectedRunnerId(id)}
        />
      )}

      {/* ProjectMdViewer Overlay */}
      <PwProjectMdPanel
        show={showProjectMd}
        onClose={() => setShowProjectMd(false)}
        projectMd={projectMd}
        projectName={project.name}
        isCustom={!!project.projectMarkdown?.trim()}
      />

      {/* Progress Dashboard Overlay */}
      <PwProgressDashboard
        show={showProgressDashboard}
        onClose={() => setShowProgressDashboard(false)}
        project={project}
      />

      {/* Memory Panel Overlay */}
      <PwMemoryPanel
        show={showMemoryPanel}
        onClose={() => setShowMemoryPanel(false)}
        memories={data.memories}
        projectId={projectId}
      />

      {/* Issues Panel Overlay */}
      <PwIssuesPanel
        show={showIssuesPanel}
        onClose={() => setShowIssuesPanel(false)}
        repoOwner={project?.remoteRepo?.repoOwner}
        repoName={project?.remoteRepo?.repoName}
        issues={projectIssues}
      />

      {/* CI Panel Overlay */}
      <PwCiPanel
        show={showCiPanel}
        onClose={() => setShowCiPanel(false)}
        repoOwner={project?.remoteRepo?.repoOwner}
        repoName={project?.remoteRepo?.repoName}
        pipelines={projectCiPipelines}
      />

      {/* Branch List Overlay */}
      <PwBranchPanel
        show={showBranchPanel}
        onClose={() => setShowBranchPanel(false)}
        branches={projectBranches}
      />

      {/* Commit History Overlay */}
      <PwCommitPanel
        show={showCommitPanel}
        onClose={() => setShowCommitPanel(false)}
        commits={projectCommits}
      />
    </div>
  );
}
