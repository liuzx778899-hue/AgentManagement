import type { LocalResult } from '../../../types/localEngineering';
import type { WorkflowNotification, NotificationStatus } from '../../../domain/notification';
import {
  createNotification,
  markDelivered,
  markConsumed,
  markResolved,
} from '../../../domain/notification';

/**
 * WorkflowNotification Repository
 *
 * 内存存储，负责通知的持久化操作
 */
const notifications = new Map<string, WorkflowNotification>();

/**
 * 保存通知
 */
export async function save(input: {
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
}): Promise<LocalResult<WorkflowNotification>> {
  const notification = createNotification(input);
  notifications.set(notification.id, notification);

  return {
    ok: true,
    data: notification,
    diagnostics: [`通知已创建: ${notification.id}`],
  };
}

/**
 * 加载通知
 */
export async function load(notificationId: string): Promise<LocalResult<WorkflowNotification>> {
  const notification = notifications.get(notificationId);

  if (!notification) {
    return {
      ok: false,
      error: {
        code: 'TASK_NOT_FOUND',
        message: `通知不存在: ${notificationId}`,
        recoverable: false,
      },
    };
  }

  return {
    ok: true,
    data: notification,
  };
}

/**
 * 按角色列出通知
 */
export async function listByRole(roleId: string): Promise<LocalResult<WorkflowNotification[]>> {
  const result = Array.from(notifications.values()).filter(
    n => n.targetRoleIds.includes(roleId)
  );

  return {
    ok: true,
    data: result,
    diagnostics: [`角色 ${roleId} 有 ${result.length} 条通知`],
  };
}

/**
 * 按工作流列出通知
 */
export async function listByWorkflow(workflowId: string): Promise<LocalResult<WorkflowNotification[]>> {
  const result = Array.from(notifications.values()).filter(
    n => n.workflowId === workflowId
  );

  return {
    ok: true,
    data: result,
    diagnostics: [`工作流 ${workflowId} 有 ${result.length} 条通知`],
  };
}

/**
 * 更新通知状态
 */
export async function update(
  notificationId: string,
  status: NotificationStatus
): Promise<LocalResult<WorkflowNotification>> {
  const existing = notifications.get(notificationId);

  if (!existing) {
    return {
      ok: false,
      error: {
        code: 'TASK_NOT_FOUND',
        message: `通知不存在: ${notificationId}`,
        recoverable: false,
      },
    };
  }

  let updated: WorkflowNotification;
  switch (status) {
    case 'delivered':
      updated = markDelivered(existing);
      break;
    case 'consumed':
      updated = markConsumed(existing);
      break;
    case 'resolved':
      updated = markResolved(existing);
      break;
    default:
      updated = { ...existing, status, updatedAt: new Date().toISOString() };
  }

  notifications.set(notificationId, updated);

  return {
    ok: true,
    data: updated,
    diagnostics: [`通知状态已更新: ${notificationId} -> ${status}`],
  };
}
