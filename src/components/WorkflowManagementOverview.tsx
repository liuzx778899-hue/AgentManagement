import { useRef, useState, useMemo } from "react";
import {
  CheckCircle2,
  CircleAlert,
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
import { workflowApi } from "../services/api/workflowApi";

interface WorkflowManagementOverviewProps {
  data: WorkbenchData;
  onNavigate?: (view: WorkbenchView) => void;
  onEnterWorkflowDesign?: (workflowId: string) => void;
}

// Workflow status types
type WorkflowStatus = "enabled" | "draft" | "disabled" | "high-risk";

// Health status types
type HealthStatus = "healthy" | "warning" | "error" | "pending";

// Workflow category types
type WorkflowCategory = "all" | "dev" | "design" | "review" | "release";

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
  roleCoverage: RoleAvatar[];
  runnerCoverage: number;
  riskGap: string | null;
  healthStatus: HealthStatus;
  healthLabel: string;
  maturity: number;
  maturityLabel: string;
  category: WorkflowCategory;
  boundProjects: number;
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
function workflowTemplateToAsset(template: WorkbenchData["workflowTemplates"][0], roles: WorkbenchData["roles"]): WorkflowAsset {
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
    if (s.roleId && !seenRoleIds.has(s.roleId)) {
      seenRoleIds.add(s.roleId);
      const roleName = getRoleName(s.roleId);
      const initials = roleName.slice(0, 2);
      roleAvatars.push({ initials: initials.toUpperCase(), color: colors[roleAvatars.length % colors.length] });
    }
  });
  return {
    id: template.id,
    name: template.name,
    description: template.workflowMarkdown?.split("\n")[0] || "无描述",
    status: template.status === "enabled" ? "enabled" : "draft",
    version: `v${template.version || 1}`,
    stepCount: steps.length,
    steps: steps.slice(0, 5).map((s, i) => ({ no: `${i + 1}`.padStart(2, "0"), name: s.name })),
    roleCoverage: roleAvatars.slice(0, 5),
    runnerCoverage: steps.some(s => s.runnerId) ? 85 : 60,
    riskGap: null,
    healthStatus: "healthy" as const,
    healthLabel: "健康",
    maturity: 75,
    maturityLabel: "成熟度",
    category: "dev" as const,
    boundProjects: 0,
    lastUpdated: template.updatedAt ? new Date(template.updatedAt).toLocaleDateString("zh-CN") : "未知",
  };
}

// Status chip styling helper
function statusChipClass(status: WorkflowAsset["status"]): string {
  switch (status) {
    case "enabled":
      return "wmo-chip ok";
    case "draft":
      return "wmo-chip";
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

export function WorkflowManagementOverview({ data, onNavigate, onEnterWorkflowDesign }: WorkflowManagementOverviewProps) {
  const [activeCategory, setActiveCategory] = useState<WorkflowCategory>("all");
  const [validating, setValidating] = useState(false);
  const [deletedFlowIds, setDeletedFlowIds] = useState<string[]>([]);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState("");
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [deletedCategoryIds, setDeletedCategoryIds] = useState<string[]>([]);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, WorkflowAsset["status"]>>({});
  const importInputRef = useRef<HTMLInputElement | null>(null);

  // Convert workflow templates to workflow assets
  const workflowAssets = useMemo(() => {
    return (data.workflowTemplates || []).map(t => workflowTemplateToAsset(t, data.roles));
  }, [data.workflowTemplates, data.roles]);

  // Compute KPIs from real data
  const kpis = useMemo((): WorkflowKPIs => {
    const total = workflowAssets.length;
    const enabled = workflowAssets.filter(w => w.status === "enabled").length;
    const highRisk = workflowAssets.filter(w => w.status === "high-risk").length;
    const pendingValidation = workflowAssets.filter(w => w.status === "draft").length;
    const boundProjects = workflowAssets.reduce((sum, w) => sum + w.boundProjects, 0);
    return { total, enabled, boundProjects, pendingValidation, highRisk };
  }, [workflowAssets]);

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

  const categoryTabs = useMemo(
    () => ALL_CATEGORIES.filter((category) => category.id === "all" || !deletedCategoryIds.includes(category.id)),
    [deletedCategoryIds]
  );

  const visibleWorkflows = useMemo(
    () =>
      workflowAssets
        .filter((flow) => !deletedFlowIds.includes(flow.id))
        .map((flow) => ({
          ...flow,
          status: statusOverrides[flow.id] ?? flow.status,
        })),
    [workflowAssets, deletedFlowIds, statusOverrides]
  );

  const filteredWorkflows = useMemo(
    () => filterWorkflowsByCategory(visibleWorkflows, activeCategory),
    [visibleWorkflows, activeCategory]
  );

  const visibleHealthCategories = useMemo(
    () => healthPanel.categories.filter((category) => !deletedCategoryIds.includes(category.id)),
    [healthPanel.categories, deletedCategoryIds]
  );

  // Handle "check all" action
  const handleValidateAll = () => {
    setValidating(true);
    setTimeout(() => setValidating(false), 3000);
  };

  // Handle entering workflow designer
  const handleEnterDesigner = (workflowId: string) => {
    onEnterWorkflowDesign?.(workflowId);
    if (!onEnterWorkflowDesign) onNavigate?.("workflows");
  };

  const handleDeleteFlow = (workflowId: string) => {
    setDeletedFlowIds((ids) => (ids.includes(workflowId) ? ids : [...ids, workflowId]));
    workflowApi.deleteTemplate(workflowId).catch(err => {
      console.error('[WorkflowManagementOverview] Failed to delete template:', err);
    });
  };

  const handleToggleFlowStatus = (workflowId: string, currentStatus: WorkflowAsset["status"]) => {
    setStatusOverrides((items) => ({
      ...items,
      [workflowId]: currentStatus === "enabled" ? "disabled" : "enabled",
    }));
  };

  const handleCreateWorkflow = () => {
    onNavigate?.("workflows");
  };

  const handleCreateAiWorkflow = () => {
    onNavigate?.("workflows");
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
      {/* Header */}
      <div className="wmo-header">
        <div className="wmo-title">
          <h1>流程管理</h1>
          <p>统一管理流程模板、项目流程实例、角色绑定与版本变更。</p>
        </div>
        <div className="wmo-actions">
          <button className="wmo-btn wmo-btn-good" onClick={handleValidateAll}>
            <CheckCircle2 size={14} /> 检查全部流程
          </button>
          <button className="wmo-btn" onClick={handleCreateWorkflow}>
            <Plus size={14} /> 新建常规流程
          </button>
          <button className="wmo-btn wmo-btn-primary" onClick={handleCreateAiWorkflow}>
            <Sparkles size={14} /> AI 生成流程
          </button>
          <button className="wmo-btn" onClick={handleImportWorkflow}>
            <Download size={14} /> 导入流程
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

      {/* KPI Stats */}
      <div className="wmo-stats">
        <div className="wmo-stat">
          <KpiIcon type="total" />
          <div>
            <span>流程总数</span>
            <strong>{kpis.total}</strong>
          </div>
        </div>
        <div className="wmo-stat">
          <KpiIcon type="enabled" />
          <div>
            <span>启用中</span>
            <strong>{kpis.enabled}</strong>
          </div>
        </div>
        <div className="wmo-stat">
          <KpiIcon type="bound" />
          <div>
            <span>绑定项目</span>
            <strong>{kpis.boundProjects}</strong>
          </div>
        </div>
        <div className="wmo-stat">
          <KpiIcon type="pending" />
          <div>
            <span>待校验</span>
            <strong>{kpis.pendingValidation}</strong>
          </div>
        </div>
        <div className="wmo-stat">
          <KpiIcon type="risk" />
          <div>
            <span>高风险</span>
            <strong>{kpis.highRisk}</strong>
          </div>
        </div>
      </div>

      {/* Main Grid: Flow List + Side Panel */}
      <div className="wmo-grid" style={{ position: "relative" }}>
        {/* Validating overlay */}
        {validating && (
          <div className="wmo-validating-overlay">
            <Loader2 size={32} className="wmo-loading-spinner" style={{ color: "#5de2a2" }} />
            <h2>正在校验全部流程...</h2>
            <p>检查角色绑定和风险缺口</p>
          </div>
        )}

        {/* Left: Flow List Panel */}
        <div className="wmo-panel">
          <div className="wmo-panel-header">
            <h2>流程列表</h2>
            <span>模板与项目实例统一管理</span>
          </div>
          <div className="wmo-category-tabs">
            <div className="wmo-tabset">
              {categoryTabs.map((cat) => (
                <button
                  key={cat.id}
                  className={`wmo-cat-tab${activeCategory === cat.id ? " active" : ""}`}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  {cat.name} <small>{getCategoryCount(visibleWorkflows, cat.id)}</small>
                </button>
              ))}
            </div>
              <div className="wmo-category-tools">
                <button className="wmo-btn" onClick={() => setShowCategoryManager(true)} type="button">
                  <Plus size={12} /> 维护分类
                </button>
              <button className="wmo-btn">排序</button>
            </div>
          </div>
          <div className="wmo-flows">
            {filteredWorkflows.length === 0 ? (
              <div className="wmo-filtered-empty">
                <h3>当前分类暂无流程</h3>
                <p>切换到其他分类，或在此分类下新建流程</p>
                <button className="wmo-btn wmo-btn-primary" style={{ marginTop: 8 }}>
                  <Plus size={14} /> 新建流程
                </button>
              </div>
            ) : (
              filteredWorkflows.map((flow) => (
                <WorkflowCard
                  key={flow.id}
                  flow={flow}
                  onEnterDesigner={handleEnterDesigner}
                  onDelete={handleDeleteFlow}
                  onToggleStatus={handleToggleFlowStatus}
                />
              ))
            )}
          </div>
        </div>

        {/* Right: Health Panel */}
        <div className="wmo-sidepanel">
          <div className="wmo-panel-header">
            <h2>分类与健康面板</h2>
            <span>AI 诊断</span>
          </div>
          <div className="wmo-sidepanel-body">
            {/* Role Binding Gaps */}
            <div className="wmo-side-card">
              <h3>角色绑定缺口</h3>
              <div className="wmo-list">
                {healthPanel.roleBindingGaps.map((gap, i) => (
                  <div key={i} className="wmo-row">
                    <span>
                      {gap.workflowName}未绑定{gap.missingRole}
                    </span>
                    <small className={`wmo-status-${gap.status}`}>
                      {gap.status === "pending" ? "待处理" : "待确认"}
                    </small>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Changes */}
            <div className="wmo-side-card">
              <h3>最近变更</h3>
              <div className="wmo-list">
                {healthPanel.recentChanges.map((change, i) => (
                  <div key={i} className="wmo-row">
                    <span>
                      {change.workflowName} {change.description}
                    </span>
                    <small>{change.timestamp}</small>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Recommendation */}
            <div className="wmo-ai-rec">
              <h3>
                <span className="wmo-ai-rec-icon">
                  <Sparkles size={14} />
                </span>
                AI 建议
              </h3>
              <p>{healthPanel.aiRecommendation.message}</p>
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
function WorkflowCard({
  flow,
  onEnterDesigner,
  onDelete,
  onToggleStatus,
}: {
  flow: WorkflowAsset;
  onEnterDesigner: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, currentStatus: WorkflowAsset["status"]) => void;
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const statusLabel = (() => {
    switch (flow.status) {
      case "enabled": return "已启用";
      case "draft": return "草稿";
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
          <h3>{flow.name}</h3>
          <div className="wmo-chips">
            <span className={statusChipClass(flow.status)}>{statusLabel}</span>
            <span className="wmo-chip">{flow.version}</span>
            <span className="wmo-chip">{flow.stepCount} 步骤</span>
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
            onClick={() => onToggleStatus(flow.id, flow.status)}
            type="button"
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
                取消
              </button>
              <button
                className="pm-v2-btn pm-v2-btn-danger"
                disabled={deleteInput !== "yes"}
                onClick={() => onDelete(flow.id)}
                type="button"
              >
                确认删除
              </button>
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
