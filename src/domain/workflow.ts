export type GateMode = "auto" | "manual";
export type FailureStrategy = "stop" | "skip" | "retry" | "fallback";

// ---------------------------------------------------------------------------
// WorkflowEventRoute - 事件路由配置
// ---------------------------------------------------------------------------

/**
 * 触发路由的事件类型
 */
export type WorkflowEventTrigger =
  | 'task_completed'
  | 'task_failed'
  | 'bug_reported'
  | 'change_requested'
  | 'gate_requested'
  | 'task_blocked';

/**
 * 路由目标类型
 */
export type WorkflowEventTargetType =
  | 'assignment'
  | 'role'
  | 'project_owner'
  | 'manual_select';

/**
 * 路由动作类型
 */
export type WorkflowEventAction =
  | 'notify'
  | 'create_task'
  | 'unblock_task'
  | 'request_gate'
  | 'reassign_task';

/**
 * BUG 分类
 */
export type BugCategory =
  | 'frontend'
  | 'backend'
  | 'requirement'
  | 'test'
  | 'integration'
  | 'unknown';

/**
 * 严重级别
 */
export type Severity = 'low' | 'medium' | 'high' | 'critical';

/**
 * 事件路由规则
 *
 * 定义当某个事件发生时，应该通知谁、执行什么动作。
 * 平台不能猜下一步通知谁，路由规则必须来自流程设计。
 */
export interface WorkflowEventRoute {
  /** 路由规则唯一标识 */
  id: string;
  /** 触发此路由的事件类型 */
  on: WorkflowEventTrigger;
  /** 路由目标 */
  target: {
    type: WorkflowEventTargetType;
    id?: string; // assignment id 或 role id
  };
  /** 可选条件过滤 */
  condition?: {
    severity?: Severity;
    bugCategory?: BugCategory;
  };
  /** 执行的动作 */
  action: WorkflowEventAction;
}

// ---------------------------------------------------------------------------
// WorkflowAssignment - 角色任务分配
// ---------------------------------------------------------------------------

/**
 * 工作流步骤下的角色任务分配
 *
 * 一个 WorkflowStep（阶段）可以包含多个 WorkflowAssignment（角色任务）。
 * 每个角色任务定义了具体的职责、Runner 配置、依赖关系和事件路由。
 */
export interface WorkflowAssignment {
  /** 分配唯一标识 */
  id: string;
  /** 同一步骤内的排序 */
  order: number;
  /** 执行此任务的角色 */
  roleId: string;
  /** 使用的 Runner 配置 */
  runnerId: string;
  /** 模型供应商 */
  modelProviderId: string;
  /** 模型名称 */
  modelName: string;
  /** 任务目标描述 */
  taskGoal: string;
  /** 验收标准 */
  acceptanceCriteria: string[];
  /** 输入制品 */
  inputs: string[];
  /** 输出制品 */
  outputs: string[];
  /** 依赖的其他 assignment ID */
  dependsOnAssignmentIds: string[];
  /** 完成后通知的 assignment ID */
  notifyAssignmentIds: string[];
  /** 事件路由规则 */
  eventRoutes: WorkflowEventRoute[];
  /** 授权的能力 */
  capabilityAuthorization: string[];
  /** Markdown 格式的任务说明 */
  assignmentMarkdown?: string;
}

// ---------------------------------------------------------------------------
// WorkflowVersion, Workflow, WorkflowTemplate, WorkflowRole
// ---------------------------------------------------------------------------

export interface WorkflowVersion {
  label: "draft" | "applied" | "changed";
  version: number;
  updatedAt: string;
  changedSteps?: string[];
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  version: string;
  status: 'active' | 'archived' | 'draft';
  steps: WorkflowStep[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  version: number;
  status?: "enabled" | "disabled" | "draft";
  category?: WorkflowCategory;
  steps: WorkflowStep[];
  workflowMarkdown?: string;
  versions?: WorkflowVersion[];
  createdAt: string;
  updatedAt: string;
  // 流程专属角色（AI 生成的角色定义）
  roles?: WorkflowRole[];
}

// 流程分类
export type WorkflowCategory = "dev" | "design" | "review" | "release";

export interface WorkflowRole {
  id: string;
  name: string;
  description: string;
  responsibilities?: string[];
  deliverables?: string[];
  roleMarkdown?: string;
}

// ---------------------------------------------------------------------------
// WorkflowStep - 流程节点（阶段）
// ---------------------------------------------------------------------------

/**
 * 工作流步骤/阶段
 *
 * 表示流程中的一个阶段，包含一个或多个角色任务（assignments）。
 * WorkflowStep 是上层概念，WorkflowAssignment 是下层执行单元。
 *
 * 重要变更（Issue #27）：
 * - 移除：roleId, runnerId, modelProviderId, modelName（移到 assignment）
 * - 新增：assignments 数组，支持多角色并行/串行任务
 */
export interface WorkflowStep {
  /** 步骤唯一标识 */
  id: string;
  /** 流程内排序 */
  order: number;
  /** 步骤名称 */
  name: string;
  /** 步骤描述 */
  description?: string;
  /** 角色任务分配列表（新格式，可选以支持向后兼容） */
  assignments?: WorkflowAssignment[];
  /** 输入制品 */
  inputs: string[];
  /** 输出制品 */
  outputs: string[];
  /** Gate 模式 */
  gateMode: GateMode;
  /** Gate 类型（向后兼容） */
  gateType?: 'manual' | 'auto';
  /** 失败策略 */
  failureStrategy: FailureStrategy;
  /** Markdown 格式的步骤说明 */
  stepMarkdown?: string;
  /** 是否允许项目覆盖 */
  projectOverride: boolean;

  // --- 向后兼容字段（迁移完成后删除） ---
  /** @deprecated 使用 assignments[0].roleId 替代 */
  roleId?: string;
  /** @deprecated 使用 assignments[0].modelProviderId 替代 */
  modelProviderId?: string;
  /** @deprecated 使用 assignments[0].modelName 替代 */
  modelName?: string;
  /** @deprecated 使用 assignments[0].runnerId 替代 */
  runnerId?: string;
}

/**
 * 检查 WorkflowStep 是否使用旧格式（单一 roleId）
 */
export function isLegacyWorkflowStep(step: WorkflowStep): boolean {
  return step.roleId !== undefined && step.assignments === undefined;
}

/**
 * 将旧格式 WorkflowStep 转换为新格式
 */
export function migrateWorkflowStep(step: WorkflowStep): WorkflowStep {
  if (!isLegacyWorkflowStep(step)) {
    return step;
  }

  return {
    id: step.id,
    order: step.order,
    name: step.name,
    description: step.description,
    assignments: [{
      id: `${step.id}-assign-0`,
      order: 0,
      roleId: step.roleId!,
      runnerId: step.runnerId || 'runner-claude-code',
      modelProviderId: step.modelProviderId!,
      modelName: step.modelName!,
      taskGoal: `执行 ${step.name} 任务`,
      acceptanceCriteria: [],
      inputs: step.inputs,
      outputs: step.outputs,
      dependsOnAssignmentIds: [],
      notifyAssignmentIds: [],
      eventRoutes: [],
      capabilityAuthorization: [],
    }],
    inputs: step.inputs,
    outputs: step.outputs,
    gateMode: step.gateMode,
    gateType: step.gateType,
    failureStrategy: step.failureStrategy,
    stepMarkdown: step.stepMarkdown,
    projectOverride: step.projectOverride,
  };
}

/**
 * 获取 WorkflowStep 的第一个 assignment
 * 用于向后兼容场景，假设旧数据只有一个角色
 */
export function getPrimaryAssignment(step: WorkflowStep): WorkflowAssignment | undefined {
  if (step.assignments && step.assignments.length > 0) {
    return step.assignments[0];
  }
  // 向后兼容：从旧字段构建临时 assignment
  if (step.roleId) {
    return {
      id: `${step.id}-legacy-assign`,
      order: 0,
      roleId: step.roleId,
      runnerId: step.runnerId || 'runner-claude-code',
      modelProviderId: step.modelProviderId!,
      modelName: step.modelName!,
      taskGoal: `执行 ${step.name} 任务`,
      acceptanceCriteria: [],
      inputs: step.inputs,
      outputs: step.outputs,
      dependsOnAssignmentIds: [],
      notifyAssignmentIds: [],
      eventRoutes: [],
      capabilityAuthorization: [],
    };
  }
  return undefined;
}