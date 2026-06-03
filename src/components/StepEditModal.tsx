import { useMemo, useState, useEffect } from "react";
import { Check, ChevronRight, Edit2, Trash2, X } from "lucide-react";
import type { FailureStrategy, GateMode, WorkbenchData, WorkflowStep, WorkflowTemplate, WorkflowAssignment } from "../domain/workbench";
import type { WorkflowRole } from "../domain/workflow";
import { AssignmentEditor } from "./AssignmentEditor";

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
  const [description, setDescription] = useState(step.description ?? "");
  const [gateMode, setGateMode] = useState<GateMode>(step.gateMode);
  const [failureStrategy, setFailureStrategy] = useState<FailureStrategy>(step.failureStrategy);
  const [inputs, setInputs] = useState(step.inputs.join(", "));
  const [outputs, setOutputs] = useState(step.outputs.join(", "));
  const [assignments, setAssignments] = useState<WorkflowAssignment[]>(step.assignments ?? []);
  const [stepMarkdown, setStepMarkdown] = useState(step.stepMarkdown ?? "");

  const sortedSteps = useMemo(() => [...template.steps].sort((a, b) => a.order - b.order), [template.steps]);
  const currentIndex = sortedSteps.findIndex((item) => item.id === step.id);

  // Collect all assignments from all steps for dependency selection
  const allAssignments = useMemo(() => {
    const all: WorkflowAssignment[] = [];
    template.steps.forEach((s) => {
      if (s.assignments) {
        all.push(...s.assignments);
      }
    });
    return all;
  }, [template.steps]);

  // Convert flowRoles to WorkflowRole format for AssignmentEditor
  const workflowRoles: WorkflowRole[] = useMemo(() => {
    return (flowRoles ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description ?? "",
      responsibilities: [],
      deliverables: [],
      roleMarkdown: r.roleMarkdown,
    }));
  }, [flowRoles]);

  const handleSave = () => {
    if (readOnly) return;
    onSave({
      name: name.trim(),
      description: description.trim(),
      gateMode,
      failureStrategy,
      inputs: inputs.split(",").map((item) => item.trim()).filter(Boolean),
      outputs: outputs.split(",").map((item) => item.trim()).filter(Boolean),
      assignments,
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
      <div className="modal-panel step-edit-panel step-edit-panel-wide" onClick={(event) => event.stopPropagation()}>
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
          {/* Left: Basic step config */}
          <div className="step-edit-main">
            <div className="modal-body-grid step-edit-grid">
              <div className="form-field">
                <label>步骤名称</label>
                <input value={name} onChange={(event) => setName(event.target.value)} disabled={readOnly} />
              </div>
              <div className="form-field">
                <label>步骤描述</label>
                <input
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="可选描述"
                  disabled={readOnly}
                />
              </div>
              <div className="form-field">
                <label>Gate 模式</label>
                <select value={gateMode} onChange={(event) => setGateMode(event.target.value as GateMode)} disabled={readOnly}>
                  <option value="auto">自动继续</option>
                  <option value="manual">人工决策</option>
                </select>
              </div>
              <div className="form-field">
                <label>输入制品</label>
                <input value={inputs} onChange={(event) => setInputs(event.target.value)} placeholder="逗号分隔" disabled={readOnly} />
              </div>
              <div className="form-field">
                <label>输出制品</label>
                <input value={outputs} onChange={(event) => setOutputs(event.target.value)} placeholder="逗号分隔" disabled={readOnly} />
              </div>
            </div>

            <div className="modal-routing step-edit-routing">
              <div className="modal-routing-title">
                <ChevronRight size={12} />
                失败处理策略
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

            <div className="modal-routing step-edit-rules">
              <div className="modal-routing-title">
                <ChevronRight size={12} />
                步骤规则 (Markdown)
              </div>
              <div className="form-field step-edit-rule-field" style={{ gridTemplateColumns: "1fr" }}>
                <textarea
                  className="step-md-textarea"
                  value={stepMarkdown}
                  onChange={(event) => setStepMarkdown(event.target.value)}
                  placeholder="输入步骤 Markdown 规则..."
                  rows={8}
                  spellCheck={false}
                  disabled={readOnly}
                />
              </div>
            </div>
          </div>

          {/* Right: Assignments editor */}
          <div className="step-edit-assignments">
            <AssignmentEditor
              assignments={assignments}
              stepId={step.id}
              data={data}
              flowRoles={workflowRoles}
              allAssignments={allAssignments}
              readOnly={readOnly}
              onChange={setAssignments}
            />
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
