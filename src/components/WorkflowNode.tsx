import { useMemo } from "react";
import { GripVertical, ShieldAlert } from "lucide-react";
import type { WorkflowStep, WorkbenchData, WorkflowTemplate } from "../domain/workbench";

interface WorkflowNodeProps {
  step: WorkflowStep;
  index: number;
  onDoubleClick: () => void;
  data: WorkbenchData;
  template: WorkflowTemplate;
  isLast: boolean;
  isDragging?: boolean;
  isDropTarget?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  onDragStart: (e: React.DragEvent, stepId: string, index: number) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (e: React.DragEvent, targetIndex: number) => void;
}

export function WorkflowNode({
  step,
  index,
  onDoubleClick,
  data,
  template: _template,
  isLast,
  isDragging = false,
  isDropTarget = false,
  isSelected = false,
  onClick,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: WorkflowNodeProps) {
  const role = useMemo(() => data.roles.find((r) => r.id === step.roleId), [data.roles, step.roleId]);
  const provider = useMemo(
    () => data.modelProviders.find((p) => p.id === step.modelProviderId),
    [data.modelProviders, step.modelProviderId]
  );

  const orderLabel = String(index + 1).padStart(2, "0");
  const gateLabel = step.gateMode === "manual" ? "人工决策" : "自动继续";

  // Determine next step label
  const successLabel = isLast ? "完成" : `步骤 ${index + 2}`;

  // Failure strategy label
  const failureLabels: Record<string, string> = {
    stop: "停止",
    retry: "重试",
    skip: "跳过",
    fallback: "回退",
  };
  const failureLabel = failureLabels[step.failureStrategy] ?? step.failureStrategy;
  const modelLabel = step.modelName.includes("deepseek")
    ? "v4-pro"
    : step.modelName.includes("gpt-5.3")
      ? "gpt-5.3"
      : step.modelName;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", step.id);
    e.dataTransfer.effectAllowed = "move";
    onDragStart(e, step.id, index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    onDragOver(e, index);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDrop(e, index);
  };

  return (
    <div
      className="step-group"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div
        className={`step-card${isDragging ? " dragging" : ""}${isDropTarget ? " drop-target" : ""}${isSelected ? " selected" : ""}`}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        title="单击选中查看配置 · 双击编辑步骤"
        draggable
        onDragStart={handleDragStart}
        onDragEnd={onDragEnd}
      >
        {/* Drag handle */}
        <div className="step-drag">
          <GripVertical size={14} />
        </div>

        {/* Exit ports */}
        <div className="step-ports">
          <div className="step-port success" title="成功出口">
            <span className="step-port-label">→ {successLabel}</span>
          </div>
          <div className="step-port failure" title="失败出口">
            <span className="step-port-label">→ {failureLabel}</span>
          </div>
        </div>

        {/* Header */}
        <div className="step-card-header">
          <div className="step-order">{orderLabel}</div>
          <div className="step-info">
            <div className="step-name">{step.name}</div>
            <div className="step-meta">
              {role && <span className="badge badge-v">{role.name}</span>}
              {provider && <span className="badge badge-b">{provider.name} {modelLabel}</span>}
              <span className={`badge ${step.gateMode === "manual" ? "badge-o" : "badge-g"}`}>
                {step.gateMode === "manual" && <ShieldAlert size={10} />}
                {gateLabel}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
