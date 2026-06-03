/**
 * Notification Domain Model
 *
 * Represents user-facing notifications in the workbench.
 * Notifications are generated from workflow events, runner state changes,
 * and other system events that require user attention.
 */

/**
 * The type/severity of the notification.
 */
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

/**
 * The category/source of the notification.
 */
export type NotificationCategory =
  | 'gate'      // Gate decision required
  | 'runner'    // Runner process events
  | 'step'      // Workflow step events
  | 'task'      // Task state changes
  | 'system';   // General system notifications

/**
 * A single notification item.
 */
export interface Notification {
  /** Unique notification identifier. */
  id: string;
  /** Severity/type of the notification. */
  type: NotificationType;
  /** Category for grouping and filtering. */
  category: NotificationCategory;
  /** Short title for the notification. */
  title: string;
  /** Optional detailed body text. */
  body?: string;
  /** ISO 8601 timestamp of when the notification was created. */
  createdAt: string;
  /** Whether the notification has been read/dismissed. */
  read: boolean;
  /** Associated workflow run ID, if applicable. */
  relatedRunId?: string;
  /** Associated project ID, if applicable. */
  relatedProjectId?: string;
  /** Associated step ID, if applicable. */
  relatedStepId?: string;
  /** Associated task ID, if applicable. */
  relatedTaskId?: string;
}

/**
 * Input for creating a new notification.
 */
export interface CreateNotificationInput {
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  body?: string;
  relatedRunId?: string;
  relatedProjectId?: string;
  relatedStepId?: string;
  relatedTaskId?: string;
}
