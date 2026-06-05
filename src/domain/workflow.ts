export type GateMode = "auto" | "manual";
export type FailureStrategy = "stop" | "skip" | "retry" | "fallback";

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

/**
 * WorkflowStep - 流程阶段
 * Issue #41: 移除 roleId，使用 assignments 数组
 *
 * WorkflowStep 表示流程中的一个阶段
 * WorkflowAssignment 表示阶段下的可执行角色责任单元
 */
export interface WorkflowStep {
  id: string;
  order: number;
  name: string;
  description?: string;
  /** 流程阶段下的角色任务分配 */
  assignments: WorkflowStepAssignment[];
  inputs: string[];
  outputs: string[];
  gateMode: GateMode;
  gateType?: 'manual' | 'auto';
  failureStrategy: FailureStrategy;
  stepMarkdown?: string;
  projectOverride: boolean;
}

/**
 * WorkflowStepAssignment - 流程阶段内的角色任务
 * 简化版本，用于 fixtures 迁移
 */
export interface WorkflowStepAssignment {
  id: string;
  order: number;
  roleId: string;
  runnerId?: string;
  modelProviderId: string;
  modelName: string;
  goal: string;
  acceptanceCriteria: string[];
  inputs: string[];
  outputs: string[];
  dependsOnAssignmentIds?: string[];
  notifyAssignmentIds?: string[];
  eventRoutes?: WorkflowEventRouteSimple[];
}

/**
 * 简化的事件路由
 */
export interface WorkflowEventRouteSimple {
  trigger: 'task_completed' | 'task_failed' | 'bug_reported' | 'handoff_requested';
  targetAssignmentId?: string;
  action: 'notify' | 'unblock_task' | 'create_task';
}

// ============ 向后兼容类型 ============

/**
 * @deprecated 使用 WorkflowStepAssignment 替代
 * 保留用于迁移期间的类型检查
 */
export interface LegacyWorkflowStep {
  id: string;
  order: number;
  name: string;
  roleId: string;
  modelProviderId: string;
  modelName: string;
  inputs: string[];
  outputs: string[];
  gateMode: GateMode;
  gateType?: 'manual' | 'auto';
  failureStrategy: FailureStrategy;
  stepMarkdown?: string;
  projectOverride: boolean;
  runnerId?: string;
}

/**
 * 辅助函数：从 step 获取主要角色 ID
 * Issue #41: 用于向后兼容
 */
export function getPrimaryRoleId(step: WorkflowStep): string | undefined {
  return step.assignments[0]?.roleId;
}

/**
 * 辅助函数：从 step 获取主要 Runner ID
 */
export function getPrimaryRunnerId(step: WorkflowStep): string | undefined {
  return step.assignments[0]?.runnerId;
}

/**
 * 辅助函数：从 step 获取主要模型配置
 */
export function getPrimaryModelConfig(step: WorkflowStep): { modelProviderId: string; modelName: string } | undefined {
  const assignment = step.assignments[0];
  if (!assignment) return undefined;
  return { modelProviderId: assignment.modelProviderId, modelName: assignment.modelName };
}