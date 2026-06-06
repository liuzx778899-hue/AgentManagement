import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  Brain,
  Camera,
  CheckCircle2,
  ChevronDown,
  CircleCheck,
  CircleDot,
  Database,
  FileCode2,
  FileText,
  FolderGit2,
  GitBranch,
  Info,
  Loader2,
  MoreHorizontal,
  PanelRightClose,
  PanelRightOpen,
  Play,
  Puzzle,
  RotateCcw,
  Save,
  Square,
  Terminal,
  XCircle,
  Zap,
} from "lucide-react";
import type { WorkbenchData, WorkbenchView, WorkflowStep } from "../domain/workbench";
import type { Task } from "../domain/task";
import { taskApi, workbenchRunApi, gitApi } from "../services/api";
import type { GitStatus } from "../services/api/gitApi";
import type { LogEntry } from "../types/localEngineering";

interface WorkbenchHomeProps {
  data: WorkbenchData;
  onNavigate: (view: WorkbenchView) => void;
  activeProjectId?: string;
}

// HTML 转义 - 防止 XSS
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface TerminalTab {
  id: string;
  label: string;
  runnerLabel: string;
  stepId: string;
  taskId?: string;
  logs: LogEntry[];
  status: 'idle' | 'running' | 'completed' | 'failed';
}

// 根据真实任务状态计算步骤状态
export function getStepStatus(step: WorkflowStep, tasks: Task[]): { cls: string; label: string } {
  const stepTasks = tasks.filter(t => t.workflowStepId === step.id);
  if (stepTasks.length === 0) return { cls: "idle", label: "待开始" };

  const running = stepTasks.some(t => t.status === 'running');
  const allDone = stepTasks.every(t => t.status === 'done');
  const hasFailed = stepTasks.some(t => t.status === 'failed');
  const inGate = stepTasks.some(t => t.status === 'gate');
  const queued = stepTasks.some(t => t.status === 'queued' || t.status === 'draft');

  if (running) return { cls: "run", label: "运行中" };
  if (inGate) return { cls: "wait", label: "等待 Gate" };
  if (hasFailed) return { cls: "error", label: "失败" };
  if (allDone) return { cls: "ok", label: "已完成" };
  if (queued) return { cls: "queued", label: "排队中" };
  return { cls: "idle", label: "待开始" };
}

// 从 workflow steps 生成 terminal tabs
export function buildTabs(data: WorkbenchData, tasks: Task[], templateId?: string): TerminalTab[] {
  const template = templateId
    ? data.workflowTemplates.find(t => t.id === templateId)
    : data.workflowTemplates[0];
  if (!template) return [];

  return template.steps.flatMap((step) => {
    const assignments = step.assignments ?? [];
    // Find tasks for this step (one task per assignment)
    const stepTasks = tasks.filter(t => t.workflowStepId === step.id);
    return assignments.map((assignment, ai) => {
      const role = data.roles.find(r => r.id === assignment.roleId);
      const task = stepTasks.find(t => t.assignmentId === assignment.id) ?? stepTasks[ai];
      const runnerId = assignment.runnerId ?? 'runner-claude-code';

      return {
        id: `tab-${step.id}-${ai}`,
        label: role?.name ?? step.name,
        runnerLabel: runnerId.includes('codex') ? 'Codex CLI' :
                     runnerId.includes('cursor') ? 'Cursor CLI' :
                     runnerId.includes('gemini') ? 'Gemini CLI' : 'Claude Code',
        stepId: step.id,
        taskId: task?.id,
        logs: [],
        status: task?.status === 'running' ? 'running' :
                task?.status === 'done' ? 'completed' :
                task?.status === 'failed' ? 'failed' : 'idle',
      };
    });
  });
}

export function WorkbenchHome({ data, onNavigate, activeProjectId }: WorkbenchHomeProps) {
  const project = data.projects.find((item) => item.id === activeProjectId) ?? data.projects[0];
  const template = useMemo(() => {
    if (!project?.workflowTemplateId) return null;
    return data.workflowTemplates.find(t => t.id === project.workflowTemplateId) ?? null;
  }, [data.workflowTemplates, project?.workflowTemplateId]);

  // 真实任务过滤
  const projectTasks = useMemo(() => {
    if (!project?.id) return [];
    return data.tasks.filter(t => t.projectId === project.id);
  }, [data.tasks, project?.id]);

  const tabs = useMemo(() => buildTabs(data, projectTasks, project?.workflowTemplateId), [data, projectTasks, project?.workflowTemplateId]);
  const [activeTabId, setActiveTabId] = useState(tabs[0]?.id ?? "");
  const [logs, setLogs] = useState<Record<string, LogEntry[]>>({});
  const [panelVisible, setPanelVisible] = useState(true);
  const [popover, setPopover] = useState<string | null>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<{ left: number; bottom: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [customTabs, setCustomTabs] = useState<TerminalTab[]>([]);
  const [customTabCounter, setCustomTabCounter] = useState(1);
  const [closedRoleTabs, setClosedRoleTabs] = useState<Set<string>>(new Set());
  const [showClosedRoles, setShowClosedRoles] = useState(false);
  const promptEditRef = useRef<HTMLTextAreaElement | null>(null);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [showGitPanel, setShowGitPanel] = useState(false);
  const gitPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const logPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadingRef = useRef<{ type: 'start' | 'stop' | 'complete'; taskId: string } | null>(null);

  // 获取活动 tab
  const activeTab = tabs.find((item) => item.id === activeTabId);

  // 轮询日志 - running 时持续轮询，completed/failed 时加载一次
  useEffect(() => {
    if (!activeTab?.taskId) {
      if (logPollRef.current) {
        clearInterval(logPollRef.current);
        logPollRef.current = null;
      }
      return;
    }

    const fetchLogs = async () => {
      try {
        const result = await workbenchRunApi.getLogs(activeTab.taskId!);
        if (result.ok && result.data) {
          setLogs(prev => ({
            ...prev,
            [activeTab.id]: result.data!.logs,
          }));
        }
      } catch (error) {
        console.error('Failed to fetch logs:', error);
      }
    };

    // 初始加载
    fetchLogs();

    if (activeTab.status === 'running') {
      // running 时每 2 秒轮询
      logPollRef.current = setInterval(fetchLogs, 2000);
    } else {
      // completed/failed 时清除轮询
      if (logPollRef.current) {
        clearInterval(logPollRef.current);
        logPollRef.current = null;
      }
    }

    return () => {
      if (logPollRef.current) {
        clearInterval(logPollRef.current);
        logPollRef.current = null;
      }
    };
  }, [activeTab?.taskId, activeTab?.status, activeTab?.id]);

  useEffect(() => {
    if (!tabs.some((tab) => tab.id === activeTabId)) {
      setActiveTabId(tabs[0]?.id ?? "");
    }
  }, [activeTabId, tabs]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // 真实最近文件 - 从 git status 获取 (必须在条件返回之前声明)
  const recentFiles = useMemo(() => {
    // 优先从 git status 获取变更文件
    if (gitStatus && !gitStatus.isClean) {
      const files: string[] = [];
      if (gitStatus.staged > 0) files.push(`${gitStatus.staged} staged files`);
      if (gitStatus.unstaged > 0) files.push(`${gitStatus.unstaged} modified files`);
      if (gitStatus.untracked > 0) files.push(`${gitStatus.untracked} untracked files`);
      return files.slice(0, 3);
    }
    // 备选：从最近任务获取
    if (!project?.id) return [];
    const recentTasks = data.tasks
      .filter((t) => t.projectId === project.id)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 3);
    return recentTasks.map((t) => (t.goal?.slice(0, 30) ?? 'Untitled') + "...").filter(Boolean);
  }, [gitStatus, data.tasks, project?.id]);

  // 获取 git status
  useEffect(() => {
    if (!project?.repoPath) return;

    const fetchGitStatus = async () => {
      try {
        const result = await gitApi.getStatus(project.repoPath);
        if (result.ok && result.data) {
          setGitStatus(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch git status:', error);
      }
    };

    fetchGitStatus();
  }, [project?.repoPath]);

  const closePopover = () => {
    setPopover(null);
    setPopoverAnchor(null);
  };

  useEffect(() => {
    if (!popover) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePopover();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [popover]);

  const togglePopover = (id: string, anchor?: HTMLElement) => {
    if (popover === id) {
      closePopover();
      return;
    }
    if (anchor) {
      const rect = anchor.getBoundingClientRect();
      setPopoverAnchor({ left: Math.max(12, Math.min(rect.left, window.innerWidth - 360)), bottom: rect.bottom });
    } else {
      setPopoverAnchor(null);
    }
    setPopover(id);
  };

  const handleAction = (label: string) => {
    setActionLoading(label);
    window.setTimeout(() => {
      setActionLoading(null);
      setToast(`${label}完成`);
    }, 700);
  };

  // 启动任务 - Issue #26
  const handleStartTask = useCallback(async (taskId: string) => {
    if (loadingRef.current) return;
    loadingRef.current = { type: 'start', taskId };

    try {
      const result = await workbenchRunApi.startTask(taskId);
      if (result.ok) {
        setToast("任务已启动");
        window.dispatchEvent(new CustomEvent("refresh-workbench"));
      } else {
        setToast(result.error?.message || "启动失败");
      }
    } catch (error) {
      setToast(error instanceof Error ? error.message : "启动失败");
    } finally {
      loadingRef.current = null;
    }
  }, []);

  // 停止任务 - Issue #26
  const handleStopTask = useCallback(async (taskId: string) => {
    if (loadingRef.current) return;
    loadingRef.current = { type: 'stop', taskId };

    try {
      const result = await workbenchRunApi.stopTask(taskId, { taskId, status: 'stopped' });
      if (result.ok) {
        setToast("任务已停止");
        window.dispatchEvent(new CustomEvent("refresh-workbench"));
      } else {
        setToast(result.error?.message || "停止失败");
      }
    } catch (error) {
      setToast(error instanceof Error ? error.message : "停止失败");
    } finally {
      loadingRef.current = null;
    }
  }, []);

  // 完成任务 - Issue #26 (走 workbenchRunApi.stopTask 完成流程)
  const handleCompleteTask = useCallback(async (taskId: string) => {
    if (loadingRef.current) return;
    loadingRef.current = { type: 'complete', taskId };

    try {
      const result = await workbenchRunApi.stopTask(taskId, { taskId, status: 'done' });
      if (result.ok) {
        setToast("任务已完成");
        window.dispatchEvent(new CustomEvent("refresh-workbench"));
      } else {
        setToast(result.error?.message || "更新失败");
      }
    } catch (error) {
      setToast(error instanceof Error ? error.message : "更新失败");
    } finally {
      loadingRef.current = null;
    }
  }, []);

  const handleSavePrompt = async () => {
    if (!currentRole) return;
    const newMarkdown = promptEditRef.current?.value ?? "";
    setSavingPrompt(true);
    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...currentRole, roleMarkdown: newMarkdown }),
      });
      if (res.ok) {
        window.dispatchEvent(new CustomEvent("refresh-workbench"));
        setToast("提示词已保存");
      }
    } catch (err) {
      console.error("Failed to save prompt:", err);
    }
    setSavingPrompt(false);
    setPopover(null);
  };

  if (!project) {
    return (
      <div className="wb-cockpit">
        <div className="state empty">
          <h3>暂无项目</h3>
          <p>请先在项目管理中创建或导入项目。</p>
          <button className="btn primary" onClick={() => onNavigate("project-management")} type="button">
            进入项目管理
          </button>
        </div>
      </div>
    );
  }

  const flowSteps = template?.steps ?? [];
  const todos = projectTasks.filter((task) => task.status !== "done");
  const activeRuns = data.agentRuns.filter((run) => run.status === "running" || run.status === "waiting_gate");
  const activeGate = data.manualGates.find((gate) => gate.status === "waiting");
  const projectMemories = data.memories.filter((memory) => memory.scope === "project");

  const activeStep = flowSteps.find((step) => activeTabId.startsWith(`tab-${step.id}`));
  // Issue #41: 从 assignments 获取所有角色名
  const activeRoleNames = activeStep?.assignments
    ? activeStep.assignments.map(a => data.roles.find(r => r.id === a.roleId)?.name).filter(Boolean).join("、")
    : null;
  // Get current role from active tab's assignment
  const currentRole = useMemo(() => {
    if (!activeStep) return null;
    const assignments = activeStep.assignments ?? [];
    const match = activeTabId.match(/-(\d+)$/);
    const ai = match ? parseInt(match[1], 10) : 0;
    const assignment = assignments[ai] ?? assignments[0];
    if (!assignment?.roleId) return null;
    return data.roles.find(r => r.id === assignment.roleId) ?? null;
  }, [activeStep, activeTabId, data.roles]);
  const popoverPositionStyle = popoverAnchor
    ? { left: popoverAnchor.left, top: popoverAnchor.bottom + 8, right: "auto", bottom: "auto", display: "block" }
    : undefined;

  // 获取当前 tab 的日志
  const activeTabLogs = activeTab ? (logs[activeTab.id] || []) : [];

  const renderSelectPopover = () => {
    if (!["project-select", "branch-select", "worktree-select", "phase-select", "top-more"].includes(popover ?? "")) return null;

    const actions =
      popover === "project-select"
        ? data.projects.map((item) => ({ key: item.id, icon: <FolderGit2 size={14} />, label: item.name }))
        : popover === "branch-select"
          ? [project.defaultBranch ?? "main", "develop", "release/v1"].map((item) => ({ key: item, icon: <GitBranch size={14} />, label: item }))
          : popover === "worktree-select"
            ? [project.worktreeRoot ?? ".codex/worktrees/agentmanagement", ".claude/worktrees", "D:/work/vibecode/AgentManagement"].map((item) => ({
                key: item,
                icon: <GitBranch size={14} />,
                label: item,
              }))
            : popover === "phase-select"
              ? [project.phase ?? "Phase 1 Web MVP", "Phase 2 核心功能", "Phase 0 概念验证"].map((item) => ({
                  key: item,
                  icon: <CircleDot size={14} />,
                  label: item,
                }))
              : ["导出日志", "复制上下文", "打开设置"].map((item) => ({ key: item, icon: <MoreHorizontal size={14} />, label: item }));

    const title =
      popover === "project-select"
        ? "选择项目"
        : popover === "branch-select"
          ? "选择分支"
          : popover === "worktree-select"
            ? "选择工作区"
            : popover === "phase-select"
              ? "选择阶段"
              : "更多操作";

    return (
      <div className="wb-toolbar-popover-fixed" style={popoverPositionStyle} onClick={closePopover}>
        <div className="wb-popover-card-backdrop" onClick={(event) => event.stopPropagation()}>
          <div className="wb-popup-caret" />
          <h4>{title}</h4>
          {actions.map((item) => (
            <button
              key={item.key}
              className="wb-popup-action"
              onClick={() => {
                if (popover === "project-select") {
                  window.dispatchEvent(new CustomEvent("switch-project", { detail: { projectId: item.key } }));
                } else {
                  setToast(`${item.label}已选择`);
                }
                closePopover();
              }}
              type="button"
            >
              {item.icon}
              {item.label}
            </button>
          ))}
          <button className="btn ghost btn-sm" onClick={closePopover} type="button">
            关闭
          </button>
        </div>
      </div>
    );
  };

  const renderToolPopover = () => {
    if (!popover || ["project-select", "branch-select", "worktree-select", "phase-select", "top-more"].includes(popover)) return null;
    const config: Record<string, { title: string; lines: string[] }> = {
      context: { title: "步骤上下文", lines: [`当前步骤：${activeTab?.label ?? "-"}`, `Runner：${activeTab?.runnerLabel ?? "-"}`, "最近修改：2 个文件", "待办事项：4 项"] },
      prompt: { title: "角色提示词", lines: currentRole ? [currentRole.roleMarkdown || currentRole.description || "暂无提示词"] : ["请先选择一个角色"] },
      memory: { title: "角色记忆", lines: currentRole ? projectMemories.filter(m => m.roleId === currentRole.id).map(m => `${m.title}: ${(m.body || "").slice(0, 50)}`) : ["请先选择一个角色"] },
      mcp: { title: "MCP", lines: ["Browser：已启用", "Local Shell：已启用"] },
      skills: { title: "Skills", lines: ["ui-ux-pro-max：已启用", "code-simplifier：可选"] },
      git: { title: "Git", lines: [`当前分支：${project.defaultBranch ?? "main"}`, `最近提交：${gitStatus?.lastCommitMessage?.slice(0, 40) ?? "加载中..."}`] },
      shell: { title: "Local Shell", lines: ["PowerShell", "CMD"] },
      snapshot: { title: "快照", lines: ["创建当前工作区快照。"] },
    };
    const item = config[popover];
    if (!item) return null;
    const isPrompt = popover === "prompt";
    const isMemory = popover === "memory";
    return (
      <div className="wb-toolbar-popover-fixed" style={popoverPositionStyle} onClick={closePopover}>
        <div className="wb-popover-card-backdrop" onClick={(event) => event.stopPropagation()} style={isPrompt ? { width: 360, maxHeight: 400, overflow: "auto" } : undefined}>
          <div className="wb-popup-caret" />
          <h4>{item.title}</h4>
          {isPrompt && currentRole ? (
            <>
              <textarea
                ref={promptEditRef}
                defaultValue={currentRole.roleMarkdown || currentRole.description || ""}
                style={{
                  width: "100%", minHeight: 150, background: "var(--bg-tertiary)", border: "1px solid var(--border-primary)",
                  borderRadius: 4, color: "var(--text-primary)", fontFamily: "inherit", fontSize: 12,
                  padding: 8, resize: "vertical", marginBottom: 8,
                }}
                placeholder="输入角色提示词..."
              />
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <button className="btn ghost btn-sm" onClick={closePopover} type="button">关闭</button>
                <button className="btn btn-sm primary" disabled={savingPrompt} onClick={handleSavePrompt} type="button">
                  {savingPrompt ? "保存中..." : "保存"}
                </button>
              </div>
            </>
          ) : (
            <>
              {item.lines.map((line) => (
                <p key={line}>{line}</p>
              ))}
              <button className="btn ghost btn-sm" onClick={closePopover} type="button">
                关闭
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="wb-cockpit">
      <header className="wb-topbar">
        <div className="wb-topbar-left">
          <button className={`wb-select-pill${popover === "project-select" ? " active" : ""}`} type="button" onClick={(event) => togglePopover("project-select", event.currentTarget)}>
            <FolderGit2 className="wb-inline-icon" />
            {project.name}
            <ChevronDown className="wb-inline-icon" />
          </button>
          <button className={`wb-select-pill${popover === "prompt" ? " active" : ""}`} type="button" onClick={(event) => togglePopover("prompt", event.currentTarget)}>
            <FileText className="wb-inline-icon" />
            项目提示词
          </button>
          <button className={`wb-select-pill${popover === "branch-select" ? " active" : ""}`} type="button" onClick={(event) => togglePopover("branch-select", event.currentTarget)}>
            <GitBranch className="wb-inline-icon" />
            {project.defaultBranch ?? "main"}
            <ChevronDown className="wb-inline-icon" />
          </button>
          <button className={`wb-select-pill wide${popover === "worktree-select" ? " active" : ""}`} type="button" onClick={(event) => togglePopover("worktree-select", event.currentTarget)}>
            <GitBranch className="wb-inline-icon" />
            {project.worktreeRoot ?? ".codex/worktrees/agentmanagement"}
            <ChevronDown className="wb-inline-icon" />
          </button>
          <button className={`wb-select-pill phase${popover === "phase-select" ? " active" : ""}`} type="button" onClick={(event) => togglePopover("phase-select", event.currentTarget)}>
            <CircleDot className="wb-inline-icon" />
            {project.phase ?? "Phase 1 Web MVP"}
            <ChevronDown className="wb-inline-icon" />
          </button>
          <div className="wb-saved-status">
            <CircleCheck className="wb-inline-icon" />
            已保存 <span className="wb-saved-time">09:20</span>
          </div>
        </div>
        <div className="wb-topbar-right">
          <button className="wb-top-btn green" onClick={() => handleAction("启动项目")} disabled={actionLoading !== null} type="button">
            <Play className="wb-inline-icon" />
            {actionLoading === "启动项目" ? "启动中..." : "启动项目"}
          </button>
          <button className="wb-top-btn" onClick={() => handleAction("恢复会话")} disabled={actionLoading !== null} type="button">
            <RotateCcw className="wb-inline-icon" />
            {actionLoading === "恢复会话" ? "恢复中..." : "恢复会话"}
          </button>
          <button className="wb-top-btn blue" onClick={() => handleAction("保存进度")} disabled={actionLoading !== null} type="button">
            <Save className="wb-inline-icon" />
            {actionLoading === "保存进度" ? "保存中..." : "保存进度"}
          </button>
          <button className="wb-top-btn" onClick={() => onNavigate("project-management")} type="button">
            <XCircle className="wb-inline-icon" />
            关闭项目
          </button>
          <button className="wb-top-more" aria-label="更多操作" type="button" onClick={(event) => togglePopover("top-more", event.currentTarget)}>
            <MoreHorizontal size={18} />
          </button>
        </div>
      </header>

      {toast && (
        <div className="wb-toast">
          <CheckCircle2 size={14} />
          <span>{toast}</span>
        </div>
      )}

      <div className={`wb-content-area${!panelVisible ? " panel-hidden" : ""}`}>
        <section className="wb-flow-band">
          <div className="wb-flow-title">
            角色流程运行带 <span>{flowSteps.length} 个角色 · {activeStep ? `${String(activeStep.order).padStart(2, "0")} ${activeRoleNames ?? activeStep.name}` : "未选择"} 运行中</span>
          </div>
          <div className="wb-flow-scroll">
            {flowSteps.map((step, index) => {
              // Issue #41: 从 assignments 获取所有角色
              const assignments = step.assignments ?? [];
              const roleNames = assignments
                .map(a => data.roles.find(r => r.id === a.roleId)?.name)
                .filter(Boolean)
                .join("、") || "未绑定";
              const firstAssignment = assignments[0];
              const firstTabId = `tab-${step.id}-0`;
              // Issue #26: 使用真实任务状态
              const status = getStepStatus(step, projectTasks);
              return (
                <button
                  key={step.id}
                  className={`wb-flow-card ${status.cls}${activeTabId.startsWith(`tab-${step.id}`) ? " active" : ""}`}
                  onClick={() => setActiveTabId(firstTabId)}
                  type="button"
                >
                  <div className="wb-flow-card-title">
                    <span>{String(step.order).padStart(2, "0")}</span>
                    <strong>{step.name}</strong>
                  </div>
                  <p>{roleNames} Agent</p>
                  <div className="wb-flow-model">{firstAssignment?.modelName || "DeepSeek / deepseek-v4-pro"}</div>
                  <div className="wb-flow-footer">
                    <span>{tabs.find(t => t.stepId === step.id)?.runnerLabel ?? "Claude Code"}</span>
                    <b className={`wb-step-state ${status.cls}`}>{status.label}</b>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className={`wb-terminal-workspace${!panelVisible ? " expanded" : ""}`}>
          <div className="wb-ws-head">
            <div className="wb-ws-title">
              Terminal Workspace
              <span className="wb-run-meta">
                <span className="wb-run-dot" />
                运行中 · {activeRoleNames ?? activeTab?.label ?? "未选择"}
              </span>
            </div>
            <div className="wb-ws-tools">
              {[
                ["context", Info, "步骤上下文"],
                ["memory", Brain, "角色记忆"],
                ["prompt", FileText, "角色提示词"],
                ["mcp", Puzzle, "MCP"],
                ["skills", Zap, "Skills"],
                ["shell", Terminal, "Local Shell"],
                ["snapshot", Camera, "快照"],
              ].map(([id, Icon, label]) => {
                const ToolIcon = Icon as typeof Info;
                return (
                  <button key={id as string} className={`wb-toolbar-btn${popover === id ? " active" : ""}`} onClick={(event) => togglePopover(id as string, event.currentTarget)} type="button">
                    <ToolIcon size={14} />
                    <span>{label as string}</span>
                  </button>
                );
              })}
              <button className="wb-toolbar-btn" onClick={() => setShowGitPanel(true)} type="button">
                <GitBranch size={14} />
                <span>Git</span>
              </button>
              <button className="wb-toolbar-btn" onClick={() => setToast("更多工具开发中")} type="button">
                <MoreHorizontal size={14} />
              </button>
            </div>
          </div>

          <div className="wb-terminal-tabs" style={{ overflowX: "auto", whiteSpace: "nowrap", flexWrap: "nowrap" }}>
            {tabs.filter(t => !closedRoleTabs.has(t.id)).map((tab) => (
              <div key={tab.id} style={{ display: "inline-flex", alignItems: "center", position: "relative" }}>
                <button className={`wb-terminal-tab${activeTabId === tab.id ? " active" : ""}`} onClick={() => setActiveTabId(tab.id)} type="button">
                  {tab.label}
                </button>
                <button
                  className="wb-terminal-tab-close"
                  onClick={() => {
                    setClosedRoleTabs(prev => new Set([...prev, tab.id]));
                    if (activeTabId === tab.id) {
                      const remaining = [...tabs.filter(t => !closedRoleTabs.has(t.id) && t.id !== tab.id), ...customTabs];
                      setActiveTabId(remaining[0]?.id ?? "");
                    }
                  }}
                  title="关闭此窗口（可重新打开）"
                  type="button"
                  style={{ marginLeft: -6, marginRight: 2, cursor: "pointer", background: "none", border: "none", color: "var(--text-muted)", fontSize: 12, padding: "2px 4px" }}
                >×</button>
              </div>
            ))}
            {customTabs.map((tab) => (
              <div key={tab.id} style={{ display: "inline-flex", alignItems: "center" }}>
                <button className={`wb-terminal-tab custom${activeTabId === tab.id ? " active" : ""}`} onClick={() => setActiveTabId(tab.id)} type="button">
                  {tab.label}
                </button>
                <button
                  className="wb-terminal-tab-close"
                  onClick={() => {
                    setCustomTabs(prev => prev.filter(t => t.id !== tab.id));
                    if (activeTabId === tab.id) {
                      const remaining = [...tabs.filter(t => !closedRoleTabs.has(t.id)), ...customTabs.filter(t => t.id !== tab.id)];
                      setActiveTabId(remaining[0]?.id ?? "");
                    }
                  }}
                  title="删除此窗口"
                  type="button"
                  style={{ marginLeft: -6, marginRight: 2, cursor: "pointer", background: "none", border: "none", color: "var(--danger)", fontSize: 12, padding: "2px 4px" }}
                >×</button>
              </div>
            ))}
            <button
              className="wb-terminal-tab plus"
              onClick={() => {
                const id = `custom-tab-${Date.now()}`;
                const label = `终端 ${customTabCounter}`;
                setCustomTabs(prev => [...prev, { id, label, runnerLabel: "本地", stepId: "", taskId: undefined, logs: [], status: "idle" }]);
                setCustomTabCounter(c => c + 1);
                setActiveTabId(id);
              }}
              type="button"
            >
              +
            </button>
            {closedRoleTabs.size > 0 && (
              <div style={{ position: "relative" }}>
                <button
                  className="wb-terminal-tab"
                  onClick={() => setShowClosedRoles(!showClosedRoles)}
                  title="已关闭的角色窗口"
                  type="button"
                  style={{ fontSize: 11, opacity: 0.6 }}
                >
                  已关闭 ▾
                </button>
                {showClosedRoles && (
                  <>
                    <div style={{
                      position: "fixed", top: 105, zIndex: 110,
                      background: "#0d1723", border: "1px solid #26384d", borderRadius: 8,
                      padding: 6, minWidth: 140, boxShadow: "0 4px 16px rgba(0,0,0,0.6)", marginBottom: 4,
                    }}>
                      {tabs.filter(t => closedRoleTabs.has(t.id)).map(t => (
                        <button
                          key={t.id}
                          className="wb-popup-action"
                          style={{ width: "100%", justifyContent: "flex-start", fontSize: 11 }}
                          onClick={() => {
                            setClosedRoleTabs(prev => { const next = new Set(prev); next.delete(t.id); return next; });
                            setActiveTabId(t.id);
                            setShowClosedRoles(false);
                          }}
                          type="button"
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                    <div style={{ position: "fixed", inset: 0, zIndex: 109 }} onClick={() => setShowClosedRoles(false)} />
                  </>
                )}
              </div>
            )}
          </div>

          <div className="wb-terminal-content">
            {activeTab ? (
              <>
                <div
                  className="wb-terminal-output"
                  dangerouslySetInnerHTML={{
                    __html:
                      `<span class="terminal-prompt">agentdev@AgentManagement</span>:<span class="terminal-path">~/AgentManagement</span>$ npm run dev\n\n` +
                      `> agentmanagement@0.1.0 dev\n> vite\n\n` +
                      activeTabLogs.map(l => `[${escapeHtml(l.timestamp)}] ${escapeHtml(l.content)}`).join('\n') +
                      (activeTabLogs.length === 0 ? (activeTab.status === 'idle' ? '<span class="terminal-muted">等待任务启动...</span>' : '<span class="terminal-muted">暂无日志</span>') : '') +
                      `\n\n<span class="terminal-prompt">agentdev@AgentManagement</span>:<span class="terminal-path">~/AgentManagement</span>$ <span class="terminal-cursor"></span>`,
                  }}
                />
                <div className="wb-terminal-status-bar">
                  <span>琛?1锛屽垪 1</span>
                  <span>UTF-8</span>
                  <span>LF</span>
                  <span>Shell: bash</span>
                </div>
              </>
            ) : (
              <div className="wb-terminal-empty">閫夋嫨缁堢 Tab</div>
            )}
          </div>
        </section>

        {panelVisible && (
          <aside className="wb-right-panel">
            <div className="wb-panel-header">
              <span>工作区信息</span>
              <div className="wb-panel-header-icons">
                <button className="wb-toolbar-btn wb-view-icon" onClick={() => onNavigate("project-management")} title="返回项目管理" type="button">
                  <ChevronDown size={14} style={{ transform: "rotate(90deg)" }} />
                </button>
                <button className="wb-toolbar-btn wb-view-icon" onClick={() => setPanelVisible(false)} title="隐藏面板" type="button">
                  <PanelRightClose size={14} />
                </button>
                <button className="wb-toolbar-btn wb-view-icon" onClick={() => setToast("记忆面板开发中")} title="记忆面板" type="button">
                  <Database size={14} />
                </button>
              </div>
            </div>

            <div className="wb-right-content">
              <div className="wb-panel-box">
                <div className="wb-box-title">
                  <span>TODO LIST</span>
                  <span className="wb-model-pill">{todos.length}</span>
                </div>
                <div className="wb-box-list">
                  {todos.slice(0, 4).map((task) => (
                    <div key={task.id} className="wb-todo-item">
                      <span className="wb-todo-check" />
                      <span>{task.goal}</span>
                      <span className="wb-prio-pill high">高</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="wb-panel-box">
                <div className="wb-box-title">
                  <span>Gate 状态</span>
                  {activeGate && <span className="wb-prio-pill high">待决策</span>}
                </div>
                {activeGate ? (
                  <div className="wb-box-list">
                    <p style={{ color: "var(--text-secondary)", fontSize: 12 }}>{activeGate.summary}</p>
                    <button className="wb-gate-btn" onClick={() => onNavigate("project-management")} type="button">
                      前往 Gate 决策
                    </button>
                  </div>
                ) : (
                  <p className="wb-panel-empty">无待处理 Gate</p>
                )}
              </div>

              <div className="wb-panel-box">
                <div className="wb-box-title">
                  <span>项目记忆</span>
                </div>
                <div className="wb-box-list">
                  {projectMemories.slice(0, 3).map((memory) => (
                    <div key={memory.id} className="wb-memory-row">
                      <Database className="wb-row-icon" />
                      <span>{memory.title}</span>
                      <span style={{ color: "var(--faint)", fontSize: 10 }}>{memory.updatedAt?.slice(0, 10) ?? ""}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="wb-panel-box">
                <div className="wb-box-title">
                  <span>当前角色记忆摘要</span>
                </div>
                <p style={{ color: "var(--text-secondary)", fontSize: 12, lineHeight: 1.5 }}>
                  {activeRoleNames ?? "产品经理"}：角色约束已同步，继续关注验收标准、风险确认和执行反馈。
                </p>
              </div>

              <div className="wb-panel-box">
                <div className="wb-box-title">
                  <span>最近文件</span>
                </div>
                <div className="wb-box-list">
                  {recentFiles.map((file) => (
                    <div key={file} className="wb-file-row">
                      <FileCode2 className="wb-row-icon muted" />
                      <span>{file}</span>
                      <span style={{ color: "var(--faint)", fontSize: 10 }}>12:30</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="wb-panel-box">
                <div className="wb-box-title">
                  <span>会话状态</span>
                </div>
                <div className="wb-progress-line">
                  <span />
                </div>
                <p style={{ color: "var(--text-secondary)", fontSize: 11, marginBottom: 6 }}>
                  正在运行 Agent：{activeRuns.length} | 等待 Gate：{data.manualGates.filter((gate) => gate.status === "waiting").length}
                </p>
                <button className="wb-panel-link" onClick={() => handleAction("恢复会话")} type="button">
                  恢复会话
                </button>
              </div>
            </div>
          </aside>
        )}
        {!panelVisible && (
          <div className="wb-view-icons-floating">
            <button className="wb-toolbar-btn wb-view-icon" onClick={() => onNavigate("project-management")} title="返回项目管理" type="button">
              <ChevronDown size={14} style={{ transform: "rotate(90deg)" }} />
            </button>
            <button className="wb-toolbar-btn wb-view-icon active" onClick={() => setPanelVisible(true)} title="显示面板" type="button">
              <PanelRightOpen size={14} />
            </button>
            <button className="wb-toolbar-btn wb-view-icon" onClick={() => setToast("记忆面板开发中")} title="记忆面板" type="button">
              <Database size={14} />
            </button>
          </div>
        )}
      </div>

      {renderSelectPopover()}
      {renderToolPopover()}

      {/* Git Panel */}
      {showGitPanel && (
        <div className="wb-modal-backdrop" style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.5)" }} onClick={() => setShowGitPanel(false)}>
          <div className="wb-git-panel" style={{
            position: "absolute", right: 20, top: 40, bottom: 20, width: 420,
            background: "#0d1723", border: "1px solid #26384d", borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0,0,0,0.7)", display: "flex", flexDirection: "column", overflow: "hidden",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--border-primary)" }}>
              <h3 style={{ margin: 0, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <GitBranch size={16} /> Git 状态
              </h3>
              <button onClick={() => setShowGitPanel(false)} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: 18 }}>×</button>
            </div>
            <div style={{ flex: 1, overflow: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Project Info */}
              <div style={{ padding: 12, background: "var(--bg-tertiary)", borderRadius: 8, border: "1px solid var(--border-primary)" }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>项目目录</div>
                <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--text-secondary)", wordBreak: "break-all" }}>{project.repoPath}</div>
              </div>

              {/* Branch & Status */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div style={{ padding: 10, background: "var(--bg-tertiary)", borderRadius: 8, border: "1px solid var(--border-primary)" }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>分支</div>
                  <div style={{ fontSize: 13, color: "var(--accent-blue)", fontFamily: "var(--mono)" }}>{project.defaultBranch ?? "main"}</div>
                </div>
                <div style={{ padding: 10, background: "var(--bg-tertiary)", borderRadius: 8, border: "1px solid var(--border-primary)" }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>状态</div>
                  <div style={{ fontSize: 13, color: gitStatus ? "var(--ok)" : "var(--text-muted)" }}>{gitStatus ? "已连接" : "未连接"}</div>
                </div>
              </div>

              {/* Recent Commits */}
              {/* Recent Commit */}
              <div style={{ padding: 12, background: "var(--bg-tertiary)", borderRadius: 8, border: "1px solid var(--border-primary)" }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>最近提交</div>
                {gitStatus?.lastCommitMessage ? (
                  <div>
                    <div style={{ color: "var(--text-secondary)", fontFamily: "var(--mono)", fontSize: 11, wordBreak: "break-all" }}>{gitStatus.lastCommitMessage.slice(0, 80)}</div>
                    <div style={{ color: "var(--text-muted)", fontSize: 10, marginTop: 4 }}>
                      SHA: <span style={{ fontFamily: "var(--mono)" }}>{gitStatus.lastCommitSha?.slice(0, 7)}</span> · {gitStatus.lastCommitDate}
                    </div>
                  </div>
                ) : <div style={{ fontSize: 12, color: "var(--text-muted)" }}>暂无提交记录</div>}
              </div>

              {/* Changes Summary */}
              <div style={{ padding: 12, background: "var(--bg-tertiary)", borderRadius: 8, border: "1px solid var(--border-primary)" }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>工作区状态</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 18, color: "var(--ok)", fontFamily: "var(--mono)" }}>{gitStatus?.staged ?? 0}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>已暂存</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 18, color: "var(--warn)", fontFamily: "var(--mono)" }}>{gitStatus?.unstaged ?? 0}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>未暂存</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 18, color: "var(--text-muted)", fontFamily: "var(--mono)" }}>{gitStatus?.untracked ?? 0}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>未跟踪</div>
                  </div>
                </div>
                <div style={{ marginTop: 8, fontSize: 11, color: gitStatus?.isClean ? "var(--ok)" : "var(--warn)" }}>
                  {gitStatus ? (gitStatus.isClean ? "✓ 工作区干净" : `⚠ 超前 ${gitStatus.ahead} / 落后 ${gitStatus.behind}`) : "加载中..."}
                </div>
              </div>

              {/* Remote Info */}
              <div style={{ padding: 12, background: "var(--bg-tertiary)", borderRadius: 8, border: "1px solid var(--border-primary)" }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>远程仓库</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--mono)" }}>
                  {project.remoteRepo ? `${project.remoteRepo.platform}/${project.remoteRepo.repoOwner}/${project.remoteRepo.repoName}` : "未配置远程仓库"}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

