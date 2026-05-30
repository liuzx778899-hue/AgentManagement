import { Router, Request, Response, NextFunction } from 'express';
import { getServices } from '../services/serviceFactory';
import {
  startRunnerProcess,
  stopRunnerProcess,
  getProcessLogs,
  getProcessStatus,
  listRunningProcesses,
} from '../../services/local/useCases';
import type { RunnerKind } from '../../domain/runner';

export const runnerRouter = Router();

/**
 * POST /api/runner/start
 * Start a CLI runner process
 */
runnerRouter.post('/start', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { runnerId, kind, cwd, command, args, env, timeout } = req.body;

    // Validate required fields
    if (!runnerId) {
      res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'runnerId is required',
          recoverable: true,
        },
      });
      return;
    }

    if (!kind) {
      res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'kind is required',
          recoverable: true,
        },
      });
      return;
    }

    if (!cwd) {
      res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'cwd is required',
          recoverable: true,
        },
      });
      return;
    }

    const services = getServices();

    const result = await startRunnerProcess(services.processRunner, {
      runnerId,
      runnerKind: kind as RunnerKind,
      command: command || '',
      args: args || [],
      cwd,
      env,
      timeout,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/runner/stop
 * Stop a running process
 */
runnerRouter.post('/stop', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { processId } = req.body;

    if (!processId) {
      res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'processId is required',
          recoverable: true,
        },
      });
      return;
    }

    const services = getServices();
    const result = await stopRunnerProcess(services.processRunner, processId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/runner/logs/:processId
 * Get logs for a process
 */
runnerRouter.get('/logs/:processId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const processId = req.params.processId as string;
    const services = getServices();

    const result = await getProcessLogs(services.processRunner, processId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/runner/status/:processId
 * Get status of a process
 */
runnerRouter.get('/status/:processId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const processId = req.params.processId as string;
    const services = getServices();

    const result = await getProcessStatus(services.processRunner, processId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/runner/list
 * List all running processes
 */
runnerRouter.get('/list', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const services = getServices();
    const result = await listRunningProcesses(services.processRunner);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
