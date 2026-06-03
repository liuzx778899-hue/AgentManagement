import { Router, Request, Response, NextFunction } from 'express';
import { getServices } from '../services/serviceFactory';
import {
  createNotification,
  getNotification,
  updateNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  listNotifications,
  filterNotifications,
  getUnreadCount,
  clearAllNotifications,
} from '../../services/local/useCases/notificationUseCase';
import type { NotificationType, NotificationCategory } from '../../domain/notification';

export const notificationsRouter = Router();

/**
 * GET /api/notifications
 * List all notifications, optionally filtered
 */
notificationsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { read, category, type, relatedRunId, relatedProjectId } = req.query;
    const services = getServices();

    // If any filter is provided, use filterNotifications
    if (read !== undefined || category || type || relatedRunId || relatedProjectId) {
      const result = await filterNotifications(services.repositories.notification, {
        read: read !== undefined ? read === 'true' : undefined,
        category: category as NotificationCategory | undefined,
        type: type as NotificationType | undefined,
        relatedRunId: relatedRunId as string | undefined,
        relatedProjectId: relatedProjectId as string | undefined,
      });

      if (!result.ok) {
        res.status(400).json({
          ok: false,
          error: result.error,
        });
        return;
      }

      res.json({
        ok: true,
        data: result.data,
      });
      return;
    }

    const result = await listNotifications(services.repositories.notification);

    res.json({
      ok: true,
      data: result.data,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/notifications/unread-count
 * Get unread notifications count
 */
notificationsRouter.get('/unread-count', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const services = getServices();
    const result = await getUnreadCount(services.repositories.notification);

    if (!result.ok) {
      res.status(400).json({
        ok: false,
        error: result.error,
      });
      return;
    }

    res.json({
      ok: true,
      data: { count: result.data },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/notifications/:id
 * Get a notification by ID
 */
notificationsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const services = getServices();
    const result = await getNotification(services.repositories.notification, id);

    if (!result.ok) {
      res.status(404).json({
        ok: false,
        error: result.error,
      });
      return;
    }

    res.json({
      ok: true,
      data: result.data,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/notifications
 * Create a new notification
 */
notificationsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, category, title, body, relatedRunId, relatedProjectId, relatedStepId, relatedTaskId } = req.body;

    // Validate required fields
    if (!type) {
      res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'type is required',
          recoverable: true,
        },
      });
      return;
    }

    if (!category) {
      res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'category is required',
          recoverable: true,
        },
      });
      return;
    }

    if (!title) {
      res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'title is required',
          recoverable: true,
        },
      });
      return;
    }

    const services = getServices();
    const result = await createNotification(services.repositories.notification, {
      type: type as NotificationType,
      category: category as NotificationCategory,
      title,
      body,
      relatedRunId,
      relatedProjectId,
      relatedStepId,
      relatedTaskId,
    });

    if (!result.ok) {
      res.status(400).json({
        ok: false,
        error: result.error,
      });
      return;
    }

    res.status(201).json({
      ok: true,
      data: result.data,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/notifications/:id
 * Update a notification
 */
notificationsRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id;
    const { read } = req.body;

    const services = getServices();
    const result = await updateNotification(services.repositories.notification, {
      id,
      read,
    });

    if (!result.ok) {
      res.status(404).json({
        ok: false,
        error: result.error,
      });
      return;
    }

    res.json({
      ok: true,
      data: result.data,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/notifications/:id/read
 * Mark a notification as read
 */
notificationsRouter.post('/:id/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const services = getServices();
    const result = await markNotificationAsRead(services.repositories.notification, id);

    if (!result.ok) {
      res.status(404).json({
        ok: false,
        error: result.error,
      });
      return;
    }

    res.json({
      ok: true,
      data: result.data,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/notifications/mark-all-read
 * Mark all notifications as read
 */
notificationsRouter.post('/mark-all-read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const services = getServices();
    const result = await markAllNotificationsAsRead(services.repositories.notification);

    if (!result.ok) {
      res.status(400).json({
        ok: false,
        error: result.error,
      });
      return;
    }

    res.json({
      ok: true,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
notificationsRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const services = getServices();
    const result = await deleteNotification(services.repositories.notification, id);

    if (!result.ok) {
      res.status(404).json({
        ok: false,
        error: result.error,
      });
      return;
    }

    res.json({
      ok: true,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/notifications
 * Clear all notifications
 */
notificationsRouter.delete('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const services = getServices();
    const result = await clearAllNotifications(services.repositories.notification);

    if (!result.ok) {
      res.status(400).json({
        ok: false,
        error: result.error,
      });
      return;
    }

    res.json({
      ok: true,
    });
  } catch (err) {
    next(err);
  }
});
