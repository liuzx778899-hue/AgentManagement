import type { FileStoreAdapter } from '../adapters/fileStoreAdapter';
import type { LocalResult } from '../../../types/localEngineering';
import type { Notification, NotificationType, NotificationCategory, CreateNotificationInput } from '../../../domain/notification';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Persisted notification structure
 */
interface PersistedNotification extends Notification {
  version: string;
  persistedAt: string;
}

/**
 * Notification Repository
 *
 * Handles notification data persistence
 */
export class NotificationRepository {
  private fileStore: FileStoreAdapter;
  private basePath: string;

  constructor(fileStore: FileStoreAdapter, basePath: string = '.agentmanagement') {
    this.fileStore = fileStore;
    this.basePath = basePath;
  }

  /**
   * Get notification file path
   */
  private getNotificationPath(notificationId: string): string {
    return `${this.basePath}/notifications/${notificationId}.json`;
  }

  /**
   * Generate a unique notification ID
   */
  private generateId(): string {
    return `notif-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * Save a notification
   */
  async save(notification: Notification): Promise<LocalResult<PersistedNotification>> {
    const persisted: PersistedNotification = {
      ...notification,
      version: '1.0',
      persistedAt: new Date().toISOString(),
    };

    const result = await this.fileStore.writeJson(
      this.getNotificationPath(notification.id),
      persisted
    );

    if (!result.ok) {
      return {
        ok: false,
        error: result.error,
      };
    }

    return {
      ok: true,
      data: persisted,
      diagnostics: [`Notification saved: ${notification.id}`],
    };
  }

  /**
   * Create a new notification
   */
  async create(input: CreateNotificationInput): Promise<LocalResult<PersistedNotification>> {
    const now = new Date().toISOString();
    const notificationId = this.generateId();

    const notification: Notification = {
      id: notificationId,
      type: input.type,
      category: input.category,
      title: input.title,
      body: input.body,
      createdAt: now,
      read: false,
      relatedRunId: input.relatedRunId,
      relatedProjectId: input.relatedProjectId,
      relatedStepId: input.relatedStepId,
      relatedTaskId: input.relatedTaskId,
    };

    return this.save(notification);
  }

  /**
   * Load a notification by ID
   */
  async load(notificationId: string): Promise<LocalResult<PersistedNotification>> {
    const result = await this.fileStore.readJson<PersistedNotification>(
      this.getNotificationPath(notificationId)
    );

    if (!result.ok) {
      return {
        ok: false,
        error: result.error,
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
  async update(notificationId: string, updates: Partial<Notification>): Promise<LocalResult<PersistedNotification>> {
    const existingResult = await this.load(notificationId);

    if (!existingResult.ok) {
      return {
        ok: false,
        error: existingResult.error,
      };
    }

    const updated: PersistedNotification = {
      ...existingResult.data!,
      ...updates,
      persistedAt: new Date().toISOString(),
    };

    return this.save(updated as Notification);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<LocalResult<PersistedNotification>> {
    return this.update(notificationId, { read: true });
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<LocalResult<void>> {
    const allResult = await this.listAll();

    if (!allResult.ok) {
      return {
        ok: false,
        error: allResult.error,
      };
    }

    for (const notification of allResult.data!) {
      if (!notification.read) {
        await this.markAsRead(notification.id);
      }
    }

    return {
      ok: true,
      data: undefined,
      diagnostics: [`Marked ${allResult.data!.filter(n => !n.read).length} notifications as read`],
    };
  }

  /**
   * Delete a notification
   */
  async delete(notificationId: string): Promise<LocalResult<void>> {
    const result = await this.fileStore.writeJson(
      this.getNotificationPath(notificationId),
      { deleted: true, deletedAt: new Date().toISOString() }
    );

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
   * Clear all notifications
   */
  async clearAll(): Promise<LocalResult<void>> {
    const result = await this.fileStore.writeJson(
      `${this.basePath}/notifications/index.json`,
      []
    );

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

  /**
   * List all notifications
   */
  async listAll(): Promise<LocalResult<PersistedNotification[]>> {
    const notifications: PersistedNotification[] = [];

    try {
      const notificationsDir = join(process.cwd(), this.basePath, 'notifications');
      const files = await readdir(notificationsDir);

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        try {
          const content = await readFile(join(notificationsDir, file), 'utf-8');
          const notification = JSON.parse(content) as PersistedNotification;

          // Skip deleted notifications
          if ('deleted' in notification && (notification as any).deleted) continue;

          notifications.push(notification);
        } catch {
          // Skip files that can't be read or parsed
          continue;
        }
      }

      // Sort by createdAt descending (newest first)
      notifications.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });

      return {
        ok: true,
        data: notifications,
      };
    } catch {
      // Directory doesn't exist or can't be read
      return {
        ok: true,
        data: [],
      };
    }
  }

  /**
   * Get unread notifications count
   */
  async getUnreadCount(): Promise<LocalResult<number>> {
    const allResult = await this.listAll();

    if (!allResult.ok) {
      return {
        ok: false,
        error: allResult.error,
      };
    }

    const unreadCount = allResult.data!.filter(n => !n.read).length;

    return {
      ok: true,
      data: unreadCount,
      diagnostics: [`Unread notifications: ${unreadCount}`],
    };
  }

  /**
   * Filter notifications by criteria
   */
  async filter(criteria: {
    read?: boolean;
    category?: NotificationCategory;
    type?: NotificationType;
    relatedRunId?: string;
    relatedProjectId?: string;
  }): Promise<LocalResult<PersistedNotification[]>> {
    const allResult = await this.listAll();

    if (!allResult.ok) {
      return allResult;
    }

    let filtered = allResult.data!;

    if (criteria.read !== undefined) {
      filtered = filtered.filter(n => n.read === criteria.read);
    }

    if (criteria.category) {
      filtered = filtered.filter(n => n.category === criteria.category);
    }

    if (criteria.type) {
      filtered = filtered.filter(n => n.type === criteria.type);
    }

    if (criteria.relatedRunId) {
      filtered = filtered.filter(n => n.relatedRunId === criteria.relatedRunId);
    }

    if (criteria.relatedProjectId) {
      filtered = filtered.filter(n => n.relatedProjectId === criteria.relatedProjectId);
    }

    return {
      ok: true,
      data: filtered,
      diagnostics: [`Found ${filtered.length} matching notifications`],
    };
  }
}
