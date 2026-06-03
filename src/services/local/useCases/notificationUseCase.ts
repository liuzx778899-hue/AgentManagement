import type { Notification, NotificationType, NotificationCategory, CreateNotificationInput } from '../../../domain/notification';
import type { LocalResult } from '../../../types/localEngineering';
import type { NotificationRepository } from '../repositories/notificationRepository';

/**
 * Generate a notification ID
 */
function generateNotificationId(): string {
  return `notif-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Create notification config
 */
export interface CreateNotificationConfig {
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  body?: string;
  relatedRunId?: string;
  relatedProjectId?: string;
  relatedStepId?: string;
  relatedTaskId?: string;
}

/**
 * Update notification config
 */
export interface UpdateNotificationConfig {
  id: string;
  read?: boolean;
}

/**
 * Notification filter options
 */
export interface NotificationFilterOptions {
  read?: boolean;
  category?: NotificationCategory;
  type?: NotificationType;
  relatedRunId?: string;
  relatedProjectId?: string;
}

/**
 * Create a notification
 */
export async function createNotification(
  notificationRepository: NotificationRepository,
  config: CreateNotificationConfig
): Promise<LocalResult<Notification>> {
  const now = new Date().toISOString();
  const notificationId = generateNotificationId();

  const notification: Notification = {
    id: notificationId,
    type: config.type,
    category: config.category,
    title: config.title,
    body: config.body,
    createdAt: now,
    read: false,
    relatedRunId: config.relatedRunId,
    relatedProjectId: config.relatedProjectId,
    relatedStepId: config.relatedStepId,
    relatedTaskId: config.relatedTaskId,
  };

  const result = await notificationRepository.save(notification);

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
    };
  }

  return {
    ok: true,
    data: notification,
    diagnostics: [`Notification created: ${config.title} (${notificationId})`],
  };
}

/**
 * Get a notification by ID
 */
export async function getNotification(
  notificationRepository: NotificationRepository,
  notificationId: string
): Promise<LocalResult<Notification>> {
  if (!notificationId) {
    return {
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'Notification ID is required',
        recoverable: false,
      },
    };
  }

  const result = await notificationRepository.load(notificationId);

  if (!result.ok) {
    return {
      ok: false,
      error: {
        code: 'NOTIFICATION_NOT_FOUND',
        message: `Notification not found: ${notificationId}`,
        cause: result.error?.message,
        recoverable: true,
      },
    };
  }

  return {
    ok: true,
    data: result.data,
  };
}

/**
 * Update a notification
 */
export async function updateNotification(
  notificationRepository: NotificationRepository,
  config: UpdateNotificationConfig
): Promise<LocalResult<Notification>> {
  const { id, ...updates } = config;

  if (!id) {
    return {
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'Notification ID is required',
        recoverable: false,
      },
    };
  }

  const result = await notificationRepository.update(id, updates);

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
    };
  }

  return {
    ok: true,
    data: result.data,
    diagnostics: [`Notification updated: ${id}`],
  };
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(
  notificationRepository: NotificationRepository,
  notificationId: string
): Promise<LocalResult<Notification>> {
  return updateNotification(notificationRepository, { id: notificationId, read: true });
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(
  notificationRepository: NotificationRepository
): Promise<LocalResult<void>> {
  const result = await notificationRepository.markAllAsRead();

  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    data: undefined,
    diagnostics: ['All notifications marked as read'],
  };
}

/**
 * Delete a notification
 */
export async function deleteNotification(
  notificationRepository: NotificationRepository,
  notificationId: string
): Promise<LocalResult<void>> {
  if (!notificationId) {
    return {
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'Notification ID is required',
        recoverable: false,
      },
    };
  }

  // Check if notification exists
  const existingResult = await notificationRepository.load(notificationId);

  if (!existingResult.ok) {
    return {
      ok: false,
      error: {
        code: 'NOTIFICATION_NOT_FOUND',
        message: `Notification not found: ${notificationId}`,
        cause: existingResult.error?.message,
        recoverable: true,
      },
    };
  }

  const result = await notificationRepository.delete(notificationId);

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
    };
  }

  return {
    ok: true,
    data: undefined,
    diagnostics: [`Notification deleted: ${notificationId}`],
  };
}

/**
 * List all notifications
 */
export async function listNotifications(
  notificationRepository: NotificationRepository
): Promise<LocalResult<Notification[]>> {
  const result = await notificationRepository.listAll();

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
    };
  }

  return {
    ok: true,
    data: result.data,
    diagnostics: [`Found ${result.data!.length} notifications`],
  };
}

/**
 * Filter notifications
 */
export async function filterNotifications(
  notificationRepository: NotificationRepository,
  options: NotificationFilterOptions
): Promise<LocalResult<Notification[]>> {
  const result = await notificationRepository.filter(options);

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
    };
  }

  return {
    ok: true,
    data: result.data,
    diagnostics: result.diagnostics,
  };
}

/**
 * Get unread notifications count
 */
export async function getUnreadCount(
  notificationRepository: NotificationRepository
): Promise<LocalResult<number>> {
  const result = await notificationRepository.getUnreadCount();

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
    };
  }

  return {
    ok: true,
    data: result.data,
    diagnostics: [`Unread count: ${result.data}`],
  };
}

/**
 * Clear all notifications
 */
export async function clearAllNotifications(
  notificationRepository: NotificationRepository
): Promise<LocalResult<void>> {
  const result = await notificationRepository.clearAll();

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
    };
  }

  return {
    ok: true,
    data: undefined,
    diagnostics: ['All notifications cleared'],
  };
}
