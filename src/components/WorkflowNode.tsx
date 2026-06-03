import { useMemo } from "react";
import { GripVertical, ShieldAlert, Users } from "lucide-react";
import type { WorkflowStep, WorkbenchData, WorkflowTemplate, WorkflowAssignment } from "../domain/workbench";
import type { WorkflowRole } from "../domain/workflow";
import { getPrimaryAssignment } from "../domain/workflow";

interface WorkflowNodeProps {
  step: WorkflowStep;
  index: number;
  onDoubleClick: () => void;
  data: WorkbenchData;
  template: WorkflowTemplate;
  flowRoles?: WorkflowRole[];
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
  flowRoles,
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
  // Get role info from flow roles or global roles
  const getRoleInfo = (roleId: string): { id: string; name: string } | null => {
    if (!roleId) return null;
    const flowRole = flowRoles?.find((r) => r.id === roleId);
    const globalRole = data.roles.find((r) => r.id === roleId);
    return flowRole || globalRole || null;
  };

  // Get assignment role avatars
  const assignments = step.assignments ?? [];
  const assignmentRoles = assignments.map((a) => getRoleInfo(a.roleId)).filter((r): r is { id: string; name: string } => r !== null);

  // Legacy: use primary assignment if no assignments array
  const primaryAssignment = getPrimaryAssignment(step);
  const primaryRole = primaryAssignment ? getRoleInfo(primaryAssignment.roleId) : null;

  // Use assignments if available, otherwise fall back to legacy roleId
  const displayRoles: { id: string; name: string }[] = assignmentRoles.length > 0 ? assignmentRoles : primaryRole ? [primaryRole] : [];

  // Get provider info
  const provider = useMemo(
    () => data.modelProviders.find((p) => p.id === (step.modelProviderId ?? primaryAssignment?.modelProviderId)),
    [data.modelProviders, step.modelProviderId, primaryAssignment?.modelProviderId]
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
  const modelName = step.modelName ?? primaryAssignment?.modelName ?? "unknown";
  const modelLabel = modelName.includes("deepseek")
    ? "v4-pro"
    : modelName.includes("gpt-5.3")
      ? "gpt-5.3"
      : modelName;

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

  // Color palette for role avatars
  const avatarColors = [
    { bg: "#263451", color: "#bdd0ff" },
    { bg: "#2d2746", color: "#d0bfff" },
    { bg: "#1d3a2e", color: "#b0e8c8" },
    { bg: "#3d2a1d", color: "#f5c8a0" },
    { bg: "#2a1d3d", color: "#d0a0f5" },
    { bg: "#1d2a3d", color: "#a0d0f5" },
    { bg: "#3d1d2a", color: "#f5a0c8" },
  ];

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
              {/* Display role avatars */}
              <div className="step-role-avatars">
                {displayRoles.length > 0 ? (
                  displayRoles.slice(0, 4).map((role, i) => (
                    <div
                      key={role.id}
                      className="step-role-avatar"
                      style={{
                        background: avatarColors[i % avatarColors.length].bg,
                        color: avatarColors[i % avatarColors.length].color,
                        zIndex: displayRoles.length - i,
                        marginLeft: i > 0 ? -8 : 0,
                      }}
                      title={role.name}
                    >
                      {role.name[0] ?? "?"}
                    </div>
                  ))
                ) : (
                  <div className="step-role-avatar empty" title="未绑定角色">
                    ?
                  </div>
                )}
                {displayRoles.length > 4 && (
                  <span className="step-role-more">+{displayRoles.length - 4}</span>
                )}
              </div>
              {provider && (
                <span className="badge badge-b">
                  {provider.name} {modelLabel}
                </span>
              )}
              <span className={`badge ${step.gateMode === "manual" ? "badge-o" : "badge-g"}`}>
                {step.gateMode === "manual" && <ShieldAlert size={10} />}
                {gateLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Assignments section - 显示每个 step 下的角色任务 */}
        {assignments.length > 0 && (
          <div className="step-assignments-preview">
            <div className="step-assignments-header">
              <Users size={12} />
              <span>{assignments.length} 个角色任务</span>
            </div>
            <div className="step-assignments-roles">
              {assignments.map((assignment: WorkflowAssignment, i: number) => {
                const role = getRoleInfo(assignment.roleId);
                return (
                  <div
                    key={assignment.id}
                    className="assignment-role-chip"
                    style={{
                      background: avatarColors[i % avatarColors.length].bg,
                      color: avatarColors[i % avatarColors.length].color,
                    }}
                    title={`${role?.name ?? "未绑定"} - ${assignment.taskGoal?.slice(0, 30) ?? ""}`}
                  >
                    {role?.name ?? "未绑定"}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
