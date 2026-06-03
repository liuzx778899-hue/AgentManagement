/**
 * useNotifications Hook
 *
 * Provides notification state management and helper functions
 * for the Workbench notification system.
 */

import { useCallback, useMemo } from 'react';
import { useWorkbenchState } from '../state/WorkbenchProvider';
import type { Notification, NotificationType, NotificationCategory } from '../domain/notification';
import { addNotification, markNotificationRead, clearNotifications } from '../state/workbenchActions';

/**
 * Hook return type
 */
export interface UseNotificationsResult {
  /** All notifications */
  notifications: Notification[];
  /** Unread notifications count */
  unreadCount: number;
  /** Notifications grouped by category */
  byCategory: Record<NotificationCategory, Notification[]>;
  /** Notifications grouped by type/severity */
  byType: Record<NotificationType, Notification[]>;
  /** Mark a notification as read */
  markAsRead: (notificationId: string) => void;
  /** Clear all notifications */
  clearAll: () => void;
  /** Add a new notification */
  addNew: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  /** Get notifications for a specific project */
  getProjectNotifications: (projectId: string) => Notification[];
  /** Get notifications for a specific run */
  getRunNotifications: (runId: string) => Notification[];
}

/**
 * React hook for managing notifications in the Workbench.
 *
 * @returns Notification state and helper functions
 */
export function useNotifications(): UseNotificationsResult {
  const state = useWorkbenchState();
  const { dispatch } = state;

  const notifications = useMemo(() => {
    return state.data.notifications || [];
  }, [state.data.notifications]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  const byCategory = useMemo(() => {
    const groups: Record<NotificationCategory, Notification[]> = {
      gate: [],
      runner: [],
      step: [],
      task: [],
      system: [],
    };
    notifications.forEach(n => {
      groups[n.category].push(n);
    });
    return groups;
  }, [notifications]);

  const byType = useMemo(() => {
    const groups: Record<NotificationType, Notification[]> = {
      info: [],
      success: [],
      warning: [],
      error: [],
    };
    notifications.forEach(n => {
      groups[n.type].push(n);
    });
    return groups;
  }, [notifications]);

  const markAsRead = useCallback((notificationId: string) => {
    dispatch(markNotificationRead(notificationId));
  }, [dispatch]);

  const clearAll = useCallback(() => {
    dispatch(clearNotifications());
  }, [dispatch]);

  const addNew = useCallback((notification: Omit<Notification, 'id' | 'createdAt'>) => {
    const now = new Date().toISOString();
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    dispatch(addNotification({
      ...notification,
      id,
      createdAt: now,
    }));
  }, [dispatch]);

  const getProjectNotifications = useCallback((projectId: string) => {
    return notifications.filter(n => n.relatedProjectId === projectId);
  }, [notifications]);

  const getRunNotifications = useCallback((runId: string) => {
    return notifications.filter(n => n.relatedRunId === runId);
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    byCategory,
    byType,
    markAsRead,
    clearAll,
    addNew,
    getProjectNotifications,
    getRunNotifications,
  };
}