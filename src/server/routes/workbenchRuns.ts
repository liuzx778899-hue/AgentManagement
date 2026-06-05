/**
 * Workbench Runs Router - Issue #28
 *
 * 工作台运行会话 API 路由
 */

import { Router, Request, Response, NextFunction } from 'express';
import { getServices } from '../services/serviceFactory';
import { startTask, getSession, stopTask, syncProcessState } from '../../services/local/useCases/workbenchRunUseCase';
import type { StopTaskResult } from '../../domain/workbenchRun';

export const workbenchRunsRouter = Router();

/**
 * POST /api/workbench-runs/start
 * 启动任务
 */
workbenchRunsRouter.post('/start', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { taskId } = req.body;

    if (!taskId) {
      res.status(400).json({
        ok: false,
        error: { code: 'INVALID_INPUT', message: 'taskId is required' }
      });
      return;
    }

    const services = getServices();
    const session = await startTask({
      projectRepo: services.repositories.project,
      taskRepo: services.repositories.task,
      workflowRepo: services.repositories.workflow,
      agentRunRepo: services.repositories.agentRun,
      processRunner: services.processRunner,
    }, taskId);

    res.json({ ok: true, data: session });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/workbench-runs/stop
 * 停止任务
 */
workbenchRunsRouter.post('/stop', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { taskId, result } = req.body as { taskId: string; result?: StopTaskResult };

    if (!taskId) {
      res.status(400).json({
        ok: false,
        error: { code: 'INVALID_INPUT', message: 'taskId is required' }
      });
      return;
    }

    const services = getServices();
    await stopTask({
      projectRepo: services.repositories.project,
      taskRepo: services.repositories.task,
      workflowRepo: services.repositories.workflow,
      agentRunRepo: services.repositories.agentRun,
      processRunner: services.processRunner,
    }, taskId, result);

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/workbench-runs/session/:taskId
 * 获取运行会话
 */
workbenchRunsRouter.get('/session/:taskId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = Array.isArray(req.params.taskId) ? req.params.taskId[0] : req.params.taskId;

    const services = getServices();
    const session = await getSession({
      projectRepo: services.repositories.project,
      taskRepo: services.repositories.task,
      workflowRepo: services.repositories.workflow,
      agentRunRepo: services.repositories.agentRun,
      processRunner: services.processRunner,
    }, taskId);

    if (!session) {
      res.status(404).json({
        ok: false,
        error: { code: 'NOT_FOUND', message: 'Session not found' }
      });
      return;
    }

    res.json({ ok: true, data: session });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/workbench-runs/logs/:taskId
 * 获取任务日志
 */
workbenchRunsRouter.get('/logs/:taskId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = Array.isArray(req.params.taskId) ? req.params.taskId[0] : req.params.taskId;
    const since = req.query.since;

    const services = getServices();

    // 先同步进程状态
    await syncProcessState({
      projectRepo: services.repositories.project,
      taskRepo: services.repositories.task,
      workflowRepo: services.repositories.workflow,
      agentRunRepo: services.repositories.agentRun,
      processRunner: services.processRunner,
    }, taskId);

    const session = await getSession({
      projectRepo: services.repositories.project,
      taskRepo: services.repositories.task,
      workflowRepo: services.repositories.workflow,
      agentRunRepo: services.repositories.agentRun,
      processRunner: services.processRunner,
    }, taskId);

    if (!session) {
      res.status(404).json({
        ok: false,
        error: { code: 'NOT_FOUND', message: 'Session not found' }
      });
      return;
    }

    let logs = session.logs;
    if (since && typeof since === 'string') {
      const sinceTime = new Date(since);
      logs = logs.filter((l: { timestamp: string }) => new Date(l.timestamp) > sinceTime);
    }

    res.json({ ok: true, data: { logs } });
  } catch (error) {
    next(error);
  }
});
