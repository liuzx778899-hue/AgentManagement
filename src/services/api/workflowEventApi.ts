/**
 * Workflow Event API client
 *
 * Issue: #27 #28 #30
 */

import { apiCall, type ApiResponse } from './client';
import type { WorkflowEvent } from '../../domain/workflowEvent';
import type { WorkflowNotification, NotificationStatus } from '../../domain/notification';
import type { WorkflowEventTrigger } from '../../domain/workflowAssignment';

export interface EmitEventInput {
  workflowId: string;
  workflowRunId?: string;
  sourceAssignmentId?: string;
  sourceStepId: string;
  sourceTaskId?: string;
  trigger: WorkflowEventTrigger;
  payload?: Record<string, unknown>;
}

export const workflowEventApi = {
  /**
   * 获取工作流事件列表
   */
  getWorkflowEvents: (workflowId: string) =>
    apiCall<WorkflowEvent[]>('GET', `/workflow-events/${encodeURIComponent(workflowId)}`),

  /**
   * 获取角色通知列表
   */
  getNotificationsByRole: (roleId: string) =>
    apiCall<WorkflowNotification[]>('GET', `/workflow-events/notifications/${encodeURIComponent(roleId)}`),

  /**
   * 发射新事件
   */
  emitEvent: (input: EmitEventInput) =>
    apiCall<{ event: WorkflowEvent; results: unknown[]; notifications: string[] }>('POST', '/workflow-events/emit', input),

  /**
   * 更新通知状态
   */
  updateNotificationStatus: (id: string, status: NotificationStatus) =>
    apiCall<WorkflowNotification>('POST', `/workflow-events/notifications/${encodeURIComponent(id)}/status`, { status }),
};
