/**
 * WorkflowEvent - 工作流事件模型
 * Issue: #27 #30
 */

import type { WorkflowEventTrigger, WorkflowEventRouteAction } from './workflowAssignment';

export interface WorkflowEvent {
  id: string;
  workflowId: string;
  workflowRunId?: string;
  sourceAssignmentId?: string;
  sourceStepId: string;
  sourceTaskId?: string;
  trigger: WorkflowEventTrigger;
  payload: Record<string, unknown>;
  routes: WorkflowEventRouteResult[];
  timestamp: string;
}

export interface WorkflowEventRouteResult {
  routeId?: string;
  action: WorkflowEventRouteAction;
  targetAssignmentId?: string;
  targetRoleId?: string;
  targetTaskId?: string;
  status: 'pending' | 'completed' | 'failed';
  message?: string;
}
