/**
 * Agent Service REST API Routes
 *
 * Issue: #33
 *
 * API 设计：
 * POST   /v1/tasks              创建任务
 * GET    /v1/tasks/:taskId      查询任务状态
 * POST   /v1/tasks/:taskId/start 启动任务
 * POST   /v1/tasks/:taskId/cancel 取消任务
 * GET    /v1/tasks/:taskId/logs 获取日志流
 * GET    /v1/tasks/:taskId/events 获取事件列表
 * GET    /v1/tasks/:taskId/result 获取执行结果
 *
 * POST   /v1/sessions/:sessionId/input 发送输入
 * POST   /v1/sessions/:sessionId/stop 停止会话
 */

import { Router, Request, Response } from 'express';
import { taskService } from '../services/task-service';
import { mockRunnerAdapter } from '../adapters/mock-runner-adapter';
import { agentRegistry } from '../services/agent-registry';
import { eventLogService } from '../services/event-log-service';
import { auditLogService } from '../services/audit-log-service';

/**
 * 创建 Agent Service API Router
 */
export function createAgentServiceRouter(): Router {
  const router = Router();

  // ============ Tasks API ============

  /**
   * POST /v1/tasks - 创建任务
   */
  router.post('/tasks', async (req: Request, res: Response) => {
    try {
      const task = await taskService.createTask(req.body);
      res.status(201).json({
        ok: true,
        data: task,
      });
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
    const filter = req.query as any;
    const tasks = taskService.listTasks(filter);
    res.json({
      ok: true,
      data: tasks,
      total: tasks.length,
    });
  });

  /**
   * GET /v1/tasks/:taskId - 获取任务详情
   */
  router.get('/tasks/:taskId', (req: Request, res: Response) => {
    const task = taskService.getTask(req.params.taskId);
    if (!task) {
      return res.status(404).json({
        ok: false,
        error: 'Task not found',
      });
    }
    res.json({
      ok: true,
      data: task,
    });
  });

  /**
   * POST /v1/tasks/:taskId/start - 启动任务
   */
  router.post('/tasks/:taskId/start', async (req: Request, res: Response) => {
    try {
      const task = await taskService.startTask(req.params.taskId);
      res.json({
        ok: true,
        data: task,
        message: 'Task started successfully',
      });
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
  router.post('/tasks/:taskId/cancel', async (req: Request, res: Response) => {
    try {
      const task = await taskService.cancelTask(req.params.taskId);
      res.json({
        ok: true,
        data: task,
        message: 'Task cancelled successfully',
      });
    } catch (error) {
      res.status(400).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /v1/tasks/:taskId/retry - 重试任务
   */
  router.post('/tasks/:taskId/retry', async (req: Request, res: Response) => {
    try {
      const task = await taskService.retryTask(req.params.taskId);
      res.json({
        ok: true,
        data: task,
        message: 'Task queued for retry',
      });
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
    const logs = taskService.getTaskLogs(req.params.taskId);
    res.json({
      ok: true,
      data: logs,
      total: logs.length,
    });
  });

  /**
   * GET /v1/tasks/:taskId/events - 获取任务事件
   */
  router.get('/tasks/:taskId/events', (req: Request, res: Response) => {
    const events = taskService.getTaskEvents(req.params.taskId);
    res.json({
      ok: true,
      data: events,
      total: events.length,
    });
  });

  /**
   * GET /v1/tasks/:taskId/result - 获取任务结果
   */
  router.get('/tasks/:taskId/result', (req: Request, res: Response) => {
    try {
      const result = taskService.getTaskResult(req.params.taskId);
      res.json({
        ok: true,
        data: result,
      });
    } catch (error) {
      res.status(404).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ============ Sessions API ============

  /**
   * GET /v1/sessions/:sessionId - 获取 Session 详情
   */
  router.get('/sessions/:sessionId', (req: Request, res: Response) => {
    const session = mockRunnerAdapter.getSession(req.params.sessionId);
    if (!session) {
      return res.status(404).json({
        ok: false,
        error: 'Session not found',
      });
    }
    res.json({
      ok: true,
      data: session,
    });
  });

  /**
   * POST /v1/sessions/:sessionId/input - 发送输入
   */
  router.post('/sessions/:sessionId/input', async (req: Request, res: Response) => {
    try {
      const { input } = req.body;
      await mockRunnerAdapter.sendInput(req.params.sessionId, input);
      res.json({
        ok: true,
        message: 'Input sent successfully',
      });
    } catch (error) {
      res.status(400).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /v1/sessions/:sessionId/stop - 停止 Session
   */
  router.post('/sessions/:sessionId/stop', async (req: Request, res: Response) => {
    try {
      await mockRunnerAdapter.stopSession(req.params.sessionId);
      res.json({
        ok: true,
        message: 'Session stopped successfully',
      });
    } catch (error) {
      res.status(400).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /v1/sessions/:sessionId/events - 获取 Session 事件
   */
  router.get('/sessions/:sessionId/events', (req: Request, res: Response) => {
    const events = mockRunnerAdapter.getEvents(req.params.sessionId);
    res.json({
      ok: true,
      data: events,
      total: events.length,
    });
  });

  // ============ Agents API ============

  /**
   * POST /v1/agents - 注册 Agent
   */
  router.post('/agents', (req: Request, res: Response) => {
    try {
      const agent = agentRegistry.register(req.body);
      res.status(201).json({
        ok: true,
        data: agent,
      });
    } catch (error) {
      res.status(400).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /v1/agents - 列出 Agents
   */
  router.get('/agents', (req: Request, res: Response) => {
    const filter = req.query as any;
    const agents = agentRegistry.list(filter);
    res.json({
      ok: true,
      data: agents,
      total: agents.length,
    });
  });

  /**
   * GET /v1/agents/:agentId - 获取 Agent 详情
   */
  router.get('/agents/:agentId', (req: Request, res: Response) => {
    const agent = agentRegistry.get(req.params.agentId);
    if (!agent) {
      return res.status(404).json({
        ok: false,
        error: 'Agent not found',
      });
    }
    res.json({
      ok: true,
      data: agent,
    });
  });

  /**
   * PUT /v1/agents/:agentId - 更新 Agent
   */
  router.put('/agents/:agentId', (req: Request, res: Response) => {
    const agent = agentRegistry.update(req.params.agentId, req.body);
    if (!agent) {
      return res.status(404).json({
        ok: false,
        error: 'Agent not found',
      });
    }
    res.json({
      ok: true,
      data: agent,
    });
  });

  /**
   * DELETE /v1/agents/:agentId - 删除 Agent
   */
  router.delete('/agents/:agentId', (req: Request, res: Response) => {
    const deleted = agentRegistry.delete(req.params.agentId);
    if (!deleted) {
      return res.status(404).json({
        ok: false,
        error: 'Agent not found',
      });
    }
    res.json({
      ok: true,
      message: 'Agent deleted successfully',
    });
  });

  // ============ Statistics API ============

  /**
   * GET /v1/statistics - 获取系统统计
   */
  router.get('/statistics', (req: Request, res: Response) => {
    res.json({
      ok: true,
      data: {
        tasks: taskService.getQueueStatistics(),
        agents: agentRegistry.getStatistics(),
        runner: mockRunnerAdapter.getStatistics(),
        events: eventLogService.getStatistics(),
        audit: auditLogService.getStatistics(),
      },
    });
  });

  // ============ Health Check ============

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

// 导出默认路由
export const agentServiceRouter = createAgentServiceRouter();