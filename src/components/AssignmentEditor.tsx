import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Edit2,
  Plus,
  Trash2,
  AlertCircle,
  Bell,
  GitBranch,
  X,
  Check,
} from "lucide-react";
import type {
  WorkbenchData,
  WorkflowAssignment,
  WorkflowEventRoute,
  WorkflowEventTrigger,
  WorkflowEventAction,
  WorkflowEventTargetType,
} from "../domain/workbench";
import type { WorkflowRole } from "../domain/workflow";

interface AssignmentEditorProps {
  assignments: WorkflowAssignment[];
  stepId: string;
  data: WorkbenchData;
  flowRoles: WorkflowRole[];
  allAssignments: WorkflowAssignment[]; // All assignments in the workflow for dependency selection
  readOnly?: boolean;
  onChange: (assignments: WorkflowAssignment[]) => void;
}

export function AssignmentEditor({
  assignments,
  stepId,
  data,
  flowRoles,
  allAssignments,
  readOnly = false,
  onChange,
}: AssignmentEditorProps) {
  const [expandedAssignmentId, setExpandedAssignmentId] = useState<string | null>(null);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);

  // Get role info
  const getRoleInfo = (roleId: string) => {
    const flowRole = flowRoles.find((r: { id: string }) => r.id === roleId);
    const globalRole = data.roles.find((r: { id: string }) => r.id === roleId);
    return flowRole || globalRole;
  };

  // Get runner info
  const getRunnerInfo = (runnerId: string) => {
    return data.runnerProfiles?.find((r: { id: string }) => r.id === runnerId);
  };

  // Get model provider info
  const getProviderInfo = (providerId: string) => {
    return data.modelProviders.find((p: { id: string }) => p.id === providerId);
  };

  // Create default assignment
  const createDefaultAssignment = (order: number): WorkflowAssignment => {
    const defaultProvider = data.modelProviders.find((p) => p.enabled) ?? data.modelProviders[0];
    const defaultRunner = data.runnerProfiles?.find((r) => r.enabled);
    const defaultRole = flowRoles[0] || data.roles[0];

    return {
      id: `${stepId}-assign-${Date.now()}`,
      order,
      roleId: defaultRole?.id ?? "",
      runnerId: defaultRunner?.id ?? "runner-claude-code",
      modelProviderId: defaultProvider?.id ?? "",
      modelName: defaultProvider?.defaultModel ?? defaultProvider?.models[0]?.name ?? "",
      taskGoal: "",
      acceptanceCriteria: [],
      inputs: [],
      outputs: [],
      dependsOnAssignmentIds: [],
      notifyAssignmentIds: [],
      eventRoutes: [],
      capabilityAuthorization: [],
    };
  };

  // Add assignment
  const handleAddAssignment = () => {
    const newOrder = assignments.length > 0 ? Math.max(...assignments.map((a) => a.order)) + 1 : 0;
    const newAssignment = createDefaultAssignment(newOrder);
    onChange([...assignments, newAssignment]);
    setExpandedAssignmentId(newAssignment.id);
  };

  // Update assignment
  const handleUpdateAssignment = (assignmentId: string, updates: Partial<WorkflowAssignment>) => {
    onChange(
      assignments.map((a) => (a.id === assignmentId ? { ...a, ...updates } : a))
    );
  };

  // Delete assignment
  const handleDeleteAssignment = (assignmentId: string) => {
    if (!confirm("确定删除此角色任务吗？")) return;
    onChange(assignments.filter((a) => a.id !== assignmentId));
    if (expandedAssignmentId === assignmentId) {
      setExpandedAssignmentId(null);
    }
  };

  // Duplicate assignment
  const handleDuplicateAssignment = (assignment: WorkflowAssignment) => {
    const newAssignment: WorkflowAssignment = {
      ...assignment,
      id: `${stepId}-assign-${Date.now()}`,
      order: Math.max(...assignments.map((a) => a.order)) + 1,
    };
    onChange([...assignments, newAssignment]);
  };

  // Add event route
  const handleAddEventRoute = (assignmentId: string) => {
    const newRoute: WorkflowEventRoute = {
      id: `route-${Date.now()}`,
      on: "task_completed",
      target: { type: "assignment" },
      action: "notify",
    };
    handleUpdateAssignment(assignmentId, {
      eventRoutes: [
        ...(assignments.find((a) => a.id === assignmentId)?.eventRoutes ?? []),
        newRoute,
      ],
    });
    setEditingRouteId(newRoute.id);
  };

  // Update event route
  const handleUpdateEventRoute = (
    assignmentId: string,
    routeId: string,
    updates: Partial<WorkflowEventRoute>
  ) => {
    const assignment = assignments.find((a) => a.id === assignmentId);
    if (!assignment) return;
    handleUpdateAssignment(assignmentId, {
      eventRoutes: assignment.eventRoutes.map((r) =>
        r.id === routeId ? { ...r, ...updates } : r
      ),
    });
  };

  // Delete event route
  const handleDeleteEventRoute = (assignmentId: string, routeId: string) => {
    const assignment = assignments.find((a) => a.id === assignmentId);
    if (!assignment) return;
    handleUpdateAssignment(assignmentId, {
      eventRoutes: assignment.eventRoutes.filter((r) => r.id !== routeId),
    });
  };

  const eventTriggerOptions: { value: WorkflowEventTrigger; label: string }[] = [
    { value: "task_completed", label: "任务完成" },
    { value: "task_failed", label: "任务失败" },
    { value: "bug_reported", label: "BUG 上报" },
    { value: "change_requested", label: "变更请求" },
    { value: "gate_requested", label: "Gate 请求" },
    { value: "task_blocked", label: "任务阻塞" },
  ];

  const eventActionOptions: { value: WorkflowEventAction; label: string }[] = [
    { value: "notify", label: "通知" },
    { value: "create_task", label: "创建任务" },
    { value: "unblock_task", label: "解除阻塞" },
    { value: "request_gate", label: "请求 Gate" },
    { value: "reassign_task", label: "重新分配" },
  ];

  const targetTypeOptions: { value: WorkflowEventTargetType; label: string }[] = [
    { value: "assignment", label: "角色任务" },
    { value: "role", label: "角色" },
    { value: "project_owner", label: "项目所有者" },
    { value: "manual_select", label: "手动选择" },
  ];

  return (
    <div className="assignment-editor">
      <div className="assignment-editor-header">
        <h4>角色任务分配 ({assignments.length})</h4>
        {!readOnly && (
          <button
            className="btn btn-sm btn-add"
            onClick={handleAddAssignment}
            type="button"
          >
            <Plus size={14} /> 添加角色任务
          </button>
        )}
      </div>

      {assignments.length === 0 ? (
        <div className="assignment-empty">
          <p>暂无角色任务，点击上方按钮添加</p>
        </div>
      ) : (
        <div className="assignment-list">
          {assignments
            .sort((a, b) => a.order - b.order)
            .map((assignment, index) => {
              const role = getRoleInfo(assignment.roleId);
              const runner = getRunnerInfo(assignment.runnerId);
              const provider = getProviderInfo(assignment.modelProviderId);
              const isExpanded = expandedAssignmentId === assignment.id;
              const dependsOnAssignments = allAssignments.filter((a) =>
                assignment.dependsOnAssignmentIds.includes(a.id)
              );
              const notifyAssignments = allAssignments.filter((a) =>
                assignment.notifyAssignmentIds.includes(a.id)
              );

              return (
                <div key={assignment.id} className="assignment-card">
                  <div
                    className="assignment-card-header"
                    onClick={() => setExpandedAssignmentId(isExpanded ? null : assignment.id)}
                  >
                    <div className="assignment-card-header-left">
                      <span className="assignment-order">{index + 1}</span>
                      <div
                        className="assignment-role-avatar"
                        style={{
                          background: index === 0 ? "#263451" : index === 1 ? "#2d2746" : "#1d3a2e",
                          color: index === 0 ? "#bdd0ff" : index === 1 ? "#d0bfff" : "#b0e8c8",
                        }}
                      >
                        {role?.name?.[0] ?? "?"}
                      </div>
                      <div className="assignment-card-title">
                        <span className="assignment-role-name">
                          {role?.name ?? "未绑定角色"}
                        </span>
                        <span className="assignment-model-info">
                          {provider?.name} / {assignment.modelName}
                        </span>
                      </div>
                    </div>
                    <div className="assignment-card-header-right">
                      {!readOnly && (
                        <>
                          <button
                            className="btn-icon-small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicateAssignment(assignment);
                            }}
                            title="复制"
                            type="button"
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            className="btn-icon-small danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAssignment(assignment.id);
                            }}
                            title="删除"
                            type="button"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                      <span className="assignment-expand-icon">
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="assignment-card-body">
                      {/* Basic config */}
                      <div className="assignment-config-grid">
                        <div className="form-field">
                          <label>执行角色</label>
                          <select
                            value={assignment.roleId}
                            onChange={(e) =>
                              handleUpdateAssignment(assignment.id, { roleId: e.target.value })
                            }
                            disabled={readOnly}
                          >
                            <option value="">选择角色</option>
                            {flowRoles.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                              </option>
                            ))}
                            {data.roles.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="form-field">
                          <label>CLI Runner</label>
                          <select
                            value={assignment.runnerId}
                            onChange={(e) =>
                              handleUpdateAssignment(assignment.id, { runnerId: e.target.value })
                            }
                            disabled={readOnly}
                          >
                            <option value="">默认 Runner</option>
                            {(data.runnerProfiles ?? [])
                              .filter((r) => r.enabled)
                              .map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.displayName}
                                </option>
                              ))}
                          </select>
                        </div>

                        <div className="form-field">
                          <label>模型供应商</label>
                          <select
                            value={assignment.modelProviderId}
                            onChange={(e) => {
                              const provider = data.modelProviders.find(
                                (p) => p.id === e.target.value
                              );
                              handleUpdateAssignment(assignment.id, {
                                modelProviderId: e.target.value,
                                modelName: provider?.defaultModel ?? provider?.models[0]?.name ?? "",
                              });
                            }}
                            disabled={readOnly}
                          >
                            <option value="">选择供应商</option>
                            {data.modelProviders
                              .filter((p) => p.enabled)
                              .map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                          </select>
                        </div>

                        <div className="form-field">
                          <label>模型名称</label>
                          <select
                            value={assignment.modelName}
                            onChange={(e) =>
                              handleUpdateAssignment(assignment.id, { modelName: e.target.value })
                            }
                            disabled={readOnly}
                          >
                            <option value="">选择模型</option>
                            {(
                              data.modelProviders.find(
                                (p) => p.id === assignment.modelProviderId
                              )?.models ?? []
                            ).map((m) => (
                              <option key={m.name} value={m.name}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Task goal */}
                      <div className="form-field">
                        <label>任务目标</label>
                        <textarea
                          value={assignment.taskGoal}
                          onChange={(e) =>
                            handleUpdateAssignment(assignment.id, { taskGoal: e.target.value })
                          }
                          placeholder="描述此角色任务的目标..."
                          rows={2}
                          disabled={readOnly}
                        />
                      </div>

                      {/* Acceptance criteria */}
                      <div className="form-field">
                        <label>验收标准</label>
                        <textarea
                          value={assignment.acceptanceCriteria.join("\n")}
                          onChange={(e) =>
                            handleUpdateAssignment(assignment.id, {
                              acceptanceCriteria: e.target.value.split("\n").filter(Boolean),
                            })
                          }
                          placeholder="每行一条验收标准..."
                          rows={3}
                          disabled={readOnly}
                        />
                      </div>

                      {/* Dependencies */}
                      <div className="assignment-section">
                        <div className="assignment-section-header">
                          <GitBranch size={14} />
                          <span>依赖任务</span>
                          <span className="assignment-section-count">
                            {assignment.dependsOnAssignmentIds.length}
                          </span>
                        </div>
                        <div className="assignment-dependencies">
                          {dependsOnAssignments.length === 0 ? (
                            <p className="empty-hint">无依赖，可立即开始</p>
                          ) : (
                            dependsOnAssignments.map((dep) => {
                              const depRole = getRoleInfo(dep.roleId);
                              return (
                                <span key={dep.id} className="dependency-tag">
                                  {depRole?.name ?? "未知"}
                                  {!readOnly && (
                                    <button
                                      className="tag-remove"
                                      onClick={() =>
                                        handleUpdateAssignment(assignment.id, {
                                          dependsOnAssignmentIds:
                                            assignment.dependsOnAssignmentIds.filter(
                                              (id) => id !== dep.id
                                            ),
                                        })
                                      }
                                      type="button"
                                    >
                                      <X size={10} />
                                    </button>
                                  )}
                                </span>
                              );
                            })
                          )}
                          {!readOnly && (
                            <select
                              className="dependency-add"
                              value=""
                              onChange={(e) => {
                                if (e.target.value && !assignment.dependsOnAssignmentIds.includes(e.target.value)) {
                                  handleUpdateAssignment(assignment.id, {
                                    dependsOnAssignmentIds: [
                                      ...assignment.dependsOnAssignmentIds,
                                      e.target.value,
                                    ],
                                  });
                                }
                              }}
                            >
                              <option value="">+ 添加依赖</option>
                              {allAssignments
                                .filter(
                                  (a) =>
                                    a.id !== assignment.id &&
                                    !assignment.dependsOnAssignmentIds.includes(a.id)
                                )
                                .map((a) => {
                                  const aRole = getRoleInfo(a.roleId);
                                  return (
                                    <option key={a.id} value={a.id}>
                                      {aRole?.name ?? "未知"} - {a.taskGoal?.slice(0, 20) ?? ""}
                                    </option>
                                  );
                                })}
                            </select>
                          )}
                        </div>
                      </div>

                      {/* Notify targets */}
                      <div className="assignment-section">
                        <div className="assignment-section-header">
                          <Bell size={14} />
                          <span>完成后通知</span>
                          <span className="assignment-section-count">
                            {assignment.notifyAssignmentIds.length}
                          </span>
                        </div>
                        <div className="assignment-dependencies">
                          {notifyAssignments.length === 0 ? (
                            <p className="empty-hint">无通知目标</p>
                          ) : (
                            notifyAssignments.map((notify) => {
                              const notifyRole = getRoleInfo(notify.roleId);
                              return (
                                <span key={notify.id} className="dependency-tag notify">
                                  {notifyRole?.name ?? "未知"}
                                  {!readOnly && (
                                    <button
                                      className="tag-remove"
                                      onClick={() =>
                                        handleUpdateAssignment(assignment.id, {
                                          notifyAssignmentIds:
                                            assignment.notifyAssignmentIds.filter(
                                              (id) => id !== notify.id
                                            ),
                                        })
                                      }
                                      type="button"
                                    >
                                      <X size={10} />
                                    </button>
                                  )}
                                </span>
                              );
                            })
                          )}
                          {!readOnly && (
                            <select
                              className="dependency-add"
                              value=""
                              onChange={(e) => {
                                if (e.target.value && !assignment.notifyAssignmentIds.includes(e.target.value)) {
                                  handleUpdateAssignment(assignment.id, {
                                    notifyAssignmentIds: [
                                      ...assignment.notifyAssignmentIds,
                                      e.target.value,
                                    ],
                                  });
                                }
                              }}
                            >
                              <option value="">+ 添加通知</option>
                              {allAssignments
                                .filter(
                                  (a) =>
                                    a.id !== assignment.id &&
                                    !assignment.notifyAssignmentIds.includes(a.id)
                                )
                                .map((a) => {
                                  const aRole = getRoleInfo(a.roleId);
                                  return (
                                    <option key={a.id} value={a.id}>
                                      {aRole?.name ?? "未知"} - {a.taskGoal?.slice(0, 20) ?? ""}
                                    </option>
                                  );
                                })}
                            </select>
                          )}
                        </div>
                      </div>

                      {/* Event routes */}
                      <div className="assignment-section">
                        <div className="assignment-section-header">
                          <AlertCircle size={14} />
                          <span>事件路由</span>
                          <span className="assignment-section-count">
                            {assignment.eventRoutes.length}
                          </span>
                          {!readOnly && (
                            <button
                              className="btn-link-small"
                              onClick={() => handleAddEventRoute(assignment.id)}
                              type="button"
                            >
                              <Plus size={12} /> 添加
                            </button>
                          )}
                        </div>
                        {assignment.eventRoutes.length > 0 && (
                          <div className="event-routes-list">
                            {assignment.eventRoutes.map((route: WorkflowEventRoute) => {
                              const isEditing = editingRouteId === route.id;
                              return (
                                <div key={route.id} className="event-route-item">
                                  <div className="event-route-summary">
                                    <span className="event-route-trigger">
                                      {eventTriggerOptions.find((o) => o.value === route.on)?.label ??
                                        route.on}
                                    </span>
                                    <span className="event-route-arrow">→</span>
                                    <span className="event-route-action">
                                      {eventActionOptions.find((o) => o.value === route.action)
                                        ?.label ?? route.action}
                                    </span>
                                    {!readOnly && (
                                      <button
                                        className="btn-icon-small danger"
                                        onClick={() =>
                                          handleDeleteEventRoute(assignment.id, route.id)
                                        }
                                        type="button"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    )}
                                  </div>
                                  {isEditing && (
                                    <div className="event-route-config">
                                      <div className="form-field-inline">
                                        <label>触发事件</label>
                                        <select
                                          value={route.on}
                                          onChange={(e) =>
                                            handleUpdateEventRoute(assignment.id, route.id, {
                                              on: e.target.value as WorkflowEventTrigger,
                                            })
                                          }
                                        >
                                          {eventTriggerOptions.map((o) => (
                                            <option key={o.value} value={o.value}>
                                              {o.label}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                      <div className="form-field-inline">
                                        <label>目标类型</label>
                                        <select
                                          value={route.target.type}
                                          onChange={(e) =>
                                            handleUpdateEventRoute(assignment.id, route.id, {
                                              target: {
                                                ...route.target,
                                                type: e.target.value as WorkflowEventTargetType,
                                              },
                                            })
                                          }
                                        >
                                          {targetTypeOptions.map((o) => (
                                            <option key={o.value} value={o.value}>
                                              {o.label}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                      {route.target.type === "assignment" && (
                                        <div className="form-field-inline">
                                          <label>目标任务</label>
                                          <select
                                            value={route.target.id ?? ""}
                                            onChange={(e) =>
                                              handleUpdateEventRoute(assignment.id, route.id, {
                                                target: { ...route.target, id: e.target.value },
                                              })
                                            }
                                          >
                                            <option value="">选择任务</option>
                                            {allAssignments
                                              .filter((a) => a.id !== assignment.id)
                                              .map((a) => {
                                                const aRole = getRoleInfo(a.roleId);
                                                return (
                                                  <option key={a.id} value={a.id}>
                                                    {aRole?.name ?? "未知"}
                                                  </option>
                                                );
                                              })}
                                          </select>
                                        </div>
                                      )}
                                      <div className="form-field-inline">
                                        <label>执行动作</label>
                                        <select
                                          value={route.action}
                                          onChange={(e) =>
                                            handleUpdateEventRoute(assignment.id, route.id, {
                                              action: e.target.value as WorkflowEventAction,
                                            })
                                          }
                                        >
                                          {eventActionOptions.map((o) => (
                                            <option key={o.value} value={o.value}>
                                              {o.label}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                      <button
                                        className="btn btn-sm"
                                        onClick={() => setEditingRouteId(null)}
                                        type="button"
                                      >
                                        <Check size={14} /> 完成
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
