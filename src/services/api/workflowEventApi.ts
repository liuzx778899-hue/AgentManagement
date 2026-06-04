/**
 * Workflow Event API client
 *
 * Issue: #27 #28 #30
 *
 * Endpoints:
 *   POST   /api/workflow-events                        — emit event
 *   POST   /api/workflow-events/:id/process            — process event routes
 *   GET    /api/workflow-events/workflow/:workflowId    — get workflow events
 *   GET    /api/workflow-events/notifications/:roleId   — get role notifications
 *   PATCH  /api/workflow-events/notifications/:id/status — update notification status
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
   * Emit a new workflow event
   */
  emitEvent: (input: EmitEventInput) =>
    apiCall<{ event: WorkflowEvent; results: unknown[]; notifications: string[] }>('POST', '/workflow-events', input),

  /**
   * Re-process routes for an existing event by id
   */
  processEventById: (eventId: string) =>
    apiCall<unknown>('POST', `/workflow-events/${encodeURIComponent(eventId)}/process`),

  /**
   * Get all events for a workflow
   */
  getWorkflowEvents: (workflowId: string) =>
    apiCall<WorkflowEvent[]>('GET', `/workflow-events/workflow/${encodeURIComponent(workflowId)}`),

  /**
   * Get notifications for a role
   */
  getNotificationsByRole: (roleId: string) =>
    apiCall<WorkflowNotification[]>('GET', `/workflow-events/notifications/${encodeURIComponent(roleId)}`),

  /**
   * Update notification status
   */
  updateNotificationStatus: (id: string, status: NotificationStatus) =>
    apiCall<WorkflowNotification>('POST', `/workflow-events/notifications/${encodeURIComponent(id)}/status`, { status }),
};
