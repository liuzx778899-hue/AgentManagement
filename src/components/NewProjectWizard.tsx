import { useState, useMemo } from "react";
import { Check, Loader2, ArrowRight, Search, Code2, FileCheck, Bug, Wrench, Layers, CheckCircle2, User, AlertCircle, FileText } from "lucide-react";
import type { WorkbenchData } from "../domain/workbench";
import type { AgentRole } from "../domain/role";
import { getPrimaryAssignment } from "../domain/workflow";
import { useWorkbenchState } from "../App";
import { useLocalServices } from "../hooks/useLocalServices";
import type { CreateProjectInput } from "../services/api/projectApi";
import { taskApi } from "../services/api";

interface NewProjectWizardProps {
  data: WorkbenchData;
}

type WizardStep = "info" | "roles" | "workflow" | "capabilities" | "confirm";
type WizardState = "loading" | "empty" | "error" | "success" | "validation";

interface ProjectInfo {
  name: string;
  repoPath: string;
  defaultBranch: string;
  worktreeRoot: string;
}

interface RoleConfig {
  id: string;
  roleId: string;
  customPrompt?: string;
  memoryScope: "project" | "task";
  selectedCapabilities: string[];
  runnerId?: string;
  modelProviderId?: string;
  modelName?: string;
}

interface StepConfig {
  stepId: string;
  roleId: string;
  runnerId?: string;
  modelProviderId: string;
  modelName: string;
  capabilities: string[];
}

// 流程模板分类
type TemplateCategory = "all" | "development" | "review" | "fix" | "refactor";

const categoryConfig: Record<TemplateCategory, { label: string; icon: React.ReactNode; keywords: string[] }> = {
  all: { label: "全部", icon: <Layers size={16} />, keywords: [] },
  development: { label: "开发流程", icon: <Code2 size={16} />, keywords: ["开发", "软件", "完整"] },
  review: { label: "评审流程", icon: <FileCheck size={16} />, keywords: ["评审", "设计"] },
  fix: { label: "修复流程", icon: <Bug size={16} />, keywords: ["Bug", "修复", "问题"] },
  refactor: { label: "重构流程", icon: <Wrench size={16} />, keywords: ["重构"] },
};

export function NewProjectWizard({ data }: NewProjectWizardProps) {
  const { addProject, setTasks } = useWorkbenchState();
  const services = useLocalServices();
  const [step, setStep] = useState<WizardStep>("info");
  const [wizardState, setWizardState] = useState<WizardState>("empty");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [projectInfo, setProjectInfo] = useState<ProjectInfo>({
    name: "",
    repoPath: "",
    defaultBranch: "main",
    worktreeRoot: ".claude/worktrees",
  });

  // Role configuration state
  const [roleConfigs, setRoleConfigs] = useState<RoleConfig[]>([]);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);

  // Workflow configuration state
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>("");
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);
  const [stepConfigs, setStepConfigs] = useState<StepConfig[]>([]);

  // Capability selection state
  const [selectedMcps, setSelectedMcps] = useState<Set<string>>(new Set());
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [selectedPlugins, setSelectedPlugins] = useState<Set<string>>(new Set());

  // Creation state
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Category and search state
  const [activeCategory, setActiveCategory] = useState<TemplateCategory>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const selectedWorkflow = useMemo(
    () => data.workflowTemplates.find((t) => t.id === selectedWorkflowId),
    [data, selectedWorkflowId]
  );

  const bindingPreviewWorkflow = selectedWorkflow ?? data.workflowTemplates[0] ?? null;

  const previewTemplate = useMemo(
    () => data.workflowTemplates.find((t) => t.id === previewTemplateId) ?? data.workflowTemplates[0] ?? null,
    [data, previewTemplateId]
  );

  // 方案B: 过滤后的模板列表
  const filteredTemplates = useMemo(() => {
    return data.workflowTemplates.filter((t) => {
      // 分类过滤
      if (activeCategory !== "all") {
        const keywords = categoryConfig[activeCategory].keywords;
        const matchesCategory = keywords.some(kw => t.name.includes(kw));
        if (!matchesCategory) return false;
      }
      // 搜索过滤
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = t.name.toLowerCase().includes(query) ||
          t.steps.some(s => s.name.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }
      return true;
    });
  }, [data.workflowTemplates, activeCategory, searchQuery]);

  // 分类计数
  const categoryCounts = useMemo(() => {
    const counts: Record<TemplateCategory, number> = { all: 0, development: 0, review: 0, fix: 0, refactor: 0 };
    counts.all = data.workflowTemplates.length;
    data.workflowTemplates.forEach((t) => {
      Object.entries(categoryConfig).forEach(([cat, config]) => {
        if (cat !== "all" && config.keywords.some(kw => t.name.includes(kw))) {
          counts[cat as TemplateCategory]++;
        }
      });
    });
    return counts;
  }, [data.workflowTemplates]);

  const steps = [
    { key: "info" as const, label: "项目信息", num: "01" },
    { key: "workflow" as const, label: "选择流程", num: "02" },
    { key: "capabilities" as const, label: "能力授权", num: "03" },
    { key: "confirm" as const, label: "确认创建", num: "04" },
  ];
  const currentStepIndex = steps.findIndex((s) => s.key === step);

  const selectedWorkflowRoles = useMemo(() => {
    const roleIds = Array.from(new Set(selectedWorkflow?.steps.map((s) => s.roleId) ?? []));
    return roleIds
      .map((roleId) => data.roles.find((role) => role.id === roleId))
      .filter((role): role is AgentRole => Boolean(role));
  }, [data.roles, selectedWorkflow]);

  // Initialize role configs when moving to roles step
  const initializeRoleConfigs = () => {
    const defaultRoles = data.roles.filter((r) => r.isBuiltIn);
    const configs: RoleConfig[] = defaultRoles.map((role) => ({
      id: `role-config-${role.id}`,
      roleId: role.id,
      memoryScope: "project" as const,
      selectedCapabilities: [...role.defaultCapabilities],
    }));
    setRoleConfigs(configs);
  };

  // Initialize step configs when workflow is selected
  const initializeStepConfigs = (workflowId: string) => {
    const template = data.workflowTemplates.find((t) => t.id === workflowId);
    if (!template) return;

    const configs: StepConfig[] = template.steps.map((s) => {
      const assignment = getPrimaryAssignment(s);
      return {
        stepId: s.id,
        roleId: assignment?.roleId || '',
        runnerId: assignment?.runnerId || data.runnerProfiles.find((r) => r.enabled)?.id,
        modelProviderId: assignment?.modelProviderId || 'claude',
        modelName: assignment?.modelName || 'claude-sonnet-4-20250514',
        capabilities: [],
      };
    });
    setStepConfigs(configs);
  };

  const handleCreate = async () => {
    const trimmedName = projectInfo.name.trim();
    const trimmedPath = projectInfo.repoPath.trim();
    if (!trimmedName || !trimmedPath) return;

    // Validation
    setWizardState("validation");
    if (!selectedWorkflowId) {
      setErrorMessage("请选择工作流模板");
      setWizardState("error");
      return;
    }

    setCreating(true);
    setWizardState("loading");
    setError(null);

    const input: CreateProjectInput = {
      name: trimmedName,
      repoPath: trimmedPath,
      defaultBranch: projectInfo.defaultBranch,
      worktreeRoot: projectInfo.worktreeRoot,
      workflowTemplateId: selectedWorkflowId,
    };

    try {
      if (!services.createProject) {
        throw new Error('服务不可用');
      }
      const result = await services.createProject(input);

      if (result.ok && result.data) {
        // Update reducer state with new project
        addProject({
          name: result.data.name,
          repoPath: result.data.repoPath,
          defaultBranch: result.data.defaultBranch,
          worktreeRoot: result.data.worktreeRoot,
          scope: result.data.scope,
          desktopIntegrationStatus: result.data.desktopIntegrationStatus,
          permissions: result.data.permissions,
          settings: result.data.settings,
          workflowTemplateId: result.data.workflowTemplateId,
          roleOverrides: result.data.roleOverrides,
        });

        // Create initial tasks from workflow template
        if (selectedWorkflowId) {
          try {
            const tasksResult = await taskApi.createFromWorkflow({
              projectId: result.data.id,
              workflowTemplateId: selectedWorkflowId,
            });
            if (tasksResult.ok && tasksResult.data) {
              console.log(`[NewProjectWizard] Created ${tasksResult.data.length} initial tasks`);
              // Sync created tasks to reducer state so ProjectDetailPage can find them
              setTasks([...data.tasks, ...tasksResult.data]);
            }
          } catch (taskError) {
            console.error('[NewProjectWizard] Failed to create initial tasks:', taskError);
            // Don't fail the whole project creation if task creation fails
          }
        }

        setCreating(false);
        setCreated(true);
        setWizardState("success");
      } else {
        setCreating(false);
        setWizardState("error");
        const errorMsg = result.error?.message || '创建项目失败';
        setErrorMessage(errorMsg);
        setError(errorMsg);
      }
    } catch (err) {
      setCreating(false);
      setWizardState("error");
      const errorMsg = err instanceof Error ? err.message : '创建项目失败';
      setErrorMessage(errorMsg);
      setError(errorMsg);
    }
  };

  if (created) {
    return (
      <div className="wizard-done">
        <Check className="done-icon" size={48} aria-hidden="true" />
        <h2>项目已创建</h2>
        <p>项目 "{projectInfo.name}" 已成功创建。</p>
        <button
          className="btn primary"
          onClick={() => {
            setCreated(false);
            setStep("info");
            setProjectInfo({ name: "", repoPath: "", defaultBranch: "main", worktreeRoot: ".claude/worktrees" });
          }}
        >
          创建新项目
        </button>
      </div>
    );
  }

  return (
    <div className="wizard-page">
      <div className="flow-stepper">
        {steps.map((s, i) => (
          <button
            key={s.key}
            className={`flow-step${i === currentStepIndex ? " active" : ""}${i < currentStepIndex ? " done" : ""}`}
            onClick={() => {
              setStep(s.key);
            }}
          >
            <span className="step-num">{s.num}</span>
            <span className="step-label">{s.label}</span>
          </button>
        ))}
      </div>

      <div className="wizard-content">
        {step === "info" && (
          <div className="wizard-step-content">
            <h2>项目信息</h2>
            <div className="form-grid">
              <div className="form-field">
                <label>项目名称</label>
                <input
                  placeholder="例如：my-awesome-project"
                  value={projectInfo.name}
                  onChange={(e) => setProjectInfo({ ...projectInfo, name: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label>仓库路径</label>
                <input
                  placeholder="例如：D:/work/my-project"
                  value={projectInfo.repoPath}
                  onChange={(e) => setProjectInfo({ ...projectInfo, repoPath: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label>默认分支</label>
                <input
                  value={projectInfo.defaultBranch}
                  onChange={(e) => setProjectInfo({ ...projectInfo, defaultBranch: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label>Worktree 根目录</label>
                <input
                  value={projectInfo.worktreeRoot}
                  onChange={(e) => setProjectInfo({ ...projectInfo, worktreeRoot: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        {step === "roles" && (
          <div className="wizard-step-content role-config-panel">
            <div className="role-panel-header">
              <h2><User size={20} /> 角色池与流程绑定</h2>
              <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: "var(--space-lg)" }}>
                先确定项目角色池，再检查每个流程步骤默认绑定的角色，后续可在流程步骤里细调 Runner 与模型。
              </p>
            </div>

            {wizardState === "error" && (
              <div className="wizard-error-banner">
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="npw-binding-layout">
              <section className="npw-role-pool-panel">
                <div className="npw-panel-title">
                  <h3>项目角色池</h3>
                  <span>{roleConfigs.length || data.roles.filter((r) => r.isBuiltIn).length} 个角色</span>
                </div>

                <div className="role-list">
                  {roleConfigs.length === 0 ? (
                    <div className="role-empty">
                      <User size={32} />
                      <p>尚未添加角色</p>
                      <button
                        className="btn primary"
                        onClick={() => {
                          initializeRoleConfigs();
                        }}
                      >
                        使用默认角色池
                      </button>
                    </div>
                  ) : (
                    roleConfigs.map((rc) => {
                      const role = data.roles.find((r) => r.id === rc.roleId);
                      if (!role) return null;
                      return (
                        <div
                          key={rc.id}
                          className={`role-config-item${editingRoleId === rc.id ? " editing" : ""}`}
                        >
                          <div className="role-config-header">
                            <div className="role-config-title">
                              <User size={16} />
                              <strong>{role.name}</strong>
                              {role.isBuiltIn && <span className="badge">内置</span>}
                            </div>
                            <button
                              className="btn ghost sm"
                              onClick={() => setEditingRoleId(editingRoleId === rc.id ? null : rc.id)}
                            >
                              {editingRoleId === rc.id ? "收起" : "配置"}
                            </button>
                          </div>

                          <div className="role-config-desc">{role.description}</div>

                          {editingRoleId === rc.id && (
                            <div className="role-config-detail">
                              <div className="form-field">
                                <label>记忆范围</label>
                                <select
                                  value={rc.memoryScope}
                                  onChange={(e) => {
                                    setRoleConfigs(roleConfigs.map((c) =>
                                      c.id === rc.id ? { ...c, memoryScope: e.target.value as "project" | "task" } : c
                                    ));
                                  }}
                                >
                                  <option value="project">项目级记忆</option>
                                  <option value="task">任务级记忆</option>
                                </select>
                              </div>

                              <div className="form-field">
                                <label>Runner 偏好</label>
                                <select
                                  value={rc.runnerId || ""}
                                  onChange={(e) => {
                                    setRoleConfigs(roleConfigs.map((c) =>
                                      c.id === rc.id ? { ...c, runnerId: e.target.value } : c
                                    ));
                                  }}
                                >
                                  <option value="">默认</option>
                                  {data.runnerProfiles.filter((r) => r.enabled).map((runner) => (
                                    <option key={runner.id} value={runner.id}>{runner.displayName}</option>
                                  ))}
                                </select>
                              </div>

                              <div className="form-field">
                                <label>模型偏好</label>
                                <select
                                  value={`${rc.modelProviderId || ""}:${rc.modelName || ""}`}
                                  onChange={(e) => {
                                    const [providerId, modelName] = e.target.value.split(":");
                                    setRoleConfigs(roleConfigs.map((c) =>
                                      c.id === rc.id ? { ...c, modelProviderId: providerId, modelName: modelName } : c
                                    ));
                                  }}
                                >
                                  <option value="">默认</option>
                                  {data.modelProviders.filter((p) => p.enabled).map((provider) => (
                                    provider.models.map((model) => (
                                      <option key={`${provider.id}:${model.name}`} value={`${provider.id}:${model.name}`}>
                                        {provider.name} / {model.name}
                                      </option>
                                    ))
                                  ))}
                                </select>
                              </div>

                              <div className="form-field">
                                <label>能力授权</label>
                                <div className="capability-chips">
                                  {role.defaultCapabilities.map((cap) => (
                                    <span
                                      key={cap}
                                      className={`chip${rc.selectedCapabilities.includes(cap) ? " selected" : ""}`}
                                      onClick={() => {
                                        setRoleConfigs(roleConfigs.map((c) =>
                                          c.id === rc.id ? {
                                            ...c,
                                            selectedCapabilities: rc.selectedCapabilities.includes(cap)
                                              ? rc.selectedCapabilities.filter((id) => id !== cap)
                                              : [...rc.selectedCapabilities, cap]
                                          } : c
                                        ));
                                      }}
                                    >
                                      {cap}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="role-pool-section">
                  <h3>从角色池添加</h3>
                  <div className="role-pool-grid">
                    {data.roles.filter((r) => !roleConfigs.some((rc) => rc.roleId === r.id)).map((role) => (
                      <button
                        key={role.id}
                        className="role-pool-item"
                        onClick={() => {
                          setRoleConfigs([
                            ...roleConfigs,
                            {
                              id: `role-config-${role.id}`,
                              roleId: role.id,
                              memoryScope: "project",
                              selectedCapabilities: [...role.defaultCapabilities],
                            },
                          ]);
                        }}
                      >
                        <User size={14} />
                        <span>{role.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <section className="npw-workflow-binding-panel">
                <div className="npw-panel-title">
                  <h3>流程步骤绑定</h3>
                  <span>{bindingPreviewWorkflow?.name ?? "未选择流程"}</span>
                </div>
                <div className="npw-binding-steps">
                  {bindingPreviewWorkflow ? (
                    bindingPreviewWorkflow.steps.map((workflowStep, idx) => {
                      const stepConfig = stepConfigs.find((sc) => sc.stepId === workflowStep.id);
                      const role = data.roles.find((r) => r.id === (stepConfig?.roleId ?? workflowStep.roleId));
                      return (
                        <div key={workflowStep.id} className="npw-binding-step">
                          <span className="npw-binding-index">{String(idx + 1).padStart(2, "0")}</span>
                          <div>
                            <strong>{workflowStep.name}</strong>
                            <span>{role?.name ?? "未绑定角色"}</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="npw-binding-empty">暂无可绑定流程</div>
                  )}
                </div>
              </section>
            </div>
          </div>
        )}

        {step === "workflow" && (
          <div className="wizard-step-content workflow-selector-b">
            <div className="ws-sidebar">
              <div className="ws-sidebar-title">分类</div>
              {(Object.keys(categoryConfig) as TemplateCategory[]).map((cat) => (
                <button
                  key={cat}
                  className={`ws-category-item${activeCategory === cat ? " active" : ""}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {categoryConfig[cat].icon}
                  <span>{categoryConfig[cat].label}</span>
                  <span className="ws-category-count">{categoryCounts[cat]}</span>
                </button>
              ))}
            </div>

            <div className="ws-list-panel">
              <div className="ws-search-bar">
                <Search size={14} />
                <input
                  type="text"
                  placeholder="搜索模板..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="ws-template-list">
                {filteredTemplates.length === 0 ? (
                  <div className="ws-empty">暂无匹配的模板</div>
                ) : (
                  filteredTemplates.map((t) => (
                    <button
                      key={t.id}
                      className={`ws-list-item${previewTemplateId === t.id ? " active" : ""}`}
                      onClick={() => setPreviewTemplateId(t.id)}
                    >
                      <div className="ws-list-item-title">{t.name}</div>
                      <div className="ws-list-item-desc">
                        {t.steps.slice(0, 3).map(s => s.name).join(' → ')}
                        {t.steps.length > 3 && ' ...'}
                      </div>
                      <div className="ws-list-item-meta">
                        <span>{t.steps.length} 步骤</span>
                        <span>v{t.version}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="ws-detail-panel">
              {previewTemplate ? (
                <>
                  <div className="ws-detail-header">
                    <div className="ws-detail-icon">▣</div>
                    <div className="ws-detail-info">
                      <h3>{previewTemplate.name}</h3>
                      <p>{previewTemplate.steps.length} 个步骤 · v{previewTemplate.version}</p>
                    </div>
                  </div>

                  <div className="ws-detail-stats">
                    <div className="ws-stat">
                      <span className="ws-stat-value">{previewTemplate.steps.length}</span>
                      <span className="ws-stat-label">步骤</span>
                    </div>
                    <div className="ws-stat">
                      <span className="ws-stat-value">{previewTemplate.steps.filter(s => s.gateMode === 'manual').length}</span>
                      <span className="ws-stat-label">人工决策</span>
                    </div>
                    <div className="ws-stat">
                      <span className="ws-stat-value">{previewTemplate.steps.filter(s => s.gateMode === 'auto').length}</span>
                      <span className="ws-stat-label">自动继续</span>
                    </div>
                  </div>

                  <div className="ws-detail-steps">
                    <h4>流程步骤</h4>
                    <div className="ws-steps-flow editable">
                      {previewTemplate.steps.map((s, idx) => {
                        const stepConfig = stepConfigs.find((sc) => sc.stepId === s.id);
                        const role = stepConfig ? data.roles.find((r) => r.id === stepConfig.roleId) : data.roles.find((r) => r.id === s.roleId);
                        return (
                          <div key={s.id} className="ws-flow-step">
                            <div className="ws-flow-step-no">{idx + 1}</div>
                            <div className="ws-flow-step-content">
                              <div className="ws-flow-step-name">{s.name}</div>
                              <div className="ws-flow-step-role">{role?.name ?? '—'}</div>
                              {selectedWorkflowId === previewTemplate.id && stepConfig && (
                                <div className="ws-flow-step-meta">
                                  <span>{stepConfig.runnerId ? data.runnerProfiles.find((r) => r.id === stepConfig.runnerId)?.displayName : '默认 Runner'}</span>
                                  <span>{stepConfig.modelName || '默认模型'}</span>
                                </div>
                              )}
                            </div>
                            {idx < previewTemplate.steps.length - 1 && <ArrowRight size={14} className="ws-flow-arrow" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="ws-detail-actions">
                    <button
                      className={`btn primary${selectedWorkflowId === previewTemplate.id ? " selected" : ""}`}
                      onClick={() => {
                        if (selectedWorkflowId !== previewTemplate.id) {
                          setSelectedWorkflowId(previewTemplate.id);
                          initializeStepConfigs(previewTemplate.id);
                        }
                      }}
                    >
                      {selectedWorkflowId === previewTemplate.id ? (
                        <><CheckCircle2 size={14} /> 已选择</>
                      ) : (
                        "选择此流程"
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <div className="ws-detail-empty">
                  <Layers size={32} />
                  <p>选择左侧模板查看详情</p>
                </div>
              )}
            </div>
          </div>
        )}

        {step === "capabilities" && (
          <div className="wizard-step-content">
            <h2>能力授权</h2>
            <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: "var(--space-lg)" }}>选择项目可用的 MCP、Skills 和 Plugins。</p>

            <div className="capabilities-section">
              <h3 className="cap-section-title">MCP Servers</h3>
              {data.mcpServers.length === 0 ? (
                <p className="muted-text">暂无 MCP Server</p>
              ) : (
                <div className="capability-grid">
                  {data.mcpServers.map((mcp) => (
                    <div
                      key={mcp.id}
                      className={`cap-item${selectedMcps.has(mcp.id) ? " selected" : ""}`}
                      onClick={() => {
                        setSelectedMcps(prev => {
                          const next = new Set(prev);
                          if (next.has(mcp.id)) { next.delete(mcp.id); } else { next.add(mcp.id); }
                          return next;
                        });
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="item-left">
                        <span className="item-icon hardware">MCP</span>
                        <div className="item-info">
                          <strong>{mcp.name}</strong>
                          <div className="item-badges">
                            <span className="badge">{mcp.toolCount} 个工具</span>
                          </div>
                        </div>
                      </div>
                      <button
                        className={`cap-select-btn${selectedMcps.has(mcp.id) ? " selected" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMcps(prev => {
                            const next = new Set(prev);
                            if (next.has(mcp.id)) { next.delete(mcp.id); } else { next.add(mcp.id); }
                            return next;
                          });
                        }}
                        type="button"
                      >
                        {selectedMcps.has(mcp.id) ? "已选择" : "选择"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="capabilities-section">
              <h3 className="cap-section-title">Skills</h3>
              {data.skills.length === 0 ? (
                <p className="muted-text">暂无 Skill</p>
              ) : (
                <div className="capability-grid">
                  {data.skills.map((skill) => (
                    <div
                      key={skill.id}
                      className={`cap-item${selectedSkills.has(skill.id) ? " selected" : ""}`}
                      onClick={() => {
                        setSelectedSkills(prev => {
                          const next = new Set(prev);
                          if (next.has(skill.id)) { next.delete(skill.id); } else { next.add(skill.id); }
                          return next;
                        });
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="item-left">
                        <span className="item-icon violet">SK</span>
                        <div className="item-info">
                          <strong>{skill.name}</strong>
                          <div className="item-badges">
                            <span className="badge violet">{skill.description?.slice(0, 40)}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        className={`cap-select-btn${selectedSkills.has(skill.id) ? " selected" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSkills(prev => {
                            const next = new Set(prev);
                            if (next.has(skill.id)) { next.delete(skill.id); } else { next.add(skill.id); }
                            return next;
                          });
                        }}
                        type="button"
                      >
                        {selectedSkills.has(skill.id) ? "已选择" : "选择"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="capabilities-section">
              <h3 className="cap-section-title">Plugins</h3>
              {data.plugins.length === 0 ? (
                <p className="muted-text">暂无 Plugin</p>
              ) : (
                <div className="capability-grid">
                  {data.plugins.map((plugin) => (
                    <div
                      key={plugin.id}
                      className={`cap-item${selectedPlugins.has(plugin.id) ? " selected" : ""}`}
                      onClick={() => {
                        setSelectedPlugins(prev => {
                          const next = new Set(prev);
                          if (next.has(plugin.id)) { next.delete(plugin.id); } else { next.add(plugin.id); }
                          return next;
                        });
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="item-left">
                        <span className="item-icon blue">PL</span>
                        <div className="item-info">
                          <strong>{plugin.name}</strong>
                          <div className="item-badges">
                            <span className="badge blue">{"v" + plugin.version}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        className={`cap-select-btn${selectedPlugins.has(plugin.id) ? " selected" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPlugins(prev => {
                            const next = new Set(prev);
                            if (next.has(plugin.id)) { next.delete(plugin.id); } else { next.add(plugin.id); }
                            return next;
                          });
                        }}
                        type="button"
                      >
                        {selectedPlugins.has(plugin.id) ? "已选择" : "选择"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {step === "confirm" && (
          <div className="wizard-step-content">
            <h2><FileText size={20} /> 确认创建</h2>

            {wizardState === "error" && (
              <div className="wizard-error-banner">
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="confirm-summary">
              <div className="summary-section">
                <h3>项目信息</h3>
                <div className="summary-item">
                  <strong>项目名称</strong>
                  <span>{projectInfo.name || "未填写"}</span>
                </div>
                <div className="summary-item">
                  <strong>仓库路径</strong>
                  <span>{projectInfo.repoPath || "未填写"}</span>
                </div>
                <div className="summary-item">
                  <strong>默认分支</strong>
                  <span className="badge blue">{projectInfo.defaultBranch}</span>
                </div>
              </div>

              <div className="summary-section">
                <h3>流程内置角色</h3>
                {selectedWorkflowRoles.length === 0 ? (
                  <p className="muted-text">选择流程后自动带出角色</p>
                ) : (
                  <div className="role-summary-grid">
                    {selectedWorkflowRoles.map((role) => (
                        <div key={role.id} className="role-summary-item">
                          <User size={14} />
                          <span>{role.name}</span>
                          <span className="badge">流程绑定</span>
                        </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="summary-section">
                <h3>工作流绑定</h3>
                <div className="summary-item">
                  <strong>流程模板</strong>
                  <span>{selectedWorkflow?.name || "未选择"}</span>
                </div>
                {selectedWorkflow && (
                  <div className="workflow-step-summary">
                    {selectedWorkflow.steps.map((s, idx) => {
                      const stepConfig = stepConfigs.find((sc) => sc.stepId === s.id);
                      const role = stepConfig ? data.roles.find((r) => r.id === stepConfig.roleId) : data.roles.find((r) => r.id === s.roleId);
                      return (
                        <div key={s.id} className="step-summary-item">
                          <span className="step-no">{idx + 1}</span>
                          <span className="step-name">{s.name}</span>
                          <span className="step-role">{role?.name || '—'}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="summary-section">
                <h3>能力授权</h3>
                <div className="capability-summary">
                  <span className="badge hardware">{selectedMcps.size} MCP</span>
                  <span className="badge violet">{selectedSkills.size} Skill</span>
                  <span className="badge blue">{selectedPlugins.size} Plugin</span>
                </div>
              </div>
            </div>

            {/* Initial Project Plan */}
            <div className="initial-plan">
              <h3><FileText size={16} /> 初始项目计划</h3>
              {selectedWorkflow ? (
                <div className="plan-content">
                  <p>项目创建后将自动生成以下初始计划：</p>
                  <ol>
                    {selectedWorkflow.steps.slice(0, 3).map((s, idx) => (
                      <li key={s.id}>
                        <strong>{s.name}</strong>
                        {idx === 0 && <span className="badge green">起始步骤</span>}
                      </li>
                    ))}
                    {selectedWorkflow.steps.length > 3 && (
                      <li className="more-steps">... 共 {selectedWorkflow.steps.length} 个步骤</li>
                    )}
                  </ol>
                </div>
              ) : (
                <p className="muted-text">请先选择工作流模板以生成初始计划</p>
              )}
            </div>

            <button
              className="btn primary btn-lg"
              onClick={handleCreate}
              disabled={creating || !projectInfo.name || !projectInfo.repoPath || !selectedWorkflowId}
            >
              {wizardState === "loading" ? (
                <><Loader2 size={14} className="spin" /> 创建中...</>
              ) : (
                <><Check size={14} /> 创建项目</>
              )}
            </button>
          </div>
        )}
      </div>

      <div className="wizard-nav">
        {currentStepIndex > 0 && (
          <button className="btn ghost" onClick={() => setStep(steps[currentStepIndex - 1].key)}>
            上一步
          </button>
        )}
        {currentStepIndex < steps.length - 1 && (
          <button className="btn primary" onClick={() => setStep(steps[currentStepIndex + 1].key)}>
            下一步
          </button>
        )}
      </div>

      {/* 弹窗已移除 - 详情直接显示在右侧面板 */}
    </div>
  );
}
