import { useRef, useState, useMemo, useEffect } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock,
  GitBranch,
  Loader2,
  Package,
  Plus,
  Sparkles,
  TriangleAlert,
  Download,
  LayoutGrid,
  Power,
  PowerOff,
  Trash2,
  X,
} from "lucide-react";
import type { WorkbenchData, WorkbenchView } from "../domain/workbench";
import { WorkflowCategory as WorkflowCategoryBase } from "../domain/workflow";

interface WorkflowManagementOverviewProps {
  data: WorkbenchData;
  onNavigate?: (view: WorkbenchView) => void;
  onEnterWorkflowDesign?: (workflowId: string) => void;
  onEnterAiWorkflowDesign?: () => void;
  onDeleteTemplate?: (templateId: string) => void;
  onUpdateTemplate?: (templateId: string, updates: Partial<WorkbenchData["workflowTemplates"][0]>) => void;
}

// Workflow status types
type WorkflowStatus = "enabled" | "draft" | "disabled" | "high-risk";

// Health status types
type HealthStatus = "healthy" | "warning" | "error" | "pending";

// Workflow category types (包含 "all" 用于筛选)
type WorkflowCategory = "all" | WorkflowCategoryBase;

// Role coverage avatar
interface RoleAvatar {
  initials: string;
  color: "green" | "purple" | "orange" | "blue" | "muted";
}

// Workflow step display
interface WorkflowStepDisplay {
  no: string;
  name: string;
}

// Workflow asset card (computed from workflowTemplate)
interface WorkflowAsset {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  version: string;
  stepCount: number;
  steps: WorkflowStepDisplay[];
  fullSteps: Array<{ id: string; name: string; roleId?: string; modelProviderId?: string; modelName?: string; runnerId?: string }>;
  roleCoverage: RoleAvatar[];
  runnerCoverage: number;
  riskGap: string | null;
  healthStatus: HealthStatus;
  healthLabel: string;
  maturity: number;
  maturityLabel: string;
  category: WorkflowCategory;
  boundProjects: number;
  boundProjectNames: string[];
  lastUpdated: string;
}

// Category statistics
interface CategoryStats {
  id: WorkflowCategory;
  name: string;
  count: number;
  description: string;
  healthPercent: number;
  status: HealthStatus;
}

// KPI stats
interface WorkflowKPIs {
  total: number;
  enabled: number;
  boundProjects: number;
  pendingValidation: number;
  highRisk: number;
}

// Role binding gap
interface RoleBindingGap {
  workflowName: string;
  missingRole: string;
  status: "pending" | "unconfirmed";
}

// Recent change
interface RecentChange {
  workflowName: string;
  description: string;
  timestamp: string;
}

// AI recommendation
interface AIRecommendation {
  message: string;
  priority: "high" | "medium" | "low";
}

// Health panel data
interface HealthPanelData {
  categories: CategoryStats[];
  roleBindingGaps: RoleBindingGap[];
  recentChanges: RecentChange[];
  aiRecommendation: AIRecommendation;
}

// Helper function to filter workflows by category
function filterWorkflowsByCategory(
  workflows: WorkflowAsset[],
  category: WorkflowCategory
): WorkflowAsset[] {
  if (category === "all") return workflows;
  return workflows.filter((w) => w.category === category);
}

// Helper function to map workflow template to asset
function workflowTemplateToAsset(template: WorkbenchData["workflowTemplates"][0], roles: WorkbenchData["roles"], projects: WorkbenchData["projects"]): WorkflowAsset {
  const steps = template.steps || [];
  // 构建角色查找表：先从模板自带 roles 找，再从全局角色池找
  const templateRoleMap = new Map((template.roles || []).map(r => [r.id, r]));
  const globalRoleMap = new Map(roles.map(r => [r.id, r]));
  const getRoleName = (rid: string) => {
    const tRole = templateRoleMap.get(rid);
    if (tRole) return tRole.name;
    const gRole = globalRoleMap.get(rid);
    if (gRole) return gRole.name;
    return rid;
  };
  // 从步骤中提取不重复的角色，用真实角色名
  const seenRoleIds = new Set<string>();
  const roleAvatars: RoleAvatar[] = [];
  const colors: RoleAvatar["color"][] = ["blue", "green", "purple", "orange", "blue", "green", "purple"];
  steps.forEach(s => {
    const roleId = s.assignments?.[0]?.roleId;
    if (roleId && !seenRoleIds.has(roleId)) {
      seenRoleIds.add(roleId);
      const roleName = getRoleName(roleId);
      // 提取前2个中文字符；若开头是英文则取前2个字母
      const cnChars = (roleName.match(/[\u4e00-\u9fff]/g) || []);
      const initials = cnChars.length >= 2
        ? cnChars.slice(0, 2).join("")
        : roleName.replace(/[\u4e00-\u9fff]/g, "").trim().slice(0, 2);
      roleAvatars.push({ initials: initials.toUpperCase(), color: colors[roleAvatars.length % colors.length] });
    }
  });
  return {
    id: template.id,
    name: template.name,
    description: template.workflowMarkdown?.split("\n")[0] || "无描述",
    status: template.status === "enabled" ? "enabled" : template.status === "disabled" ? "disabled" : "draft",
    version: `v${template.version || 1}`,
    stepCount: steps.length,
    steps: steps.slice(0, 5).map((s, i) => ({ no: `${i + 1}`.padStart(2, "0"), name: s.name })),
    fullSteps: steps.map(s => ({
      id: s.id,
      name: s.name,
      roleId: s.assignments?.[0]?.roleId,
      modelProviderId: s.assignments?.[0]?.modelProviderId,
      modelName: s.assignments?.[0]?.modelName,
      runnerId: s.assignments?.[0]?.runnerId
    })),
    roleCoverage: roleAvatars.slice(0, 5),
    runnerCoverage: steps.some(s => s.assignments?.[0]?.runnerId) ? 85 : 60,
    riskGap: null,
    healthStatus: "healthy" as const,
    healthLabel: "健康",
    maturity: 75,
    maturityLabel: "成熟度",
    category: (template.category || "dev") as WorkflowCategory,
    boundProjects: projects.filter(p => p.workflowTemplateId === template.id).length,
    boundProjectNames: projects.filter(p => p.workflowTemplateId === template.id).map(p => p.name),
    lastUpdated: template.updatedAt ? new Date(template.updatedAt).toLocaleDateString("zh-CN") : "未知",
  };
}

// Status chip styling helper
function statusChipClass(status: WorkflowAsset["status"]): string {
  switch (status) {
    case "enabled":
      return "wmo-chip ok";
    case "draft":
      return "wmo-chip warn";
    case "high-risk":
      return "wmo-chip bad";
    case "disabled":
      return "wmo-chip";
    default:
      return "wmo-chip";
  }
}

// Health chip styling helper
function healthChipClass(status: HealthStatus): string {
  switch (status) {
    case "healthy":
      return "wmo-chip ok";
    case "warning":
      return "wmo-chip warn";
    case "error":
      return "wmo-chip bad";
    case "pending":
      return "wmo-chip";
    default:
      return "wmo-chip";
  }
}

// Category tab with counts
const ALL_CATEGORIES: { id: WorkflowCategory; name: string }[] = [
  { id: "all", name: "全部" },
  { id: "dev", name: "开发类" },
  { id: "design", name: "设计类" },
  { id: "review", name: "评审类" },
  { id: "release", name: "发布类" },
];

function getCategoryCount(workflows: WorkflowAsset[], catId: WorkflowCategory): number {
  if (catId === "all") return workflows.length;
  return workflows.filter((w) => w.category === catId).length;
}

// KPI stat icons
function KpiIcon({ type }: { type: "total" | "enabled" | "bound" | "pending" | "risk" }) {
  switch (type) {
    case "total":
      return (
        <div className="wmo-stat-icon info">
          <LayoutGrid size={16} />
        </div>
      );
    case "enabled":
      return (
        <div className="wmo-stat-icon success">
          <CheckCircle2 size={16} />
        </div>
      );
    case "bound":
      return (
        <div className="wmo-stat-icon info">
          <Package size={16} />
        </div>
      );
    case "pending":
      return (
        <div className="wmo-stat-icon warn">
          <CircleAlert size={16} />
        </div>
      );
    case "risk":
      return (
        <div className="wmo-stat-icon danger">
          <TriangleAlert size={16} />
        </div>
      );
  }
}

export function WorkflowManagementOverview({ data, onNavigate, onEnterWorkflowDesign, onEnterAiWorkflowDesign, onDeleteTemplate, onUpdateTemplate }: WorkflowManagementOverviewProps) {
  const [activeCategory, setActiveCategory] = useState<WorkflowCategory>("all");
  const [validating, setValidating] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState("");
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [deletedCategoryIds, setDeletedCategoryIds] = useState<string[]>([]);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, WorkflowAsset["status"]>>({});
  const [validationResults, setValidationResults] = useState<Record<string, string[]>>({});
  const importInputRef = useRef<HTMLInputElement | null>(null);

  // Toolbar dropdowns
  const [sortField, setSortField] = useState<"default" | "name" | "updated" | "steps">("default");
  const [openDropdown, setOpenDropdown] = useState<"flows" | "sort" | "category" | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Convert workflow templates to workflow assets
  const workflowAssets = useMemo(() => {
    return (data.workflowTemplates || []).map(t => workflowTemplateToAsset(t, data.roles, data.projects));
  }, [data.workflowTemplates, data.roles, data.projects]);

  const categoryTabs = useMemo(
    () => ALL_CATEGORIES.filter((category) => category.id === "all" || !deletedCategoryIds.includes(category.id)),
    [deletedCategoryIds]
  );

  const visibleWorkflows = useMemo(
    () =>
      workflowAssets.map((flow) => ({
        ...flow,
        status: statusOverrides[flow.id] ?? flow.status,
      })),
    [workflowAssets, statusOverrides]
  );

  // Compute KPIs from visibleWorkflows (includes statusOverrides + validationResults)
  const kpis = useMemo((): WorkflowKPIs => {
    const total = visibleWorkflows.length;
    const enabled = visibleWorkflows.filter(w => w.status === "enabled").length;
    const highRisk = visibleWorkflows.filter(w => w.status === "high-risk").length;
    const pendingValidation = visibleWorkflows.filter(w =>
      w.status === "draft" || (validationResults[w.id] && validationResults[w.id].length > 0)
    ).length;
    const boundProjects = visibleWorkflows.reduce((sum, w) => sum + w.boundProjects, 0);
    return { total, enabled, boundProjects, pendingValidation, highRisk };
  }, [visibleWorkflows, validationResults]);

  // Compute health panel data from real data
  const healthPanel = useMemo((): HealthPanelData => {
    const categories: CategoryStats[] = [
      { id: "dev", name: "开发类", count: workflowAssets.filter(w => w.category === "dev").length, description: "需求、开发、修复、测试闭环", healthPercent: 75, status: "healthy" },
      { id: "design", name: "设计类", count: workflowAssets.filter(w => w.category === "design").length, description: "方案、原型、视觉和交互评审", healthPercent: 65, status: "warning" },
      { id: "review", name: "评审类", count: workflowAssets.filter(w => w.category === "review").length, description: "代码审查、产品验收、风险确认", healthPercent: 80, status: "healthy" },
      { id: "release", name: "发布类", count: workflowAssets.filter(w => w.category === "release").length, description: "发布冻结、上线验收、回滚预案", healthPercent: 60, status: "warning" },
    ];
    const roleBindingGaps: RoleBindingGap[] = [];
    const recentChanges: RecentChange[] = workflowAssets.slice(0, 2).map(w => ({
      workflowName: w.name,
      description: w.version,
      timestamp: w.lastUpdated,
    }));
    const aiRecommendation: AIRecommendation = {
      message: workflowAssets.length > 0 ? "当前流程状态良好，继续保持。" : "暂无流程，请创建第一个流程模板。",
      priority: "medium",
    };
    return { categories, roleBindingGaps, recentChanges, aiRecommendation };
  }, [workflowAssets]);

  const filteredWorkflows = useMemo(
    () => {
      let result = filterWorkflowsByCategory(visibleWorkflows, activeCategory);
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        result = result.filter(w =>
          w.name.toLowerCase().includes(q) ||
          w.description.toLowerCase().includes(q) ||
          w.roleCoverage.some(r => r.initials?.toLowerCase().includes(q))
        );
      }
      // Apply sort
      switch (sortField) {
        case "name":
          result = [...result].sort((a, b) => a.name.localeCompare(b.name, "zh"));
          break;
        case "updated":
          result = [...result].sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
          break;
        case "steps":
          result = [...result].sort((a, b) => b.stepCount - a.stepCount);
          break;
        default:
          // default: keep original order
          break;
      }
      return result;
    },
    [visibleWorkflows, activeCategory, searchQuery, sortField]
  );

  const visibleHealthCategories = useMemo(
    () => healthPanel.categories.filter((category) => !deletedCategoryIds.includes(category.id)),
    [healthPanel.categories, deletedCategoryIds]
  );

  // Handle "check all" action — validate every workflow
  const handleValidateAll = () => {
    setValidating(true);
    // 清除旧结果，让校验重新计算
    setValidationResults({});
    setTimeout(() => {
      const results: Record<string, string[]> = {};
      let totalIssues = 0;
      workflowAssets.forEach((flow) => {
        const issues: string[] = [];
        if (flow.fullSteps.length === 0) issues.push("流程没有任何步骤");
        flow.fullSteps.forEach((s, i) => {
          if (!s.name?.trim()) issues.push(`步骤 ${i + 1} 缺少名称`);
          if (!s.roleId) issues.push(`步骤 ${i + 1}「${s.name}」未绑定角色`);
          if (!s.modelProviderId || !s.modelName) issues.push(`步骤 ${i + 1}「${s.name}」未配置模型`);
          if (!s.runnerId) issues.push(`步骤 ${i + 1}「${s.name}」未配置 Runner`);
        });
        if (issues.length > 0) results[flow.id] = issues;
        totalIssues += issues.length;
      });
      setValidationResults(results);
      setValidating(false);
      // 显示校验结果摘要
      const problemCount = Object.keys(results).length;
      if (problemCount === 0) {
        window.alert(`校验完成：${workflowAssets.length} 个流程全部通过，未发现问题。`);
      } else {
        window.alert(`校验完成：发现 ${problemCount} 个流程存在 ${totalIssues} 个问题。请在流程卡片查看详情。`);
      }
    }, 600);
  };

  // Removed auto-validate — only validate on user click

  // Handle entering workflow designer
  const handleEnterDesigner = (workflowId: string) => {
    onEnterWorkflowDesign?.(workflowId);
    if (!onEnterWorkflowDesign) onNavigate?.("workflows");
  };

  const handleDeleteFlow = (workflowId: string) => {
    onDeleteTemplate?.(workflowId);
  };

  const handleToggleFlowStatus = (workflowId: string, currentStatus: WorkflowAsset["status"]) => {
    const newStatus = currentStatus === "enabled" ? "disabled" : "enabled";
    setStatusOverrides((items) => ({
      ...items,
      [workflowId]: newStatus,
    }));
    onUpdateTemplate?.(workflowId, { status: newStatus });
  };

  const handleUpdateCategory = (workflowId: string, category: WorkflowCategoryBase) => {
    onUpdateTemplate?.(workflowId, { category });
  };

  const handleCreateWorkflow = () => {
    window.history.replaceState(null, "", window.location.pathname + "#workflows?mode=manual");
    window.dispatchEvent(new CustomEvent("navigate", { detail: { view: "workflows" } }));
  };

  const handleCreateAiWorkflow = () => {
    if (onEnterAiWorkflowDesign) {
      onEnterAiWorkflowDesign();
    } else {
      window.history.replaceState(null, "", window.location.pathname + "#workflows?mode=ai");
      window.dispatchEvent(new CustomEvent("navigate", { detail: { view: "workflows" } }));
    }
  };

  const handleImportWorkflow = () => {
    importInputRef.current?.click();
  };

  const handleAddCategory = () => {
    const name = categoryDraft.trim();
    if (!name || customCategories.includes(name)) return;
    setCustomCategories((items) => [...items, name]);
    setCategoryDraft("");
  };

  const handleDeleteCategory = (categoryId: string, categoryName: string, custom = false) => {
    if (!window.confirm(`确定删除分类「${categoryName}」吗？`)) return;
    if (custom) {
      setCustomCategories((items) => items.filter((name) => name !== categoryName));
      return;
    }
    setDeletedCategoryIds((ids) => (ids.includes(categoryId) ? ids : [...ids, categoryId]));
    if (activeCategory === categoryId) setActiveCategory("all");
  };

  // Empty state (no workflows at all)
  if (workflowAssets.length === 0) {
    return (
      <div className="wmo-page">
        <div className="wmo-empty">
          <div className="wmo-empty-icon">
            <GitBranch size={24} />
          </div>
          <h2>还没有流程资产</h2>
          <p>
            创建第一个流程开始管理你的工程流程。你可以从
            <span className="wmo-empty-highlight">常规创建</span>、
            <span className="wmo-empty-highlight">AI 生成</span>或
            <span className="wmo-empty-highlight">导入</span>开始。
          </p>
          <div className="wmo-empty-actions">
            <button className="wmo-btn" onClick={handleCreateWorkflow}>
              <Plus size={14} /> 新建常规流程
            </button>
            <button className="wmo-btn wmo-btn-primary" onClick={handleCreateAiWorkflow}>
              <Sparkles size={14} /> AI 生成流程
            </button>
            <button className="wmo-btn" onClick={handleImportWorkflow}>
              <Download size={14} /> 导入流程
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wmo-page">
      {/* ===== TOOLBAR (project management style) ===== */}
      <div className="pm-v2-toolbar">
        <div className="pm-v2-toolbar-left" ref={toolbarRef}>
          {/* 全部流程 dropdown */}
          <div className="pm-v2-select-wrapper">
            <div
              className={`pm-v2-select${openDropdown === "flows" ? " active" : ""}`}
              onClick={() => setOpenDropdown(openDropdown === "flows" ? null : "flows")}
            >
              <GitBranch size={14} />全部流程<ChevronDown size={12} />
            </div>
            {openDropdown === "flows" && (
              <div className="pm-v2-dropdown">
                {workflowAssets.length === 0 ? (
                  <div className="pm-v2-dropdown-item muted">暂无流程</div>
                ) : (
                  workflowAssets.map(w => (
                    <div key={w.id} className="pm-v2-dropdown-item" onClick={() => { setOpenDropdown(null); }}>
                      <span>{w.name}</span>
                      <span className={`wmo-chip ${w.status === "enabled" ? "ok" : w.status === "draft" ? "warn" : ""}`} style={{ fontSize: 10, marginLeft: "auto" }}>
                        {w.version}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* 按状态排序 dropdown */}
          <div className="pm-v2-select-wrapper">
            <div
              className={`pm-v2-select${openDropdown === "sort" ? " active" : ""}`}
              onClick={() => setOpenDropdown(openDropdown === "sort" ? null : "sort")}
            >
              按状态排序<ChevronDown size={12} />
            </div>
            {openDropdown === "sort" && (
              <div className="pm-v2-dropdown">
                {([
                  { key: "default", label: "默认排序" },
                  { key: "name", label: "按名称" },
                  { key: "updated", label: "按更新时间" },
                  { key: "steps", label: "按步骤数" },
                ] as const).map(opt => (
                  <div
                    key={opt.key}
                    className={`pm-v2-dropdown-item${sortField === opt.key ? " active" : ""}`}
                    onClick={() => { setSortField(opt.key); setOpenDropdown(null); }}
                  >
                    {sortField === opt.key && <CheckCircle2 size={12} style={{ color: "var(--ok)" }} />}
                    <span>{opt.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 按类别筛选 dropdown */}
          <div className="pm-v2-select-wrapper">
            <div
              className={`pm-v2-select${openDropdown === "category" ? " active" : ""}`}
              onClick={() => setOpenDropdown(openDropdown === "category" ? null : "category")}
            >
              按类别筛选<ChevronDown size={12} />
            </div>
            {openDropdown === "category" && (
              <div className="pm-v2-dropdown">
                {ALL_CATEGORIES.map(cat => (
                  <div
                    key={cat.id}
                    className={`pm-v2-dropdown-item${activeCategory === cat.id ? " active" : ""}`}
                    onClick={() => { setActiveCategory(cat.id); setOpenDropdown(null); }}
                  >
                    {activeCategory === cat.id && <CheckCircle2 size={12} style={{ color: "var(--ok)" }} />}
                    <span>{cat.name}</span>
                    <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-muted)" }}>{getCategoryCount(visibleWorkflows, cat.id)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <input
            className="pm-v2-search"
            placeholder="搜索流程名称、角色、项目关联..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="pm-v2-toolbar-right">
          <button className="pm-v2-btn pm-v2-btn-ok" onClick={handleValidateAll}>
            <CheckCircle2 size={14} />检查全部流程
          </button>
          <button className="pm-v2-btn" onClick={handleCreateWorkflow}>
            <Plus size={14} />新建常规流程
          </button>
          <button className="pm-v2-btn" onClick={handleImportWorkflow}>
            <Download size={14} />导入流程
          </button>
          <button className="pm-v2-btn pm-v2-btn-primary" onClick={handleCreateAiWorkflow}>
            <Sparkles size={14} />AI 生成流程
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".json,.yaml,.yml,.md"
            hidden
            onChange={(event) => {
              if (event.target.files?.[0]) {
                window.alert(`已选择流程文件：${event.target.files[0].name}`);
                event.target.value = "";
              }
            }}
          />
        </div>
      </div>

      {/* ===== KPI Stats ===== */}
      <div className="pm-v2-kpis">
        <div className="pm-v2-kpi pm-v2-kpi-health">
          <div className="pm-v2-ring" style={{ background: `conic-gradient(var(--ok) 0 ${kpis.total > 0 ? Math.round((kpis.enabled / kpis.total) * 100) : 0}%, #263244 ${kpis.total > 0 ? Math.round((kpis.enabled / kpis.total) * 100) : 0}% 100%)` }}>
            <span>{kpis.total > 0 ? Math.round((kpis.enabled / kpis.total) * 100) : 0}</span>
          </div>
          <div>
            <label>流程组合健康度</label>
            <small>{kpis.highRisk > 0 ? `${kpis.highRisk} 个流程需关注` : "所有流程状态正常"}</small>
          </div>
        </div>
        <div className="pm-v2-kpi"><label>流程总数</label><strong>{kpis.total}</strong><small>{kpis.enabled} 个已启用</small></div>
        <div className="pm-v2-kpi"><label>绑定项目</label><strong>{kpis.boundProjects}</strong><small>关联项目数</small></div>
        <div className="pm-v2-kpi"><label>待校验</label><strong style={{ color: "var(--warn)" }}>{kpis.pendingValidation}</strong><small>需人工确认</small></div>
        <div className="pm-v2-kpi"><label>高风险</label><strong style={{ color: "var(--danger)" }}>{kpis.highRisk}</strong><small>角色/模型缺失</small></div>
        <div className="pm-v2-kpi"><label>类别覆盖</label><strong>{healthPanel.categories.filter(c => c.count > 0).length}</strong><small>{healthPanel.categories.length} 个类别</small></div>
        <div className="pm-v2-kpi"><label>版本状态</label><strong>{workflowAssets.filter(w => parseInt(w.version.replace(/[^0-9]/g, "")) >= 2).length}</strong><small>高版本流程</small></div>
      </div>

      {/* ===== COMMANDER STRIP ===== */}
      <div className="pm-v2-commander">
        <div className="pm-v2-commander-left">
          <div className="pm-v2-commander-card">
            <div className="pm-v2-commander-icon"><AlertTriangle size={18} /></div>
            <div>
              <h3>待校验流程</h3>
              <p>{kpis.pendingValidation > 0 ? `${kpis.pendingValidation} 个流程需校验` : "暂无待处理校验"}</p>
            </div>
            <div className="pm-v2-commander-metric">{kpis.pendingValidation}<span>待校验</span></div>
          </div>
          <div className="pm-v2-commander-card ok">
            <div className="pm-v2-commander-icon"><Activity size={18} /></div>
            <div>
              <h3>启用中流程</h3>
              <p>{kpis.enabled > 0 ? `${kpis.enabled} 个流程运行正常` : "暂无启用流程"}</p>
            </div>
            <div className="pm-v2-commander-metric">{kpis.enabled}<span>启用中</span></div>
          </div>
          <div className="pm-v2-commander-card">
            <div className="pm-v2-commander-icon"><Clock size={18} /></div>
            <div>
              <h3>流程绑定状态</h3>
              <p>{kpis.boundProjects > 0 ? `${kpis.boundProjects} 个项目已绑定` : "暂无项目绑定"}</p>
            </div>
            <div className="pm-v2-commander-metric">{kpis.boundProjects}<span>绑定</span></div>
          </div>
        </div>
        <div className="pm-v2-commander-right">
          <div className="pm-v2-commander-card ai">
            <div className="pm-v2-commander-icon"><Sparkles size={18} /></div>
            <div>
              <h3>AI 建议下一步</h3>
              <p>{kpis.pendingValidation > 0 ? `有 ${kpis.pendingValidation} 个流程待校验` : "所有流程状态良好"}</p>
            </div>
            <button className="pm-v2-btn" onClick={handleValidateAll}>立即校验</button>
          </div>
        </div>
      </div>

      {/* Validating overlay */}
      {validating && (
        <div className="wmo-validating-overlay">
          <Loader2 size={32} className="wmo-loading-spinner" style={{ color: "#5de2a2" }} />
          <h2>正在校验全部流程...</h2>
          <p>检查角色绑定和风险缺口</p>
        </div>
      )}

      {/* Flow List + Side Panel Grid */}
      <div className="wmo-grid" style={{ minHeight: 0, flex: 1, marginTop: 0 }}>
        {/* Left: Flow List Panel */}
        <div className="pm-v2-panel" style={{ minHeight: 0, display: "flex", flexDirection: "column" }}>
          <div className="pm-v2-panel-head">
            <div>
              <h2>流程列表</h2>
              <p>{filteredWorkflows.length} 个流程</p>
            </div>
            <div className="pm-v2-portfolio-tools">
              <div className="wmo-tabset">
                {categoryTabs.map((cat) => (
                  <button
                    key={cat.id}
                    className={`wmo-cat-tab${activeCategory === cat.id ? " active" : ""}`}
                    onClick={() => setActiveCategory(cat.id)}
                    style={{ fontSize: 11, padding: "3px 8px" }}
                  >
                    {cat.name} <small>{getCategoryCount(visibleWorkflows, cat.id)}</small>
                  </button>
                ))}
              </div>
              <button className="pm-v2-btn" onClick={() => setShowCategoryManager(true)} type="button" style={{ fontSize: 11 }}>
                <Plus size={12} /> 维护分类
              </button>
            </div>
          </div>
          <div className="pm-v2-portfolio">
            {filteredWorkflows.length === 0 ? (
              <div className="pm-v2-empty">
                <h3>当前分类暂无流程</h3>
                <p>切换到其他分类，或在此分类下新建流程</p>
                <button className="pm-v2-btn pm-v2-btn-primary" style={{ marginTop: 8 }}>
                  <Plus size={14} /> 新建流程
                </button>
              </div>
            ) : (
              <div className="pm-v2-project-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
                {filteredWorkflows.map((flow) => (
                  <WorkflowCard
                    key={flow.id}
                    flow={flow}
                    onEnterDesigner={handleEnterDesigner}
                    onDelete={handleDeleteFlow}
                    onToggleStatus={handleToggleFlowStatus}
                    onUpdateCategory={handleUpdateCategory}
                    validationIssues={validationResults[flow.id]}
                  />
                ))}
              </div>
            )}
            <div className="pm-v2-portfolio-foot">
              <span>共 {filteredWorkflows.length} 个流程</span>
              <span>10 条/页</span>
            </div>
          </div>
        </div>

        {/* Right: Side Panel */}
        <div className="wmo-sidepanel">
          <div className="wmo-panel-header">
            <h2>健康面板</h2>
            <span>实时状态</span>
          </div>
          <div className="wmo-sidepanel-body">
            {/* Category Stats */}
            {visibleHealthCategories.map((cat) => (
              <div key={cat.id} className="wmo-side-card" style={{ padding: "8px 10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ margin: 0, fontSize: 12 }}>{cat.name}</h3>
                  <span style={{
                    fontSize: 10, padding: "1px 6px", borderRadius: 3,
                    background: cat.status === "healthy" ? "rgba(63,185,80,0.12)" : "rgba(210,153,34,0.12)",
                    color: cat.status === "healthy" ? "#3fb950" : "#d29922",
                  }}>{cat.status === "healthy" ? "健康" : "注意"}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                  <div style={{ flex: 1, height: 4, borderRadius: 2, background: "#1e2a38", overflow: "hidden" }}>
                    <div style={{ width: `${cat.healthPercent}%`, height: "100%", borderRadius: 2, background: cat.status === "healthy" ? "var(--ok)" : "var(--warn)" }} />
                  </div>
                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{cat.count} 个</span>
                </div>
              </div>
            ))}

            {/* Risk Gaps */}
            {healthPanel.roleBindingGaps.length > 0 && (
              <div className="wmo-side-card" style={{ padding: "8px 10px" }}>
                <h3 style={{ margin: "0 0 6px", fontSize: 12 }}>角色绑定缺口</h3>
                {healthPanel.roleBindingGaps.map((gap, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, padding: "3px 0", borderBottom: i < healthPanel.roleBindingGaps.length - 1 ? "1px solid #1e2a38" : "none" }}>
                    <span style={{ color: "var(--text-secondary)" }}>{gap.workflowName} - {gap.missingRole}</span>
                    <span style={{ color: "var(--warn)", fontSize: 10 }}>待处理</span>
                  </div>
                ))}
              </div>
            )}

            {/* Recent Changes */}
            <div className="wmo-side-card" style={{ padding: "8px 10px" }}>
              <h3 style={{ margin: "0 0 6px", fontSize: 12 }}>最近变更</h3>
              {healthPanel.recentChanges.length > 0 ? healthPanel.recentChanges.map((change, i) => (
                <div key={i} style={{ fontSize: 11, padding: "3px 0", color: "var(--text-muted)", borderBottom: i < healthPanel.recentChanges.length - 1 ? "1px solid #1e2a38" : "none" }}>
                  <div style={{ color: "var(--text-secondary)" }}>{change.workflowName}</div>
                  <div>{change.description} · {change.timestamp}</div>
                </div>
              )) : (
                <p style={{ color: "var(--text-muted)", fontSize: 11, margin: 0 }}>暂无近期变更</p>
              )}
            </div>

            {/* AI Tip */}
            <div className="wmo-side-card" style={{ padding: "8px 10px", background: "linear-gradient(135deg, rgba(75,91,183,0.08), rgba(55,70,140,0.04))", borderColor: "rgba(107,129,255,0.15)" }}>
              <h3 style={{ margin: "0 0 4px", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                <Sparkles size={12} style={{ color: "var(--accent-purple)" }} /> AI 建议
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: 11, margin: 0 }}>{healthPanel.aiRecommendation.message}</p>
            </div>
          </div>
        </div>
      </div>

      {showCategoryManager && (
        <div className="wmo-category-modal-overlay" onClick={() => setShowCategoryManager(false)}>
          <div className="wmo-category-modal" onClick={(event) => event.stopPropagation()}>
            <div className="wmo-category-modal-head">
              <div>
                <h3>维护分类</h3>
                <p>管理流程列表的分类入口和健康度视图。</p>
              </div>
              <button className="wmo-btn" onClick={() => setShowCategoryManager(false)} type="button">
                ×
              </button>
            </div>

            <div className="wmo-category-modal-list">
              {visibleHealthCategories.map((category) => (
                <div key={category.id} className="wmo-category-modal-row">
                  <div>
                    <strong>{category.name}</strong>
                    <span>{category.description}</span>
                  </div>
                  <div className="wmo-category-modal-row-actions">
                    <small>{category.count} 个 · {category.healthPercent}%</small>
                    <button className="wmo-category-delete-btn" onClick={() => handleDeleteCategory(category.id, category.name)} type="button" aria-label={`删除分类 ${category.name}`} title="删除分类">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
              {customCategories.map((name) => (
                <div key={name} className="wmo-category-modal-row custom">
                  <div>
                    <strong>{name}</strong>
                    <span>新建分类，等待绑定流程</span>
                  </div>
                  <div className="wmo-category-modal-row-actions">
                    <small>0 个 · 草稿</small>
                    <button className="wmo-category-delete-btn" onClick={() => handleDeleteCategory(`custom-${name}`, name, true)} type="button" aria-label={`删除分类 ${name}`} title="删除分类">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="wmo-category-modal-add">
              <input
                value={categoryDraft}
                onChange={(event) => setCategoryDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleAddCategory();
                }}
                placeholder="输入新分类名称"
              />
              <button className="wmo-btn wmo-btn-primary" onClick={handleAddCategory} disabled={!categoryDraft.trim()} type="button">
                新增分类
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Individual workflow card
const CATEGORY_LABELS: Record<WorkflowCategoryBase, string> = {
  dev: "开发类",
  design: "设计类",
  review: "评审类",
  release: "发布类",
};

function WorkflowCard({
  flow,
  onEnterDesigner,
  onDelete,
  onToggleStatus,
  onUpdateCategory,
  validationIssues,
}: {
  flow: WorkflowAsset;
  onEnterDesigner: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, currentStatus: WorkflowAsset["status"]) => void;
  onUpdateCategory?: (id: string, category: WorkflowCategoryBase) => void;
  validationIssues?: string[] | null;
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");

  const statusLabel = (() => {
    switch (flow.status) {
      case "enabled": return "已启用";
      case "draft": return "待校验";
      case "high-risk": return "高风险";
      case "disabled": return "已禁用";
      default: return "未知";
    }
  })();

  // Pad steps to 5 columns
  const displaySteps = [...flow.steps];
  while (displaySteps.length < 5) {
    displaySteps.push({ no: "--", name: "扩展" });
  }

  return (
    <article className="wmo-flow-card">
      <button
        className="wmo-flow-delete-btn"
        onClick={(event) => {
          event.stopPropagation();
          setShowDeleteConfirm(true);
        }}
        aria-label={`删除 ${flow.name}`}
        title="删除流程"
        type="button"
      >
        <Trash2 size={14} />
      </button>

      {/* Top: name, chips, health */}
      <div className="wmo-flow-top">
        <div>
          <h3>
            {(flow.status === "draft" || (validationIssues && validationIssues.length > 0)) && (
              <CircleAlert size={14} style={{ color: "var(--warning, #e0a030)", verticalAlign: "middle", marginRight: 6 }} />
            )}
            {flow.name}
          </h3>
          <div className="wmo-chips">
            {validationIssues && validationIssues.length > 0 ? (
              <span className="wmo-chip warn">待校验 · {validationIssues.length} 个问题</span>
            ) : (
              <span className={statusChipClass(flow.status)}>{statusLabel}</span>
            )}
            <span className="wmo-chip">{flow.version}</span>
            <span className="wmo-chip">{flow.stepCount} 步骤</span>
            <select
              className="wmo-chip wmo-category-select"
              value={flow.category}
              onChange={(e) => onUpdateCategory?.(flow.id, e.target.value as WorkflowCategoryBase)}
              onClick={(e) => e.stopPropagation()}
              title="设置分类"
            >
              {(["dev", "design", "review", "release"] as WorkflowCategoryBase[]).map((cat) => (
                <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
              ))}
            </select>
          </div>
        </div>
        <span className={healthChipClass(flow.healthStatus)}>{flow.healthLabel}</span>
      </div>

      {/* Description */}
      <p className="wmo-flow-desc">{flow.description}</p>

      {/* Step path */}
      <div className="wmo-flow-path">
        {displaySteps.slice(0, 5).map((step, i) => (
          <div key={i} className="wmo-step-pill">
            <small>{step.no}</small>
            <b>{step.name}</b>
          </div>
        ))}
      </div>

      {/* Detail: role coverage + health */}
      <div className="wmo-flow-detail">
        <div className="wmo-role-stack">
          <label>角色覆盖</label>
          <div className="wmo-avatars">
            {flow.roleCoverage.map((role, i) => (
              <span key={i} className={`wmo-avatar-dot ${role.color}`}>
                {role.initials}
              </span>
            ))}
          </div>
        </div>
        <div className="wmo-risk-box">
          <label>执行健康</label>
          <div className="wmo-risk-list">
            <div className="wmo-risk-line">
              <span>Runner</span>
              <b>{flow.runnerCoverage}%</b>
            </div>
          </div>
        </div>
      </div>

      {/* Footer: progress + actions */}
      <div className="wmo-flow-foot">
        <div className="wmo-progress-line">
          <div className="wmo-progress-between">
            <span>{flow.maturityLabel}</span>
            <b>{flow.maturity}%</b>
          </div>
          <div className="wmo-bar">
            <i style={{ width: `${flow.maturity}%` }} />
          </div>
        </div>
        <div className="wmo-flow-actions">
          <button
            className={`wmo-btn ${flow.status === "enabled" ? "wmo-btn-stop" : "wmo-btn-start"}`}
            onClick={() => {
              if (flow.status === "draft" || (validationIssues && validationIssues.length > 0)) {
                window.alert("流程存在校验问题，请先进入设计修复后再启用");
                return;
              }
              onToggleStatus(flow.id, flow.status);
            }}
            type="button"
            disabled={flow.status === "draft" || !!validationIssues?.length}
            title={(flow.status === "draft" || (validationIssues && validationIssues.length > 0)) ? "待校验流程无法启用" : undefined}
          >
            {flow.status === "enabled" ? <PowerOff size={13} /> : <Power size={13} />}
            {flow.status === "enabled" ? "停用" : "启用"}
          </button>
          <button
            className="wmo-btn wmo-btn-primary"
            onClick={() => onEnterDesigner(flow.id)}
            type="button"
          >
            进入设计
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="pm-v2-pc-confirm-overlay" onClick={(event) => event.stopPropagation()}>
          <div className="pm-v2-pc-confirm-box">
            <div className="pm-v2-pc-confirm-header">
              <TriangleAlert size={16} color="var(--danger)" />
              <span>删除流程</span>
              <button
                className="pm-v2-btn"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteInput("");
                }}
                type="button"
              >
                <X size={14} />
              </button>
            </div>
            <div className="pm-v2-pc-confirm-body">
              {flow.boundProjects > 0 ? (
                <>
                  <p>
                    <strong>{flow.name}</strong> 正在被以下 <strong>{flow.boundProjects}</strong> 个项目使用，无法删除：
                  </p>
                  <ul style={{ margin: "8px 0", paddingLeft: 20, color: "var(--text-secondary)" }}>
                    {flow.boundProjectNames.map((name, i) => (
                      <li key={i}>{name}</li>
                    ))}
                  </ul>
                  <p style={{ color: "var(--warning)" }}>请先将这些项目解绑或切换到其他流程，再进行删除。</p>
                </>
              ) : (
                <>
                  <p>
                    请输入 <strong>yes</strong> 以确认删除 <strong>{flow.name}</strong>：
                  </p>
                  <input
                    value={deleteInput}
                    onChange={(event) => setDeleteInput(event.target.value)}
                    placeholder="yes"
                    autoFocus
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && deleteInput === "yes") {
                        onDelete(flow.id);
                      }
                    }}
                  />
                </>
              )}
            </div>
            <div className="pm-v2-pc-confirm-footer">
              <button
                className="pm-v2-btn"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteInput("");
                }}
                type="button"
              >
                {flow.boundProjects > 0 ? "关闭" : "取消"}
              </button>
              {flow.boundProjects === 0 && (
                <button
                  className="pm-v2-btn pm-v2-btn-danger"
                  disabled={deleteInput !== "yes"}
                  onClick={() => onDelete(flow.id)}
                  type="button"
                >
                  确认删除
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

// Category card in side panel
function CategoryCard({
  category,
  isActive,
  onClick,
}: {
  category: CategoryStats;
  isActive: boolean;
  onClick: () => void;
}) {
  const countChipClass = (() => {
    switch (category.status) {
      case "healthy": return "wmo-chip ok";
      case "warning": return "wmo-chip warn";
      case "error": return "wmo-chip bad";
      default: return "wmo-chip";
    }
  })();

  return (
    <div
      className={`wmo-category-card${isActive ? " active" : ""}`}
      onClick={onClick}
    >
      <div className="wmo-category-card-top">
        <b>{category.name}</b>
        <span className={countChipClass}>{category.count} 个</span>
      </div>
      <p>{category.description}</p>
      <div className="wmo-mini-bar">
        <i style={{ width: `${category.healthPercent}%` }} />
      </div>
    </div>
  );
}
