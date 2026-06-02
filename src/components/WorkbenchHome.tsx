import { useCallback, useEffect, useMemo, useState } from "react";
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
  Terminal,
  XCircle,
  Zap,
} from "lucide-react";
import { PwLogStream } from "./PwLogStream";
import { taskApi } from "../services/api/taskApi";
import { runnerApi } from "../services/api/runnerApi";
import { gitApi } from "../services/api/gitApi";
import type { LogEntry } from "../types/localEngineering";
import type { WorkbenchData, WorkbenchView } from "../domain/workbench";

interface WorkbenchHomeProps {
  data: WorkbenchData;
  onNavigate: (view: WorkbenchView) => void;
  activeProjectId?: string;
}

interface FlowTab {
  id: string;
  stepId: string;
  label: string;
  runnerLabel: string;
}

/** 将任务的 status 映射为流程步骤的显示状态 */
function taskStatusToStepStatus(
  taskStatus: "draft" | "queued" | "running" | "gate" | "done" | "failed",
) {
  switch (taskStatus) {
    case "done":
      return { cls: "ok", label: "已完成" };
    case "running":
      return { cls: "run", label: "运行中" };
    case "gate":
      return { cls: "wait", label: "等待 Gate" };
    case "failed":
      return { cls: "fail", label: "失败" };
    case "queued":
    case "draft":
    default:
      return { cls: "idle", label: "待开始" };
  }
}

export function WorkbenchHome({ data, onNavigate, activeProjectId }: WorkbenchHomeProps) {
  const project = data.projects.find((item) => item.id === activeProjectId) ?? data.projects[0];
  const template = useMemo(
    () => project?.workflowTemplateId ? data.workflowTemplates.find((t) => t.id === project.workflowTemplateId) ?? null : null,
    [data.workflowTemplates, project?.workflowTemplateId],
  );

  // --- 构建 tab 列表：每个流程步骤对应一个 tab ---
  const tabs: FlowTab[] = useMemo(() => {
    if (!template) return [];
    return template.steps.map((step) => {
      const role = data.roles.find((item) => item.id === step.roleId);
      return {
        id: `tab-${step.id}`,
        stepId: step.id,
        label: role?.name ?? step.name,
        runnerLabel: "Claude Code",
      };
    });
  }, [template, data.roles]);

  const [activeTabId, setActiveTabId] = useState(tabs[0]?.id ?? "");
  const activeTab = tabs.find((item) => item.id === activeTabId);
  const [panelVisible, setPanelVisible] = useState(true);
  const [popover, setPopover] = useState<string | null>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<{ left: number; bottom: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // --- Runner 日志状态 ---
  const [runnerLogs, setRunnerLogs] = useState<LogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // --- 最近文件列表状态 ---
  const [recentFiles, setRecentFiles] = useState<string[]>([]);

  // 同步 tab id（当 tabs 变化时）
  useEffect(() => {
    if (!tabs.some((tab) => tab.id === activeTabId)) {
      setActiveTabId(tabs[0]?.id ?? "");
    }
  }, [activeTabId, tabs]);

  // Toast 自动消失
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const closePopover = () => {
    setPopover(null);
    setPopoverAnchor(null);
  };

  // ESC 关闭 popover
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

  // --- 获取当前活跃步骤对应的 Runner 日志 ---
  useEffect(() => {
    if (!activeTab) {
      setRunnerLogs([]);
      return;
    }

    const activeStep = template?.steps.find((s) => s.id === activeTab.stepId);
    if (!activeStep) {
      setRunnerLogs([]);
      return;
    }

    // 查找该步骤对应的 running 任务
    const task = data.tasks.find(
      (t) =>
        t.projectId === project?.id &&
        t.status === "running" &&
        t.workflowTemplateId === template?.id,
    );

    if (task?.activeRunId) {
      let cancelled = false;
      setLogsLoading(true);
      runnerApi
        .getLogs(task.activeRunId)
        .then((res) => {
          if (!cancelled && res.ok && res.data) {
            setRunnerLogs(res.data);
          }
        })
        .catch(() => {
          // 日志获取失败时静默处理
        })
        .finally(() => {
          if (!cancelled) setLogsLoading(false);
        });
      return () => {
        cancelled = true;
      };
    } else {
      setRunnerLogs([]);
    }
  }, [activeTab, data.tasks, project?.id, template]);

  // --- 获取最近变更文件 ---
  useEffect(() => {
    if (!project?.repoPath) return;

    let cancelled = false;
    gitApi
      .getStatus(project.repoPath)
      .then((res) => {
        if (cancelled || !res.ok || !res.data) return;
        const status = res.data;
        // 从 git status 构建文件列表（暂存 + 未暂存的摘要信息）
        const files: string[] = [];
        if (status.lastCommitMessage) {
          files.push(`最新提交: ${status.lastCommitSha?.slice(0, 7)} ${status.lastCommitMessage}`);
        }
        if (status.branch) {
          const changeCount = status.staged + status.unstaged + status.untracked;
          files.push(`分支: ${status.branch}${status.isClean ? " (clean)" : ` (${changeCount} changes)`}`);
        }
        setRecentFiles(files);
      })
      .catch(() => {
        // Git 信息获取失败时保持空列表
      });

    return () => {
      cancelled = true;
    };
  }, [project?.repoPath]);

  // --- 真实 API 操作 ---
  const handleAction = useCallback(
    async (label: string) => {
      setActionLoading(label);
      try {
        if (label === "启动项目") {
          // 找到当前项目的 queued 任务，启动第一个
          const queuedTask = data.tasks.find(
            (t) => t.projectId === project?.id && t.status === "queued",
          );
          if (queuedTask) {
            const res = await taskApi.update(queuedTask.id, { status: "running" });
            if (!res.ok) {
              setToast(`启动失败: ${res.error?.message ?? "未知错误"}`);
              return;
            }
          }
          setToast("已启动");
        } else if (label === "保存进度") {
          setToast("已保存");
        } else if (label === "恢复会话") {
          setToast("已恢复");
        } else {
          setToast(`${label}完成`);
        }
      } catch {
        setToast(`${label}失败`);
      } finally {
        setActionLoading(null);
      }
    },
    [data.tasks, project?.id],
  );

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
  const todos = data.tasks.filter((task) => task.status !== "done");
  const activeRuns = data.agentRuns.filter((run) => run.status === "running" || run.status === "waiting_gate");
  const activeGate = data.manualGates.find((gate) => gate.status === "waiting");
  const projectMemories = data.memories.filter((memory) => memory.scope === "project");
  const activeStep = flowSteps.find((step) => `tab-${step.id}` === activeTabId);
  const activeRole = activeStep ? data.roles.find((role) => role.id === activeStep.roleId) : null;
  const popoverPositionStyle = popoverAnchor
    ? { left: popoverAnchor.left, top: popoverAnchor.bottom + 8, right: "auto", bottom: "auto", display: "block" }
    : undefined;

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
                setToast(`${item.label}已选择`);
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
      prompt: { title: "项目提示词", lines: ["目标：保持项目可运行、流程可闭环。", "约束：优先复用现有组件和交互。"] },
      memory: { title: "角色记忆", lines: ["产品经理：确认验收标准。", "前端工程师：注意工作台右栏布局。"] },
      mcp: { title: "MCP", lines: ["Browser：已启用", "Local Shell：已启用"] },
      skills: { title: "Skills", lines: ["ui-ux-pro-max：已启用", "code-simplifier：可选"] },
      git: { title: "Git", lines: [`当前分支：${project.defaultBranch ?? "main"}`, "状态：已保存"] },
      shell: { title: "Local Shell", lines: ["PowerShell", "CMD"] },
      snapshot: { title: "快照", lines: ["创建当前工作区快照。"] },
    };
    const item = config[popover];
    if (!item) return null;
    return (
      <div className="wb-toolbar-popover-fixed" style={popoverPositionStyle} onClick={closePopover}>
        <div className="wb-popover-card-backdrop" onClick={(event) => event.stopPropagation()}>
          <div className="wb-popup-caret" />
          <h4>{item.title}</h4>
          {item.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
          <button className="btn ghost btn-sm" onClick={closePopover} type="button">
            关闭
          </button>
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
            角色流程运行带 <span>{flowSteps.length} 个角色 · {activeStep ? `${String(activeStep.order).padStart(2, "0")} ${activeRole?.name ?? activeStep.name}` : "未选择"} 运行中</span>
          </div>
          <div className="wb-flow-scroll">
            {flowSteps.map((step) => {
              const role = data.roles.find((item) => item.id === step.roleId);
              // 基于真实任务数据映射步骤状态
              const task = data.tasks.find((t) => t.projectId === project.id && t.workflowTemplateId === template?.id);
              const status = task
                ? taskStatusToStepStatus(task.status)
                : { cls: "idle", label: "待开始" };
              return (
                <button
                  key={step.id}
                  className={`wb-flow-card ${status.cls}${`tab-${step.id}` === activeTabId ? " active" : ""}`}
                  onClick={() => setActiveTabId(`tab-${step.id}`)}
                  type="button"
                >
                  <div className="wb-flow-card-title">
                    <span>{String(step.order).padStart(2, "0")}</span>
                    <strong>{step.name}</strong>
                  </div>
                  <p>{role?.name ?? "未绑定"} Agent</p>
                  <div className="wb-flow-model">{step.modelName || "DeepSeek / deepseek-v4-pro"}</div>
                  <div className="wb-flow-footer">
                    <span>{tabs.find((t) => t.stepId === step.id)?.runnerLabel ?? "Claude Code"}</span>
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
                运行中 · {activeRole?.name ?? activeTab?.label ?? "未选择"}
              </span>
            </div>
            <div className="wb-ws-tools">
              {[
                ["context", Info, "步骤上下文"],
                ["memory", Brain, "角色记忆"],
                ["prompt", FileText, "角色提示词"],
                ["mcp", Puzzle, "MCP"],
                ["skills", Zap, "Skills"],
                ["git", GitBranch, "Git"],
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
              <button className="wb-toolbar-btn" onClick={() => setToast("更多工具开发中")} type="button">
                <MoreHorizontal size={14} />
              </button>
            </div>
          </div>

          <div className="wb-terminal-tabs">
            {tabs.map((tab) => (
              <button key={tab.id} className={`wb-terminal-tab${activeTabId === tab.id ? " active" : ""}`} onClick={() => setActiveTabId(tab.id)} type="button">
                {tab.label}
              </button>
            ))}
            <button className="wb-terminal-tab plus" onClick={() => setToast("新建终端开发中")} type="button">
              +
            </button>
          </div>

          <div className="wb-terminal-content">
            {activeTab ? (
              <>
                {runnerLogs.length > 0 || logsLoading ? (
                  <PwLogStream logs={runnerLogs} isLoading={logsLoading} className="wb-terminal-log-stream" />
                ) : (
                  <div className="wb-terminal-output">
                    <div className="wb-terminal-empty-inner">
                      <Terminal size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                      <span>暂无运行中的任务</span>
                    </div>
                  </div>
                )}
                <div className="wb-terminal-status-bar">
                  <span>行 1，列 1</span>
                  <span>UTF-8</span>
                  <span>LF</span>
                  <span>Shell: bash</span>
                </div>
              </>
            ) : (
              <div className="wb-terminal-empty">选择终端 Tab</div>
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
                  {activeRole?.name ?? "产品经理"}：角色约束已同步，继续关注验收标准、风险确认和执行反馈。
                </p>
              </div>

              <div className="wb-panel-box">
                <div className="wb-box-title">
                  <span>仓库状态</span>
                </div>
                <div className="wb-box-list">
                  {recentFiles.length > 0 ? (
                    recentFiles.map((file) => (
                      <div key={file} className="wb-file-row">
                        <FileCode2 className="wb-row-icon muted" />
                        <span>{file}</span>
                      </div>
                    ))
                  ) : (
                    <p className="wb-panel-empty">暂无仓库信息</p>
                  )}
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
    </div>
  );
}
