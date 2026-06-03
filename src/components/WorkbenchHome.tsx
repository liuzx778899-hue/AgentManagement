import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import type { WorkbenchData, WorkbenchView } from "../domain/workbench";
import type { LogEntry, ProcessState } from "../types/localEngineering";
import { useLocalServices } from "../hooks/useLocalServices";
import { PwLogStream } from "./PwLogStream";

interface WorkbenchHomeProps {
  data: WorkbenchData;
  onNavigate: (view: WorkbenchView) => void;
  activeProjectId?: string;
}

interface TerminalTab {
  id: string;
  stepId: string;
  label: string;
  runnerLabel: string;
}

interface TabProcessState {
  processId: string | null;
  processState: ProcessState;
  logs: LogEntry[];
  error: string | null;
}

function buildTabs(data: WorkbenchData): TerminalTab[] {
  const template = data.workflowTemplates[0];
  if (!template) return [];
  return template.steps.slice(0, 3).map((step, index) => {
    const role = data.roles.find((item) => item.id === step.roleId);
    return {
      id: `tab-${step.id}`,
      stepId: step.id,
      label: role?.name ?? step.name,
      runnerLabel: index === 2 ? "Codex CLI" : "Claude Code",
    };
  });
}

function stepStatus(index: number, gateMode: string) {
  if (index <= 1) return { cls: "ok", label: "已完成" };
  if (index === 2) return { cls: "run", label: "运行中" };
  if (index === 3 && gateMode === "manual") return { cls: "wait", label: "等待 Gate" };
  return { cls: "idle", label: "待开始" };
}

const LOG_POLL_INTERVAL = 1500;

export function WorkbenchHome({ data, onNavigate, activeProjectId }: WorkbenchHomeProps) {
  const { processRunner } = useLocalServices();
  const project = data.projects.find((item) => item.id === activeProjectId) ?? data.projects[0];
  const template = data.workflowTemplates[0];
  const tabs = useMemo(() => buildTabs(data), [data]);
  const [activeTabId, setActiveTabId] = useState(tabs[0]?.id ?? "");
  const activeTab = tabs.find((item) => item.id === activeTabId);
  const [panelVisible, setPanelVisible] = useState(true);
  const [popover, setPopover] = useState<string | null>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<{ left: number; bottom: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Per-tab runner process state
  const [tabStates, setTabStates] = useState<Record<string, TabProcessState>>({});
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getTabState = useCallback((tabId: string): TabProcessState => {
    return tabStates[tabId] ?? { processId: null, processState: "idle", logs: [], error: null };
  }, [tabStates]);

  const updateTabState = useCallback((tabId: string, updates: Partial<TabProcessState>) => {
    setTabStates((prev) => ({
      ...prev,
      [tabId]: { ...(prev[tabId] ?? { processId: null, processState: "idle", logs: [], error: null }), ...updates },
    }));
  }, []);

  // Start a runner process for the given tab
  const handleStartRunner = useCallback(async (tab: TerminalTab) => {
    if (!project?.repoPath) return;
    const tabId = tab.id;

    // Duplicate start guard: if this tab already has a running or starting
    // process, do not spawn a second one.
    const currentState = tabStates[tabId];
    if (currentState && (currentState.processState === "running" || currentState.processState === "starting")) {
      return;
    }

    // If there is an existing processId (from a stopped/failed run) but the
    // process state is not running, clear it before restarting.
    updateTabState(tabId, { processState: "starting", error: null, processId: null });

    const runnerProfile = data.runnerProfiles.find((r) =>
      tab.runnerLabel === "Codex CLI" ? r.command.includes("codex") : r.command.includes("claude")
    );

    const command = runnerProfile?.command ?? "npm";
    const args = runnerProfile?.defaultArgs ?? ["run", "dev"];
    const env = runnerProfile?.envVars;

    const result = await processRunner.start({
      runnerId: runnerProfile?.id ?? tab.stepId,
      command,
      args,
      cwd: project.repoPath,
      env,
    });

    if (!result.ok || !result.data) {
      updateTabState(tabId, {
        processState: "failed",
        error: result.error?.message ?? "Failed to start process",
      });
      return;
    }

    updateTabState(tabId, {
      processId: result.data.id,
      processState: "running",
      logs: result.data.logs ?? [],
    });
  }, [project?.repoPath, data.runnerProfiles, processRunner, updateTabState, tabStates]);

  // Stop the runner process for the given tab
  const handleStopRunner = useCallback(async (tabId: string) => {
    const state = tabStates[tabId];
    if (!state?.processId) return;

    updateTabState(tabId, { processState: "stopping" });

    const result = await processRunner.stop(state.processId);
    if (result.ok) {
      updateTabState(tabId, {
        processState: "stopped",
        processId: null,
      });
    } else {
      updateTabState(tabId, {
        processState: "failed",
        error: result.error?.message ?? "Failed to stop process",
      });
    }
  }, [tabStates, processRunner, updateTabState]);

  // Poll for logs on all running processes
  useEffect(() => {
    const runningTabs = Object.entries(tabStates).filter(
      ([, state]) => state.processState === "running" && state.processId
    );

    if (runningTabs.length === 0) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      const updates = await Promise.all(
        runningTabs.map(async ([tabId, state]) => {
          if (!state.processId) return null;
          const logResult = await processRunner.getLogs(state.processId);
          if (logResult.ok && logResult.data) {
            return { tabId, logs: logResult.data };
          }
          return null;
        })
      );

      // Batch state updates
      setTabStates((prev) => {
        const next = { ...prev };
        for (const update of updates) {
          if (!update) continue;
          next[update.tabId] = {
            ...(next[update.tabId] ?? { processId: null, processState: "idle" as ProcessState, logs: [], error: null }),
            logs: update.logs,
          };
        }
        return next;
      });
    }, LOG_POLL_INTERVAL);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [tabStates, processRunner]);

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
      setToast(`${label}瀹屾垚`);
    }, 700);
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
  const todos = data.tasks.filter((task) => task.status !== "done");
  const activeRuns = data.agentRuns.filter((run) => run.status === "running" || run.status === "waiting_gate");
  const activeGate = data.manualGates.find((gate) => gate.status === "waiting");
  const projectMemories = data.memories.filter((memory) => memory.scope === "project");
  const recentFiles = ["src/components/WorkbenchHome.tsx", "src/styles/base.css", "docs/HANDOFF_NEXT_TASKS.md"];
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
            {flowSteps.map((step, index) => {
              const role = data.roles.find((item) => item.id === step.roleId);
              const status = stepStatus(index, step.gateMode);
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
                    <span>{tabs[index % Math.max(tabs.length, 1)]?.runnerLabel ?? "Claude Code"}</span>
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
                ["snapshot", Camera, "蹇収"],
              ].map(([id, Icon, label]) => {
                const ToolIcon = Icon as typeof Info;
                return (
                  <button key={id as string} className={`wb-toolbar-btn${popover === id ? " active" : ""}`} onClick={(event) => togglePopover(id as string, event.currentTarget)} type="button">
                    <ToolIcon size={14} />
                    <span>{label as string}</span>
                  </button>
                );
              })}
              <button className="wb-toolbar-btn" onClick={() => setToast("鏇村宸ュ叿寮€鍙戜腑")} type="button">
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
            <button className="wb-terminal-tab plus" onClick={() => setToast("鏂板缓缁堢寮€鍙戜腑")} type="button">
              +
            </button>
          </div>

          <div className="wb-terminal-content">
            {activeTab ? (
              <>
                <div className="wb-terminal-prompt-line">
                  <span className="terminal-prompt">agentdev@{project?.name ?? "AgentManagement"}</span>
                  <span>:</span>
                  <span className="terminal-path">~/{project?.name ?? "AgentManagement"}</span>
                  <span>$ </span>
                </div>
                {(() => {
                  const tabState = getTabState(activeTab.id);
                  const isRunning = tabState.processState === "running";
                  const isStarting = tabState.processState === "starting";
                  const isIdle = tabState.processState === "idle";
                  const isStopped = tabState.processState === "stopped" || tabState.processState === "failed";

                  return (
                    <div className="wb-terminal-runner-area">
                      {/* Runner controls */}
                      <div className="wb-terminal-controls">
                        {isIdle || isStopped ? (
                          <button
                            className="wb-runner-inline-btn start"
                            onClick={() => handleStartRunner(activeTab)}
                            disabled={isStarting}
                            type="button"
                          >
                            <Play size={12} />
                            <span>{isIdle ? "启动 Runner" : "重新启动"}</span>
                          </button>
                        ) : null}
                        {isRunning ? (
                          <button
                            className="wb-runner-inline-btn stop"
                            onClick={() => handleStopRunner(activeTab.id)}
                            disabled={tabState.processState === "stopping"}
                            type="button"
                          >
                            <Square size={12} />
                            <span>停止</span>
                          </button>
                        ) : null}
                        <span className={`wb-runner-state ${tabState.processState}`}>
                          {tabState.processState === "idle" ? "待启动"
                            : tabState.processState === "starting" ? "启动中..."
                            : tabState.processState === "running" ? "运行中"
                            : tabState.processState === "stopping" ? "停止中..."
                            : tabState.processState === "stopped" ? "已停止"
                            : tabState.error ?? "失败"}
                        </span>
                        {tabState.logs.length > 0 && (
                          <span className="wb-runner-log-count">{tabState.logs.length} 行日志</span>
                        )}
                      </div>

                      {/* Error display */}
                      {tabState.error && tabState.processState === "failed" && (
                        <div className="wb-terminal-error">
                          <span className="wb-error-icon">!</span>
                          <span>{tabState.error}</span>
                        </div>
                      )}

                      {/* Log stream */}
                      <PwLogStream
                        logs={tabState.logs}
                        autoScroll
                        isLoading={isStarting}
                        className="wb-terminal-log-stream"
                      />
                    </div>
                  );
                })()}
                <div className="wb-terminal-status-bar">
                  <span>UTF-8</span>
                  <span>LF</span>
                  <span>{activeTab.runnerLabel}</span>
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
                  {(() => {
                    // Aggregate runner status across all tabs
                    const allProcessStates = tabs.map((t) => getTabState(t.id).processState);
                    const hasRunning = allProcessStates.some((s) => s === "running");
                    const hasStarting = allProcessStates.some((s) => s === "starting");
                    const anyActive = hasRunning || hasStarting;
                    const stateCls = hasRunning ? "running" : hasStarting ? "starting" : "idle";
                    const stateLabel = hasRunning ? "运行中" : hasStarting ? "启动中" : "空闲";
                    return (
                      <span className={`wb-status-pill ${stateCls}`}>
                        <span className={`wb-status-dot ${stateCls}`} />
                        {stateLabel}
                      </span>
                    );
                  })()}
                </div>

                {/* Active tab process status */}
                {activeTab && (() => {
                  const tabState = getTabState(activeTab.id);
                  const processState = tabState.processState;
                  // Find AgentRun for active step
                  const activeAgentRun = data.agentRuns.find(
                    (run) => run.currentStepId === activeTab.stepId && (run.status === "running" || run.status === "starting" || run.status === "waiting_gate")
                  );
                  // Find task for the active step
                  const activeTask = data.tasks.find(
                    (task) => task.status === "running" || task.status === "queued"
                  );
                  // Get last log timestamp
                  const lastLogTime = tabState.logs.length > 0
                    ? tabState.logs[tabState.logs.length - 1].timestamp
                    : null;
                  // Format time helper
                  const fmtTime = (iso: string | null | undefined) => {
                    if (!iso) return "-";
                    try {
                      const d = new Date(iso);
                      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
                    } catch { return "-"; }
                  };
                  // Duration since start
                  const fmtDuration = (startIso: string | null | undefined) => {
                    if (!startIso) return "-";
                    try {
                      const ms = Date.now() - new Date(startIso).getTime();
                      if (ms < 60000) return `${Math.floor(ms / 1000)}s`;
                      if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
                      return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
                    } catch { return "-"; }
                  };
                  // Progress: how many steps have a non-idle process
                  const totalSteps = flowSteps.length || 1;
                  const completedSteps = flowSteps.filter((_, idx) => {
                    const stepTabId = `tab-${flowSteps[idx].id}`;
                    const s = getTabState(stepTabId);
                    return s.processState === "stopped";
                  }).length;
                  const runningSteps = flowSteps.filter((_, idx) => {
                    const stepTabId = `tab-${flowSteps[idx].id}`;
                    const s = getTabState(stepTabId);
                    return s.processState === "running" || s.processState === "starting";
                  }).length;
                  const progressPct = totalSteps > 0 ? Math.round(((completedSteps + runningSteps * 0.5) / totalSteps) * 100) : 0;
                  const progressCls = runningSteps > 0 ? "active" : completedSteps > 0 ? "active" : "idle";
                  return (
                    <>
                      {/* Process state row */}
                      <div className="wb-status-row">
                        <span className="wb-status-label">Runner 进程</span>
                        <span className={`wb-status-pill ${processState}`}>
                          <span className={`wb-status-dot ${processState}`} />
                          {processState === "idle" ? "空闲"
                            : processState === "starting" ? "启动中"
                            : processState === "running" ? "运行中"
                            : processState === "stopping" ? "停止中"
                            : processState === "stopped" ? "已停止"
                            : processState === "failed" ? "失败"
                            : processState}
                        </span>
                      </div>

                      {/* AgentRun status row */}
                      {activeAgentRun && (
                        <div className="wb-status-row">
                          <span className="wb-status-label">AgentRun</span>
                          <span className={`wb-status-pill ${activeAgentRun.status}`}>
                            <span className={`wb-status-dot ${activeAgentRun.status}`} />
                            {activeAgentRun.status === "starting" ? "启动中"
                              : activeAgentRun.status === "running" ? "运行中"
                              : activeAgentRun.status === "waiting_gate" ? "等待 Gate"
                              : activeAgentRun.status === "done" ? "已完成"
                              : activeAgentRun.status === "failed" ? "失败"
                              : activeAgentRun.status === "cancelled" ? "已取消"
                              : activeAgentRun.status}
                          </span>
                        </div>
                      )}

                      {/* Task status row */}
                      {activeTask && (
                        <div className="wb-status-row">
                          <span className="wb-status-label">Task</span>
                          <span className={`wb-status-pill ${activeTask.status}`}>
                            <span className={`wb-status-dot ${activeTask.status}`} />
                            {activeTask.status === "queued" ? "排队中"
                              : activeTask.status === "running" ? "运行中"
                              : activeTask.status === "gate" ? "Gate 决策"
                              : activeTask.status === "done" ? "已完成"
                              : activeTask.status === "failed" ? "失败"
                              : activeTask.status === "draft" ? "草稿"
                              : activeTask.status}
                          </span>
                        </div>
                      )}

                      <div className="wb-status-divider" />

                      {/* Timing rows */}
                      <div className="wb-status-row">
                        <span className="wb-status-label">开始时间</span>
                        <span className="wb-status-value">{fmtTime(activeAgentRun?.startedAt)}</span>
                      </div>
                      <div className="wb-status-row">
                        <span className="wb-status-label">运行时长</span>
                        <span className="wb-status-value">{fmtDuration(activeAgentRun?.startedAt)}</span>
                      </div>
                      <div className="wb-status-row">
                        <span className="wb-status-label">最近日志</span>
                        <span className="wb-status-value">{fmtTime(lastLogTime)}</span>
                      </div>
                      <div className="wb-status-row">
                        <span className="wb-status-label">日志行数</span>
                        <span className="wb-status-value">{tabState.logs.length}</span>
                      </div>

                      {/* Error display */}
                      {tabState.error && tabState.processState === "failed" && (
                        <div className="wb-status-error">{tabState.error}</div>
                      )}

                      {/* Progress bar */}
                      <div className="wb-status-progress">
                        <span className={progressCls} style={{ width: `${progressPct}%` }} />
                      </div>
                      <div className="wb-status-row">
                        <span className="wb-status-label">步骤进度</span>
                        <span className="wb-status-value">
                          {completedSteps}/{totalSteps} 完成
                          {runningSteps > 0 && ` · ${runningSteps} 运行中`}
                        </span>
                      </div>

                      {/* Aggregated counts */}
                      <div className="wb-status-divider" />
                      <div className="wb-status-row">
                        <span className="wb-status-label">活跃 Agent</span>
                        <span className="wb-status-value">{activeRuns.length}</span>
                      </div>
                      <div className="wb-status-row">
                        <span className="wb-status-label">待处理 Gate</span>
                        <span className="wb-status-value">{data.manualGates.filter((gate) => gate.status === "waiting").length}</span>
                      </div>

                      <div className="wb-status-actions">
                        <button className="wb-panel-link" onClick={() => handleAction("恢复会话")} type="button">
                          恢复会话
                        </button>
                      </div>
                    </>
                  );
                })()}
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

