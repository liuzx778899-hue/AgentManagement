/**
 * Workbench Runs Router
 *
 * 工作台运行会话 API 端点
 */
import { Router, type Request, type Response } from 'express';
import type { ProcessRunnerAdapter } from '../../services/local/adapters/processRunnerAdapter';
import {
  startWorkbenchTask,
  stopWorkbenchTask,
  getWorkbenchSession,
  getWorkbenchLogs,
} from '../../services/local/useCases/workbenchRunUseCase';
import type { Task } from '../../domain/task';

export function createWorkbenchRunsRouter(
  getAdapter: () => ProcessRunnerAdapter,
  getTask: (taskId: string) => Promise<Task | null>,
  getProject: (projectId: string) => Promise<any>,
  getWorkflow: (workflowId: string) => Promise<any>
): Router {
  const router = Router();

  /**
   * POST /workbench-runs/start
   * 启动任务
   */
  router.post('/start', async (req: Request, res: Response) => {
    const { taskId, runnerKind } = req.body;

    if (!taskId) {
      res.status(400).json({ error: 'Missing taskId' });
      return;
    }

    try {
      const task = await getTask(taskId);
      if (!task) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      const project = await getProject(task.projectId);
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      const workflow = await getWorkflow(task.workflowTemplateId);
      if (!workflow) {
        res.status(404).json({ error: 'Workflow not found' });
        return;
      }

      const adapter = getAdapter();
      const result = await startWorkbenchTask(adapter, {
        taskId,
        projectId: task.projectId,
        project,
        workflow,
        runnerKind: runnerKind || 'claude-code',
        cwd: project.repoPath || process.cwd(),
      }, task);

      if (result.ok) {
        res.json(result.data);
      } else {
        res.status(500).json({ error: result.error?.message || 'Failed to start task' });
      }
    } catch (error) {
      console.error('Error starting task:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * POST /workbench-runs/stop
   * 停止任务
   */
  router.post('/stop', async (req: Request, res: Response) => {
    const { taskId } = req.body;

    if (!taskId) {
      res.status(400).json({ error: 'Missing taskId' });
      return;
    }

    try {
      const task = await getTask(taskId);
      if (!task) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      const adapter = getAdapter();
      const result = await stopWorkbenchTask(adapter, taskId, task);

      if (result.ok) {
        res.json(result.data);
      } else {
        res.status(500).json({ error: result.error?.message || 'Failed to stop task' });
      }
    } catch (error) {
      console.error('Error stopping task:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * GET /workbench-runs/session/:taskId
   * 获取任务运行会话
   */
  router.get('/session/:taskId', async (req: Request, res: Response) => {
    const taskId = req.params.taskId as string;

    try {
      const task = await getTask(taskId);
      if (!task) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      const adapter = getAdapter();
      const result = await getWorkbenchSession(adapter, taskId, task);

      if (result.ok) {
        res.json(result.data);
      } else {
        res.status(500).json({ error: result.error?.message || 'Failed to get session' });
      }
    } catch (error) {
      console.error('Error getting session:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * GET /workbench-runs/logs/:taskId
   * 获取任务日志
   */
  router.get('/logs/:taskId', async (req: Request, res: Response) => {
    const taskId = req.params.taskId as string;

    try {
      const adapter = getAdapter();
      const result = await getWorkbenchLogs(adapter, taskId);

      if (result.ok) {
        res.json(result.data);
      } else {
        res.status(500).json({ error: result.error?.message || 'Failed to get logs' });
      }
    } catch (error) {
      console.error('Error getting logs:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
