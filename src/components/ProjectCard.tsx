import { useMemo, useState, useEffect, useCallback } from "react";
import {
  ArrowRight,
  AlertTriangle,
  Activity,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  X,
  Heart,
  Milestone,
  FlagTriangleRight,
  Clock,
  GitCompare,
  Loader2,
  GitBranch,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import type { Project, WorkbenchData, ManualGate } from "../domain/workbench";
import { useLocalServices } from "../hooks/useLocalServices";
import { gitApi, type GitStatus } from "../services/api";

interface ProjectCardProps {
  project: Project;
  data: WorkbenchData;
  onClick: () => void;
  onGateClick?: (gate: ManualGate) => void;
  onDelete?: (projectId: string) => void;
  onEnterWorkbench?: (projectId: string) => void;
  onCheck?: (projectId: string) => void;
}

const riskLabels: Record<string, string> = {
  low: "低风险",
  medium: "中风险",
  high: "高风险",
  critical: "高风险",
};

const riskPillClass: Record<string, string> = {
  low: "pm-v2-pill ok",
  medium: "pm-v2-pill warn",
  high: "pm-v2-pill danger",
  critical: "pm-v2-pill danger",
};

const statusLabels: Record<string, string> = {
  running: "运行中",
  waiting: "等待确认",
  paused: "已暂停",
  done: "已完成",
};

const statusClass: Record<string, string> = {
  running: "",
  waiting: "wait",
  paused: "pause",
  done: "",
};

function getHealthColor(score: number): string {
  if (score >= 80) return "var(--ok)";
  if (score >= 60) return "var(--warn)";
  return "var(--danger)";
}

function formatSyncTime(iso: string | undefined): string {
  if (!iso) return "未同步";
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDay = Math.floor(diffMs / 86400000);
    if (diffDay < 1) return "今天";
    if (diffDay === 1) return "昨天";
    return `${diffDay}天前`;
  } catch {
    return "未知";
  }
}

export function ProjectCard({ project, data, onClick, onGateClick, onDelete, onEnterWorkbench }: ProjectCardProps) {
  const services = useLocalServices();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [gitLoading, setGitLoading] = useState(false);

  const projectTasks = useMemo(
    () => data.tasks.filter((t) => t.projectId === project.id),
    [data.tasks, project.id]
  );

  const waitingGates = useMemo(() => {
    const projectTaskIds = new Set(projectTasks.map((t) => t.id));
    return data.manualGates.filter(
      (g) => g.status === "waiting" && projectTaskIds.has(g.taskId)
    );
  }, [data.manualGates, projectTasks]);

  const stats = useMemo(() => {
    const running = projectTasks.filter((t) => t.status === "running").length;
    const gates = projectTasks.filter((t) => t.status === "gate").length;
    const pending = projectTasks.filter((t) => t.status !== "done" && t.status !== "gate" && t.status !== "failed").length;
    const pendingConfirms = data.manualGates.filter(
      (g) => g.status === "waiting" && data.tasks.find((t) => t.id === g.taskId)?.projectId === project.id
    ).length;
    return { running, gates, pending, pendingConfirms };
  }, [projectTasks, data.manualGates, data.tasks, project.id]);

  const initials = project.name.slice(0, 2).toUpperCase();
  const hasGates = waitingGates.length > 0;

  const handleDeleteEsc = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setShowDeleteConfirm(false);
      setDeleteInput("");
    }
  }, []);

  useEffect(() => {
    if (!showDeleteConfirm) return;
    document.addEventListener("keydown", handleDeleteEsc);
    return () => document.removeEventListener("keydown", handleDeleteEsc);
  }, [showDeleteConfirm, handleDeleteEsc]);

  // Fetch Git status
  useEffect(() => {
    if (!project.repoPath) return;

    let isMounted = true;

    const fetchGitStatus = async () => {
      setGitLoading(true);
      try {
        const result = await gitApi.getStatus(project.repoPath);
        if (isMounted && result.ok && result.data) {
          setGitStatus(result.data);
        }
      } catch {
        // Silently handle errors - not all projects may have Git
      } finally {
        if (isMounted) {
          setGitLoading(false);
        }
      }
    };

    fetchGitStatus();
    // Refresh every 60 seconds
    const interval = setInterval(fetchGitStatus, 60000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [project.repoPath]);

  const handleWorkbenchClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEnterWorkbench) onEnterWorkbench(project.id);
  };

  const handleDelete = async () => {
    if (deleteInput !== project.name) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      if (!services.deleteProject) {
        throw new Error('服务不可用');
      }
      const result = await services.deleteProject(project.id);

      if (result.ok) {
        if (onDelete) onDelete(project.id);
        setShowDeleteConfirm(false);
        setDeleteInput("");
      } else {
        setDeleteError(result.error?.message || '删除项目失败');
      }
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : '删除项目失败');
    }

    setDeleting(false);
  };

  const riskLevel = project.riskLevel ?? "low";
  const healthScore = project.healthScore ?? 70;
  const healthColor = getHealthColor(healthScore);
  const syncTime = formatSyncTime(project.remoteRepo?.lastSyncAt);

  // Determine project status
  const projectStatus = project.status ?? (stats.running > 0 ? "running" : "waiting");

  return (
    <article className="pm-v2-project-card" onClick={onClick}>
      {/* Title row */}
      <div className="pm-v2-pc-title">
        <div className="pm-v2-pc-name">
          <span className="pm-v2-pc-mark">{initials}</span>
          {project.name}
        </div>
        <div className="pm-v2-pc-title-right">
          {hasGates && (
            <button
              className="pm-v2-pc-gate-badge"
              onClick={(e) => {
                e.stopPropagation();
                if (onGateClick && waitingGates.length > 0) onGateClick(waitingGates[0]);
              }}
              title="待决策"
              type="button"
            >
              <AlertTriangle size={12} />
              <span>待决策</span>
            </button>
          )}
          <span className={`pm-v2-pc-status ${statusClass[projectStatus]}`}>
            {projectStatus === "running" && <span className="pm-v2-dot"></span>}
            {statusLabels[projectStatus] || "运行中"}
          </span>
        </div>
      </div>

      {/* Progress row */}
      <div className="pm-v2-pc-progress-row">
        <div className="pm-v2-pc-progress-label">
          <span>{project.phase || "Phase 1"}</span>
          <strong>{project.progress ?? 0}%</strong>
        </div>
        <div className="pm-v2-pc-progress">
          <span style={{ width: `${project.progress ?? 0}%` }} />
        </div>
      </div>

      {/* Health + Risk row */}
      <div className="pm-v2-pc-score-row">
        <span className="pm-v2-pc-score" style={healthScore < 60 ? { color: "var(--danger)" } : {}}>
          <Heart size={14} />
          健康分 <b style={{ color: healthColor }}>{healthScore}</b>
        </span>
        <span className={riskPillClass[riskLevel]}>{riskLabels[riskLevel]}</span>
      </div>

      {/* Insight row */}
      <div className="pm-v2-pc-insight">
        <div className="pm-v2-pc-insight-line">
          <label><Milestone size={12} />当前里程碑</label>
          <strong>{project.currentMilestone || "进行中"}</strong>
        </div>
        <div className="pm-v2-pc-insight-line">
          <label><FlagTriangleRight size={12} />下一验收点</label>
          <strong>{project.nextCheckpoint || "待定"}</strong>
        </div>
      </div>

      {/* Git status row */}
      <div className="pm-v2-pc-git-row">
        {gitLoading ? (
          <span className="pm-v2-pc-git-loading"><Loader2 size={12} className="spin" /> 加载中...</span>
        ) : gitStatus ? (
          <>
            <span className="pm-v2-pc-git-branch">
              <GitBranch size={12} />
              <span>{gitStatus.branch}</span>
            </span>
            {gitStatus.ahead > 0 && (
              <span className="pm-v2-pill ok"><ArrowUp size={10} />{gitStatus.ahead}</span>
            )}
            {gitStatus.behind > 0 && (
              <span className="pm-v2-pill warn"><ArrowDown size={10} />{gitStatus.behind}</span>
            )}
            {gitStatus.isClean ? (
              <span className="pm-v2-pill ok">Clean</span>
            ) : (
              <span className="pm-v2-pill warn">
                {gitStatus.staged > 0 && `${gitStatus.staged} staged`}
                {gitStatus.staged > 0 && gitStatus.unstaged > 0 && " "}
                {gitStatus.unstaged > 0 && `${gitStatus.unstaged} changed`}
                {gitStatus.staged + gitStatus.unstaged > 0 && gitStatus.untracked > 0 && " "}
                {gitStatus.untracked > 0 && `${gitStatus.untracked} untracked`}
              </span>
            )}
          </>
        ) : (
          <span className="pm-v2-pc-git-none">无 Git 信息</span>
        )}
      </div>

      {/* Meta grid */}
      <div className="pm-v2-pc-meta-grid">
        <span className="pm-v2-pc-meta-chip">运行 <b>{stats.running}</b></span>
        <span className="pm-v2-pc-meta-chip">Gate <b>{stats.gates}</b></span>
        <span className="pm-v2-pc-meta-chip">TODO <b>{stats.pending}</b></span>
        <span className={`pm-v2-pc-meta-chip${stats.pendingConfirms > 0 ? " warn" : ""}`}>
          待确认 <b>{stats.pendingConfirms}</b>
        </span>
        <span className="pm-v2-pc-meta-chip">同步 {syncTime}</span>
        <span className="pm-v2-pc-meta-chip">变更 <b>{project.discoveryChanges ?? 0}</b></span>
      </div>

      {/* Actions row */}
      <div className="pm-v2-pc-actions">
        <button className="pm-v2-btn" onClick={onClick}><ArrowRight size={12} />进入详情</button>
        <button className="pm-v2-btn" onClick={handleWorkbenchClick}>
          <ArrowRight size={12} />进入工作台
        </button>
      </div>

      {/* Delete button */}
      <button
        className="pm-v2-pc-delete-btn"
        onClick={(e) => {
          e.stopPropagation();
          setShowDeleteConfirm(true);
        }}
        title="删除项目"
        type="button"
      >
        <Trash2 size={14} />
      </button>

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="pm-v2-pc-confirm-overlay" onClick={(e) => e.stopPropagation()}>
          <div className="pm-v2-pc-confirm-box">
            <div className="pm-v2-pc-confirm-header">
              <AlertTriangle size={16} color="var(--danger)" />
              <span>删除项目</span>
              <button className="pm-v2-btn" onClick={() => { setShowDeleteConfirm(false); setDeleteInput(""); setDeleteError(null); }} type="button">
                <X size={14} />
              </button>
            </div>
            <div className="pm-v2-pc-confirm-body">
              <p>请输入项目名称 <strong>{project.name}</strong> 以确认删除：</p>
              <input
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                placeholder={project.name}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && deleteInput === project.name && !deleting) {
                    handleDelete();
                  }
                }}
              />
              {deleteError && (
                <p style={{ color: "var(--danger)", marginTop: "8px", fontSize: "12px" }}>
                  {deleteError}
                </p>
              )}
            </div>
            <div className="pm-v2-pc-confirm-footer">
              <button className="pm-v2-btn" onClick={() => { setShowDeleteConfirm(false); setDeleteInput(""); setDeleteError(null); }} type="button">取消</button>
              <button
                className="pm-v2-btn pm-v2-btn-danger"
                disabled={deleteInput !== project.name || deleting}
                onClick={handleDelete}
                type="button"
              >
                {deleting ? <Loader2 size={14} className="spin" /> : null}
                {deleting ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
