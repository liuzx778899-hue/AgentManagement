import { useMemo, useState } from "react";
import { Check, ChevronRight, Edit2, Trash2, X } from "lucide-react";
import type { FailureStrategy, GateMode, WorkbenchData, WorkflowStep, WorkflowTemplate } from "../domain/workbench";

interface StepEditModalProps {
  step: WorkflowStep;
  template: WorkflowTemplate;
  data: WorkbenchData;
  flowRoles?: { id: string; name: string; description?: string; roleMarkdown?: string }[];
  readOnly?: boolean;
  onSave: (updates: Partial<WorkflowStep>) => void;
  onDelete: (stepId: string) => void;
  onClose: () => void;
}

export function StepEditModal({
  step,
  template,
  data,
  flowRoles,
  readOnly = false,
  onSave,
  onDelete,
  onClose,
}: StepEditModalProps) {
  // Issue #27: 多 assignment 管理
  const [localAssignments, setLocalAssignments] = useState(step.assignments ?? []);
  const [activeAssignmentIndex, setActiveAssignmentIndex] = useState(0);
  const assignments = localAssignments;
  const activeAssignment = assignments[activeAssignmentIndex] ?? assignments[0];

  const [name, setName] = useState(step.name);
  const [gateMode, setGateMode] = useState<GateMode>(step.gateMode);
  const [failureStrategy, setFailureStrategy] = useState<FailureStrategy>(step.failureStrategy);
  const [inputs, setInputs] = useState(step.inputs.join(", "));
  const [outputs, setOutputs] = useState(step.outputs.join(", "));

  // 当前活动 assignment 的表单状态
  const [providerId, setProviderId] = useState(activeAssignment?.modelProviderId ?? '');
  const [modelName, setModelName] = useState(activeAssignment?.modelName ?? '');
  const [runnerId, setRunnerId] = useState<string>(activeAssignment?.runnerId ?? "");

  // 角色处理
  const getRoleNameFromId = (rid: string) => {
    if (!rid) return "";
    const role = (flowRoles ?? []).find(r => r.id === rid);
    return role?.name ?? rid;
  };

  // 其他步骤已分配的角色 ID（跨步骤去重）
  const otherStepAssignedRoleIds = useMemo(() => {
    const ids = new Set<string>();
    template.steps.forEach((s) => {
      if (s.id === step.id) return; // 排除当前步骤
      (s.assignments ?? []).forEach((a) => {
        if (a.roleId) ids.add(a.roleId);
      });
    });
    return ids;
  }, [template.steps, step.id]);

  // 当前步骤已分配的角色 ID
  const currentStepAssignedRoleIds = useMemo(() => {
    return new Set(assignments.map(a => a.roleId).filter(Boolean));
  }, [assignments]);

  // 可选角色：排除当前步骤已选 + 其他步骤已选
  const availableRoles = useMemo(() => {
    return (flowRoles ?? []).filter(r => {
      if (currentStepAssignedRoleIds.has(r.id)) return false;
      if (otherStepAssignedRoleIds.has(r.id)) return false;
      return true;
    });
  }, [flowRoles, currentStepAssignedRoleIds, otherStepAssignedRoleIds]);

  const enabledRunners = useMemo(() => (data.runnerProfiles ?? []).filter((runner) => runner.enabled), [data.runnerProfiles]);
  const sortedSteps = useMemo(() => [...template.steps].sort((a, b) => a.order - b.order), [template.steps]);
  const currentIndex = sortedSteps.findIndex((item) => item.id === step.id);

  const selectedProvider = useMemo(
    () => data.modelProviders.find((provider) => provider.id === providerId),
    [data.modelProviders, providerId],
  );

  const activeRoleName = getRoleNameFromId(activeAssignment?.roleId ?? "");

  const defaultStepMarkdown = useMemo(() => {
    const providerName = selectedProvider?.name ?? providerId;
    const inputLabels = inputs.split(",").map((item) => item.trim()).filter(Boolean);
    const outputLabels = outputs.split(",").map((item) => item.trim()).filter(Boolean);
    const strategyLabel: Record<FailureStrategy, string> = {
      stop: "停止流程",
      retry: "重试当前步骤",
      skip: "跳过步骤",
      fallback: "回退到前一步",
    };

    // 多角色时列出所有角色
    const roleNames = assignments
      .map(a => getRoleNameFromId(a.roleId))
      .filter(Boolean)
      .join("、");

    return [
      `# ${name}`,
      "",
      `**执行角色：** ${roleNames || "未绑定角色"}`,
      `**模型：** ${providerName} / ${modelName}`,
      "",
      "## 输入",
      inputLabels.length > 0 ? inputLabels.map((label) => `- ${label}`).join("\n") : "（无）",
      "",
      "## 输出",
      outputLabels.length > 0 ? outputLabels.map((label) => `- ${label}`).join("\n") : "（无）",
      "",
      "## 失败策略",
      strategyLabel[failureStrategy] ?? failureStrategy,
    ].join("\n");
  }, [name, assignments, providerId, modelName, inputs, outputs, failureStrategy, selectedProvider]);

  const [stepMarkdown, setStepMarkdown] = useState(step.stepMarkdown || defaultStepMarkdown);

  const handleProviderChange = (newProviderId: string) => {
    setProviderId(newProviderId);
    const provider = data.modelProviders.find((item) => item.id === newProviderId);
    if (provider && provider.models.length > 0) {
      setModelName(provider.defaultModel || provider.models[0]?.name || "");
      return;
    }
    setModelName("");
  };

  // 切换到指定 assignment，更新表单状态
  const switchToAssignment = (index: number) => {
    setActiveAssignmentIndex(index);
    const asgn = assignments[index];
    if (asgn) {
      setProviderId(asgn.modelProviderId ?? "");
      setModelName(asgn.modelName ?? "");
      setRunnerId(asgn.runnerId ?? "");
    }
  };

  // 添加新角色分配（直接选角色即创建 assignment）
  const handleAddRoleAssignment = (newRoleId: string) => {
    const newAssignment = {
      id: `assignment-${Date.now()}`,
      order: assignments.length + 1,
      roleId: newRoleId,
      modelProviderId: data.modelProviders[0]?.id ?? "",
      modelName: data.modelProviders[0]?.defaultModel ?? "",
      goal: name.trim(),
      acceptanceCriteria: [],
      inputs: [],
      outputs: [],
    };
    const newAssignments = [...assignments, newAssignment];
    setLocalAssignments(newAssignments);
    // 切换到新添加的 assignment
    const newIndex = newAssignments.length - 1;
    setActiveAssignmentIndex(newIndex);
    setProviderId(newAssignment.modelProviderId);
    setModelName(newAssignment.modelName);
    setRunnerId("");
  };

  // 移除角色分配
  const handleRemoveRoleAssignment = (index: number) => {
    const newAssignments = assignments.filter((_, i) => i !== index);
    setLocalAssignments(newAssignments);
    if (newAssignments.length === 0) {
      setActiveAssignmentIndex(0);
      setProviderId(data.modelProviders[0]?.id ?? "");
      setModelName(data.modelProviders[0]?.defaultModel ?? "");
      setRunnerId("");
    } else if (index === activeAssignmentIndex) {
      switchToAssignment(Math.min(index, newAssignments.length - 1));
    } else if (index < activeAssignmentIndex) {
      setActiveAssignmentIndex(activeAssignmentIndex - 1);
    }
  };

  const handleSave = () => {
    if (readOnly) return;
    const parsedInputs = inputs.split(",").map((item) => item.trim()).filter(Boolean);
    const parsedOutputs = outputs.split(",").map((item) => item.trim()).filter(Boolean);

    // 保留所有 assignments，只更新当前活动的 assignment
    const updatedAssignments = assignments.map((asgn, i) => {
      if (i === activeAssignmentIndex) {
        return {
          ...asgn,
          modelProviderId: providerId,
          modelName,
          runnerId: runnerId || undefined,
          goal: asgn.goal || name.trim(),
          inputs: parsedInputs,
          outputs: parsedOutputs,
        };
      }
      return asgn;
    });

    if (updatedAssignments.length === 0) {
      updatedAssignments.push({
        id: `assignment-${Date.now()}`,
        order: 1,
        roleId: "",
        modelProviderId: providerId,
        modelName,
        runnerId: runnerId || undefined,
        goal: name.trim(),
        acceptanceCriteria: [],
        inputs: parsedInputs,
        outputs: parsedOutputs,
      });
    }

    onSave({
      name: name.trim(),
      assignments: updatedAssignments,
      gateMode,
      failureStrategy,
      inputs: parsedInputs,
      outputs: parsedOutputs,
      stepMarkdown,
    });
    onClose();
  };

  const handleDelete = () => {
    if (readOnly) return;
    if (confirm(`确定删除步骤 "${step.name}" 吗？`)) {
      onDelete(step.id);
      onClose();
    }
  };

  return (
    <div className="modal-overlay step-edit-overlay" onClick={onClose}>
      <div className="modal-panel step-edit-panel" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header step-edit-header">
          <h3>
            <Edit2 size={16} />
            编辑步骤 {String(currentIndex + 1).padStart(2, "0")} · {step.name}
          </h3>
          <button className="btn ghost btn-sm" onClick={onClose} title="关闭">
            <X size={16} /> 关闭
          </button>
        </div>

        <div className="modal-body step-edit-body">
          <div className="step-edit-main">
            <div className="modal-body-grid step-edit-grid">
              <div className="form-field">
                <label>步骤名称</label>
                <input value={name} onChange={(event) => setName(event.target.value)} disabled={readOnly} />
              </div>
              <div className="form-field">
                <label>
                  执行角色
                  {assignments.length > 1 && (
                    <span style={{ marginLeft: 8, color: "var(--accent-purple)", fontSize: "0.85em" }}>
                      ({assignments.length} 个)
                    </span>
                  )}
                </label>
                {/* 已分配角色标签列表 */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4, minHeight: 24 }}>
                  {assignments.filter(a => a.roleId).length === 0 && (
                    <span style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic", lineHeight: "24px" }}>
                      请从下方添加角色
                    </span>
                  )}
                  {assignments.map((asgn, i) => {
                    if (!asgn.roleId) return null;
                    const isActive = i === activeAssignmentIndex;
                    const rName = getRoleNameFromId(asgn.roleId);
                    return (
                      <span
                        key={asgn.id}
                        onClick={() => switchToAssignment(i)}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 3,
                          padding: "2px 8px", borderRadius: 4, cursor: "pointer",
                          fontSize: 12,
                          background: isActive ? "var(--accent-blue)" : "var(--bg-tertiary)",
                          color: isActive ? "#fff" : "var(--text-secondary)",
                          border: isActive ? "1px solid var(--accent-blue)" : "1px solid var(--border-primary)",
                          transition: "all 0.15s",
                        }}
                      >
                        {rName}
                        {!readOnly && (
                          <X
                            size={10}
                            style={{ cursor: "pointer", opacity: 0.7 }}
                            onClick={(e) => { e.stopPropagation(); handleRemoveRoleAssignment(i); }}
                          />
                        )}
                      </span>
                    );
                  })}
                </div>
                {/* 添加角色下拉 */}
                {!readOnly && availableRoles.length > 0 && (
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) handleAddRoleAssignment(e.target.value);
                    }}
                    style={{
                      width: "100%",
                      fontSize: 12,
                      padding: "4px 8px",
                      background: "#0d1b2a",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border-primary)",
                      borderRadius: 4,
                      cursor: "pointer",
                    }}
                  >
                    <option value="">+ 添加角色...</option>
                    {availableRoles.map((role) => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="form-field">
                <label>
                  绑定模型
                  {assignments.length > 1 && activeRoleName && (
                    <span style={{ marginLeft: 8, color: "var(--accent-blue)", fontSize: "0.8em" }}>
                      ({activeRoleName})
                    </span>
                  )}
                </label>
                <select
                  value={`${providerId}/${modelName}`}
                  disabled={readOnly}
                  onChange={(event) => {
                    const [nextProviderId, nextModelName] = event.target.value.split("/");
                    if (nextProviderId !== providerId) {
                      handleProviderChange(nextProviderId);
                    } else {
                      setModelName(nextModelName);
                    }
                  }}
                >
                  {data.modelProviders.filter((provider) => provider.enabled).flatMap((provider) =>
                    provider.models.map((model) => (
                      <option key={`${provider.id}/${model.name}`} value={`${provider.id}/${model.name}`}>
                        {provider.name} / {model.name}
                      </option>
                    )),
                  )}
                </select>
              </div>
              <div className="form-field">
                <label>Gate 模式</label>
                <select value={gateMode} onChange={(event) => setGateMode(event.target.value as GateMode)} disabled={readOnly}>
                  <option value="auto">自动继续</option>
                  <option value="manual">人工决策</option>
                </select>
              </div>
              <div className="form-field">
                <label>CLI Runner</label>
                <select value={runnerId} onChange={(event) => setRunnerId(event.target.value)} disabled={readOnly}>
                  <option value="">使用默认 Runner</option>
                  {enabledRunners.map((runner) => (
                    <option key={runner.id} value={runner.id}>
                      {runner.displayName} ({runner.command})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>输入</label>
                <input value={inputs} onChange={(event) => setInputs(event.target.value)} placeholder="逗号分隔" disabled={readOnly} />
              </div>
              <div className="form-field">
                <label>输出</label>
                <input value={outputs} onChange={(event) => setOutputs(event.target.value)} placeholder="逗号分隔" disabled={readOnly} />
              </div>
            </div>

            <div className="modal-routing step-edit-routing">
              <div className="modal-routing-title">
                <ChevronRight size={12} />
                连线走向配置
              </div>
              <div className="form-field">
                <label style={{ color: "var(--ok)" }}>成功时前往</label>
                <select value="" onChange={() => {}} disabled={readOnly}>
                  {sortedSteps.filter((item) => item.id !== step.id).map((item) => (
                    <option key={item.id} value={item.id}>
                      步骤 {sortedSteps.findIndex((candidate) => candidate.id === item.id) + 1} · {item.name}
                    </option>
                  ))}
                  <option value="end">完成流程</option>
                </select>
              </div>
              <div className="form-field">
                <label style={{ color: "var(--warn)" }}>失败时操作</label>
                <select value={failureStrategy} onChange={(event) => setFailureStrategy(event.target.value as FailureStrategy)} disabled={readOnly}>
                  <option value="stop">停止流程</option>
                  <option value="retry">重试当前步骤</option>
                  <option value="skip">跳过步骤</option>
                  <option value="fallback">回退到前一步</option>
                </select>
              </div>
            </div>
          </div>

          <div className="modal-routing step-edit-rules">
            <div className="modal-routing-title">
              <ChevronRight size={12} />
              步骤规则
            </div>
            <div className="form-field step-edit-rule-field" style={{ gridTemplateColumns: "1fr" }}>
              <textarea
                className="step-md-textarea"
                value={stepMarkdown}
                onChange={(event) => setStepMarkdown(event.target.value)}
                placeholder="输入步骤 Markdown 规则..."
                rows={10}
                spellCheck={false}
                disabled={readOnly}
              />
            </div>
          </div>
        </div>

        <div className="modal-footer step-edit-footer">
          {!readOnly && (
            <button className="btn btn-danger btn-sm" onClick={handleDelete} title="删除步骤">
              <Trash2 size={14} /> 删除步骤
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button className="btn ghost btn-sm" onClick={onClose}>取消</button>
          <button className="btn primary btn-sm" onClick={handleSave} disabled={readOnly}>
            <Check size={14} /> 保存
          </button>
        </div>
      </div>
    </div>
  );
}
