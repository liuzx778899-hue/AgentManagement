import { useState, useMemo } from "react";
import {
  ArrowLeft,
  Activity,
  ShieldCheck,
  CheckCircle2,
  Clock,
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
  Milestone,
  Play,
  Save,
  Search,
  FlagTriangleRight,
  Star,
} from "lucide-react";
import type { WorkbenchData } from "../domain/workbench";

// 鈹€鈹€ Types 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

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

// 鈹€鈹€ Constants 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

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

// 鈹€鈹€ Mock Data 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

interface MockRisk {
  id: string;
  title: string;
  probability: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
  level: string;
  mitigation: string;
  owner: string;
  status: "open" | "mitigated" | "closed";
}

const MOCK_RISKS: MockRisk[] = [
  {
    id: "risk-001",
    title: "AI Agent 任务执行超时",
    probability: "medium",
    impact: "high",
    level: "high",
    mitigation: "设置合理的超时时间，增加重试机制，监控运行状态",
    owner: "PM Agent",
    status: "open",
  },
  {
    id: "risk-002",
    title: "前端框架版本兼容性问题",
    probability: "low",
    impact: "medium",
    level: "medium",
    mitigation: "锁定依赖版本，定期进行回归测试",
    owner: "FE Agent",
    status: "mitigated",
  },
  {
    id: "risk-003",
    title: "人工决策阻塞工作流进度",
    probability: "high",
    impact: "high",
    level: "high",
    mitigation: "设置决策超时提醒，自动化通过条件明确的门禁",
    owner: "PM Agent",
    status: "open",
  },
  {
    id: "risk-004",
    title: "协同文件版本冲突",
    probability: "medium",
    impact: "low",
    level: "medium",
    mitigation: "使用 Git 管理协同文件，增加冲突检测提示",
    owner: "Review Agent",
    status: "open",
  },
];

interface MockChangeLogEntry {
  id: string;
  type: "plan" | "progress" | "confirmation" | "ai";
  title: string;
  description: string;
  time: string;
  tag?: { label: string; className: string };
}

const MOCK_CHANGELOG: MockChangeLogEntry[] = [
  {
    id: "cl-001",
    type: "plan",
    title: "计划更新：Phase 1 范围调整",
    description: "将 Phase 1 范围从多个核心页面调整为 5 个，聚焦 MVP 产品闭环验证",
    time: "2026-05-16 14:30",
  },
  {
    id: "cl-002",
    type: "progress",
    title: "进度更新：需求分析步骤完成",
    description: "产品经理 Agent 完成需求分析，产出 V1 产品需求规格文档",
    time: "2026-05-16 10:00",
  },
  {
    id: "cl-003",
    type: "confirmation",
    title: "手动确认：通过 UI/UX 设计方案",
    description: "用户确认了 UI/UX 设计方案，同意进入前端开发阶段",
    time: "2026-05-15 18:00",
  },
  {
    id: "cl-004",
    type: "ai",
    title: "AI 建议：采用暗色主题设计",
    description: "AI 建议采用暗色主题配合 CSS Variables 实现设计系统，已被采纳",
    time: "2026-05-15 09:00",
    tag: { label: "已采纳", className: "adopted" },
  },
  {
    id: "cl-005",
    type: "ai",
    title: "AI 建议：引入状态管理库",
    description: "AI 建议引入 Zustand 进行状态管理，建议暂时搁置，先用 Context + Reducer",
    time: "2026-05-14 16:00",
    tag: { label: "已拒绝", className: "rejected" },
  },
  {
    id: "cl-006",
    type: "progress",
    title: "进度更新：前端开发基本完成",
    description: "前端工程师 Agent 完成核心页面开发，包括工作流构建器",
    time: "2026-05-14 11:00",
  },
];

const MOCK_PHASES = ["需求分析", "UI/UX 设计", "前端开发", "代码审查", "测试验证"];

// AI Progress Check mock data
const MOCK_AI_PROGRESS_CHECK = {
  changesCount: 5,
  oldProgress: 70,
  newProgress: 76,
  changeSummary: "AI 助手完成、IM/Git 完成、画布推进中等",
};

interface MockRoleData {
  id: string;
  name: string;
  shortLabel: string;
  avatarClass: string;
  description: string;
  promptSummary: string;
  capabilities: string[];
  memoryCount: number;
}

const MOCK_ROLES: MockRoleData[] = [
  {
    id: "role-001",
    name: "产品经理",
    shortLabel: "产",
    avatarClass: "pm",
    description: "负责需求分析、产品规划和用户故事编写",
    promptSummary: "你是一位经验丰富的产品经理，擅长需求分析和产品规划...",
    capabilities: ["需求分析", "PRD 编写", "竞品分析", "路线图规划"],
    memoryCount: 12,
  },
  {
    id: "role-002",
    name: "UI/UX 设计师",
    shortLabel: "设",
    avatarClass: "design",
    description: "负责交互设计和视觉设计，产出设计规范",
    promptSummary: "你是一位资深的 UI/UX 设计师，遵循 Material Design 和现代设计原则...",
    capabilities: ["交互设计", "视觉设计", "设计系统", "原型制作"],
    memoryCount: 8,
  },
  {
    id: "role-003",
    name: "前端工程师",
    shortLabel: "前",
    avatarClass: "fe",
    description: "负责前端开发实现，包括组件开发和状态管理",
    promptSummary: "你是一位精通 React 和 TypeScript 的前端工程师...",
    capabilities: ["React", "TypeScript", "CSS", "状态管理"],
    memoryCount: 15,
  },
  {
    id: "role-004",
    name: "代码审查员",
    shortLabel: "审",
    avatarClass: "review",
    description: "负责代码质量审查，确保代码规范和最佳实践",
    promptSummary: "你是一位严格的代码审查员，关注代码质量、安全性和可维护性...",
    capabilities: ["代码审查", "安全审计", "性能分析", "最佳实践"],
    memoryCount: 6,
  },
  {
    id: "role-005",
    name: "测试工程师",
    shortLabel: "测",
    avatarClass: "qa",
    description: "负责测试用例编写和自动化测试执行",
    promptSummary: "你是一位严谨的测试工程师，擅长编写测试用例和执行自动化测试...",
    capabilities: ["测试用例", "自动化测试", "性能测试", "回归测试"],
    memoryCount: 9,
  },
];

// 鈹€鈹€ Component 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

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

  // Role data
  const roleData = useMemo(() => {
    return MOCK_ROLES.map((mockRole) => ({
      ...mockRole,
      realRole: data.roles.find((r) => r.id === mockRole.id),
    }));
  }, [data.roles]);

  // KPI stats
  const kpis = useMemo(() => {
    const totalTasks = projectTasks.length;
    const runningTasks = projectTasks.filter((t) => t.status === "running").length;
    const doneTasks = projectTasks.filter((t) => t.status === "done").length;
    const progressPct = MOCK_AI_PROGRESS_CHECK.newProgress;
    const pendingConfirmations = 2;
    const gatesTotal = projectGates.length;
    const testsPassed = projectTasks.filter((t) => t.status === "done").length; // mock: each done task = tests passed
    const highRiskCount = 1;

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
  }, [projectTasks, projectGates]);

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

  // 鈹€鈹€ State: Error 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

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

  // 鈹€鈹€ State: Loading 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

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

  // 鈹€鈹€ State: Empty / No project 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

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

  // 鈹€鈹€ State: No plan (empty plan) 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

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

  // 鈹€鈹€ Build row data for risk matrix 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

  const riskMatrix = {
    highHigh: MOCK_RISKS.filter((r) => r.probability === "high" && r.impact === "high"),
    highLow: MOCK_RISKS.filter((r) => r.probability === "high" && r.impact !== "high"),
    lowHigh: MOCK_RISKS.filter((r) => r.probability !== "high" && r.impact === "high"),
    lowLow: MOCK_RISKS.filter((r) => r.probability !== "high" && r.impact !== "high"),
  };

  const riskLevelColor = riskColors[p.riskLevel ?? "low"] ?? "var(--ok)";
  const riskLevelLabel = riskLabels[p.riskLevel ?? "low"] ?? "低风险";
  const runStatus = p.runStatus ?? "running";
  const runStatusLabel = runStatusLabels[runStatus] ?? "未知";
  const runStatusColor = runStatusColors[runStatus] ?? "var(--muted)";
  const syncTime = formatSyncTime(p.lastCheckAt);

  // 鈹€鈹€ Tab Content Renders 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

  function renderOverviewTab() {
    return (
      <div className="pd-overview-grid">
        <section className="pd-panel">
          <div className="pd-panel-head"><h2>项目基本信息</h2></div>
          <div className="pd-panel-body pd-info-list">
            <div className="pd-info-row"><label>项目说明</label><span>构建本地 Web MVP，完成核心流程闭环，并通过产品验收与性能验证。</span></div>
            <div className="pd-info-row"><label>当前 Phase</label><span>{p.phase ?? "Phase 1 · Web MVP"}</span></div>
            <div className="pd-info-row"><label>交付物</label><span>前端应用、流程编排画布、适配器、文档</span></div>
            <div className="pd-info-row"><label>验收口径</label><span>功能可用、流程可闭环、性能达标、通过验收</span></div>
            <div className="pd-info-row"><label>项目路径</label><span>{p.repoPath}</span></div>
            <div className="pd-info-row"><label>默认分支</label><span>{p.defaultBranch}</span></div>
            <div className="pd-info-row"><label>工作区</label><span>{p.worktreeRoot}</span></div>
          </div>
        </section>
        <section className="pd-panel">
          <div className="pd-panel-head"><h2>计划摘要</h2><a>查看全部任务</a></div>
          <div className="pd-panel-body">
            <div className="pd-plan-row"><span>优先级</span><span>任务</span><span>状态</span><span>负责人</span><span>进度</span></div>
            <div className="pd-plan-row"><span className="pd-prio">P0</span><b>导航合并 + 角色模型解耦</b><span style={{ color: "var(--ok)" }}>完成</span><span>产品经理</span><div className="pd-bar-mini"><span style={{ width: "100%" }} /></div></div>
            <div className="pd-plan-row"><span className="pd-prio">P1</span><b>IM/Git 适配器</b><span style={{ color: "var(--ok)" }}>完成</span><span>前端工程师</span><div className="pd-bar-mini"><span style={{ width: "100%" }} /></div></div>
            <div className="pd-plan-row"><span className="pd-prio p2">P2</span><b>前端工程标准</b><span style={{ color: "var(--ok)" }}>完成</span><span>产品经理</span><div className="pd-bar-mini"><span style={{ width: "90%" }} /></div></div>
            <div className="pd-plan-row"><span className="pd-prio p3">P3</span><b>流程编排画布 V2</b><span style={{ color: "#7c96ff" }}>推进中</span><span>前端工程师</span><div className="pd-bar-mini blue"><span style={{ width: "75%" }} /></div></div>
            <div className="pd-plan-row"><span className="pd-prio p4">P4</span><b>项目管理 V3 + 工作区</b><span style={{ color: "var(--warn)" }}>推进中</span><span>产品经理</span><div className="pd-bar-mini blue"><span style={{ width: "70%" }} /></div></div>
            <div className="pd-plan-row"><span className="pd-prio p5">P5</span><b>MD 指令体系</b><span style={{ color: "var(--warn)" }}>推进中</span><span>产品经理</span><div className="pd-bar-mini warn"><span style={{ width: "60%" }} /></div></div>
          </div>
        </section>
        <section className="pd-panel">
          <div className="pd-panel-head"><h2>协同来源</h2></div>
          <div className="pd-panel-body pd-sources">
            <div className="pd-source"><span className="pd-file-icon" /><span>HANDOFF_NEXT_TASKS.md<small>更新于 10 分钟前 · 最后同步 09:20</small></span></div>
            <div className="pd-source"><span className="pd-file-icon" /><span>CODE_REVIEW_AND_FIX_REQUESTS.md<small>更新于 30 分钟前</small></span></div>
            <div className="pd-source"><span className="pd-file-icon" /><span>工作台 TODO<small>更新于 15 分钟前</small></span></div>
            <div className="pd-source"><span className="pd-file-icon" /><span>测试记录<small>更新于 1 小时前</small></span></div>
            <div className="pd-source"><span className="pd-file-icon" /><span>协同连接状态<small>协同文件已连接 · 4 个来源可用</small></span></div>
            <a style={{ color: "#7c96ff", textAlign: "right", fontSize: 10 }}>查看全部协同文件</a>
          </div>
        </section>
      </div>
    );
  }

  function renderPlanTab() {
    const tasks = projectTasks.length > 0
      ? projectTasks.map((t, i) => ({
          ...t,
          priority: (["P0", "P1", "P2", "P3"] as const)[i % 4] as "P0" | "P1" | "P2" | "P3",
          role: (["产品经理", "UI/UX 设计师", "前端工程师", "代码审查员", "测试工程师"] as const)[i % 5],
          gate: undefined as string | undefined,
        }))
      : [
          { id: "mock-001", goal: "需求分析", status: "done" as const, priority: "P0" as const, role: "产品经理", gate: "PASSED", projectId },
          { id: "mock-002", goal: "UI/UX 设计", status: "done" as const, priority: "P1" as const, role: "UI/UX 设计师", gate: "PASSED", projectId },
          { id: "mock-003", goal: "前端开发", status: "running" as const, priority: "P0" as const, role: "前端工程师", gate: "ACTIVE", projectId },
          { id: "mock-004", goal: "代码审查", status: "gate" as const, priority: "P1" as const, role: "代码审查员", gate: "ACTIVE", projectId },
          { id: "mock-005", goal: "测试验证", status: "todo" as const, priority: "P2" as const, role: "测试工程师", gate: "PENDING", projectId },
        ];

    const statusLabels: Record<string, string> = {
      done: "已完成",
      running: "运行中",
      gate: "等待决策",
      todo: "待开始",
      failed: "失败",
    };

    const statusClasses: Record<string, string> = {
      done: "done",
      running: "running",
      gate: "gate",
      todo: "todo",
      failed: "failed",
    };

    // Group tasks by priority
    const priorityOrder = ["P0", "P1", "P2", "P3"] as const;
    const priorityColors: Record<string, string> = {
      P0: "var(--danger)",
      P1: "var(--warn)",
      P2: "var(--primary)",
      P3: "var(--muted)",
    };
    const grouped: Record<string, Record<string, unknown>[]> = {};
    for (const t of tasks) {
      const p = (t.priority as string) ?? "P2";
      if (!grouped[p]) grouped[p] = [];
      grouped[p].push(t as unknown as Record<string, unknown>);
    }

    return (
      <div>
        {priorityOrder.map((priority) => {
          const groupTasks = grouped[priority];
          if (!groupTasks || groupTasks.length === 0) return null;
          return (
            <div key={priority} className="pd-plan-group" style={{ marginBottom: "var(--space-lg)" }}>
              <div className="pd-plan-group-header" style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-sm)",
                padding: "var(--space-sm) 0",
                borderBottom: `2px solid ${priorityColors[priority]}`,
                marginBottom: "var(--space-md)",
              }}>
                <span className={`pd-priority-badge ${priority.toLowerCase()}`} style={{
                  padding: "2px 8px",
                  borderRadius: "var(--radius-sm)",
                  fontWeight: 700,
                  fontSize: 12,
                  background: `${priorityColors[priority]}20`,
                  color: priorityColors[priority],
                  border: `1px solid ${priorityColors[priority]}`,
                }}>{priority}</span>
                <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>
                  {priority === "P0" ? "紧急 / 阻塞项" : priority === "P1" ? "高优先级" : priority === "P2" ? "中优先级" : "低优先级"}
                </span>
                <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: "auto" }}>{groupTasks.length} 项任务</span>
              </div>
              <table className="pd-task-table">
                <thead>
                  <tr>
                    <th style={{ width: 80 }}>优先级</th>
                    <th>任务名称</th>
                    <th style={{ width: 100 }}>角色</th>
                    <th style={{ width: 100 }}>状态</th>
                    <th style={{ width: 100 }}>门禁</th>
                  </tr>
                </thead>
                <tbody>
                  {groupTasks.map((t: Record<string, unknown>) => {
                    const status = (t.status as string) ?? "todo";
                    const gate = (t.gate as string) ?? "PENDING";
                    return (
                      <tr key={t.id as string}>
                        <td>
                          <span className={`pd-priority-badge ${priority.toLowerCase()}`}>{priority}</span>
                        </td>
                        <td>
                          <span
                            className="pd-task-name"
                            onClick={() => handleSelect("task", t.id as string)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === "Enter") handleSelect("task", t.id as string); }}
                          >
                            {t.goal as string}
                          </span>
                        </td>
                        <td>{t.role as string}</td>
                        <td>
                          <span className={`task-status ${statusClasses[status] ?? "todo"}`}>
                            {statusLabels[status] ?? "未知"}
                          </span>
                        </td>
                        <td>
                          <span className={`pd-task-gate ${gate === "ACTIVE" ? "active" : gate === "PASSED" ? "passed" : ""}`}>
                            {gate === "ACTIVE" ? "进行中" : gate === "PASSED" ? "已通过" : "待处理"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    );
  }

  function renderProgressTab() {
    const progressItems = [
      { name: "需求分析", pct: 100, status: "ok", done: 3, total: 3 },
      { name: "UI/UX 设计", pct: 100, status: "ok", done: 2, total: 2 },
      { name: "前端开发", pct: 65, status: "running", done: 13, total: 20 },
      { name: "代码审查", pct: 0, status: "pending", done: 0, total: 5 },
      { name: "测试验证", pct: 0, status: "pending", done: 0, total: 8 },
    ];

    // Gantt mock data
    const ganttBars = [
      { name: "需求分析", left: 0, width: 20, color: "var(--ok)" },
      { name: "UI/UX 设计", left: 20, width: 18, color: "var(--ok)" },
      { name: "前端开发", left: 38, width: 30, color: "var(--primary)" },
      { name: "代码审查", left: 70, width: 15, color: "var(--line-soft)" },
      { name: "测试验证", left: 85, width: 10, color: "var(--line-soft)" },
    ];

    type KanbanTask = { name: string; role: string; pct?: number };
    const kanbanColumns: { title: string; tasks: KanbanTask[] }[] = [
      { title: "待开始", tasks: [{ name: "代码审查", role: "代码审查员" }, { name: "测试验证", role: "测试工程师" }] },
      { title: "进行中", tasks: [{ name: "前端开发", role: "前端工程师", pct: 65 }] },
      { title: "已完成", tasks: [{ name: "需求分析", role: "产品经理" }, { name: "UI/UX 设计", role: "UI/UX 设计师" }] },
    ];

    return (
      <div>
        {/* Progress bars per step */}
        <div className="pd-overview-section">
          <h3><Activity size={14} /> 步骤进度</h3>
          <div className="pd-progress-list">
            {progressItems.map((item) => (
              <div key={item.name} className="pd-progress-item">
                <div className="pd-progress-item-header">
                  <span className="pd-progress-item-name">{item.name}</span>
                  <span className="pd-progress-item-pct">{item.pct}%</span>
                </div>
                <div className="pd-progress-bar-track">
                  <div
                    className={`pd-progress-bar-fill ${item.status === "ok" ? "ok" : item.status === "running" ? "" : item.status === "pending" ? "warn" : ""}`}
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
                <div className="pd-progress-sub">
                  <span><CheckCircle2 size={12} color="var(--ok)" /> {item.done}/{item.total} 完成</span>
                  <span><FlagTriangleRight size={12} color="var(--primary)" /> {item.status === "ok" ? "已完成" : item.status === "running" ? "进行中" : "待开始"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gantt chart */}
        <div className="pd-overview-section">
          <h3><FlagTriangleRight size={14} /> 甘特图</h3>
          <div className="pd-gantt">
            <div className="pd-gantt-header">
              <span className="pd-gantt-header-label">阶段</span>
              <span className="pd-gantt-header-pct">0%</span>
              <span className="pd-gantt-header-pct">25%</span>
              <span className="pd-gantt-header-pct">50%</span>
              <span className="pd-gantt-header-pct">75%</span>
              <span className="pd-gantt-header-pct">100%</span>
            </div>
            {ganttBars.map((bar) => (
              <div key={bar.name} className="pd-gantt-row">
                <span className="pd-gantt-row-label">{bar.name}</span>
                <div className="pd-gantt-track">
                  <div
                    className="pd-gantt-bar"
                    style={{ left: `${bar.left}%`, width: `${bar.width}%`, background: bar.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Kanban board */}
        <div className="pd-overview-section">
          <h3><FolderGit2 size={14} /> 看板</h3>
          <div className="pd-kanban">
            {kanbanColumns.map((col) => (
              <div key={col.title} className="pd-kanban-col">
                <div className="pd-kanban-col-header">
                  <span>{col.title}</span>
                  <span className="badge">{col.tasks.length}</span>
                </div>
                {col.tasks.map((t) => (
                  <div key={t.name} className="pd-kanban-card">
                    <strong>{t.name}</strong>
                    <span>{t.role}</span>
                    {t.pct !== undefined && (
                      <div className="pd-progress-bar-track" style={{ marginTop: "var(--space-xs)" }}>
                        <div className="pd-progress-bar-fill" style={{ width: `${t.pct}%` }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Phase timeline */}
        <div className="pd-overview-section">
          <h3><Clock size={14} /> 阶段时间线</h3>
          <div className="pd-timeline">
            {MOCK_PHASES.map((phase, i) => {
              const isActive = i === 2;
              const isDone = i < 2;
              return (
                <div key={phase} className="pd-timeline-item">
                  <div className={`pd-timeline-dot ${isActive ? "active" : isDone ? "done" : ""}`} />
                  <span className="pd-timeline-label">{phase}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  function renderPlanTabDesign() {
    const planRows = [
      { id: "plan-p0", priority: "P0", task: "导航合并 + 角色模型解耦", phase: "Phase 1", role: "产品经理", progress: 100, status: "完成", tone: "ok" },
      { id: "plan-p3", priority: "P3", task: "流程编排画布 V2", phase: "Phase 1", role: "前端工程师", progress: 75, status: "推进中", tone: "blue" },
      { id: "plan-p7", priority: "P7", task: "产品验收与性能收尾", phase: "Phase 1", role: "测试工程师", progress: 0, status: "待处理", tone: "warn" },
    ];

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
          {planRows.map((row) => (
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
          ))}
        </div>
      </section>
    );
  }

  function renderProgressTabDesign() {
    const days = ["05/15", "05/16", "05/17", "05/18", "05/19", "05/20", "05/21"];
    const ganttRows = [
      { id: "gantt-p0", task: "P0 导航合并 + 角色模型解耦", role: "产品经理", className: "ok", start: 4, span: 185 },
      { id: "gantt-p3", task: "P3 流程编排画布 V2", role: "前端工程师", className: "blue", start: 8, span: 360 },
      { id: "gantt-p6", task: "P6 AI 工程助手", role: "AI 工程师", className: "purple", start: 4, span: 185 },
      { id: "gantt-p7", task: "P7 产品验收与性能收尾", role: "测试工程师", className: "orange", start: 65, span: 180 },
    ];

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
            {days.map((day) => <span key={day}>{day}</span>)}
          </div>
          {ganttRows.map((row) => (
            <button
              key={row.id}
              className="pd-design-gantt-row"
              type="button"
              onClick={() => handleSelect("gantt", row.id)}
            >
              <strong>{row.task}</strong>
              <span>{row.role}</span>
              {days.map((day, index) => (
                <span key={day} className="pd-design-gantt-track">
                  {index === 0 && (
                    <i
                      className={`pd-design-gantt-bar ${row.className}`}
                      style={{ left: `${row.start}%`, width: `${row.span}%` }}
                    />
                  )}
                </span>
              ))}
            </button>
          ))}
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

    // SWOT data
    const swotData = {
      strengths: [
        "工作台与流程管理方向已收敛",
        "协同文件沉淀完整",
        "前端原型可快速验收"
      ],
      weaknesses: [
        "多个页面仍需按真实布局收口",
        "真实后端/API 仍未接入",
        "部分文件存在历史编码问题"
      ],
      opportunities: [
        "可沉淀 AI + CLI 工程管理标准",
        "项目记忆可复用到多项目管理",
        "流程模板可形成产品核心资产"
      ],
      threats: [
        "计划频繁变化导致返工",
        "多工具协同容易误读旧文档",
        "验收标准不清会拖慢收尾"
      ]
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
    const currentVersion = currentTemplate?.versions?.find((v) => v.label === "applied");
    const draftVersion = currentTemplate?.versions?.find((v) => v.label === "draft");

    return (
      <div className="pd-role-flow-layout">
        {/* Left: Role Pool */}
        <div className="pd-role-pool-panel">
          <div className="pd-role-pool-head">
            <h3>项目角色池</h3>
            <span className="pd-tag">{roleData.length} 个角色</span>
          </div>
          <div className="pd-role-grid">
            {roleData.map((role) => (
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
            ))}
          </div>
        </div>

        {/* Right: Workflow Steps */}
        <div className="pd-workflow-zone">
          <div className="pd-workflow-zone-head">
            <h3>流程绑定关系</h3>
            <span className="muted">工作流步骤引用左侧角色</span>
          </div>
          <div className="pd-workflow-map">
            {currentTemplate?.steps.map((step, i) => {
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
            }) ?? [
              <div key="01" className="pd-step-card"><span className="pd-step-num">01</span><strong>需求分析</strong><span className="muted">产品经理</span><div className="pd-step-runner"><span className="pd-runner-label">Runner:</span><span className="pd-runner-name">Claude CLI</span><span className="pd-runner-model">claude-sonnet-4-6</span></div></div>,
              <div key="02" className="pd-step-card"><span className="pd-step-num">02</span><strong>UI/UX 设计</strong><span className="muted">UI/UX 设计师</span><div className="pd-step-runner"><span className="pd-runner-label">Runner:</span><span className="pd-runner-name">Claude CLI</span><span className="pd-runner-model">claude-haiku-4-5</span></div></div>,
              <div key="03" className="pd-step-card"><span className="pd-step-num">03</span><strong>前端开发</strong><span className="muted">前端工程师</span><div className="pd-step-runner"><span className="pd-runner-label">Runner:</span><span className="pd-runner-name">Claude CLI</span><span className="pd-runner-model">claude-sonnet-4-6</span></div></div>,
              <div key="04" className="pd-step-card"><span className="pd-step-num">04</span><strong>代码审查</strong><span className="muted">代码审查员</span><div className="pd-step-runner"><span className="pd-runner-label">Runner:</span><span className="pd-runner-name">Claude CLI</span><span className="pd-runner-model">claude-opus-4-7</span></div></div>,
              <div key="05" className="pd-step-card"><span className="pd-step-num">05</span><strong>测试验证</strong><span className="muted">测试工程师</span><div className="pd-step-runner"><span className="pd-runner-label">Runner:</span><span className="pd-runner-name">Claude CLI</span><span className="pd-runner-model">claude-sonnet-4-6</span></div></div>,
            ]}
          </div>
        </div>
      </div>
    );
  }

  function renderFilesTab() {
    const mockFiles = [
      { name: "HANDOFF_NEXT_TASKS.md", desc: "主协同入口，记录最新设计与执行要求。", syncTime: "10 分钟前" },
      { name: "CODE_REVIEW_AND_FIX_REQUESTS.md", desc: "代码审查与整改要求。", syncTime: "30 分钟前" },
      { name: "FRONTEND_IMPLEMENTATION_PLAN.md", desc: "前端实现计划、组件拆分和验收规则。", syncTime: "今天" },
    ];

    return (
      <div className="pd-files-layout">
        {/* Left: File list */}
        <div className="pd-files-panel">
          <div className="pd-panel-head">
            <h2>协同文件</h2>
            <button type="button">同步协同文件</button>
          </div>
          <div className="pd-files-list">
            {mockFiles.map((file) => (
              <div
                key={file.name}
                className="pd-source-card"
                onClick={() => handleSelect("file", file.name)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter") handleSelect("file", file.name); }}
              >
                <FileText size={18} className="pd-file-icon-svg" />
                <div className="pd-source-content">
                  <b>{file.name}</b>
                  <p>{file.desc}</p>
                </div>
                <span className="pd-tag">{file.syncTime}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: AI summary */}
        <div className="pd-files-aside">
          <div className="pd-panel-head">
            <h2>AI 解析摘要</h2>
          </div>
          <div className="pd-files-aside-body">
            <p>协同文件显示：当前重点从单页原型转向完整分页内容落地，项目详情需要补齐甘特、SWOT、角色流程、协同文件和变更记录。</p>
          </div>
        </div>
      </div>
    );
  }

  function renderChangelogTab() {
    return (
      <div className="pd-changelog-list">
        {MOCK_CHANGELOG.map((entry) => (
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
            <span className="pd-changelog-time">{entry.time}</span>
          </div>
        ))}
      </div>
    );
  }

  // 鈹€鈹€ Panel Content 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

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
            {MOCK_CHANGELOG.slice(0, 3).map((cl) => (
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
            ))}
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
      const statusLabel = taskStatus === "running" ? "推进中" : taskStatus === "done" ? "已完成" : taskStatus === "gate" ? "等待决策" : taskStatus === "todo" ? "待开始" : "未知";

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
            <p className="muted">预计完成 2026-05-20</p>
          </div>

          {/* Detail rows */}
          <div className="pd-detail-row">
            <label>任务目标</label>
            <p>完成流程编排画布 V2 版本，支持节点、连线、配置面板与校验逻辑，并与后端 API 对接，保障稳定性与易用性。</p>
          </div>
          <div className="pd-detail-row">
            <label>所属阶段</label>
            <p><span className="pd-chip">Phase 1 · Web MVP</span></p>
          </div>
          <div className="pd-detail-row">
            <label>负责人角色</label>
            <p>前端工程师</p>
          </div>
          <div className="pd-detail-row">
            <label>关联工作流步骤</label>
            <p>需求分析 &gt; UI/UX 设计 &gt; 前端开发 &gt; 代码审查</p>
          </div>
          <div className="pd-detail-row">
            <label>验收标准</label>
            <ul>
              <li>画布支持节点新增、编辑、连线与删除</li>
              <li>节点配置面板完整，校验通过</li>
              <li>与后端流程 API 对接，数据可保存与加载</li>
              <li>通过测试用例，缺陷率 ≤ 3%</li>
            </ul>
          </div>
          <div className="pd-detail-row">
            <label>AI 最新判断</label>
            <p>整体进展良好，核心功能已完成约 75%，预计 05/20 可达成验收。建议：优先完成校验规则与性能优化。</p>
          </div>
          <div className="pd-detail-row">
            <label>工作台反馈</label>
            <ul>
              <li>05/16：连线交互体验需要优化</li>
              <li>05/16：节点复制存在 ID 冲突问题</li>
              <li>05/17：配置面板字段校验通过</li>
            </ul>
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
      const risk = MOCK_RISKS.find((r) => r.id === selected.id);
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
      const role = MOCK_ROLES.find((r) => r.id === selected.id);
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
                {role.promptSummary}
              </span>
            </div>
          </div>
          <div className="pd-drawer-section">
            <h4>能力集</h4>
            <div className="pd-role-tags">
              {role.capabilities.map((cap) => (
                <span key={cap} className="pd-role-tag">{cap}</span>
              ))}
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
      const entry = MOCK_CHANGELOG.find((e) => e.id === selected.id);
      if (!entry) return <p style={{ color: "var(--muted)" }}>变更记录不可用</p>;
      const typeLabels: Record<string, string> = {
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
              <span className="pd-drawer-field-value">{typeLabels[entry.type] ?? entry.type}</span>
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
              <span className="pd-drawer-field-value">{entry.time}</span>
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

  // 鈹€鈹€ Active Tab Content 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

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

  // 鈹€鈹€ Timeline Data 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

  const timelineMilestones = useMemo(() => [
    { date: "05/15 周四", title: "项目启动", status: "done", sub: "05/15" },
    { date: "05/16 周五", title: "环境搭建完成", status: "done", sub: "05/16" },
    { date: "05/17 周六 今天", title: "流程编排画布 V2", status: "active", sub: "开发中" },
    { date: "05/18 周日", title: "测试验证完成", status: "", sub: "05/18" },
    { date: "05/19 周一", title: "产品验收", status: "", sub: "05/19" },
    { date: "05/20 周二", title: "性能收尾", status: "", sub: "05/20" },
  ], []);

  // 鈹€鈹€ Main Render 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

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
                <h4>{p.settings.projectDescription ? p.settings.projectDescription.split("。")[0] : "完成 V1 产品闭环页面开发与验收"}</h4>
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
            <h4>发现 {MOCK_AI_PROGRESS_CHECK.changesCount} 项变更</h4>
            <p className="pd-progress-change">
              进度变化 <span className="pd-progress-old">{MOCK_AI_PROGRESS_CHECK.oldProgress}%</span> → <span className="pd-progress-new">{MOCK_AI_PROGRESS_CHECK.newProgress}%</span>
            </p>
            <p className="pd-progress-summary">主要变更：{MOCK_AI_PROGRESS_CHECK.changeSummary}</p>
          </div>
          <div className="pd-cockpit-card">
            <h3>下一验收点</h3>
            <h4>流程编排画布 V2 + 产品验收</h4>
            <p>预计完成 2026-05-20</p>
            <p>负责人：测试工程师</p>
            <div className="pd-cockpit-actions-row">
              <button type="button">查看验收标准</button>
            </div>
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
                <strong>{MOCK_AI_PROGRESS_CHECK.oldProgress}%</strong>
              </div>
              <div className="pd-diff-kpi highlight">
                <span>新进度</span>
                <strong>{MOCK_AI_PROGRESS_CHECK.newProgress}%</strong>
              </div>
              <div className="pd-diff-kpi">
                <span>变更数</span>
                <strong>{MOCK_AI_PROGRESS_CHECK.changesCount}</strong>
              </div>
              <div className="pd-diff-summary">
                <h3>主要变更</h3>
                <p>{MOCK_AI_PROGRESS_CHECK.changeSummary}</p>
              </div>
              <div className="pd-diff-list">
                <div><span>新增</span><p>协同文件解析结果已同步到项目计划。</p></div>
                <div><span>更新</span><p>流程编排画布 V2 进度提升，验收项同步刷新。</p></div>
                <div><span>待确认</span><p>高风险项需要人工确认后再进入收尾验收。</p></div>
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
