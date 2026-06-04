/**
 * Runner Adapter Interface and Mock Implementation
 *
 * Issue: #33
 */

import type { AgentRun } from '../../domain/task';
import { logEvent } from './event-log';
import { saveResult } from './resultStore';

/**
 * Runner Configuration
 */
export interface RunnerConfig {
  runnerId: string;
  roleId: string;
  modelProviderId: string;
  modelName: string;
}

/**
 * Runner Callbacks
 */
export interface RunnerCallbacks {
  onLog: (runId: string, log: string) => void;
  onStatusChange: (runId: string, status: AgentRun['status']) => void;
  onComplete: (runId: string, result: RunResult) => void;
}

/**
 * Run Result
 */
export interface RunResult {
  status: 'success' | 'failure' | 'cancelled';
  artifacts: RunnerArtifact[];
  output?: string;
  error?: string;
}

/**
 * Artifact produced by run
 */
export interface RunnerArtifact {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory' | 'output';
  size?: number;
  createdAt: string;
}

/**
 * Runner Adapter Interface
 */
export interface IRunnerAdapter {
  /**
   * Start a run
   */
  start(runId: string, taskId: string, config: RunnerConfig, callbacks: RunnerCallbacks): void;

  /**
   * Stop a run
   */
  stop(runId: string): void;

  /**
   * Check if adapter is available
   */
  isAvailable(): boolean;
}

/**
 * Mock Runner Adapter
 *
 * Simulates runner behavior for testing and development
 */
export class MockRunnerAdapter implements IRunnerAdapter {
  private activeRuns: Map<string, NodeJS.Timeout> = new Map();

  start(
    runId: string,
    taskId: string,
    config: RunnerConfig,
    callbacks: RunnerCallbacks
  ): void {
    const startTime = Date.now();

    // Simulate status change to running
    callbacks.onStatusChange(runId, 'running');

    // Simulate logs
    const logs = [
      `[${new Date().toISOString()}] Starting agent with ${config.modelName}...`,
      `[${new Date().toISOString()}] Loading configuration...`,
      `[${new Date().toISOString()}] Processing task: ${taskId}`,
      `[${new Date().toISOString()}] Task completed successfully.`,
    ];

    let logIndex = 0;
    const logInterval = setInterval(() => {
      if (logIndex < logs.length) {
        callbacks.onLog(runId, logs[logIndex]);
        logIndex++;
      }
    }, 500);

    // Store the interval for potential cancellation
    this.activeRuns.set(runId, logInterval);

    // Simulate completion after logs
    setTimeout(() => {
      clearInterval(logInterval);
      this.activeRuns.delete(runId);

      // Record completion event
      logEvent({
        taskId,
        runId,
        type: 'run_completed',
        payload: {
          duration: Date.now() - startTime,
        },
      });

      // Create result
      const result: RunResult = {
        status: 'success',
        artifacts: [
          {
            id: `artifact-${Date.now()}`,
            name: 'output.txt',
            path: '/workspace/output.txt',
            type: 'file',
            createdAt: new Date().toISOString(),
          },
        ],
        output: 'Task completed successfully',
      };

      // Save result
      saveResult({
        taskId,
        status: result.status,
        artifacts: result.artifacts,
        output: result.output,
        startedAt: new Date(startTime).toISOString(),
        finishedAt: new Date().toISOString(),
      });

      callbacks.onStatusChange(runId, 'done');
      callbacks.onComplete(runId, result);
    }, logs.length * 500 + 100);
  }

  stop(runId: string): void {
    const interval = this.activeRuns.get(runId);
    if (interval) {
      clearInterval(interval);
      this.activeRuns.delete(runId);
    }
  }

  isAvailable(): boolean {
    return true;
  }
}

/**
 * Default runner adapter instance
 */
let defaultAdapter: IRunnerAdapter | null = null;

/**
 * Get the default runner adapter
 */
export function getRunnerAdapter(): IRunnerAdapter {
  if (!defaultAdapter) {
    defaultAdapter = new MockRunnerAdapter();
  }
  return defaultAdapter;
}

/**
 * Set the default runner adapter
 */
export function setRunnerAdapter(adapter: IRunnerAdapter): void {
  defaultAdapter = adapter;
}
