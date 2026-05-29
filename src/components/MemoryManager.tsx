import { useMemo, useState, useCallback } from "react";
import {
  MemoryStick,
  Search,
  Brain,
  Sparkles,
  Trash2,
  X,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  User,
  Database,
  Lightbulb,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { MemoryItem, MemoryKind, WorkbenchData } from "../domain/workbench";
import { useWorkbenchState } from "../App";
import { IconBadge } from "./IconBadge";

interface MemoryManagerProps {
  data: WorkbenchData;
}

type CategoryFilter = "all" | MemoryKind | "knowledge";

function kindLabel(kind: MemoryKind): string {
  switch (kind) {
    case "project":
      return "项目";
    case "role":
      return "角色";
    case "task":
      return "任务";
  }
}

function kindBadge(kind: MemoryKind): string {
  switch (kind) {
    case "project":
      return "badge blue";
    case "role":
      return "badge violet";
    case "task":
      return "badge orange";
  }
}

function scopeLabel(scope: string): string {
  switch (scope) {
    case "global":
      return "全局";
    case "project":
      return "项目";
    case "workflow":
      return "流程";
    case "task":
      return "任务";
    default:
      return scope;
  }
}

function scopeBadge(scope: string): string {
  switch (scope) {
    case "global":
      return "badge cyan";
    case "project":
      return "badge blue";
    case "workflow":
      return "badge green";
    case "task":
      return "badge orange";
    default:
      return "badge";
  }
}

/* ==============================
   Left: MemorySpaceTree
   ============================== */

interface TreeFilter {
  kind: "project" | "role" | "knowledge";
  id?: string;
}

interface MemorySpaceTreeProps {
  data: WorkbenchData;
  activeFilter: TreeFilter | null;
  onFilterChange: (filter: TreeFilter | null) => void;
  activeNode: string | null;
  onActiveNodeChange: (nodeId: string | null) => void;
  expandedProjects: Set<string>;
  onToggleProject: (projectId: string) => void;
}

function MemorySpaceTree({
  data,
  activeFilter,
  onFilterChange,
  activeNode,
  onActiveNodeChange,
  expandedProjects,
  onToggleProject,
}: MemorySpaceTreeProps) {
  return (
    <div className="mm-left-tree">
      <div className="mm-left-tree-title">Memory Space</div>

      {data.projects.map((project) => {
        const isExpanded = expandedProjects.has(project.id);
        const projectRoles = data.roles.filter((r) => r.projectId === project.id);
        const projectMemories = data.memories.filter((m) => m.projectId === project.id);
        const isActiveProject =
          activeFilter?.kind === "project" && activeFilter.id === project.id;

        return (
          <div key={project.id} className="mm-tree-node">
            <div
              className={`mm-tree-node-header${isActiveProject ? " active" : ""}`}
              onClick={() => {
                onActiveNodeChange(project.id);
                onFilterChange({ kind: "project", id: project.id });
              }}
            >
              <span
                className={`mm-chevron${isExpanded ? " open" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleProject(project.id);
                }}
              >
                <ChevronRight size={13} />
              </span>
              {isExpanded ? <FolderOpen size={14} /> : <Folder size={14} />}
              <span className="mm-tree-node-label">{project.name}</span>
              <span className="mm-tree-node-badge">{projectMemories.length}</span>
            </div>

            {isExpanded && (
              <div className="mm-tree-node-children">
                {/* Roles */}
                {projectRoles.map((role) => {
                  const roleMemories = data.memories.filter(
                    (m) => m.projectId === project.id && m.roleId === role.id
                  );
                  const isActiveRole =
                    activeFilter?.kind === "role" && activeFilter.id === role.id;
                  return (
                    <div key={role.id} className="mm-tree-node">
                      <div
                        className={`mm-tree-node-header${isActiveRole ? " active" : ""}`}
                        onClick={() => {
                          onActiveNodeChange(role.id);
                          onFilterChange({ kind: "role", id: role.id });
                        }}
                      >
                        <User size={13} />
                        <span className="mm-tree-node-label">{role.name}</span>
                        <span className="mm-tree-node-badge">{roleMemories.length}</span>
                      </div>
                    </div>
                  );
                })}

                {/* "项目记忆" node */}
                {(() => {
                  const projectScoped = projectMemories.filter(
                    (m) => m.scope === "project" && !m.roleId
                  );
                  const isActivePM =
                    activeNode === `pm-${project.id}`;
                  return (
                    <div className="mm-tree-node">
                      <div
                        className={`mm-tree-node-header${isActivePM ? " active" : ""}`}
                        onClick={() => {
                          onActiveNodeChange(`pm-${project.id}`);
                          onFilterChange({ kind: "project", id: project.id });
                        }}
                      >
                        <Database size={13} />
                        <span className="mm-tree-node-label">项目记忆</span>
                        <span className="mm-tree-node-badge">{projectScoped.length}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        );
      })}

      {/* "知识库" node at bottom */}
      {(() => {
        const knowledgeCount = data.memories.filter(
          (m) => m.scope === "global" || m.title.includes("知识") || m.body.includes("知识")
        ).length;
        const isActiveKB = activeFilter?.kind === "knowledge";
        return (
          <div className="mm-tree-node mm-tree-node-kb">
            <div
              className={`mm-tree-node-header${isActiveKB ? " active" : ""}`}
              onClick={() => {
                onActiveNodeChange("knowledge");
                onFilterChange({ kind: "knowledge" });
              }}
            >
              <Database size={14} />
              <span className="mm-tree-node-label">知识库</span>
              <span className="mm-tree-node-badge">{knowledgeCount}</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

/* ==============================
   Center: MemoryWorkspace
   ============================== */

interface MemoryWorkspaceProps {
  data: WorkbenchData;
  category: CategoryFilter;
  setCategory: (c: CategoryFilter) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  activeFilter: TreeFilter | null;
  filteredMemories: MemoryItem[];
  selectedIds: Set<string>;
  toggleSelect: (id: string) => void;
  toggleSelectAll: () => void;
  expandedId: string | null;
  toggleExpand: (id: string) => void;
  selectedMemoryId: string | null;
  projectName: (id: string) => string;
  roleName: (id: string) => string;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  loading: boolean;
  loadError: string | null;
  onRetry: () => void;
  onAdd: () => void;
  onAiRefine: () => void;
  showBatchDelete: () => void;
}

function MemoryWorkspace({
  data,
  category,
  setCategory,
  searchQuery,
  setSearchQuery,
  filteredMemories,
  selectedIds,
  toggleSelect,
  toggleSelectAll,
  expandedId,
  toggleExpand,
  selectedMemoryId,
  projectName,
  roleName,
  onEdit,
  onDelete,
  loading,
  loadError,
  onRetry,
  onAdd,
  onAiRefine,
  showBatchDelete,
}: MemoryWorkspaceProps) {
  // KPI calculations
  const kpiTotal = data.memories.length;
  const kpiRefined = data.memories.filter(
    (m) => m.scope === "global" || m.title.includes("知识")
  ).length;
  const kpiReusable = data.memories.filter(
    (m) => m.scope === "global"
  ).length;
  const kpiPending = data.memories.filter(
    (m) => m.scope === "task" && m.body.length < 40
  ).length;

  // Category tabs
  const categoryTabs: { key: CategoryFilter; label: string }[] = [
    { key: "all", label: "全部记忆" },
    { key: "project", label: "决策记录" },
    { key: "role", label: "角色经验" },
    { key: "task", label: "风险与坑" },
  ];

  function tabCount(key: CategoryFilter): number {
    if (key === "all") return data.memories.length;
    return data.memories.filter((m) => m.kind === key).length;
  }

  return (
    <div className="mm-center-workspace">
      {/* Top bar: search + batch + AI */}
      <div className="mm-center-top-bar">
        <div className="mm-search-input-wrap">
          <Search size={16} className="mm-search-icon" />
          <input
            placeholder="搜索记忆标题或内容..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="mm-batch-actions">
          <label className="mm-batch-checkbox" title="全选">
            <input
              type="checkbox"
              checked={filteredMemories.length > 0 && selectedIds.size === filteredMemories.length}
              onChange={toggleSelectAll}
            />
            <span>全选</span>
          </label>
          {selectedIds.size > 0 && (
            <button
              type="button"
              className="mm-batch-btn mm-batch-delete"
              onClick={showBatchDelete}
              title="批量删除"
            >
              <Trash2 size={15} />
              <span>批量删除 ({selectedIds.size})</span>
            </button>
          )}
          <button
            type="button"
            className="mm-ai-refine-btn"
            onClick={onAiRefine}
            title="AI 提炼"
          >
            <Brain size={15} />
            <Sparkles size={12} />
            <span>AI 提炼</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="mm-kpi-row">
        <div className="mm-kpi-card">
          <span className="mm-kpi-card-label">记忆总数</span>
          <span className="mm-kpi-card-value">{kpiTotal}</span>
        </div>
        <div className="mm-kpi-card">
          <span className="mm-kpi-card-label">已提炼</span>
          <span className="mm-kpi-card-value">{kpiRefined}</span>
        </div>
        <div className="mm-kpi-card">
          <span className="mm-kpi-card-label">可复用</span>
          <span className="mm-kpi-card-value">{kpiReusable}</span>
        </div>
        <div className="mm-kpi-card">
          <span className="mm-kpi-card-label">待确认</span>
          <span className="mm-kpi-card-value">{kpiPending}</span>
        </div>
      </div>

      {/* Category tabs */}
      <div className="mm-category-tabs">
        {categoryTabs.map((tab) => {
          const count = tabCount(tab.key);
          return (
            <button
              key={tab.key}
              type="button"
              className={`mm-filter-tab${category === tab.key ? " active" : ""}`}
              onClick={() => setCategory(tab.key)}
            >
              {tab.label}
              <span className="mm-tab-count">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Memory card list */}
      <div className="mm-memory-list">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={`skel-${i}`} className="memory-card skeleton">
              <div className="skeleton-line skeleton-title" />
              <div className="skeleton-line skeleton-body" />
              <div className="skeleton-line skeleton-meta" />
            </div>
          ))
        ) : loadError ? (
          <div className="empty-state error">
            <p>记忆加载失败</p>
            <button className="btn outline" onClick={onRetry}>
              重试
            </button>
          </div>
        ) : filteredMemories.length === 0 ? (
          <div className="empty-state">
            <p>暂无记忆</p>
            <button className="btn primary" onClick={onAdd}>
              新增记忆
            </button>
          </div>
        ) : (
          filteredMemories.map((mem) => (
            <div
              key={mem.id}
              className={`memory-card${selectedMemoryId === mem.id ? " selected" : ""}`}
            >
              <div className="memory-card-header">
                <div className="mm-card-check">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(mem.id)}
                    onChange={() => toggleSelect(mem.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <button
                  type="button"
                  className="mm-expand-toggle"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(mem.id);
                  }}
                  title={expandedId === mem.id ? "收起" : "展开"}
                >
                  {expandedId === mem.id ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                </button>
                <div className="mm-card-title-row" onClick={() => {/* Select */}}>
                  <strong>{mem.title}</strong>
                  <div className="mm-card-badges">
                    <span className={kindBadge(mem.kind)}>{kindLabel(mem.kind)}</span>
                    <span className={scopeBadge(mem.scope)}>{scopeLabel(mem.scope)}</span>
                  </div>
                </div>
              </div>
              <p
                className="memory-card-body"
                onClick={() => {/* handled by parent */}}
              >
                {expandedId === mem.id
                  ? mem.body
                  : mem.body.slice(0, 80) + (mem.body.length > 80 ? "..." : "")}
              </p>
              <div className="memory-card-meta">
                <span className="mm-citation-count">
                  {mem.citation.length > 0 ? `${mem.citation.length} 条引用` : "无引用"}
                </span>
                <span className="mm-meta-project">{projectName(mem.projectId)}</span>
                {mem.roleId && (
                  <span className="mm-meta-role">{roleName(mem.roleId)}</span>
                )}
              </div>
              <div className="mm-card-timestamps">
                <span>创建: {new Date(mem.createdAt).toLocaleDateString("zh-CN")}</span>
                <span>更新: {new Date(mem.updatedAt).toLocaleDateString("zh-CN")}</span>
              </div>

              {/* Inline expanded detail */}
              {expandedId === mem.id && (
                <div className="mm-card-expanded" onClick={(e) => e.stopPropagation()}>
                  <div className="mm-card-expanded-body">
                    <p>{mem.body}</p>
                  </div>
                  <div className="mm-card-expanded-actions">
                    <button
                      className="btn ghost small"
                      onClick={() => onEdit(mem.id)}
                    >
                      编辑
                    </button>
                    <button
                      className="btn danger small"
                      onClick={() => onDelete(mem.id)}
                    >
                      删除
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ==============================
   Right: MemoryIntelligencePanel
   ============================== */

interface MemoryIntelligencePanelProps {
  data: WorkbenchData;
}

function MemoryIntelligencePanel({ data: _data }: MemoryIntelligencePanelProps) {
  // Mock insights
  const insights = [
    { id: "i1", text: "3个项目都遇到了TypeScript strictNullChecks问题" },
    { id: "i2", text: "SSR预取策略在AgentDevelop和智能客服平台中采用相同模式" },
    { id: "i3", text: "所有项目均使用Vitest作为测试框架" },
  ];

  // Mock knowledge queue
  const queue = [
    { id: "kq1", title: "React useEffect清理函数最佳实践", source: "AgentDevelop / 前端工程师" },
    { id: "kq2", title: "Git worktree工作流隔离方案", source: "AgentDevelop / 架构师" },
    { id: "kq3", title: "Prisma迁移回滚策略", source: "智能客服平台 / 后端工程师" },
  ];

  // Mock reuse suggestions
  const reuseItems = [
    { id: "ru1", title: "暗色主题设计系统", source: "来自: AgentDevelop", reason: "可复用于所有新项目" },
    { id: "ru2", title: "Agent工作流模板引擎", source: "来自: AgentDevelop", reason: "通用任务调度框架" },
  ];

  // Mock audit trail
  const auditTrail = [
    { id: "a1", action: "提炼", detail: "TypeScript配置经验", time: "2小时前" },
    { id: "a2", action: "引用", detail: "工作流模板被引用3次", time: "5小时前" },
    { id: "a3", action: "确认", detail: "Prisma迁移回滚策略", time: "昨天" },
    { id: "a4", action: "归档", detail: "MCP Server超时处理", time: "2天前" },
  ];

  return (
    <div className="mm-right-intelligence">
      {/* Cross-project insights */}
      <div className="mm-intel-section">
        <h4 className="mm-intel-section-title">
          <Lightbulb size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />
          跨项目洞察
        </h4>
        {insights.map((insight) => (
          <div key={insight.id} className="mm-insight-card">
            {insight.text}
          </div>
        ))}
      </div>

      {/* Knowledge queue */}
      <div className="mm-intel-section">
        <h4 className="mm-intel-section-title">
          <ArrowUpRight size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />
          可沉淀为知识库
        </h4>
        {queue.map((item) => (
          <div key={item.id} className="mm-knowledge-queue-item">
            <span className="mm-kq-title">{item.title}</span>
            <span className="mm-kq-meta">{item.source}</span>
            <div className="mm-kq-actions">
              <button className="mm-kq-confirm-btn" title="确认沉淀">
                <CheckCircle2 size={12} /> 确认
              </button>
              <button className="mm-kq-reject-btn" title="暂不沉淀">
                <XCircle size={12} /> 忽略
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Reuse suggestions */}
      <div className="mm-intel-section">
        <h4 className="mm-intel-section-title">
          <Database size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />
          推荐给当前项目
        </h4>
        {reuseItems.map((item) => (
          <div key={item.id} className="mm-reuse-item">
            <span className="mm-reuse-title">{item.title}</span>
            <span className="mm-reuse-source">{item.source} - {item.reason}</span>
            <button className="mm-reuse-apply-btn">
              <ArrowUpRight size={11} /> 应用
            </button>
          </div>
        ))}
      </div>

      {/* Audit trail */}
      <div className="mm-intel-section">
        <h4 className="mm-intel-section-title">
          <Clock size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />
          记忆审计
        </h4>
        {auditTrail.map((entry) => (
          <div key={entry.id} className="mm-audit-item">
            <span className="mm-audit-action">{entry.action}</span>
            <span className="mm-audit-detail">{entry.detail}</span>
            <span className="mm-audit-time">{entry.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ==============================
   Main MemoryManager
   ============================== */

export function MemoryManager({ data }: MemoryManagerProps) {
  const { addMemory, updateMemory, deleteMemory } = useWorkbenchState();
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMemoryId, setSelectedMemoryId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");

  // Batch state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);

  // AI state
  const [showAiSummary, setShowAiSummary] = useState(false);
  const [aiSummaryText, setAiSummaryText] = useState("");

  // Tree state
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    () => new Set(data.projects.map((p) => p.id))
  );
  const [activeTreeFilter, setActiveTreeFilter] = useState<TreeFilter | null>(null);
  const [activeNode, setActiveNode] = useState<string | null>(null);

  // Expanded card state (inline detail)
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Loading / error state (reserved for future async data loading)
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Derive filtered memories
  const filteredMemories = useMemo(() => {
    let result = data.memories;

    // Tree filter takes priority over category
    if (activeTreeFilter) {
      if (activeTreeFilter.kind === "knowledge") {
        result = result.filter(
          (m) => m.scope === "global" || m.title.includes("知识") || m.body.includes("知识")
        );
      } else if (activeTreeFilter.kind === "project") {
        result = result.filter((m) => m.projectId === activeTreeFilter.id);
      } else if (activeTreeFilter.kind === "role") {
        result = result.filter((m) => m.roleId === activeTreeFilter.id);
      }
    } else if (category !== "all") {
      if (category === "knowledge") {
        result = result.filter(
          (m) => m.scope === "global" || m.title.includes("知识") || m.body.includes("知识")
        );
      } else {
        result = result.filter((m) => m.kind === category);
      }
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (m) => m.title.toLowerCase().includes(q) || m.body.toLowerCase().includes(q)
      );
    }
    return result;
  }, [data.memories, category, searchQuery, activeTreeFilter]);

  const selectedMemory = useMemo(
    () => data.memories.find((m) => m.id === selectedMemoryId) ?? null,
    [data, selectedMemoryId]
  );

  // Batch operations
  const toggleSelect = useCallback(
    (id: string) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    []
  );

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === filteredMemories.length && filteredMemories.length > 0) {
        return new Set();
      }
      return new Set(filteredMemories.map((m) => m.id));
    });
  }, [filteredMemories]);

  const handleBatchDelete = useCallback(() => {
    selectedIds.forEach((id) => deleteMemory(id));
    setSelectedIds(new Set());
    setShowBatchDeleteConfirm(false);
    if (selectedMemoryId && selectedIds.has(selectedMemoryId)) {
      setSelectedMemoryId(null);
    }
  }, [selectedIds, deleteMemory, selectedMemoryId]);

  // AI mock summary generation
  const generateAiSummary = useCallback(() => {
    const selected =
      selectedIds.size > 0
        ? data.memories.filter((m) => selectedIds.has(m.id))
        : filteredMemories;
    if (selected.length === 0) return;
    const titles = selected.map((m) => m.title).join("、");
    const sampleBody = selected
      .slice(0, 2)
      .map((m) => m.body.slice(0, 60))
      .join(" ");
    setAiSummaryText(
      `基于 ${selected.length} 条记忆的提炼：${titles}。这些记忆覆盖了项目上下文、角色约束和任务执行记录，建议将关键信息整合为一条全局知识条目，供后续 Agent 自动加载。核心要点：${sampleBody}...`
    );
    setShowAiSummary(true);
  }, [data.memories, filteredMemories, selectedIds]);

  // Toggle inline card expansion
  const toggleExpand = useCallback(
    (id: string) => {
      setExpandedId((prev) => (prev === id ? null : id));
    },
    []
  );

  // Toggle project tree node
  const toggleProject = useCallback((projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  }, []);

  // Helper: get project name by id
  const projectName = useCallback(
    (projId: string) => {
      const p = data.projects.find((pr) => pr.id === projId);
      return p?.name ?? projId;
    },
    [data.projects]
  );

  // Helper: get role name by id
  const roleName = useCallback(
    (roleId: string) => {
      const r = data.roles.find((rl) => rl.id === roleId);
      return r?.name ?? roleId;
    },
    [data.roles]
  );

  return (
    <div className="memory-manager">
      {/* Header */}
      <header className="memory-header">
        <div className="memory-title">
          <IconBadge icon={MemoryStick} label="知识资产中心" />
          <div>
            <h1>知识资产中心</h1>
            <span>管理项目、角色、任务三层记忆与知识资产，控制后续 Agent context。</span>
          </div>
        </div>
        <button
          className="btn primary"
          onClick={() => {
            setIsAdding(true);
            setNewTitle("");
            setNewBody("");
            setSelectedMemoryId(null);
          }}
        >
          新增记忆
        </button>
      </header>

      {/* Batch delete confirmation */}
      {showBatchDeleteConfirm && (
        <div className="mm-confirm-overlay" onClick={() => setShowBatchDeleteConfirm(false)}>
          <div className="mm-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>确认批量删除</h3>
            <p>即将删除 {selectedIds.size} 条记忆，此操作不可撤销。确定继续？</p>
            <div className="mm-confirm-actions">
              <button className="btn danger" onClick={handleBatchDelete}>
                确认删除
              </button>
              <button className="btn ghost" onClick={() => setShowBatchDeleteConfirm(false)}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI summary modal */}
      {showAiSummary && (
        <div className="mm-confirm-overlay" onClick={() => setShowAiSummary(false)}>
          <div className="mm-ai-summary" onClick={(e) => e.stopPropagation()}>
            <div className="mm-ai-summary-header">
              <div className="mm-ai-summary-title">
                <Brain size={18} />
                <Sparkles size={14} />
                <h3>AI 记忆提炼</h3>
              </div>
              <button
                className="mm-close-btn"
                onClick={() => setShowAiSummary(false)}
                title="关闭"
              >
                <X size={16} />
              </button>
            </div>
            <div className="mm-ai-summary-body">
              <p>{aiSummaryText}</p>
            </div>
            <div className="mm-ai-summary-footer">
              <span className="badge">AI 生成 · 仅供参考</span>
            </div>
          </div>
        </div>
      )}

      {/* Add Memory form (modal-style) */}
      {isAdding && (
        <div className="mm-confirm-overlay" onClick={() => setIsAdding(false)}>
          <div
            className="mm-confirm-dialog"
            style={{ minWidth: 460 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="memory-edit-form">
              <div className="edit-header">
                <h2>新增记忆</h2>
              </div>
              <div className="form-field">
                <label>标题</label>
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="输入记忆标题..."
                />
              </div>
              <div className="form-field">
                <label>内容</label>
                <textarea
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  rows={6}
                  placeholder="输入记忆内容..."
                />
              </div>
              <div className="detail-actions">
                <button
                  className="btn primary"
                  onClick={() => {
                    if (newTitle && newBody) {
                      addMemory({
                        kind: "project",
                        scope: "project",
                        projectId: data.projects[0]?.id ?? "",
                        roleId: null,
                        taskId: null,
                        title: newTitle,
                        body: newBody,
                        citation: [],
                      });
                      setIsAdding(false);
                    }
                  }}
                >
                  保存
                </button>
                <button className="btn ghost" onClick={() => setIsAdding(false)}>
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Memory form (modal-style) */}
      {isEditing && selectedMemory && (
        <div className="mm-confirm-overlay" onClick={() => setIsEditing(false)}>
          <div
            className="mm-confirm-dialog"
            style={{ minWidth: 460 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="memory-edit-form">
              <div className="edit-header">
                <h2>编辑记忆</h2>
              </div>
              <div className="form-field">
                <label>标题</label>
                <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
              </div>
              <div className="form-field">
                <label>内容</label>
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={6}
                />
              </div>
              <div className="detail-actions">
                <button
                  className="btn primary"
                  onClick={() => {
                    updateMemory(selectedMemory.id, { title: editTitle, body: editBody });
                    setIsEditing(false);
                  }}
                >
                  保存
                </button>
                <button className="btn ghost" onClick={() => setIsEditing(false)}>
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Three-column body */}
      <div className="mm-three-col">
        {/* Left: MemorySpaceTree */}
        <MemorySpaceTree
          data={data}
          activeFilter={activeTreeFilter}
          onFilterChange={(filter) => {
            setActiveTreeFilter(filter);
            // Reset category when tree filter is applied
            if (filter) {
              setCategory("all");
            }
          }}
          activeNode={activeNode}
          onActiveNodeChange={setActiveNode}
          expandedProjects={expandedProjects}
          onToggleProject={toggleProject}
        />

        {/* Center: MemoryWorkspace */}
        <MemoryWorkspace
          data={data}
          category={category}
          setCategory={(c) => {
            setCategory(c);
            setActiveTreeFilter(null);
            setActiveNode(null);
          }}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activeFilter={activeTreeFilter}
          filteredMemories={filteredMemories}
          selectedIds={selectedIds}
          toggleSelect={toggleSelect}
          toggleSelectAll={toggleSelectAll}
          expandedId={expandedId}
          toggleExpand={toggleExpand}
          selectedMemoryId={selectedMemoryId}
          projectName={projectName}
          roleName={roleName}
          onEdit={(id) => {
            const mem = data.memories.find((m) => m.id === id);
            if (mem) {
              setSelectedMemoryId(id);
              setIsEditing(true);
              setEditTitle(mem.title);
              setEditBody(mem.body);
            }
          }}
          onDelete={(id) => {
            deleteMemory(id);
            selectedIds.delete(id);
            setSelectedIds(new Set(selectedIds));
            if (selectedMemoryId === id) setSelectedMemoryId(null);
            setExpandedId(null);
          }}
          loading={loading}
          loadError={loadError}
          onRetry={() => {
            setLoadError(null);
            setLoading(true);
            setTimeout(() => setLoading(false), 400);
          }}
          onAdd={() => {
            setIsAdding(true);
            setNewTitle("");
            setNewBody("");
            setSelectedMemoryId(null);
          }}
          onAiRefine={generateAiSummary}
          showBatchDelete={() => setShowBatchDeleteConfirm(true)}
        />

        {/* Right: MemoryIntelligencePanel */}
        <MemoryIntelligencePanel data={data} />
      </div>
    </div>
  );
}
