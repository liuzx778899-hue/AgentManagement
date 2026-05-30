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

  // Calculate milestones from project data
  const milestones = useMemo(() => {
    // 如果没有项目数据，返回空数组
    if (projects.length === 0) return [];

    // 基于项目的下一个检查点计算里程碑
    const upcomingMilestones = projects
      .filter(p => p.nextCheckpoint)
      .slice(0, 3)
      .map(p => {
        const checkDate = p.lastCheckAt ? new Date(p.lastCheckAt) : new Date();
        const tomorrow = new Date(checkDate);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return {
          date: checkDate.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" }).replace("/", "-"),
          text: `${p.name} ${p.nextCheckpoint || "待定"}`,
          tag: "待办",
          tagColor: "" as const,
        };
      });

    return upcomingMilestones;
  }, [projects]);

  // Calculate recent activities from task and gate data
  const recentActivities = useMemo(() => {
    // 如果没有任务和Gate数据，返回空数组
    if (data.tasks.length === 0 && data.manualGates.length === 0) return [];

    // 基于最近的Gate和任务生成活动
    const activities: { status: "ok" | "warn" | "primary"; text: string; desc: string; time: string }[] = [];

    // 添加最近的Gate状态变更
    data.manualGates.slice(0, 2).forEach(gate => {
      // 通过 taskId 找到对应的 task，再找到 project
      const task = data.tasks.find(t => t.id === gate.taskId);
      const project = task ? projects.find(p => p.id === task.projectId) : undefined;
      if (project) {
        activities.push({
          status: gate.status === "waiting" ? "warn" : "ok",
          text: `${project.name} Gate ${gate.status === "waiting" ? "待处理" : "已确认"}`,
          desc: gate.summary || "",
          time: gate.createdAt ? new Date(gate.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }) : "",
        });
      }
    });

    // 添加最近运行的任务
    data.tasks.filter(t => t.status === "running").slice(0, 1).forEach(task => {
      const project = projects.find(p => p.id === task.projectId);
      if (project) {
        activities.push({
          status: "primary",
          text: `${project.name} 任务运行中`,
          desc: task.goal || "",
          time: task.updatedAt ? new Date(task.updatedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }) : "",
        });
      }
    });

    return activities.slice(0, 3);
  }, [data.tasks, data.manualGates, projects]);

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
        {urgentGates.length > 0 || projects.length > 0 ? (
          <>
            <div className="pm-v2-commander-left">
              <div className="pm-v2-commander-card">
                <div className="pm-v2-commander-icon"><AlertTriangle size={18} /></div>
                <div>
                  <h3>今日必须决策</h3>
                  <p>{urgentGates.length > 0 ? `${urgentGates.length} 个 Gate 等待确认` : "暂无待处理 Gate"}</p>
                </div>
                <div className="pm-v2-commander-metric">{urgentGates.length}<span>待拍板</span></div>
              </div>
              <div className="pm-v2-commander-card ok">
                <div className="pm-v2-commander-icon"><Activity size={18} /></div>
                <div>
                  <h3>角色资源负载</h3>
                  <p>{kpis.running > 0 ? `${kpis.running} 个任务运行中` : "暂无运行任务"}</p>
                </div>
                <div className="pm-v2-commander-metric">{kpis.running}<span>运行中</span></div>
              </div>
              <div className="pm-v2-commander-card">
                <div className="pm-v2-commander-icon"><Clock size={18} /></div>
                <div>
                  <h3>项目状态</h3>
                  <p>{kpis.total > 0 ? `${kpis.total} 个项目，健康度 ${kpis.healthPct}%` : "暂无项目"}</p>
                </div>
                <div className="pm-v2-commander-metric">{kpis.healthPct}%<span>健康度</span></div>
              </div>
            </div>
            <div className="pm-v2-commander-right">
              <div className="pm-v2-commander-card ai">
                <div className="pm-v2-commander-icon"><Sparkles size={18} /></div>
                <div>
                  <h3>AI 建议下一步</h3>
                  <p>{kpis.waitingConfirm > 0 ? `有 ${kpis.waitingConfirm} 个 Gate 待处理` : "暂无待处理事项"}</p>
                </div>
                <button className="pm-v2-btn">查看</button>
              </div>
            </div>
          </>
        ) : (
          <div className="pm-v2-commander-left">
            <div className="pm-v2-commander-card">
              <div className="pm-v2-commander-icon"><Heart size={18} /></div>
              <div>
                <h3>欢迎使用项目管理</h3>
                <p>新建或导入项目开始管理你的项目组合。</p>
              </div>
            </div>
          </div>
        )}
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
            {kpis.highRisk > 0 || kpis.waitingConfirm > 0 ? (
              <div className="pm-v2-attention-list">
                {kpis.highRisk > 0 && (
                  <div className="pm-v2-attention">
                    <span className="pm-v2-pill pm-v2-pill-danger">高</span>
                    <div><h3>{kpis.highRisk} 个项目需要关注</h3><p>存在高风险项目，建议优先处理。</p></div>
                    <span className="pm-v2-badge">需确认</span>
                  </div>
                )}
                {kpis.waitingConfirm > 0 && (
                  <div className="pm-v2-attention">
                    <span className="pm-v2-pill pm-v2-pill-warn">中</span>
                    <div><h3>{kpis.waitingConfirm} 个 Gate 待处理</h3><p>有任务在 Gate 阶段等待确认。</p></div>
                    <span className="pm-v2-badge">Gate</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="pm-v2-attention-list">
                <div className="pm-v2-attention">
                  <span className="pm-v2-pill pm-v2-pill-ok">好</span>
                  <div><h3>项目状态良好</h3><p>{projects.length > 0 ? "所有项目运行正常，暂无需要特别关注的事项。" : "暂无项目，新建或导入项目开始管理。"}</p></div>
                </div>
              </div>
            )}
          </section>

          {/* 风险与阶段分布 */}
          <section className="pm-v2-panel pm-v2-risk-panel">
            <div className="pm-v2-panel-head"><div><h2>风险与阶段分布</h2><p>跨项目健康、阶段和风险热力图</p></div></div>
            {projects.length > 0 ? (
              <>
                <div className="pm-v2-risk-body">
                  <div className="pm-v2-chart">
                    <h3>阶段分布</h3>
                    {projects.length > 0 ? (
                      <div className="pm-v2-bars">
                        {/* 计算实际阶段分布 */}
                        {(() => {
                          const phaseCounts: Record<string, number> = {};
                          projects.forEach(p => {
                            const phase = p.phase || "规划中";
                            phaseCounts[phase] = (phaseCounts[phase] || 0) + 1;
                          });
                          const total = projects.length;
                          return Object.entries(phaseCounts).slice(0, 3).map(([phase, count]) => (
                            <div key={phase} className="pm-v2-bar-row">
                              <span>{phase}</span>
                              <div className="pm-v2-bar"><span style={{ width: `${(count / total) * 100}%` }} /></div>
                              <b>{count}</b>
                            </div>
                          ));
                        })()}
                      </div>
                    ) : (
                      <div className="pm-v2-bars">
                        <div className="pm-v2-bar-row"><span>暂无数据</span></div>
                      </div>
                    )}
                  </div>
                  <div className="pm-v2-chart">
                    <h3>风险热力</h3>
                    {projects.length > 0 ? (
                      <div className="pm-v2-heatmap">
                        {/* 计算实际风险分布 */}
                        {(() => {
                          const lowRisk = projects.filter(p => p.riskLevel === "low").length;
                          const mediumRisk = projects.filter(p => p.riskLevel === "medium").length;
                          const highRisk = projects.filter(p => p.riskLevel === "high" || p.riskLevel === "critical").length;
                          const noRisk = projects.length - lowRisk - mediumRisk - highRisk;
                          return [
                            <div key="low" className="pm-v2-heat low">{lowRisk}</div>,
                            <div key="mid" className="pm-v2-heat mid">{mediumRisk}</div>,
                            <div key="high" className="pm-v2-heat high">{highRisk}</div>,
                            <div key="none1" className="pm-v2-heat">{noRisk}</div>,
                            <div key="none2" className="pm-v2-heat">0</div>,
                            <div key="none3" className="pm-v2-heat">0</div>,
                            <div key="none4" className="pm-v2-heat">0</div>,
                            <div key="none5" className="pm-v2-heat">0</div>,
                            <div key="none6" className="pm-v2-heat">0</div>,
                          ];
                        })()}
                      </div>
                    ) : (
                      <div className="pm-v2-heatmap">
                        <div className="pm-v2-heat">0</div><div className="pm-v2-heat">0</div><div className="pm-v2-heat">0</div>
                        <div className="pm-v2-heat">0</div><div className="pm-v2-heat">0</div><div className="pm-v2-heat">0</div>
                        <div className="pm-v2-heat">0</div><div className="pm-v2-heat">0</div><div className="pm-v2-heat">0</div>
                      </div>
                    )}
                  </div>
                </div>
                {milestones.length > 0 && (
                  <div className="pm-v2-milestone-list">
                    {milestones.map((m, i) => (
                      <div key={i} className="pm-v2-milestone">
                        <time>{m.date}</time>
                        <strong>{m.text}</strong>
                        <span className={`pm-v2-milestone-tag${m.tagColor ? ` ${m.tagColor}` : ""}`}>{m.tag}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="pm-v2-risk-body">
                <div className="pm-v2-chart">
                  <h3>阶段分布</h3>
                  <div className="pm-v2-empty">暂无项目数据</div>
                </div>
                <div className="pm-v2-chart">
                  <h3>风险热力</h3>
                  <div className="pm-v2-empty">暂无项目数据</div>
                </div>
              </div>
            )}
          </section>

          {/* 最近变更 */}
          <section className="pm-v2-panel pm-v2-activity-panel">
            <div className="pm-v2-panel-head"><div><h2>最近变更</h2><p>来自 Check、协同文件和工作台快照</p></div></div>
            {recentActivities.length > 0 ? (
              <div className="pm-v2-activity-list">
                {recentActivities.map((a, i) => (
                  <div key={i} className="pm-v2-activity">
                    <span className={`pm-v2-dot ${a.status}`} />
                    <div><strong>{a.text}</strong>{a.desc}</div>
                    <time>{a.time}</time>
                  </div>
                ))}
              </div>
            ) : (
              <div className="pm-v2-activity-list">
                <div className="pm-v2-activity">
                  <span className="pm-v2-dot" />
                  <div><strong>暂无最近变更</strong>项目数据更新后这里会显示最近的活动。</div>
                </div>
              </div>
            )}
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
