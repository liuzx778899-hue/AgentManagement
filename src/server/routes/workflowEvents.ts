/**
 * Workflow Events & Notifications Routes
 *
 * Issue: #27 #28 #30
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
 * GET /api/workflow-events/:workflowId
 * 获取工作流的所有事件
 */
workflowEventsRouter.get('/:workflowId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workflowId = req.params.workflowId as string;
    const result = await getWorkflowEvents(workflowId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/workflow-notifications/:roleId
 * 获取角色的所有通知
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
 * POST /api/workflow-events/emit
 * 发射新事件
 */
workflowEventsRouter.post('/emit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workflowId, workflowRunId, sourceAssignmentId, sourceStepId, sourceTaskId, trigger, payload } = req.body;

    // 验证必填字段
    if (!workflowId) {
      res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'workflowId is required',
          recoverable: true,
        },
      });
      return;
    }

    if (!sourceStepId) {
      res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'sourceStepId is required',
          recoverable: true,
        },
      });
      return;
    }

    if (!trigger) {
      res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'trigger is required',
          recoverable: true,
        },
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
 * POST /api/workflow-notifications/:id/status
 * 更新通知状态
 */
workflowEventsRouter.post('/notifications/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;

    if (!status) {
      res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'status is required',
          recoverable: true,
        },
      });
      return;
    }

    const validStatuses = ['unread', 'delivered', 'consumed', 'resolved'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_INPUT',
          message: `status must be one of: ${validStatuses.join(', ')}`,
          recoverable: true,
        },
      });
      return;
    }

    const result = await updateNotificationStatus(id, status);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
