/**
 * WorkflowNotification - 工作流通知
 * Issue: #30
 *
 * 通知生命周期：unread → delivered → consumed → resolved
 */

export type NotificationStatus = 'unread' | 'delivered' | 'consumed' | 'resolved';

export interface WorkflowNotification {
  id: string;
  workflowId: string;
  taskId: string;
  eventId?: string;
  title: string;
  body: string;
  targetRoleIds: string[];
  status: NotificationStatus;
  eventType: string;
  assignmentId?: string;
  stepId?: string;
  requireResponse: boolean;
  createdAt: string;
  updatedAt: string;
  deliveredAt?: string;
  consumedAt?: string;
  resolvedAt?: string;
}

export function createNotification(input: {
  workflowId: string;
  taskId: string;
  eventId?: string;
  title: string;
  body: string;
  targetRoleIds: string[];
  eventType: string;
  assignmentId?: string;
  stepId?: string;
  requireResponse?: boolean;
}): WorkflowNotification {
  const now = new Date().toISOString();
  return {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    workflowId: input.workflowId,
    taskId: input.taskId,
    eventId: input.eventId,
    title: input.title,
    body: input.body,
    targetRoleIds: input.targetRoleIds,
    status: 'unread',
    eventType: input.eventType,
    assignmentId: input.assignmentId,
    stepId: input.stepId,
    requireResponse: input.requireResponse ?? false,
    createdAt: now,
    updatedAt: now,
  };
}

export function markDelivered(n: WorkflowNotification): WorkflowNotification {
  const now = new Date().toISOString();
  return { ...n, status: 'delivered', deliveredAt: now, updatedAt: now };
}

export function markConsumed(n: WorkflowNotification): WorkflowNotification {
  const now = new Date().toISOString();
  return { ...n, status: 'consumed', consumedAt: now, updatedAt: now };
}

export function markResolved(n: WorkflowNotification): WorkflowNotification {
  const now = new Date().toISOString();
  return { ...n, status: 'resolved', resolvedAt: now, updatedAt: now };
}
