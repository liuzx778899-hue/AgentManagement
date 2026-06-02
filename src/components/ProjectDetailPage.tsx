import { useState, useMemo } from "react";
import {
  ArrowLeft,
  Activity,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Target,
  FileText,
  History,
  Users,
  GitBranch,
  ExternalLink,
  RefreshCw,
  FolderGit2,
  GanttChartSquare,
  Save,
  Star,
} from "lucide-react";
import type { WorkbenchData } from "../domain/workbench";

// ── Types ──────────────────────────────────────────────────────────────

interface ProjectDetailPageProps {
  data: WorkbenchData;
  projectId: string;
  onBack: () => void;
  onEnterWorkbench: (projectId: string) => void;
}

type DetailTab = "overview" | "plan" | "progress" | "risk" | "roles" | "files" | "changelog";

interface SelectedObjectState {
  type: "task" | "risk" | "role" | "gate" | "gantt" | "file" | "changelog" | null;
  id: string;
}

type TaskPriority = "P0" | "P1" | "P2" | "P3" | "P4";

interface ComputedRisk {
  id: string;
  title: string;
  probability: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
  level: string;
  mitigation: string;
  owner: string;
  status: "open" | "mitigated" | "closed";
}

interface ChangelogEntry {
  id: string;
  type: "plan" | "progress" | "confirmation" | "ai";
  title: string;
  description: string;
  time: string;
  tag?: { label: string; className: string };
}

interface RoleDataItem {
  id: string;
  name: string;
  shortLabel: string;
  avatarClass: string;
  description: string;
  promptSummary: string;
  capabilities: string[];
  memoryCount: number;
  stepName?: string;
}

// ── Constants ──────────────────────────────────────────────────────────

const TAB_CONFIG: { key: DetailTab; label: string; icon: typeof Target }[] = [
  { key: "overview", label: "项目概况", icon: Target },
  { key: "plan", label: "计划与任务", icon: GanttChartSquare },
  { key: "progress", label: "进度视图", icon: Activity },
  { key: "risk", label: "风险与决策", icon: AlertTriangle },
  { key: "roles", label: "角色与流程", icon: Users },
  { key: "files", label: "协同文件", icon: FileText },
  { key: "changelog", label: "变更记录", icon: History },
];

const riskLabels: Record<string, string> = {
  low: "低风险",
  medium: "中风险",
  high: "高风险",
  critical: "严重风险",
};

const riskColors: Record<string, string> = {
  low: "var(--ok)",
  medium: "var(--warn)",
  high: "var(--danger)",
  critical: "var(--danger)",
};

const runStatusLabels: Record<string, string> = {
  idle: "空闲",
  running: "运行中",
  paused: "已暂停",
  completed: "已完成",
};

const runStatusColors: Record<string, string> = {
  idle: "var(--muted)",
  running: "var(--primary)",
  paused: "var(--warn)",
  completed: "var(--ok)",
};

const typeLabels: Record<string, string> = {
  task: "当前任务",
  risk: "风险",
  role: "角色",
  gate: "Gate",
  gantt: "进度条",
  file: "协同文件",
  changelog: "变更记录",
};

const TASK_PRIORITY_OPTIONS: TaskPriority[] = ["P0", "P1", "P2", "P3", "P4"];

const taskPriorityMeta: Record<TaskPriority, { label: string; hint: string }> = {
  P0: { label: "紧急", hint: "阻塞项，优先处理" },
  P1: { label: "高优先级", hint: "本阶段关键交付" },
  P2: { label: "中优先级", hint: "按计划推进" },
  P3: { label: "低优先级", hint: "可排期处理" },
  P4: { label: "观察项", hint: "暂不阻塞主线" },
};

function formatSyncTime(iso: string | undefined): string {
  if (!iso) return "未同步";
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "刚刚";
    if (diffMin < 60) return `${diffMin}分钟前`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}小时前`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}天前`;
  } catch {
    return "未知";
  }
}

function formatDateShort(iso: string): string {
  try {
    const d = new Date(iso);
    return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return "";
  }
}

// ── Component ──────────────────────────────────────────────────────────

export function ProjectDetailPage({ data, projectId, onBack, onEnterWorkbench }: ProjectDetailPageProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diffModalOpen, setDiffModalOpen] = useState(false);
  const [priorityModalOpen, setPriorityModalOpen] = useState(false);
  const [taskPriorityOverrides, setTaskPriorityOverrides] = useState<Record<string, TaskPriority>>({});

  // Get default selected task (highest progress, status running or gate)
  const getDefaultSelectedTask = useMemo(() => {
    const tasks = data.tasks.filter((t) => t.projectId === projectId);
    // Filter tasks with status "running" or "gate"
    const activeTasks = tasks.filter((t) => t.status === "running" || t.status === "gate");
    if (activeTasks.length === 0) {
      // Fall back to first task if no active tasks
      const firstTask = tasks[0];
      return firstTask ? { type: "task" as const, id: firstTask.id } : null;
    }
    // Sort by progress (if available) or pick first
    // For now, just pick first active task
    return { type: "task" as const, id: activeTasks[0].id };
  }, [data.tasks, projectId]);

  const [selected, setSelected] = useState<SelectedObjectState>(() => getDefaultSelectedTask || { type: null, id: "" });

  const project = data.projects.find((p) => p.id === projectId);

  // Project tasks
  const projectTasks = useMemo(
    () => data.tasks.filter((t) => t.projectId === projectId),
    [data.tasks, projectId]
  );

  const priorityModalTask = useMemo(() => {
    if (selected.type === "task") {
      return projectTasks.find((t) => t.id === selected.id) ?? projectTasks[0] ?? null;
    }
    return projectTasks[0] ?? null;
  }, [projectTasks, selected.id, selected.type]);

  const getTaskPriority = (taskId: string): TaskPriority => {
    if (taskPriorityOverrides[taskId]) return taskPriorityOverrides[taskId];
    const taskIndex = projectTasks.findIndex((t) => t.id === taskId);
    const safeIndex = taskIndex >= 0 ? taskIndex : 0;
    return TASK_PRIORITY_OPTIONS[safeIndex % TASK_PRIORITY_OPTIONS.length];
  };

  // Project gates
  const projectGates = useMemo(() => {
    const taskIds = new Set(projectTasks.map((t) => t.id));
    return data.manualGates.filter((g) => taskIds.has(g.taskId));
  }, [data.manualGates, projectTasks]);

  // Template
  const template = useMemo(() => {
    if (!project?.workflowTemplateId) return null;
    return data.workflowTemplates.find((t) => t.id === project.workflowTemplateId);
  }, [data.workflowTemplates, project?.workflowTemplateId]);

  // Handlers
  const handleCheckProgress = () => {
    setDiffModalOpen(true);
  };

  const handleSaveChanges = () => {
    alert("变更已保存（Phase 1 模拟）");
  };

  const handleViewDiff = () => {
    setDiffModalOpen(true);
  };

  const handleSelect = (type: SelectedObjectState["type"], id: string) => {
    setSelected({ type, id });
  };

  const handleOpenPriorityModal = () => {
    if (priorityModalTask && selected.id !== priorityModalTask.id) {
      setSelected({ type: "task", id: priorityModalTask.id });
    }
    setPriorityModalOpen(true);
  };

  const handleApplyPriority = (priority: TaskPriority) => {
    if (!priorityModalTask) return;
    setTaskPriorityOverrides((prev) => ({
      ...prev,
      [priorityModalTask.id]: priority,
    }));
    setSelected({ type: "task", id: priorityModalTask.id });
    setPriorityModalOpen(false);
  };

  // ── State: Error ─────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="project-detail-page">
        <div className="pd-state-container">
          <div className="pd-state-icon error">
            <AlertTriangle size={48} />
          </div>
          <h2>项目详情加载失败</h2>
          <p className="pd-state-desc">{error}</p>
          <div className="pd-state-actions">
            <button className="btn" onClick={() => setError(null)} type="button">
              <RefreshCw size={16} />
              重试
            </button>
            <button className="btn" onClick={onBack} type="button">
              <ArrowLeft size={16} />
              返回项目列表
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── State: Loading ───────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="project-detail-page">
        <div className="pd-skeleton-header" />
        <div className="pd-skeleton-tabs" />
        <div className="pd-skeleton-content">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="pd-skeleton-row" />
          ))}
        </div>
      </div>
    );
  }

  // ── State: Empty / No project ────────────────────────────────────────

  if (!project) {
    return (
      <div className="project-detail-page">
        <div className="pd-state-container">
          <div className="pd-state-icon empty">
            <FolderGit2 size={48} />
          </div>
          <h2>项目未找到</h2>
          <p className="pd-state-desc">请选择一个有效的项目</p>
          <div className="pd-state-actions">
            <button className="btn primary" onClick={onBack} type="button">
              <ArrowLeft size={16} />
              返回项目列表
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── State: No plan (empty plan) ──────────────────────────────────────

  const hasPlan = template && projectTasks.length > 0;

  if (!hasPlan) {
    return (
      <div className="project-detail-page">
        {/* Cockpit header */}
        <header className="pd-cockpit-header">
          <div className="pd-cockpit-top">
            <div className="pd-cockpit-info">
              <button className="pd-back-btn" onClick={onBack} type="button" title="返回项目管理">
                <ArrowLeft size={18} />
              </button>
              <span className="pd-project-name">{project.name}</span>
            </div>
          </div>
        </header>

        <div className="pd-empty-hint" style={{ flex: 1 }}>
          <AlertTriangle />
          <p>需要补充信息</p>
          <span>前往设置或导入协同文件以开始项目</span>
          <div className="pd-state-actions">
            <button className="btn" onClick={onBack} type="button">
              <ArrowLeft size={16} />
              返回项目设置
            </button>
          </div>
        </div>
      </div>
    );
  }

  // At this point project is guaranteed non-null (guard above)
  const p = project;

  // ── Computed data from real sources ──────────────────────────────────

  // 1. computedRisks - derived from project.riskLevel + projectGates + projectTasks
  const computedRisks = useMemo<ComputedRisk[]>(() => {
    const risks: ComputedRisk[] = [];
    const waitingGates = projectGates.filter((g) => g.status === "waiting");
    const failedTasks = projectTasks.filter((t) => t.status === "failed");

    // Risk from project risk level
    if (p.riskLevel === "high" || p.riskLevel === "critical") {
      risks.push({
        id: "risk-project-level",
        title: `项目整体风险偏高（${riskLabels[p.riskLevel ?? "low"]}）`,
        probability: "high",
        impact: "high",
        level: p.riskLevel ?? "high",
        mitigation: "建议定期检查项目健康状态，及时处理阻塞项",
        owner: "PM Agent",
        status: "open",
      });
    }

    // Risks from waiting gates
    for (const gate of waitingGates) {
      risks.push({
        id: `risk-gate-${gate.id}`,
        title: `决策阻塞：${gate.summary || "待处理 Gate"}`,
        probability: "high",
        impact: "medium",
        level: "high",
        mitigation: "尽快确认 Gate 决策，避免阻塞后续流程",
        owner: "PM Agent",
        status: "open",
      });
    }

    // Risks from failed tasks
    for (const task of failedTasks) {
      risks.push({
        id: `risk-task-${task.id}`,
        title: `任务失败：${task.goal}`,
        probability: "medium",
        impact: "high",
        level: "high",
        mitigation: "排查失败原因，修复后重试或调整计划",
        owner: template?.steps?.[0]?.roleId
          ? (data.roles.find((r) => r.id === template.steps[0].roleId)?.name ?? "负责角色")
          : "负责角色",
        status: "open",
      });
    }

    // If no risks found, add a low-level default
    if (risks.length === 0) {
      risks.push({
        id: "risk-none",
        title: "当前无明显风险",
        probability: "low",
        impact: "low",
        level: "low",
        mitigation: "保持当前节奏，持续监控",
        owner: "PM Agent",
        status: "mitigated",
      });
    }

    return risks;
  }, [p.riskLevel, projectGates, projectTasks, template?.steps, data.roles]);

  // 2. riskMatrix - quadrant filtering from computedRisks
  const riskMatrix = useMemo(() => ({
    highHigh: computedRisks.filter((r) => r.probability === "high" && r.impact === "high"),
    highLow: computedRisks.filter((r) => r.probability === "high" && r.impact !== "high"),
    lowHigh: computedRisks.filter((r) => r.probability !== "high" && r.impact === "high"),
    lowLow: computedRisks.filter((r) => r.probability !== "high" && r.impact !== "high"),
  }), [computedRisks]);

  // 3. changelogEntries - from projectGates + projectTasks
  const changelogEntries = useMemo<ChangelogEntry[]>(() => {
    const entries: ChangelogEntry[] = [];

    // Gate events
    for (const gate of projectGates) {
      if (gate.status === "approved") {
        entries.push({
          id: `cl-gate-${gate.id}-approved`,
          type: "confirmation",
          title: "Gate 已通过",
          description: gate.summary || "决策已确认通过",
          time: gate.resolvedAt ?? gate.createdAt,
        });
      } else if (gate.status === "rejected") {
        entries.push({
          id: `cl-gate-${gate.id}-rejected`,
          type: "confirmation",
          title: "Gate 已拒绝",
          description: gate.summary || "决策已被拒绝",
          time: gate.resolvedAt ?? gate.createdAt,
          tag: { label: "已拒绝", className: "rejected" },
        });
      } else if (gate.status === "waiting") {
        entries.push({
          id: `cl-gate-${gate.id}-waiting`,
          type: "ai",
          title: "等待决策确认",
          description: gate.summary || "有 Gate 等待人工确认",
          time: gate.createdAt,
          tag: { label: "待确认", className: "adopted" },
        });
      }
    }

    // Task status events
    for (const task of projectTasks) {
      if (task.status === "done") {
        entries.push({
          id: `cl-task-${task.id}-done`,
          type: "progress",
          title: `任务完成：${task.goal}`,
          description: `任务已完成，验收标准 ${task.acceptanceCriteria.length} 项`,
          time: task.updatedAt,
        });
      } else if (task.status === "failed") {
        entries.push({
          id: `cl-task-${task.id}-failed`,
          type: "progress",
          title: `任务失败：${task.goal}`,
          description: "任务执行失败，需要排查原因",
          time: task.updatedAt,
          tag: { label: "失败", className: "rejected" },
        });
      } else if (task.status === "running") {
        entries.push({
          id: `cl-task-${task.id}-running`,
          type: "progress",
          title: `任务进行中：${task.goal}`,
          description: "任务正在执行中",
          time: task.updatedAt,
        });
      } else if (task.status === "gate") {
        entries.push({
          id: `cl-task-${task.id}-gate`,
          type: "confirmation",
          title: `任务等待决策：${task.goal}`,
          description: "任务到达 Gate，等待人工确认",
          time: task.updatedAt,
        });
      }
    }

    // Sort by time descending (most recent first)
    entries.sort((a, b) => {
      const ta = a.time ? new Date(a.time).getTime() : 0;
      const tb = b.time ? new Date(b.time).getTime() : 0;
      return tb - ta;
    });

    return entries;
  }, [projectGates, projectTasks]);

  // 4. phases - from template steps
  const phases = useMemo(() => template?.steps?.map((s) => s.name) ?? [], [template?.steps]);

  // 5. aiProgressCheck - from projectTasks stats
  const aiProgressCheck = useMemo(() => {
    const totalTasks = projectTasks.length;
    const doneTasks = projectTasks.filter((t) => t.status === "done").length;
    const progressPct = p.progress ?? (totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0);
    const changesCount = p.discoveryChanges ?? changelogEntries.length;
    const oldProgress = Math.max(0, progressPct - changesCount);

    const runningTasks = projectTasks.filter((t) => t.status === "running");
    const changeSummary = runningTasks.length > 0
      ? runningTasks.map((t) => t.goal).join("、") + " 进行中"
      : (doneTasks > 0 ? `${doneTasks} 项任务已完成` : "暂无进行中的变更");

    return {
      changesCount,
      oldProgress,
      newProgress: progressPct,
      changeSummary,
    };
  }, [p.progress, p.discoveryChanges, projectTasks, changelogEntries.length]);

  // 6. roleData - from template.steps + data.roles
  const roleData = useMemo<RoleDataItem[]>(() => {
    if (!template?.steps) return [];

    const seenRoleIds = new Set<string>();
    const items: RoleDataItem[] = [];

    for (const step of template.steps) {
      if (seenRoleIds.has(step.roleId)) continue;
      seenRoleIds.add(step.roleId);

      const role = data.roles.find((r) => r.id === step.roleId);
      if (!role) continue;

      const memoryCount = data.memories.filter(
        (m) => m.projectId === projectId && m.roleId === role.id
      ).length;

      items.push({
        id: role.id,
        name: role.name,
        shortLabel: role.name[0],
        avatarClass: role.id,
        description: role.description,
        promptSummary: role.roleMarkdown?.slice(0, 200) ?? "",
        capabilities: role.defaultCapabilities ?? [],
        memoryCount,
        stepName: step.name,
      });
    }

    return items;
  }, [template?.steps, data.roles, data.memories, projectId]);

  // 7. kpis - from real data
  const kpis = useMemo(() => {
    const totalTasks = projectTasks.length;
    const runningTasks = projectTasks.filter((t) => t.status === "running").length;
    const doneTasks = projectTasks.filter((t) => t.status === "done").length;
    const progressPct = aiProgressCheck.newProgress;
    const pendingConfirmations = projectGates.filter((g) => g.status === "waiting").length;
    const gatesTotal = projectGates.length;
    const testsPassed = doneTasks;
    const highRiskCount = computedRisks.filter((r) => r.level === "high" || r.level === "critical").length;

    return {
      totalProgress: progressPct,
      pendingConfirmations,
      gatesTotal,
      testsPassed,
      highRiskCount,
      runningTasks,
      doneTasks,
      totalTasks,
    };
  }, [projectTasks, projectGates, aiProgressCheck.newProgress, computedRisks]);

  // 8. nextCheckpointInfo - first gate task or first running task
  const nextCheckpointInfo = useMemo(() => {
    const gateTask = projectTasks.find((t) => t.status === "gate");
    if (gateTask) {
      const gate = projectGates.find((g) => g.taskId === gateTask.id);
      return {
        title: gateTask.goal,
        deadline: gate?.createdAt ?? gateTask.updatedAt,
        owner: (() => {
          const roleIds = Object.values(gateTask.roleAssignment ?? {});
          if (roleIds.length === 0) return "未分配";
          return roleIds.map((rid) => data.roles.find((r) => r.id === rid)?.name ?? rid).join("、");
        })(),
        criteria: gateTask.acceptanceCriteria,
      };
    }
    const runningTask = projectTasks.find((t) => t.status === "running");
    if (runningTask) {
      return {
        title: runningTask.goal,
        deadline: runningTask.updatedAt,
        owner: (() => {
          const roleIds = Object.values(runningTask.roleAssignment ?? {});
          if (roleIds.length === 0) return "未分配";
          return roleIds.map((rid) => data.roles.find((r) => r.id === rid)?.name ?? rid).join("、");
        })(),
        criteria: runningTask.acceptanceCriteria,
      };
    }
    return null;
  }, [projectTasks, projectGates, data.roles]);

  // 9. timelineMilestones - from project.createdAt + template steps
  const timelineMilestones = useMemo(() => {
    const milestones: { date: string; title: string; status: string; sub: string }[] = [];

    if (p.createdAt) {
      milestones.push({
        date: formatDateShort(p.createdAt),
        title: "项目启动",
        status: "done",
        sub: formatDateShort(p.createdAt),
      });
    }

    if (template?.steps) {
      template.steps.forEach((step, i) => {
        // Find a task that references this step via roleAssignment
        const taskForStep = projectTasks.find((t) => {
          const assignedSteps = Object.keys(t.roleAssignment ?? {});
          return assignedSteps.includes(step.id);
        });

        let status = "";
        let sub = "";

        if (taskForStep) {
          if (taskForStep.status === "done") {
            status = "done";
            sub = "已完成";
          } else if (taskForStep.status === "running") {
            status = "active";
            sub = "进行中";
          } else if (taskForStep.status === "gate") {
            status = "active";
            sub = "等待决策";
          } else if (taskForStep.status === "failed") {
            status = "";
            sub = "失败";
          } else {
            status = "";
            sub = formatDateShort(p.createdAt);
          }
        } else {
          // No task for this step yet - show as pending
          status = "";
          sub = phases[i] ?? "";
        }

        milestones.push({
          date: taskForStep ? formatDateShort(taskForStep.updatedAt) : "--/--",
          title: step.name,
          status,
          sub,
        });
      });
    }

    // Final milestone
    if (p.nextCheckpoint) {
      milestones.push({
        date: formatDateShort(p.nextCheckpoint),
        title: "下一验收点",
        status: "",
        sub: formatDateShort(p.nextCheckpoint),
      });
    }

    return milestones;
  }, [p.createdAt, p.nextCheckpoint, template?.steps, projectTasks, phases]);

  const riskLevelColor = riskColors[p.riskLevel ?? "low"] ?? "var(--ok)";
  const riskLevelLabel = riskLabels[p.riskLevel ?? "low"] ?? "低风险";
  const runStatus = p.runStatus ?? "running";
  const runStatusLabel = runStatusLabels[runStatus] ?? "未知";
  const runStatusColor = runStatusColors[runStatus] ?? "var(--muted)";
  const syncTime = formatSyncTime(p.lastCheckAt);

  // ── Tab Content Renders ──────────────────────────────────────────────

  function renderOverviewTab() {
    // Build plan rows from real tasks
    const overviewTasks = projectTasks.slice(0, 6);

    return (
      <div className="pd-overview-grid">
        <section className="pd-panel">
          <div className="pd-panel-head"><h2>项目基本信息</h2></div>
          <div className="pd-panel-body pd-info-list">
            <div className="pd-info-row"><label>项目说明</label><span>{p.settings.projectDescription ?? "暂无项目说明"}</span></div>
            <div className="pd-info-row"><label>当前 Phase</label><span>{p.phase ?? "未设置"}</span></div>
            <div className="pd-info-row"><label>交付物</label><span>{template?.steps?.flatMap((s) => s.outputs ?? []).join("、") || "暂无交付物定义"}</span></div>
            <div className="pd-info-row"><label>验收口径</label><span>{projectTasks.flatMap((t) => t.acceptanceCriteria).join("、") || "暂无验收标准"}</span></div>
            <div className="pd-info-row"><label>项目路径</label><span>{p.repoPath}</span></div>
            <div className="pd-info-row"><label>默认分支</label><span>{p.defaultBranch}</span></div>
            <div className="pd-info-row"><label>工作区</label><span>{p.worktreeRoot}</span></div>
          </div>
        </section>
        <section className="pd-panel">
          <div className="pd-panel-head"><h2>计划摘要</h2><a>查看全部任务</a></div>
          <div className="pd-panel-body">
            <div className="pd-plan-row"><span>优先级</span><span>任务</span><span>状态</span><span>负责人</span><span>进度</span></div>
            {overviewTasks.length > 0 ? overviewTasks.map((task) => {
              const priority = getTaskPriority(task.id);
              const statusLabel = task.status === "running" ? "推进中"
                : task.status === "done" ? "完成"
                : task.status === "gate" ? "等待决策"
                : task.status === "failed" ? "失败"
                : task.status === "queued" ? "已排队"
                : "待开始";
              const statusColor = task.status === "done" ? "var(--ok)"
                : task.status === "running" ? "#7c96ff"
                : task.status === "gate" ? "var(--warn)"
                : task.status === "failed" ? "var(--danger)"
                : "var(--muted)";
              const barPct = task.status === "done" ? 100
                : task.status === "running" ? 65
                : task.status === "gate" ? 50
                : 0;
              // Get role name from task's roleAssignment
              const roleNames = Object.values(task.roleAssignment ?? {}).map((rid) =>
                data.roles.find((r) => r.id === rid)?.name ?? rid
              ).join("、") || "未分配";
              const barClass = task.status === "done" ? "" : task.status === "running" ? "blue" : "warn";

              return (
                <div className="pd-plan-row" key={task.id}>
                  <span className={`pd-prio ${priority.toLowerCase()}`}>{priority}</span>
                  <b>{task.goal}</b>
                  <span style={{ color: statusColor }}>{statusLabel}</span>
                  <span>{roleNames}</span>
                  <div className={`pd-bar-mini ${barClass}`}><span style={{ width: `${barPct}%` }} /></div>
                </div>
              );
            }) : (
              <div className="pd-plan-row"><span>暂无任务</span></div>
            )}
          </div>
        </section>
        <section className="pd-panel">
          <div className="pd-panel-head"><h2>协同来源</h2></div>
          <div className="pd-panel-body pd-sources">
            <div className="pd-source">
              <span className="pd-file-icon" />
              <span>暂无协同文件<small>功能开发中</small></span>
            </div>
          </div>
        </section>
      </div>
    );
  }

  function renderPlanTabDesign() {
    const planRows = projectTasks.map((task) => {
      const priority = getTaskPriority(task.id);
      const roleNames = Object.values(task.roleAssignment ?? {}).map((rid) =>
        data.roles.find((r) => r.id === rid)?.name ?? rid
      ).join("、") || "未分配";
      const barPct = task.status === "done" ? 100
        : task.status === "running" ? 65
        : task.status === "gate" ? 50
        : 0;
      const statusLabel = task.status === "running" ? "推进中"
        : task.status === "done" ? "完成"
        : task.status === "gate" ? "等待决策"
        : task.status === "failed" ? "失败"
        : "待处理";
      const tone = task.status === "done" ? "ok"
        : task.status === "running" ? "blue"
        : task.status === "gate" ? "warn"
        : "warn";

      return {
        id: task.id,
        priority,
        task: task.goal,
        phase: p.phase ?? "未设置",
        role: roleNames,
        progress: barPct,
        status: statusLabel,
        tone,
      };
    });

    return (
      <section className="pd-design-panel pd-plan-tab">
        <div className="pd-design-panel-head">
          <h2>计划与任务</h2>
          <button type="button" onClick={handleOpenPriorityModal}>调整优先级</button>
        </div>
        <div className="pd-design-table pd-plan-task-table">
          <div className="pd-design-table-head">
            <span>优先级</span>
            <span>任务</span>
            <span>阶段</span>
            <span>负责人</span>
            <span>进度</span>
            <span>状态</span>
          </div>
          {planRows.length > 0 ? planRows.map((row) => (
            <button
              key={row.id}
              className="pd-design-table-row"
              type="button"
              onClick={() => handleSelect("task", row.id)}
            >
              <span className={`pd-prio ${row.priority.toLowerCase()}`}>{row.priority}</span>
              <strong>{row.task}</strong>
              <span>{row.phase}</span>
              <span>{row.role}</span>
              <span className={`pd-bar-mini ${row.tone === "blue" ? "blue" : row.tone === "warn" ? "warn" : ""}`}>
                <span style={{ width: `${row.progress}%` }} />
              </span>
              <span className={`pd-plan-status ${row.tone}`}>{row.status}</span>
            </button>
          )) : (
            <div className="pd-design-table-row" style={{ color: "var(--muted)", padding: "var(--space-lg)" }}>
              暂无任务数据
            </div>
          )}
        </div>
      </section>
    );
  }

  function renderProgressTabDesign() {
    const days = phases.length > 0 ? phases : ["阶段1", "阶段2", "阶段3", "阶段4"];
    const ganttRows = projectTasks.map((task, i) => {
      const roleNames = Object.values(task.roleAssignment ?? {}).map((rid) =>
        data.roles.find((r) => r.id === rid)?.name ?? rid
      ).join("、") || "未分配";
      const className = task.status === "done" ? "ok"
        : task.status === "running" ? "blue"
        : task.status === "failed" ? "orange"
        : task.status === "gate" ? "purple"
        : "";
      const totalSteps = phases.length || 1;
      const startPct = Math.round((i / totalSteps) * 80);
      const spanPct = Math.round(80 / totalSteps);
      return {
        id: task.id,
        task: `${getTaskPriority(task.id)} ${task.goal}`,
        role: roleNames,
        className,
        start: startPct,
        span: spanPct,
      };
    });

    return (
      <section className="pd-design-panel pd-gantt-tab">
        <div className="pd-design-panel-head">
          <h2>进度视图 · 甘特图</h2>
          <div className="pd-design-head-actions">
            <button type="button">今天</button>
            <button type="button">周视图</button>
          </div>
        </div>
        <div className="pd-design-gantt">
          <div className="pd-design-gantt-today" />
          <div className="pd-design-gantt-head">
            <span>任务</span>
            <span>负责人</span>
            {days.map((day, index) => <span key={index}>{day}</span>)}
          </div>
          {ganttRows.length > 0 ? ganttRows.map((row) => (
            <button
              key={row.id}
              className="pd-design-gantt-row"
              type="button"
              onClick={() => handleSelect("gantt", row.id)}
            >
              <strong>{row.task}</strong>
              <span>{row.role}</span>
              {days.map((_, index) => (
                <span key={index} className="pd-design-gantt-track">
                  {index === 0 && (
                    <i
                      className={`pd-design-gantt-bar ${row.className}`}
                      style={{ left: `${row.start}%`, width: `${row.span}%` }}
                    />
                  )}
                </span>
              ))}
            </button>
          )) : (
            <div style={{ color: "var(--muted)", padding: "var(--space-lg)" }}>
              暂无任务进度数据
            </div>
          )}
        </div>
      </section>
    );
  }

  function renderRiskTab() {
    // Gates blocking this project
    const blockingGates = data.manualGates.filter((g) => {
      const task = data.tasks.find((t) => t.id === g.taskId);
      return task && task.projectId === projectId && g.status === "waiting";
    });

    // SWOT data - derived from real project data
    const swotData = {
      strengths: [
        p.settings.projectDescription
          ? `项目目标明确：${p.settings.projectDescription.slice(0, 30)}`
          : "项目已创建并配置工作流",
        template ? `工作流已定义：${template.name}` : "工作流待配置",
        projectTasks.length > 0 ? `${projectTasks.length} 项任务已规划` : "任务规划中",
      ],
      weaknesses: [
        projectTasks.filter((t) => t.status === "failed").length > 0
          ? `${projectTasks.filter((t) => t.status === "failed").length} 项任务失败`
          : "暂无任务失败记录",
        !p.settings.projectDescription ? "项目描述未填写" : "项目描述已完善",
        p.healthScore !== undefined && p.healthScore < 50 ? `健康分偏低（${p.healthScore}）` : "项目健康状态正常",
      ],
      opportunities: [
        roleData.length > 0 ? `${roleData.length} 个角色可协同工作` : "角色体系可扩展",
        phases.length > 0 ? `${phases.length} 个流程阶段可优化` : "流程可设计优化",
        "AI 辅助决策可提升效率",
      ],
      threats: [
        computedRisks.filter((r) => r.level === "high" || r.level === "critical").length > 0
          ? `${computedRisks.filter((r) => r.level === "high" || r.level === "critical").length} 项高风险需关注`
          : "当前风险可控",
        blockingGates.length > 0 ? `${blockingGates.length} 个 Gate 等待决策` : "无阻塞决策",
        p.settings.riskSummary ?? "风险摘要未设置",
      ],
    };

    return (
      <div className="pd-risk-layout">
        {/* Left: SWOT Analysis */}
        <div className="pd-swot-panel">
          <div className="pd-panel-head">
            <h2>风险与决策 · SWOT 分析</h2>
          </div>
          <div className="pd-swot-grid">
            <div className="pd-swot-card s" onClick={() => handleSelect("risk", "swot-s")} style={{ cursor: "pointer" }}>
              <h3>S 优势</h3>
              <ul>
                {swotData.strengths.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="pd-swot-card w" onClick={() => handleSelect("risk", "swot-w")} style={{ cursor: "pointer" }}>
              <h3>W 劣势</h3>
              <ul>
                {swotData.weaknesses.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="pd-swot-card o" onClick={() => handleSelect("risk", "swot-o")} style={{ cursor: "pointer" }}>
              <h3>O 机会</h3>
              <ul>
                {swotData.opportunities.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="pd-swot-card t" onClick={() => handleSelect("risk", "swot-t")} style={{ cursor: "pointer" }}>
              <h3>T 威胁</h3>
              <ul>
                {swotData.threats.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Right: Risk Matrix + Gate */}
        <div className="pd-risk-aside">
          <div className="pd-panel-head">
            <h2>风险矩阵</h2>
          </div>
          <div className="pd-risk-aside-body">
            <div className="pd-risk-matrix-compact">
              <span></span>
              <span className="pd-risk-matrix-header">低影响</span>
              <span className="pd-risk-matrix-header">高影响</span>
              <span className="pd-risk-matrix-row-label">高概率</span>
              <div
                className={`pd-risk-cell ${riskMatrix.highLow.length > 0 ? "hi" : "mid"}`}
                onClick={() => { if (riskMatrix.highLow.length > 0) handleSelect("risk", riskMatrix.highLow[0].id); }}
                style={{ cursor: riskMatrix.highLow.length > 0 ? "pointer" : "default" }}
              >{riskMatrix.highLow.length}</div>
              <div
                className={`pd-risk-cell ${riskMatrix.highHigh.length > 0 ? "hi" : "mid"}`}
                onClick={() => { if (riskMatrix.highHigh.length > 0) handleSelect("risk", riskMatrix.highHigh[0].id); }}
                style={{ cursor: riskMatrix.highHigh.length > 0 ? "pointer" : "default" }}
              >{riskMatrix.highHigh.length}</div>
              <span className="pd-risk-matrix-row-label">低概率</span>
              <div
                className="pd-risk-cell lo"
                onClick={() => { if (riskMatrix.lowLow.length > 0) handleSelect("risk", riskMatrix.lowLow[0].id); }}
                style={{ cursor: riskMatrix.lowLow.length > 0 ? "pointer" : "default" }}
              >{riskMatrix.lowLow.length}</div>
              <div
                className={`pd-risk-cell ${riskMatrix.lowHigh.length > 0 ? "mid" : "lo"}`}
                onClick={() => { if (riskMatrix.lowHigh.length > 0) handleSelect("risk", riskMatrix.lowHigh[0].id); }}
                style={{ cursor: riskMatrix.lowHigh.length > 0 ? "pointer" : "default" }}
              >{riskMatrix.lowHigh.length}</div>
            </div>

            {/* Pending Gate */}
            <div className="pd-gate-card">
              <h3>待决策 Gate</h3>
              <p>{blockingGates.length > 0 ? blockingGates[0].summary : "无阻塞 Gate 等待确认"}</p>
              <button className="btn primary" type="button" onClick={() => {
                if (blockingGates.length > 0) handleSelect("gate", blockingGates[0].id);
              }}>进入决策</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderRolesTab() {
    // Get workflow template info for display
    const currentTemplate = template;

    return (
      <div className="pd-role-flow-layout">
        {/* Left: Role Pool */}
        <div className="pd-role-pool-panel">
          <div className="pd-role-pool-head">
            <h3>项目角色池</h3>
            <span className="pd-tag">{roleData.length} 个角色</span>
          </div>
          <div className="pd-role-grid">
            {roleData.length > 0 ? roleData.map((role) => (
              <div
                key={role.id}
                className="pd-role-card-inline"
                onClick={() => handleSelect("role", role.id)}
              >
                <div className="pd-role-badge">{role.shortLabel}</div>
                <div className="pd-role-card-content">
                  <h3>{role.name}</h3>
                  <p>{role.description}</p>
                </div>
                <span className="pd-tag">{role.capabilities[0] ?? "通用"}</span>
              </div>
            )) : (
              <div style={{ color: "var(--muted)", padding: "var(--space-lg)" }}>
                暂无角色数据
              </div>
            )}
          </div>
        </div>

        {/* Right: Workflow Steps */}
        <div className="pd-workflow-zone">
          <div className="pd-workflow-zone-head">
            <h3>流程绑定关系</h3>
            <span className="muted">工作流步骤引用左侧角色</span>
          </div>
          <div className="pd-workflow-map">
            {currentTemplate?.steps && currentTemplate.steps.length > 0 ? (
              currentTemplate.steps.map((step, i) => {
                const role = data.roles.find((r) => r.id === step.roleId);
                const runnerProf = step.runnerId
                  ? data.runnerProfiles.find((rp) => rp.id === step.runnerId)
                  : data.runnerProfiles[i % data.runnerProfiles.length];
                const runnerName = runnerProf?.displayName ?? "Claude CLI";
                const stepNum = String(i + 1).padStart(2, "0");

                return (
                  <div key={step.id} className="pd-step-card" onClick={() => handleSelect("role", step.roleId)}>
                    <span className="pd-step-num">{stepNum}</span>
                    <strong>{step.name}</strong>
                    <span className="muted">{role?.name ?? step.roleId}</span>
                    {/* CLI Runner Info */}
                    <div className="pd-step-runner">
                      <span className="pd-runner-label">Runner:</span>
                      <span className="pd-runner-name">{runnerName}</span>
                      <span className="pd-runner-model">{step.modelName ?? "claude-sonnet-4-6"}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ color: "var(--muted)", padding: "var(--space-lg)" }}>
                暂无工作流步骤
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderFilesTab() {
    return (
      <div className="pd-files-layout">
        {/* Left: File list */}
        <div className="pd-files-panel">
          <div className="pd-panel-head">
            <h2>协同文件</h2>
          </div>
          <div className="pd-files-list">
            <div className="pd-source-card" style={{ color: "var(--muted)", padding: "var(--space-lg)" }}>
              <FileText size={18} className="pd-file-icon-svg" />
              <div className="pd-source-content">
                <b>暂无协同文件</b>
                <p>功能开发中</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: AI summary */}
        <div className="pd-files-aside">
          <div className="pd-panel-head">
            <h2>AI 解析摘要</h2>
          </div>
          <div className="pd-files-aside-body">
            <p>暂无协同文件，功能开发中</p>
          </div>
        </div>
      </div>
    );
  }

  function renderChangelogTab() {
    return (
      <div className="pd-changelog-list">
        {changelogEntries.length > 0 ? changelogEntries.map((entry) => (
          <div
            key={entry.id}
            className="pd-changelog-item"
            onClick={() => handleSelect("changelog", entry.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter") handleSelect("changelog", entry.id); }}
          >
            <div className={`pd-changelog-icon ${entry.type}`}>
              {entry.type === "plan" && <Target size={16} />}
              {entry.type === "progress" && <Activity size={16} />}
              {entry.type === "confirmation" && <ShieldCheck size={16} />}
              {entry.type === "ai" && <GitBranch size={16} />}
            </div>
            <div className="pd-changelog-content">
              <h4>
                {entry.title}
                {entry.tag && <span className={`pd-changelog-tag ${entry.tag.className}`}>{entry.tag.label}</span>}
              </h4>
              <p>{entry.description}</p>
            </div>
            <span className="pd-changelog-time">{entry.time ? formatSyncTime(entry.time) : ""}</span>
          </div>
        )) : (
          <div style={{ color: "var(--muted)", padding: "var(--space-lg)", textAlign: "center" }}>
            暂无变更记录
          </div>
        )}
      </div>
    );
  }

  // ── Panel Content ────────────────────────────────────────────────────

  function renderPanelBody() {
    // Default / empty state
    if (!selected.type) {
      return (
        <div className="pd-panel-empty">
          <Activity size={24} />
          <h4>下一步行动</h4>
          <p>点击任务、风险、角色或 Gate 查看详情</p>
          <div className="pd-panel-empty-section">
            <h5>待确认</h5>
            {projectGates.filter((g) => g.status === "waiting").length > 0 ? (
              projectGates.filter((g) => g.status === "waiting").map((g) => (
                <div key={g.id} className="pd-panel-empty-item" onClick={() => handleSelect("gate", g.id)}>
                  <ShieldCheck size={12} /> {g.summary}
                </div>
              ))
            ) : (
              <span className="pd-panel-empty-muted">暂无待确认项</span>
            )}
          </div>
          <div className="pd-panel-empty-section">
            <h5>最近变更</h5>
            {changelogEntries.length > 0 ? changelogEntries.slice(0, 3).map((cl) => (
              <div
                key={cl.id}
                className="pd-panel-empty-item"
                onClick={() => handleSelect("changelog", cl.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter") handleSelect("changelog", cl.id); }}
              >
                <History size={12} /> {cl.title}
              </div>
            )) : (
              <span className="pd-panel-empty-muted">暂无变更记录</span>
            )}
          </div>
        </div>
      );
    }

    // Task detail
    if (selected.type === "task") {
      const task = projectTasks.find((t) => t.id === selected.id);
      const taskGate = projectGates.find((g) => g.taskId === selected.id);
      const priority = task ? getTaskPriority(task.id) : "P2";
      const priorityMeta = taskPriorityMeta[priority];
      const taskStatus = task?.status as string | undefined;
      const statusLabel = taskStatus === "running" ? "推进中" : taskStatus === "done" ? "已完成" : taskStatus === "gate" ? "等待决策" : taskStatus === "queued" ? "已排队" : taskStatus === "draft" ? "草稿" : "未知";

      // Get role names from task's roleAssignment
      const assignedRoleNames = task ? Object.values(task.roleAssignment ?? {}).map((rid) =>
        data.roles.find((r) => r.id === rid)?.name ?? rid
      ).join("、") || "未分配" : "未知";

      // Get step names from task's roleAssignment keys
      const assignedStepNames = task && template?.steps
        ? Object.keys(task.roleAssignment ?? {}).map((stepId) =>
            template.steps.find((s) => s.id === stepId)?.name ?? stepId
          ).join(" > ") || "未关联"
        : "未关联";

      return task ? (
        <>
          {/* Hero card with chips */}
          <div className="pd-detail-hero">
            <div className="pd-chips">
              <span className={`pd-chip ${task.status === "running" ? "primary" : task.status === "done" ? "ok" : ""}`}>{statusLabel}</span>
              <span className="pd-chip">{priority}</span>
              <span className="pd-chip">{priorityMeta.label}</span>
            </div>
            <h3>{task.goal}</h3>
            <p className="muted">创建于 {formatSyncTime(task.createdAt)}</p>
          </div>

          {/* Detail rows */}
          <div className="pd-detail-row">
            <label>任务目标</label>
            <p>{task.goal}</p>
          </div>
          <div className="pd-detail-row">
            <label>所属阶段</label>
            <p><span className="pd-chip">{p.phase ?? "未设置"}</span></p>
          </div>
          <div className="pd-detail-row">
            <label>负责人角色</label>
            <p>{assignedRoleNames}</p>
          </div>
          <div className="pd-detail-row">
            <label>关联工作流步骤</label>
            <p>{assignedStepNames}</p>
          </div>
          <div className="pd-detail-row">
            <label>验收标准</label>
            {task.acceptanceCriteria.length > 0 ? (
              <ul>
                {task.acceptanceCriteria.map((ac, i) => (
                  <li key={i}>{ac}</li>
                ))}
              </ul>
            ) : (
              <p>暂无验收标准</p>
            )}
          </div>
          <div className="pd-detail-row">
            <label>AI 最新判断</label>
            <p>{taskGate?.logSummary ?? "暂无 AI 判断"}</p>
          </div>
          <div className="pd-detail-row">
            <label>工作台反馈</label>
            {taskGate && taskGate.diffEvidence.length > 0 ? (
              <ul>
                {taskGate.diffEvidence.map((diff, i) => (
                  <li key={i}>{diff}</li>
                ))}
              </ul>
            ) : (
              <p>暂无反馈</p>
            )}
          </div>
          {taskGate && (
            <div className="pd-detail-row">
              <label>关联门禁</label>
              <p><ShieldCheck size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />{taskGate.summary} ({taskGate.status === "waiting" ? "等待决策" : taskGate.status})</p>
            </div>
          )}
        </>
      ) : (
        <p style={{ color: "var(--muted)" }}>任务信息不可用</p>
      );
    }

    // Risk detail
    if (selected.type === "risk") {
      const risk = computedRisks.find((r) => r.id === selected.id);
      if (!risk) return <p style={{ color: "var(--muted)" }}>风险信息不可用</p>;
      return (
        <>
          <div className="pd-drawer-section">
            <h4>基本信息</h4>
            <div className="pd-drawer-field">
              <span className="pd-drawer-field-label">风险名称</span>
              <span className="pd-drawer-field-value">{risk.title}</span>
            </div>
            <div className="pd-drawer-field">
              <span className="pd-drawer-field-label">概率</span>
              <span className="pd-drawer-field-value">{risk.probability === "high" ? "高" : risk.probability === "medium" ? "中" : "低"}</span>
            </div>
            <div className="pd-drawer-field">
              <span className="pd-drawer-field-label">影响</span>
              <span className="pd-drawer-field-value">{risk.impact === "high" ? "高" : risk.impact === "medium" ? "中" : "低"}</span>
            </div>
            <div className="pd-drawer-field">
              <span className="pd-drawer-field-label">等级</span>
              <span className="pd-drawer-field-value" style={{ color: risk.level === "high" ? "var(--danger)" : risk.level === "medium" ? "var(--warn)" : "var(--ok)" }}>
                {riskLabels[risk.level] ?? risk.level}
              </span>
            </div>
            <div className="pd-drawer-field">
              <span className="pd-drawer-field-label">负责人</span>
              <span className="pd-drawer-field-value">{risk.owner}</span>
            </div>
          </div>
          <div className="pd-drawer-section">
            <h4>缓解措施</h4>
            <div className="pd-drawer-field">
              <span className="pd-drawer-field-value">{risk.mitigation}</span>
            </div>
          </div>
        </>
      );
    }

    // Role detail
    if (selected.type === "role") {
      const role = roleData.find((r) => r.id === selected.id);
      if (!role) return <p style={{ color: "var(--muted)" }}>角色信息不可用</p>;
      return (
        <>
          <div className="pd-drawer-section">
            <h4>基本信息</h4>
            <div className="pd-drawer-field">
              <span className="pd-drawer-field-label">角色名称</span>
              <span className="pd-drawer-field-value">{role.name}</span>
            </div>
            <div className="pd-drawer-field">
              <span className="pd-drawer-field-label">描述</span>
              <span className="pd-drawer-field-value">{role.description}</span>
            </div>
          </div>
          <div className="pd-drawer-section">
            <h4>角色提示词</h4>
            <div className="pd-drawer-field">
              <span className="pd-drawer-field-value" style={{ fontFamily: "var(--mono)", fontSize: 12, background: "var(--surface-2)", padding: "var(--space-md)", borderRadius: "var(--radius-sm)", maxHeight: 120, overflowY: "auto" }}>
                {role.promptSummary || "暂无提示词"}
              </span>
            </div>
          </div>
          <div className="pd-drawer-section">
            <h4>能力集</h4>
            <div className="pd-role-tags">
              {role.capabilities.length > 0 ? role.capabilities.map((cap) => (
                <span key={cap} className="pd-role-tag">{cap}</span>
              )) : (
                <span className="pd-role-tag">暂无能力定义</span>
              )}
            </div>
          </div>
          <div className="pd-drawer-section">
            <h4>记忆</h4>
            <div className="pd-drawer-field">
              <span className="pd-drawer-field-value">{role.memoryCount} 条项目记忆</span>
            </div>
          </div>
        </>
      );
    }

    // Gate detail
    if (selected.type === "gate") {
      const gate = projectGates.find((g) => g.id === selected.id);
      return gate ? (
        <>
          <div className="pd-drawer-section">
            <h4>基本信息</h4>
            <div className="pd-drawer-field">
              <span className="pd-drawer-field-label">状态</span>
              <span className="pd-drawer-field-value" style={{ color: gate.status === "waiting" ? "var(--warn)" : gate.status === "approved" ? "var(--ok)" : "var(--muted)" }}>
                {gate.status === "waiting" ? "等待决策" : gate.status === "approved" ? "已通过" : gate.status}
              </span>
            </div>
            <div className="pd-drawer-field">
              <span className="pd-drawer-field-label">摘要</span>
              <span className="pd-drawer-field-value">{gate.summary}</span>
            </div>
            <div className="pd-drawer-field">
              <span className="pd-drawer-field-label">创建时间</span>
              <span className="pd-drawer-field-value">{gate.createdAt ?? "未知"}</span>
            </div>
          </div>
          <div className="pd-drawer-section">
            <h4>决策历史</h4>
            <div className="pd-drawer-field">
              <span className="pd-drawer-field-value" style={{ color: "var(--muted)" }}>
                {gate.status === "waiting" ? "暂无决策记录" : `最后决策：${gate.status}`}
              </span>
            </div>
          </div>
        </>
      ) : (
        <p style={{ color: "var(--muted)" }}>门禁信息不可用</p>
      );
    }

    // Gantt / progress detail
    if (selected.type === "gantt") {
      const task = projectTasks.find((t) => t.id === selected.id);
      return task ? (
        <>
          <div className="pd-drawer-section">
            <h4>进度 / 时间线</h4>
            <div className="pd-drawer-field">
              <span className="pd-drawer-field-label">任务名称</span>
              <span className="pd-drawer-field-value">{task.goal}</span>
            </div>
            <div className="pd-drawer-field">
              <span className="pd-drawer-field-label">状态</span>
              <span className="pd-drawer-field-value">{task.status}</span>
            </div>
          </div>
        </>
      ) : (
        <p style={{ color: "var(--muted)" }}>进度信息不可用</p>
      );
    }

    // File detail
    if (selected.type === "file") {
      return (
        <div className="pd-drawer-section">
          <h4>文件摘要</h4>
          <div className="pd-drawer-field">
            <span className="pd-drawer-field-value">协同文件 AI 解析详情（开发中）</span>
          </div>
        </div>
      );
    }

    // Changelog detail
    if (selected.type === "changelog") {
      const entry = changelogEntries.find((e) => e.id === selected.id);
      if (!entry) return <p style={{ color: "var(--muted)" }}>变更记录不可用</p>;
      const changelogTypeLabels: Record<string, string> = {
        plan: "计划变更",
        progress: "进度更新",
        confirmation: "人工决策",
        ai: "AI 建议",
      };
      return (
        <>
          <div className="pd-drawer-section">
            <h4>变更详情</h4>
            <div className="pd-drawer-field">
              <span className="pd-drawer-field-label">类型</span>
              <span className="pd-drawer-field-value">{changelogTypeLabels[entry.type] ?? entry.type}</span>
            </div>
            <div className="pd-drawer-field">
              <span className="pd-drawer-field-label">标题</span>
              <span className="pd-drawer-field-value">{entry.title}</span>
            </div>
            <div className="pd-drawer-field">
              <span className="pd-drawer-field-label">描述</span>
              <span className="pd-drawer-field-value">{entry.description}</span>
            </div>
            <div className="pd-drawer-field">
              <span className="pd-drawer-field-label">时间</span>
              <span className="pd-drawer-field-value">{entry.time ? formatSyncTime(entry.time) : ""}</span>
            </div>
            {entry.tag && (
              <div className="pd-drawer-field">
                <span className="pd-drawer-field-label">状态</span>
                <span className="pd-drawer-field-value">{entry.tag.label}</span>
              </div>
            )}
          </div>
        </>
      );
    }

    return null;
  }

  // Panel footer actions based on selected type
  function renderPanelFooter() {
    if (selected.type === "task") {
      return (
        <>
          <button className="btn" onClick={handleOpenPriorityModal} type="button">调整优先级</button>
          <button className="btn" type="button" style={{ borderColor: "#75521b", color: "#f0b34d", background: "rgba(87,60,22,.25)" }}>标记需确认</button>
        </>
      );
    }
    if (selected.type === "risk") {
      return (
        <>
          <button className="btn" type="button">缓解风险</button>
          <button className="btn" type="button">关闭风险</button>
        </>
      );
    }
    if (selected.type === "gate") {
      const gate = projectGates.find((g) => g.id === selected.id);
      if (gate?.status === "waiting") {
        return (
          <>
            <button className="btn primary" type="button">通过</button>
            <button className="btn" type="button">拒绝</button>
          </>
        );
      }
      return null;
    }
    if (selected.type === "role") {
      return (
        <>
          <button className="btn" type="button">编辑提示词</button>
          <button className="btn" type="button">查看记忆</button>
        </>
      );
    }
    return null;
  }

  // ── Active Tab Content ───────────────────────────────────────────────

  const activeTabContent = (() => {
    switch (activeTab) {
      case "overview": return renderOverviewTab();
      case "plan": return renderPlanTabDesign();
      case "progress": return renderProgressTabDesign();
      case "risk": return renderRiskTab();
      case "roles": return renderRolesTab();
      case "files": return renderFilesTab();
      case "changelog": return renderChangelogTab();
      default: return null;
    }
  })();

  // ── Main Render ──────────────────────────────────────────────────────

  return (
    <div className="project-detail-page">
      {/* Hero Header */}
      <header className="pd-overview-header">
        <div className="pd-overview-main">
          {/* Column 1: Title Zone */}
          <div className="pd-overview-left">
            <div className="pd-title-zone">
              <div className="pd-title-icon">
                <Star size={30} />
              </div>
              <div className="pd-title-content">
                <div className="pd-project-title-row">
                  <h1 className="pd-project-title">{p.name}</h1>
                  <span className="pd-chip ok pd-title-status">{runStatusLabel}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Local Actions */}
          <div className="pd-local-actions">
            <button className="icon-only" onClick={onBack} title="返回总览">
              <ArrowLeft size={16} />
            </button>
            <button onClick={() => onEnterWorkbench(projectId)} type="button">
              <ExternalLink size={16} />
              进入工作台
            </button>
            <button onClick={handleCheckProgress} type="button">
              <CheckCircle2 size={16} />
              检查最新进度
            </button>
            <button className="primary" onClick={handleSaveChanges} type="button">
              <Save size={16} />
              保存变更
            </button>
          </div>
        </div>
      </header>

      {/* Cockpit Cards */}
      <section className="pd-cockpit-section">
        <div className="pd-cockpit">
          <div className="pd-cockpit-card pd-project-goal-card">
            <div className="pd-goal-head">
              <div>
                <h3>项目目标</h3>
                <h4>{p.settings.projectDescription ? p.settings.projectDescription.split("。")[0] : "暂无项目描述"}</h4>
              </div>
              <div className="pd-goal-progress">
                <div
                  className="pd-ring"
                  style={{ background: `conic-gradient(var(--primary) 0 ${kpis.totalProgress}%, #273247 ${kpis.totalProgress}% 100%)` }}
                  data-pct={`${kpis.totalProgress}%`}
                />
                <span>总进度</span>
              </div>
            </div>
            <div className="pd-goal-metrics" aria-label="项目关键指标">
              <div className="pd-goal-metric">
                <span>待确认</span>
                <strong>{kpis.pendingConfirmations}</strong>
              </div>
              <div className="pd-goal-metric danger">
                <span>高风险</span>
                <strong>{kpis.highRiskCount}</strong>
              </div>
            </div>
            <div className="pd-cockpit-chips" hidden>
              <span className="pd-cockpit-chip">前端 Web</span>
              <span className="pd-cockpit-chip">流程编排画布</span>
              <span className="pd-cockpit-chip">IM/Git 适配</span>
            </div>
          </div>
          <div className="pd-cockpit-card pd-cockpit-card-ai-check">
            <div className="pd-ai-check-head">
              <h3>AI 进度 Check</h3>
              <div className="pd-cockpit-actions-row">
                <button onClick={handleViewDiff} type="button">查看差异</button>
              </div>
            </div>
            <h4>发现 {aiProgressCheck.changesCount} 项变更</h4>
            <p className="pd-progress-change">
              进度变化 <span className="pd-progress-old">{aiProgressCheck.oldProgress}%</span> → <span className="pd-progress-new">{aiProgressCheck.newProgress}%</span>
            </p>
            <p className="pd-progress-summary">主要变更：{aiProgressCheck.changeSummary}</p>
          </div>
          <div className="pd-cockpit-card">
            <h3>下一验收点</h3>
            {nextCheckpointInfo ? (
              <>
                <h4>{nextCheckpointInfo.title}</h4>
                <p>预计完成 {nextCheckpointInfo.deadline ? formatSyncTime(nextCheckpointInfo.deadline) : "未设置"}</p>
                <p>负责人：{nextCheckpointInfo.owner}</p>
                <div className="pd-cockpit-actions-row">
                  <button type="button">查看验收标准</button>
                </div>
              </>
            ) : (
              <>
                <h4>暂无待验收点</h4>
                <p>所有任务已完成或尚未开始</p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Tab Bar */}
      <nav className="pd-tab-bar" role="tablist">
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.key}
            className={`pd-tab ${activeTab === tab.key ? "active" : ""}`}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Main Content Area with Drawer */}
      <div className="pd-main-layout">
        {/* Left: Tab Content */}
        <div className="pd-tab-content" role="tabpanel">
          {activeTabContent}
        </div>

        {/* Right: Detail Drawer */}
        <aside className="pd-drawer">
          <div className="pd-drawer-head">
            <h2>详情面板</h2>
            <span className="pd-drawer-type">{selected.type ? typeLabels[selected.type] : "当前任务"}</span>
          </div>
          <div className="pd-drawer-body">
            {renderPanelBody()}
          </div>
          <div className="pd-drawer-foot">
            {renderPanelFooter()}
          </div>
        </aside>
      </div>

      {diffModalOpen && (
        <div className="pd-modal-backdrop" role="presentation" onClick={() => setDiffModalOpen(false)}>
          <section className="pd-diff-modal" role="dialog" aria-modal="true" aria-labelledby="pd-diff-title" onClick={(event) => event.stopPropagation()}>
            <header className="pd-diff-modal-head">
              <div>
                <h2 id="pd-diff-title">进度差异</h2>
                <p>AI 检查后生成的同步前后对比</p>
              </div>
              <button type="button" onClick={() => setDiffModalOpen(false)} aria-label="关闭差异弹窗">×</button>
            </header>
            <div className="pd-diff-modal-body">
              <div className="pd-diff-kpi">
                <span>原进度</span>
                <strong>{aiProgressCheck.oldProgress}%</strong>
              </div>
              <div className="pd-diff-kpi highlight">
                <span>新进度</span>
                <strong>{aiProgressCheck.newProgress}%</strong>
              </div>
              <div className="pd-diff-kpi">
                <span>变更数</span>
                <strong>{aiProgressCheck.changesCount}</strong>
              </div>
              <div className="pd-diff-summary">
                <h3>主要变更</h3>
                <p>{aiProgressCheck.changeSummary}</p>
              </div>
              <div className="pd-diff-list">
                {changelogEntries.slice(0, 3).map((entry) => (
                  <div key={entry.id}>
                    <span>{entry.type === "progress" ? "更新" : entry.type === "confirmation" ? "待确认" : "新增"}</span>
                    <p>{entry.description}</p>
                  </div>
                ))}
                {changelogEntries.length === 0 && (
                  <div>
                    <span>暂无</span>
                    <p>暂无变更记录</p>
                  </div>
                )}
              </div>
            </div>
            <footer className="pd-diff-modal-foot">
              <button type="button" onClick={() => setDiffModalOpen(false)}>关闭</button>
            </footer>
          </section>
        </div>
      )}

      {priorityModalOpen && (
        <div className="pd-modal-backdrop" role="presentation" onClick={() => setPriorityModalOpen(false)}>
          <section className="pd-priority-modal" role="dialog" aria-modal="true" aria-labelledby="pd-priority-title" onClick={(event) => event.stopPropagation()}>
            <header className="pd-diff-modal-head">
              <div>
                <h2 id="pd-priority-title">调整优先级</h2>
                <p>{priorityModalTask ? priorityModalTask.goal : "当前没有可调整的任务"}</p>
              </div>
              <button type="button" onClick={() => setPriorityModalOpen(false)} aria-label="关闭优先级弹窗">×</button>
            </header>
            <div className="pd-priority-modal-body">
              {priorityModalTask ? (
                TASK_PRIORITY_OPTIONS.map((priority) => {
                  const active = getTaskPriority(priorityModalTask.id) === priority;
                  return (
                    <button
                      key={priority}
                      className={`pd-priority-option ${active ? "active" : ""}`}
                      onClick={() => handleApplyPriority(priority)}
                      type="button"
                    >
                      <strong>{priority}</strong>
                      <span>{taskPriorityMeta[priority].label}</span>
                      <small>{taskPriorityMeta[priority].hint}</small>
                    </button>
                  );
                })
              ) : (
                <p className="pd-priority-empty">暂无任务可调整。</p>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Timeline Footer */}
      <section className="pd-timeline-footer">
        {timelineMilestones.map((m, i) => (
          <div key={i} className={`pd-mile ${m.status}`}>
            <span>{m.date}</span>
            <strong>{m.title}</strong>
            <span>{m.sub}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
