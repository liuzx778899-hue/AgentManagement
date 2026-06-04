/**
 * Workflow Events & Notifications Routes
 *
 * Issue: #27 #28 #30
 *
 * Endpoints:
 *   POST   /api/workflow-events                        — emit event
 *   POST   /api/workflow-events/:id/process            — process event routes
 *   GET    /api/workflow-events/workflow/:workflowId    — get workflow events
 *   GET    /api/workflow-events/notifications/:roleId   — get role notifications
 *   POST   /api/workflow-events/notifications/:id/status — update notification status
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  emitEvent,
  getWorkflowEvents,
  getRoleNotifications,
  updateNotificationStatus,
  type EmitEventInput,
} from '../../services/local/useCases/workflowEventUseCase';

export const workflowEventsRouter = Router();

/**
 * POST /api/workflow-events
 * Emit a new workflow event
 */
workflowEventsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workflowId, workflowRunId, sourceAssignmentId, sourceStepId, sourceTaskId, trigger, payload } = req.body;

    if (!workflowId) {
      res.status(400).json({
        ok: false,
        error: { code: 'INVALID_INPUT', message: 'workflowId is required', recoverable: true },
      });
      return;
    }

    if (!sourceStepId) {
      res.status(400).json({
        ok: false,
        error: { code: 'INVALID_INPUT', message: 'sourceStepId is required', recoverable: true },
      });
      return;
    }

    if (!trigger) {
      res.status(400).json({
        ok: false,
        error: { code: 'INVALID_INPUT', message: 'trigger is required', recoverable: true },
      });
      return;
    }

    const input: EmitEventInput = {
      workflowId,
      workflowRunId,
      sourceAssignmentId,
      sourceStepId,
      sourceTaskId,
      trigger,
      payload: payload ?? {},
    };

    const result = await emitEvent(input);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/workflow-events/:id/process
 * Process routes for an existing event
 */
workflowEventsRouter.post('/:id/process', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { event } = req.body;
    if (!event) {
      res.status(400).json({
        ok: false,
        error: { code: 'INVALID_INPUT', message: 'event body is required', recoverable: true },
      });
      return;
    }

    const { processEventRoutes } = await import('../../services/local/useCases/workflowEventUseCase');
    const result = await processEventRoutes(event, []);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/workflow-events/workflow/:workflowId
 * Get all events for a workflow
 */
workflowEventsRouter.get('/workflow/:workflowId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workflowId = req.params.workflowId as string;
    const result = await getWorkflowEvents(workflowId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/workflow-events/notifications/:roleId
 * Get notifications for a role
 */
workflowEventsRouter.get('/notifications/:roleId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const roleId = req.params.roleId as string;
    const result = await getRoleNotifications(roleId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/workflow-events/notifications/:id/status
 * Update notification status
 */
workflowEventsRouter.patch('/notifications/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;

    if (!status) {
      res.status(400).json({
        ok: false,
        error: { code: 'INVALID_INPUT', message: 'status is required', recoverable: true },
      });
      return;
    }

    const validStatuses = ['unread', 'delivered', 'consumed', 'resolved'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({
        ok: false,
        error: { code: 'INVALID_INPUT', message: `status must be one of: ${validStatuses.join(', ')}`, recoverable: true },
      });
      return;
    }

    const result = await updateNotificationStatus(id, status);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
