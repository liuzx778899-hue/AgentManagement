/**
 * Agent Service REST API Routes
 *
 * Issue: #33
 *
 * API 路径：/v1/tasks, /v1/sessions, /v1/agents
 */

import { Router, Request, Response } from 'express';
import {
  createTask,
  getTask,
  listTasks,
  startTask,
  cancelTask,
  getAgentRun,
  listAgentRuns,
  getStatistics,
  getTaskLogs,
  getTaskResult,
  stopRun,
} from '../../services/agent-service/task-service';
import { getTaskEvents, getAllEvents } from '../../services/agent-service/event-log';
import { getResourceAudit, getAllAudit } from '../../services/agent-service/audit-log';
import type { Task } from '../../domain/task';

type TaskStatus = Task['status'];

export function createAgentServiceRouter(): Router {
  const router = Router();

  // ===== Tasks API =====

  /**
   * POST /v1/tasks - 创建任务
   */
  router.post('/tasks', (req: Request, res: Response) => {
    try {
      const task = createTask({
        projectId: req.body.projectId,
        goal: req.body.goal,
        acceptanceCriteria: req.body.acceptanceCriteria,
        workflowTemplateId: req.body.workflowTemplateId,
      });
      res.status(201).json({ ok: true, data: task });
    } catch (error) {
      res.status(400).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /v1/tasks - 列出任务
   */
  router.get('/tasks', (req: Request, res: Response) => {
    const projectId = req.query.projectId as string | undefined;
    const statusParam = req.query.status as string | undefined;
    const status = statusParam as TaskStatus | undefined;
    const tasks = listTasks(projectId, status);
    res.json({ ok: true, data: tasks, total: tasks.length });
  });

  /**
   * GET /v1/tasks/:taskId - 获取任务详情
   */
  router.get('/tasks/:taskId', (req: Request, res: Response) => {
    const task = getTask(req.params.taskId as string);
    if (!task) {
      return res.status(404).json({ ok: false, error: 'Task not found' });
    }
    res.json({ ok: true, data: task });
  });

  /**
   * POST /v1/tasks/:taskId/start - 启动任务
   */
  router.post('/tasks/:taskId/start', (req: Request, res: Response) => {
    try {
      const result = startTask(req.params.taskId as string);
      if (!result) {
        return res.status(404).json({ ok: false, error: 'Task not found' });
      }
      res.json({ ok: true, data: result.task, message: 'Task started' });
    } catch (error) {
      res.status(400).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /v1/tasks/:taskId/cancel - 取消任务
   */
  router.post('/tasks/:taskId/cancel', (req: Request, res: Response) => {
    try {
      const task = cancelTask(req.params.taskId as string);
      if (!task) {
        return res.status(404).json({ ok: false, error: 'Task not found' });
      }
      res.json({ ok: true, data: task, message: 'Task cancelled' });
    } catch (error) {
      res.status(400).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /v1/tasks/:taskId/logs - 获取任务日志
   */
  router.get('/tasks/:taskId/logs', (req: Request, res: Response) => {
    const task = getTask(req.params.taskId as string);
    if (!task) {
      return res.status(404).json({ ok: false, error: 'Task not found' });
    }
    const logs = getTaskLogs(req.params.taskId as string);
    res.json({ ok: true, logs });
  });

  /**
   * GET /v1/tasks/:taskId/events - 获取任务事件
   */
  router.get('/tasks/:taskId/events', (req: Request, res: Response) => {
    const task = getTask(req.params.taskId as string);
    if (!task) {
      return res.status(404).json({ ok: false, error: 'Task not found' });
    }
    const events = getTaskEvents(req.params.taskId as string);
    res.json({ ok: true, events });
  });

  /**
   * GET /v1/tasks/:taskId/result - 获取任务结果
   */
  router.get('/tasks/:taskId/result', (req: Request, res: Response) => {
    const task = getTask(req.params.taskId as string);
    if (!task) {
      return res.status(404).json({ ok: false, error: 'Task not found' });
    }
    const result = getTaskResult(req.params.taskId as string);
    res.json({
      ok: true,
      data: result || {
        status: task.status,
        artifacts: [],
      },
    });
  });

  /**
   * GET /v1/tasks/:taskId/audit - 获取任务审计日志
   */
  router.get('/tasks/:taskId/audit', (req: Request, res: Response) => {
    const task = getTask(req.params.taskId as string);
    if (!task) {
      return res.status(404).json({ ok: false, error: 'Task not found' });
    }
    const audit = getResourceAudit(req.params.taskId as string);
    res.json({ ok: true, audit });
  });

  // ===== Events & Audit API =====

  /**
   * GET /v1/events - 获取所有事件
   */
  router.get('/events', (_req: Request, res: Response) => {
    const events = getAllEvents();
    res.json({ ok: true, events, total: events.length });
  });

  /**
   * GET /v1/audit - 获取所有审计日志
   */
  router.get('/audit', (_req: Request, res: Response) => {
    const audit = getAllAudit();
    res.json({ ok: true, audit, total: audit.length });
  });

  // ===== Sessions API =====

  /**
   * GET /v1/sessions/:sessionId - 获取会话详情
   */
  router.get('/sessions/:sessionId', (req: Request, res: Response) => {
    const run = getAgentRun(req.params.sessionId as string);
    if (!run) {
      return res.status(404).json({ ok: false, error: 'Session not found' });
    }
    res.json(run);
  });

  /**
   * POST /v1/sessions/:sessionId/input - 发送输入到会话
   */
  router.post('/sessions/:sessionId/input', (req: Request, res: Response) => {
    const run = getAgentRun(req.params.sessionId as string);
    if (!run) {
      return res.status(404).json({ ok: false, error: 'Session not found' });
    }
    // In a real implementation, this would send input to the running agent
    // For now, just acknowledge the input was received
    res.json({ ok: true, message: 'Input received' });
  });

  /**
   * POST /v1/sessions/:sessionId/stop - 停止会话
   */
  router.post('/sessions/:sessionId/stop', (req: Request, res: Response) => {
    const sessionId = req.params.sessionId as string;
    const run = getAgentRun(sessionId);
    if (!run) {
      return res.status(404).json({ ok: false, error: 'Session not found' });
    }
    const updatedRun = stopRun(sessionId);
    res.json({ ok: true, data: updatedRun, message: 'Session stopped' });
  });

  // ===== Agents API =====

  /**
   * GET /v1/agents - 列出 Agents
   */
  router.get('/agents', (_req: Request, res: Response) => {
    // Return mock agents for now - in production this would query actual agents
    const agents = [
      {
        id: 'agent-1',
        name: 'Developer Agent',
        roleId: 'developer',
        runnerProviderId: 'mock-runner',
        enabled: true,
        status: 'idle' as const,
      },
      {
        id: 'agent-2',
        name: 'QA Agent',
        roleId: 'qa',
        runnerProviderId: 'mock-runner',
        enabled: true,
        status: 'idle' as const,
      },
    ];
    res.json({ ok: true, agents });
  });

  // ===== Statistics API =====

  /**
   * GET /v1/statistics - 获取系统统计
   */
  router.get('/statistics', (req: Request, res: Response) => {
    res.json({ ok: true, data: getStatistics() });
  });

  /**
   * GET /v1/health - 健康检查
   */
  router.get('/health', (req: Request, res: Response) => {
    res.json({
      ok: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  });

  return router;
}

export const agentServiceRouter = createAgentServiceRouter();