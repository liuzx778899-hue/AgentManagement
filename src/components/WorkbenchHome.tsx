import { useEffect, useMemo, useState } from "react";
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
  Terminal,
  XCircle,
  Zap,
} from "lucide-react";
import type { WorkbenchData, WorkbenchView, Task } from "../domain/workbench";
import { getMyTasks, getWaitingTasks, getReadyTasks } from "../state/selectors";
import { WorkbenchTaskList } from "./WorkbenchTaskList";

interface WorkbenchHomeProps {
  data: WorkbenchData;
  onNavigate: (view: WorkbenchView) => void;
  activeProjectId?: string;
}

interface MockTab {
  id: string;
  label: string;
  runnerLabel: string;
  content: string;
}

function mockTabs(data: WorkbenchData): MockTab[] {
  const template = data.workflowTemplates[0];
  if (!template) return [];
  return template.steps.slice(0, 3).map((step, index) => {
    const role = data.roles.find((item) => item.id === step.roleId);
    const content =
      index === 0
        ? [
            `<span class="green">RUN</span>  v1.6.0 /home/agentdev/AgentManagement`,
            `  <span class="green">鉁?/span> src/utils/format.ts (18)`,
            `  <span class="green">鉁?/span> src/components/__tests__/NavBar.spec.tsx (12)`,
            `  <span class="green">鉁?/span> src/pages/__tests__/dashboard.spec.tsx (14)`,
            "",
            `Test Files  <span class="green">21 passed</span> (21)`,
            `Tests      <span class="green">99 passed</span> (99)`,
          ].join("\n")
        : index === 1
          ? [
              `<span class="green">VITE v5.3.2</span>  ready in 362 ms`,
              `  鉃? Local:   <span class="blue">http://localhost:5173/</span>`,
              `  鉃? Network: <span class="blue">http://192.168.1.100:5173/</span>`,
            ].join("\n")
          : ["On branch main", "Your branch is up to date with 'origin/main'.", "nothing to commit, working tree clean"].join("\n");

    return {
      id: `tab-${step.id}`,
      label: role?.name ?? step.name,
      runnerLabel: index === 2 ? "Codex CLI" : "Claude Code",
      content,
    };
  });
}

function stepStatus(index: number, gateMode: string) {
  if (index <= 1) return { cls: "ok", label: "已完成" };
  if (index === 2) return { cls: "run", label: "运行中" };
  if (index === 3 && gateMode === "manual") return { cls: "wait", label: "等待 Gate" };
  return { cls: "idle", label: "待开始" };
}

export function WorkbenchHome({ data, onNavigate, activeProjectId }: WorkbenchHomeProps) {
  const project = data.projects.find((item) => item.id === activeProjectId) ?? data.projects[0];
  const template = data.workflowTemplates[0];
  const tabs = useMemo(() => mockTabs(data), [data]);
  const [activeTabId, setActiveTabId] = useState(tabs[0]?.id ?? "");
  const activeTab = tabs.find((item) => item.id === activeTabId);
  const [panelVisible, setPanelVisible] = useState(true);
  const [popover, setPopover] = useState<string | null>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<{ left: number; bottom: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

  // Issue #30: 计算分类任务
  // 使用第一个角色的 ID 作为当前角色（演示用）
  // TODO: 后续需要从用户登录状态或设置中获取实际当前角色
  const currentRoleId = data.roles[0]?.id ?? "";
  const projectTasks = data.tasks.filter((task) => task.projectId === project.id);

  const myTasks = useMemo(() => getMyTasks(projectTasks, currentRoleId), [projectTasks, currentRoleId]);
  const waitingTasks = useMemo(() => getWaitingTasks(projectTasks), [projectTasks]);
  const readyTasks = useMemo(() => getReadyTasks(projectTasks), [projectTasks]);

  const handleTaskClick = (task: Task) => {
    // TODO: 实现任务点击处理（如打开任务详情或启动任务）
    setToast(`点击任务: ${task.goal.slice(0, 30)}`);
  };
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
                <div
                  className="wb-terminal-output"
                  dangerouslySetInnerHTML={{
                    __html:
                      `<span class="terminal-prompt">agentdev@AgentManagement</span>:<span class="terminal-path">~/AgentManagement</span>$ npm run dev\n\n` +
                      `> agentmanagement@0.1.0 dev\n> vite\n\n` +
                      activeTab.content +
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
              {/* Issue #30: 工作台任务分类展示 */}
              <WorkbenchTaskList
                myTasks={myTasks}
                waitingTasks={waitingTasks}
                readyTasks={readyTasks}
                roles={data.roles}
                onTaskClick={handleTaskClick}
              />

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

