import type { WorkflowEventRoute } from "./workflowAssignment";

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
 *
 * WorkflowStep 表示流程中的一个阶段
 * WorkflowStepAssignment 表示阶段下的可执行角色责任单元
 */
export interface WorkflowStep {
  id: string;
  order: number;
  name: string;
  description?: string;
  /** 流程阶段下的角色任务分配 */
  assignments?: WorkflowStepAssignment[];
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
  eventRoutes?: WorkflowEventRoute[];
}

/**
 * 简化的事件路由
 */
export interface WorkflowEventRouteSimple {
  trigger: 'task_completed' | 'task_failed' | 'bug_reported' | 'handoff_requested';
  targetAssignmentId?: string;
  action: 'notify' | 'unblock_task' | 'create_task';
}