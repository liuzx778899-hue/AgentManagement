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
  const [name, setName] = useState(step.name);
  const [providerId, setProviderId] = useState(step.modelProviderId);
  const [modelName, setModelName] = useState(step.modelName);
  const [gateMode, setGateMode] = useState<GateMode>(step.gateMode);
  const [failureStrategy, setFailureStrategy] = useState<FailureStrategy>(step.failureStrategy);
  const [inputs, setInputs] = useState(step.inputs.join(", "));
  const [outputs, setOutputs] = useState(step.outputs.join(", "));
  const [runnerId, setRunnerId] = useState<string>(step.runnerId ?? "");

  // 角色处理：从当前流程角色中查找
  const getRoleNameFromId = (rid: string) => {
    if (!rid) return "";
    const role = (flowRoles ?? []).find(r => r.id === rid);
    return role?.name ?? rid;
  };
  const [roleId, setRoleId] = useState(step.roleId || "");
  const roleName = getRoleNameFromId(roleId);

  const enabledRunners = useMemo(() => (data.runnerProfiles ?? []).filter((runner) => runner.enabled), [data.runnerProfiles]);

  const sortedSteps = useMemo(() => [...template.steps].sort((a, b) => a.order - b.order), [template.steps]);
  const currentIndex = sortedSteps.findIndex((item) => item.id === step.id);

  const selectedProvider = useMemo(
    () => data.modelProviders.find((provider) => provider.id === providerId),
    [data.modelProviders, providerId],
  );

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

    return [
      `# ${name}`,
      "",
      `**执行角色：** ${roleName || "未绑定角色"}`,
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
  }, [name, roleId, roleName, providerId, modelName, inputs, outputs, failureStrategy, selectedProvider]);

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

  const handleSave = () => {
    if (readOnly) return;
    onSave({
      name: name.trim(),
      roleId: roleId,
      modelProviderId: providerId,
      modelName,
      gateMode,
      failureStrategy,
      inputs: inputs.split(",").map((item) => item.trim()).filter(Boolean),
      outputs: outputs.split(",").map((item) => item.trim()).filter(Boolean),
      stepMarkdown,
      runnerId: runnerId || undefined,
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
                <label>执行角色</label>
                <select
                  value={roleId}
                  disabled={readOnly}
                  onChange={(event) => setRoleId(event.target.value)}
                >
                  <option value="">未绑定角色</option>
                  {(flowRoles ?? []).map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>绑定模型</label>
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
