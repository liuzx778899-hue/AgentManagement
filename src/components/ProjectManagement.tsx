import { useMemo, useState, useEffect, useRef } from "react";
import { useWorkbenchState } from "../state/WorkbenchProvider";
import {
  AlertTriangle, Building2, Clock, Heart, Plus, Activity,
  RefreshCw, Sparkles, Upload, ChevronDown, Check,
} from "lucide-react";
import type { WorkbenchData } from "../domain/workbench";
import { ProjectCard } from "./ProjectCard";
import { GateDecisionPanel } from "./GateDecisionPanel";
import { ExistingProjectImport } from "./ExistingProjectImport";
import { NewProjectWizard } from "./NewProjectWizard";

interface ProjectManagementProps {
  data: WorkbenchData;
  onEnterProject: (projectId: string) => void;
  onEnterDetail?: (projectId: string) => void;
  onEnterWorkbench?: (projectId: string) => void;
  onAiBriefing?: () => void;
}

type OverlayPanel = "none" | "import" | "new" | "decision";
type FilterDropdown = "none" | "portfolio" | "view" | "sort";

export function ProjectManagement({ data, onEnterProject, onEnterDetail, onEnterWorkbench, onAiBriefing }: ProjectManagementProps) {
  const { deleteProject } = useWorkbenchState();
  const [overlay, setOverlay] = useState<OverlayPanel>("none");
  const [activeDropdown, setActiveDropdown] = useState<FilterDropdown>("none");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter states
  const [portfolio, setPortfolio] = useState("全部项目组合");
  const [viewMode, setViewMode] = useState("本周视图");
  const [sortBy, setSortBy] = useState("按风险优先");
  // Esc key to close overlays
  useEffect(() => {
    if (overlay === "none") return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOverlay("none"); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [overlay]);

  // Click outside to close dropdown
  useEffect(() => {
    if (activeDropdown === "none") return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveDropdown("none");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [activeDropdown]);

  const portfolioOptions = ["全部项目组合", "重点项目", "AgentManagement 相关", "测试项目"];
  const viewOptions = ["本周视图", "本月视图", "全部视图", "自定义范围"];
  const sortOptions = ["按风险优先", "按进度排序", "按健康分排序", "按更新时间"];

  const handleDropdownSelect = (setter: (v: string) => void, value: string, dropdown: FilterDropdown) => {
    setter(value);
    setActiveDropdown("none");
  };

  const projects = data.projects;

  // KPI calculations
  const kpis = useMemo(() => {
    const total = projects.length;
    const running = projects.filter(p =>
      data.tasks.some(t => t.projectId === p.id && t.status === "running")
    ).length;
    const waitingConfirm = data.manualGates.filter(g => g.status === "waiting").length;
    const highRisk = projects.filter(p => p.riskLevel === "high" || p.riskLevel === "critical").length;
    const gateBlocked = data.tasks.filter(t => t.status === "gate").length;
    const todaySync = projects.filter(p => {
      if (!p.lastCheckAt) return false;
      return new Date(p.lastCheckAt).toDateString() === new Date().toDateString();
    }).length;
    const healthPct = projects.length > 0
      ? Math.round(projects.reduce((s, p) => s + (p.healthScore ?? 70), 0) / projects.length)
      : 0;
    return { total, running, waitingConfirm, highRisk, gateBlocked, todaySync, healthPct };
  }, [data, projects]);

  // Commander strip data
  const urgentGates = useMemo(() =>
    data.manualGates.filter(g => g.status === "waiting").slice(0, 1),
  [data.manualGates]);

  const milestones = useMemo(() => [
    { date: "05-20", text: "AgentManagement 完成 AI 流程设计对齐", tag: "今天", tagColor: "ok" as const },
    { date: "05-21", text: "Stock Agent 工程层风险复核", tag: "明天", tagColor: "warn" as const },
    { date: "05-23", text: "Docs Automation 计划确认", tag: "本周", tagColor: "" as const },
  ], []);

  const recentActivities = useMemo(() => [
    { status: "ok", text: "AI 流程设计 HTML 已更新", desc: "节点比例、右侧差异面板密度已同步", time: "15:02" },
    { status: "warn", text: "项目管理概览需重设计", desc: "旧版只覆盖入口和卡片，缺少组合治理", time: "14:58" },
    { status: "primary", text: "新增两个项目管理资产", desc: "概览图与 AI 建项图已拆分", time: "14:50" },
  ], []);

  // Check all projects progress
  const handleCheckAllProgress = () => {
    alert("进度检查完成");
  };

  return (
    <div className="pm-v2-page">
      {/* ===== TOOLBAR ===== */}
      <div className="pm-v2-toolbar">
        <div className="pm-v2-toolbar-left" ref={dropdownRef}>
          <div
            className={`pm-v2-select active ${activeDropdown === "portfolio" ? "open" : ""}`}
            onClick={() => setActiveDropdown(activeDropdown === "portfolio" ? "none" : "portfolio")}
          >
            <Building2 size={14} />{portfolio}<ChevronDown size={12} />
            {activeDropdown === "portfolio" && (
              <div className="pm-v2-dropdown">
                {portfolioOptions.map(opt => (
                  <div
                    key={opt}
                    className={`pm-v2-dropdown-item ${portfolio === opt ? "selected" : ""}`}
                    onClick={(e) => { e.stopPropagation(); handleDropdownSelect(setPortfolio, opt, "portfolio"); }}
                  >
                    {portfolio === opt && <Check size={12} />}{opt}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div
            className={`pm-v2-select active ${activeDropdown === "view" ? "open" : ""}`}
            onClick={() => setActiveDropdown(activeDropdown === "view" ? "none" : "view")}
          >
            {viewMode}<ChevronDown size={12} />
            {activeDropdown === "view" && (
              <div className="pm-v2-dropdown">
                {viewOptions.map(opt => (
                  <div
                    key={opt}
                    className={`pm-v2-dropdown-item ${viewMode === opt ? "selected" : ""}`}
                    onClick={(e) => { e.stopPropagation(); handleDropdownSelect(setViewMode, opt, "view"); }}
                  >
                    {viewMode === opt && <Check size={12} />}{opt}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div
            className={`pm-v2-select active ${activeDropdown === "sort" ? "open" : ""}`}
            onClick={() => setActiveDropdown(activeDropdown === "sort" ? "none" : "sort")}
          >
            {sortBy}<ChevronDown size={12} />
            {activeDropdown === "sort" && (
              <div className="pm-v2-dropdown">
                {sortOptions.map(opt => (
                  <div
                    key={opt}
                    className={`pm-v2-dropdown-item ${sortBy === opt ? "selected" : ""}`}
                    onClick={(e) => { e.stopPropagation(); handleDropdownSelect(setSortBy, opt, "sort"); }}
                  >
                    {sortBy === opt && <Check size={12} />}{opt}
                  </div>
                ))}
              </div>
            )}
          </div>
          <input className="pm-v2-search" placeholder="搜索项目、Owner、阶段..." />
        </div>
        <div className="pm-v2-toolbar-right">
          <button className="pm-v2-btn pm-v2-btn-ok" onClick={handleCheckAllProgress}><RefreshCw size={14} />检查全部进度</button>
          <button className="pm-v2-btn" onClick={() => setOverlay("new")}><Plus size={14} />新建项目</button>
          <button className="pm-v2-btn" onClick={() => setOverlay("import")}><Upload size={14} />导入已有项目</button>
          <button className="pm-v2-btn pm-v2-btn-primary" onClick={() => onAiBriefing?.()}><Sparkles size={14} />AI 建项</button>
        </div>
      </div>

      {/* ===== KPIs ===== */}
      <div className="pm-v2-kpis">
        <div className="pm-v2-kpi pm-v2-kpi-health">
          <div className="pm-v2-ring" style={{ background: `conic-gradient(var(--ok) 0 ${kpis.healthPct}%, #263244 ${kpis.healthPct}% 100%)` }}>
            <span>{kpis.healthPct}</span>
          </div>
          <div>
            <label>项目组合健康度</label>
            <small>{kpis.highRisk > 0 ? `${kpis.highRisk} 个项目需关注` : "所有项目健康"}</small>
          </div>
        </div>
        <div className="pm-v2-kpi"><label>项目总数</label><strong>{kpis.total}</strong><small>{projects.filter(p => p.sourceType === "claude-code").length} 个重点项目</small></div>
        <div className="pm-v2-kpi"><label>运行中</label><strong>{kpis.running}</strong><small>平均进度 —</small></div>
        <div className="pm-v2-kpi"><label>等待确认</label><strong>{kpis.waitingConfirm}</strong><small>Gate / 计划变更</small></div>
        <div className="pm-v2-kpi"><label>高风险</label><strong style={{ color: "var(--danger)" }}>{kpis.highRisk}</strong><small>权限与测试覆盖</small></div>
        <div className="pm-v2-kpi"><label>Gate 阻塞</label><strong style={{ color: "var(--warn)" }}>{kpis.gateBlocked}</strong><small>需人工确认</small></div>
        <div className="pm-v2-kpi"><label>今日同步</label><strong>{kpis.todaySync}</strong><small>发现变更 +2</small></div>
      </div>

      {/* ===== COMMANDER STRIP ===== */}
      <div className="pm-v2-commander">
        <div className="pm-v2-commander-left">
          <div className="pm-v2-commander-card">
            <div className="pm-v2-commander-icon"><AlertTriangle size={18} /></div>
            <div>
              <h3>今日必须决策</h3>
              <p>AgentManagement 流程草案是否应用，Stock Agent 是否先暂停工程层。</p>
            </div>
            <div className="pm-v2-commander-metric">{urgentGates.length}<span>待拍板</span></div>
          </div>
          <div className="pm-v2-commander-card ok">
            <div className="pm-v2-commander-icon"><Activity size={18} /></div>
            <div>
              <h3>角色资源负载</h3>
              <p>前端工程师 82%，测试工程师 46%，暂无单角色严重过载。</p>
            </div>
            <div className="pm-v2-commander-metric">82%<span>最高负载</span></div>
          </div>
          <div className="pm-v2-commander-card">
            <div className="pm-v2-commander-icon"><Clock size={18} /></div>
            <div>
              <h3>计划偏差</h3>
              <p>Stock Agent 落后 2 天；Docs Automation 需求确认不足。</p>
            </div>
            <div className="pm-v2-commander-metric">-2d<span>最大偏差</span></div>
          </div>
        </div>
        <div className="pm-v2-commander-right">
          <div className="pm-v2-commander-card ai">
            <div className="pm-v2-commander-icon"><Sparkles size={18} /></div>
            <div>
              <h3>AI 建议下一步</h3>
              <p>先处理 2 个 Gate，再启动全量进度 Check，避免计划状态误判。</p>
            </div>
            <button className="pm-v2-btn">查看</button>
          </div>
        </div>
      </div>

      {/* ===== WORKSPACE ===== */}
      <div className="pm-v2-workspace">
        <div className="pm-v2-left-stack">
          {/* Project Portfolio */}
          <section className="pm-v2-panel pm-v2-portfolio">
            <div className="pm-v2-panel-head">
              <div><h2>项目组合看板</h2><p>以风险、阶段、Gate 和同步状态管理多个项目</p></div>
              <div className="pm-v2-portfolio-tools"><button className="pm-v2-btn">全部状态</button><button className="pm-v2-btn">卡片视图</button></div>
            </div>
            <div className="pm-v2-project-grid">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  data={data}
                  onClick={() => onEnterDetail ? onEnterDetail(project.id) : onEnterProject(project.id)}
                  onEnterWorkbench={(pid) => onEnterWorkbench?.(pid)}
                  onDelete={(pid) => deleteProject(pid)}
                />
              ))}
              {projects.length === 0 && (
                <div className="pm-v2-empty">暂无项目，新建或导入一个</div>
              )}
            </div>
            <div className="pm-v2-portfolio-foot">
              <span>共 {projects.length} 个项目</span>
              <span>10 条/页</span>
            </div>
          </section>
        </div>

        {/* Right Stack */}
        <aside className="pm-v2-right-stack">
          {/* AI 项目管家 */}
          <section className="pm-v2-panel pm-v2-ai-steward">
            <div className="pm-v2-panel-head"><div><h2>AI 项目管家</h2><p>根据协同文件和工作台状态生成管理建议</p></div><button className="pm-v2-btn pm-v2-btn-ok">同步</button></div>
            <div className="pm-v2-attention-list">
              <div className="pm-v2-attention">
                <span className="pm-v2-pill pm-v2-pill-danger">高</span>
                <div><h3>Stock Agent 测试覆盖不足</h3><p>最近同步发现高风险，建议先补测试再进入工程层。</p></div>
                <span className="pm-v2-badge">需确认</span>
              </div>
              <div className="pm-v2-attention">
                <span className="pm-v2-pill pm-v2-pill-warn">中</span>
                <div><h3>AgentManagement Gate 待处理</h3><p>前端页面已成型，需确认流程草案是否应用。</p></div>
                <span className="pm-v2-badge">Gate</span>
              </div>
            </div>
          </section>

          {/* 风险与阶段分布 */}
          <section className="pm-v2-panel pm-v2-risk-panel">
            <div className="pm-v2-panel-head"><div><h2>风险与阶段分布</h2><p>跨项目健康、阶段和风险热力图</p></div></div>
            <div className="pm-v2-risk-body">
              <div className="pm-v2-chart">
                <h3>阶段分布</h3>
                <div className="pm-v2-bars">
                  <div className="pm-v2-bar-row"><span>Phase 1</span><div className="pm-v2-bar"><span style={{ width: "50%" }} /></div><b>4</b></div>
                  <div className="pm-v2-bar-row"><span>Phase 2</span><div className="pm-v2-bar"><span style={{ width: "25%", background: "var(--cyan)" }} /></div><b>2</b></div>
                  <div className="pm-v2-bar-row"><span>规划中</span><div className="pm-v2-bar"><span style={{ width: "25%", background: "var(--warn)" }} /></div><b>2</b></div>
                </div>
              </div>
              <div className="pm-v2-chart">
                <h3>风险热力</h3>
                <div className="pm-v2-heatmap">
                  <div className="pm-v2-heat low">3</div><div className="pm-v2-heat mid">2</div><div className="pm-v2-heat high">1</div>
                  <div className="pm-v2-heat low">1</div><div className="pm-v2-heat mid">1</div><div className="pm-v2-heat">0</div>
                  <div className="pm-v2-heat">0</div><div className="pm-v2-heat">0</div><div className="pm-v2-heat">0</div>
                </div>
              </div>
            </div>
            <div className="pm-v2-milestone-list">
              {milestones.map((m, i) => (
                <div key={i} className="pm-v2-milestone">
                  <time>{m.date}</time>
                  <strong>{m.text}</strong>
                  <span className={`pm-v2-milestone-tag${m.tagColor ? ` ${m.tagColor}` : ""}`}>{m.tag}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 最近变更 */}
          <section className="pm-v2-panel pm-v2-activity-panel">
            <div className="pm-v2-panel-head"><div><h2>最近变更</h2><p>来自 Check、协同文件和工作台快照</p></div></div>
            <div className="pm-v2-activity-list">
              {recentActivities.map((a, i) => (
                <div key={i} className="pm-v2-activity">
                  <span className={`pm-v2-dot ${a.status}`} />
                  <div><strong>{a.text}</strong>{a.desc}</div>
                  <time>{a.time}</time>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {/* Overlay Panels */}
      {overlay === "import" && (
        <div className="pm-overlay" onClick={() => setOverlay("none")}>
          <div className="pm-overlay-panel" onClick={e => e.stopPropagation()}>
            <div className="pm-overlay-header"><h2>导入已有项目</h2><button className="pm-overlay-close" onClick={() => setOverlay("none")}>×</button></div>
            <div className="pm-overlay-content"><ExistingProjectImport data={data} /></div>
          </div>
        </div>
      )}
      {overlay === "new" && (
        <div className="pm-overlay" onClick={() => setOverlay("none")}>
          <div className="pm-overlay-panel" onClick={e => e.stopPropagation()}>
            <div className="pm-overlay-header"><h2>新建项目</h2><button className="pm-overlay-close" onClick={() => setOverlay("none")}>×</button></div>
            <div className="pm-overlay-content"><NewProjectWizard data={data} /></div>
          </div>
        </div>
      )}
      {overlay === "decision" && (
        <GateDecisionPanel data={data} onClose={() => setOverlay("none")} />
      )}
    </div>
  );
}
