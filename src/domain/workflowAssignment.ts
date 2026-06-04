/**
 * WorkflowAssignment - 流程阶段下的可执行角色责任单元
 *
 * Issue: #27
 *
 * 当一个 step 需要多个角色并行时，使用 WorkflowAssignment 细分。
 * 单角色场景继续使用 WorkflowStep.roleId。
 */

export interface WorkflowAssignment {
  id: string;
  /** 所属 workflow template */
  workflowTemplateId: string;
  /** 所属 step */
  workflowStepId: string;
  /** 角色引用 */
  roleId: string;
  /** Runner 配置 */
  runnerId: string;
  modelProviderId: string;
  modelName: string;
  /** 任务描述 */
  goal: string;
  acceptanceCriteria: string[];
  /** 依赖的其他 assignment（本 step 内或跨 step） */
  dependsOnAssignmentIds: string[];
  /** 完成后需要通知的 assignment */
  notifyAssignmentIds: string[];
  /** 事件路由规则 */
  eventRoutes: WorkflowEventRoute[];
}

export interface WorkflowEventRoute {
  trigger: WorkflowEventTrigger;
  action: WorkflowEventRouteAction;
  targetAssignmentId?: string;
  targetRoleId?: string;
}

export type WorkflowEventTrigger =
  | 'task_completed'
  | 'task_failed'
  | 'bug_reported'
  | 'change_requested'
  | 'gate_requested'
  | 'gate_passed'
  | 'gate_failed'
  | 'task_blocked'
  | 'handoff_requested';

export type WorkflowEventRouteAction =
  | 'create_task'
  | 'unblock_task'
  | 'notify'
  | 'request_gate'
  | 'reassign_task'
  | 'fail_task';
