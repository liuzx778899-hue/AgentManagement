import { BaseAdapter } from './baseAdapter';
import type {
  LocalResult,
  AdapterConfig,
  RunnerProcess,
  LogEntry,
} from '../../../types/localEngineering';
import { spawn, ChildProcess } from 'child_process';
import { randomUUID } from 'crypto';

/**
 * 进程启动配置
 */
export interface ProcessStartConfig {
  runnerId: string;
  command: string;
  args: string[];
  cwd: string;
  env?: Record<string, string>;
  timeout?: number;
}

/**
 * Callback signature for process exit events.
 * Receives the processId, exit code (null if signal-killed), and the updated RunnerProcess.
 */
export type ProcessExitCallback = (
  processId: string,
  exitCode: number | null,
  process: RunnerProcess,
) => void;

/**
 * 进程运行器 Adapter
 *
 * 负责启动、停止、监控 CLI agent 子进程
 */
export class ProcessRunnerAdapter extends BaseAdapter {
  private processes: Map<string, RunnerProcess> = new Map();
  private childProcesses: Map<string, ChildProcess> = new Map();
  private commandWhitelist: Set<string>;
  private exitCallbacks: ProcessExitCallback[] = [];

  constructor(config: AdapterConfig) {
    super(config);
    // 默认命令白名单
    this.commandWhitelist = new Set([
      'npm',
      'node',
      'npx',
      'git',
      'claude',
      'codex',
      'cursor',
    ]);
  }

  /**
   * Register a callback to be invoked when any process exits.
   * Returns an unsubscribe function.
   */
  onProcessExit(callback: ProcessExitCallback): () => void {
    this.exitCallbacks.push(callback);
    return () => {
      const idx = this.exitCallbacks.indexOf(callback);
      if (idx >= 0) this.exitCallbacks.splice(idx, 1);
    };
  }

  /**
   * 添加命令到白名单
   */
  addToWhitelist(command: string): void {
    this.commandWhitelist.add(command);
  }

  /**
   * 检查命令是否在白名单中
   */
  private isCommandAllowed(command: string): boolean {
    // 提取命令名（去除路径）
    const cmdName = command.split('/').pop() ?? command;
    return this.commandWhitelist.has(cmdName);
  }

  /**
   * 启动进程
   */
  async start(config: ProcessStartConfig): Promise<LocalResult<RunnerProcess>> {
    const { runnerId, command, args, cwd, env, timeout } = config;

    // 检查命令白名单
    if (!this.isCommandAllowed(command) && !this.isMockEnabled) {
      return this.err('PERMISSION_DENIED', `命令不在白名单中: ${command}`, command);
    }

    const processId = randomUUID();
    const now = new Date().toISOString();

    // Mock 模式
    if (this.isMockEnabled) {
      const mockProcess: RunnerProcess = {
        id: processId,
        runnerId,
        state: 'running',
        startedAt: now,
        logs: [
          {
            timestamp: now,
            stream: 'stdout',
            content: `Mock process started: ${command} ${args.join(' ')}`,
          },
        ],
      };
      this.processes.set(processId, mockProcess);
      return this.ok(mockProcess);
    }

    try {
      const proc = spawn(command, args, {
        cwd,
        env: { ...process.env, ...env },
        shell: true,
      });

      const runnerProcess: RunnerProcess = {
        id: processId,
        runnerId,
        pid: proc.pid,
        state: 'running',
        startedAt: now,
        logs: [],
      };

      // 收集日志
      proc.stdout?.on('data', (data) => {
        runnerProcess.logs.push({
          timestamp: new Date().toISOString(),
          stream: 'stdout',
          content: data.toString(),
        });
      });

      proc.stderr?.on('data', (data) => {
        runnerProcess.logs.push({
          timestamp: new Date().toISOString(),
          stream: 'stderr',
          content: data.toString(),
        });
      });

      proc.on('close', (code) => {
        runnerProcess.state = code === 0 ? 'stopped' : 'failed';
        runnerProcess.stoppedAt = new Date().toISOString();
        runnerProcess.exitCode = code ?? 1;
        this.childProcesses.delete(processId);
        // Notify exit listeners
        for (const cb of this.exitCallbacks) {
          try { cb(processId, code, { ...runnerProcess }); } catch { /* swallow callback errors */ }
        }
      });

      proc.on('error', (err) => {
        runnerProcess.state = 'failed';
        runnerProcess.logs.push({
          timestamp: new Date().toISOString(),
          stream: 'stderr',
          content: err.message,
        });
      });

      this.processes.set(processId, runnerProcess);
      this.childProcesses.set(processId, proc);

      // 设置超时
      if (timeout) {
        setTimeout(() => {
          if (runnerProcess.state === 'running') {
            proc.kill('SIGTERM');
          }
        }, timeout);
      }

      return this.ok(runnerProcess);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return this.err('UNKNOWN', '启动进程失败', errorMessage);
    }
  }

  /**
   * 停止进程
   */
  async stop(processId: string): Promise<LocalResult<RunnerProcess>> {
    const runnerProcess = this.processes.get(processId);

    if (!runnerProcess) {
      return this.err('DIRECTORY_NOT_FOUND', `进程不存在: ${processId}`);
    }

    if (runnerProcess.state !== 'running') {
      return this.ok(runnerProcess);
    }

    // Mock 模式
    if (this.isMockEnabled) {
      runnerProcess.state = 'stopped';
      runnerProcess.stoppedAt = new Date().toISOString();
      runnerProcess.exitCode = 0;
      // Notify exit listeners in mock mode too
      for (const cb of this.exitCallbacks) {
        try { cb(processId, 0, { ...runnerProcess }); } catch { /* swallow callback errors */ }
      }
      return this.ok(runnerProcess);
    }

    const childProcess = this.childProcesses.get(processId);
    if (childProcess) {
      childProcess.kill('SIGTERM');
      runnerProcess.state = 'stopped';
      runnerProcess.stoppedAt = new Date().toISOString();
      runnerProcess.exitCode = 0;
      this.childProcesses.delete(processId);
      // Notify exit listeners on explicit stop
      for (const cb of this.exitCallbacks) {
        try { cb(processId, 0, { ...runnerProcess }); } catch { /* swallow callback errors */ }
      }
    }

    return this.ok(runnerProcess);
  }

  /**
   * 获取进程日志
   */
  async getLogs(processId: string): Promise<LocalResult<LogEntry[]>> {
    const runnerProcess = this.processes.get(processId);

    if (!runnerProcess) {
      return this.err('DIRECTORY_NOT_FOUND', `进程不存在: ${processId}`);
    }

    return this.ok(runnerProcess.logs);
  }

  /**
   * 获取进程状态
   */
  async getStatus(processId: string): Promise<LocalResult<RunnerProcess>> {
    const runnerProcess = this.processes.get(processId);

    if (!runnerProcess) {
      return this.err('DIRECTORY_NOT_FOUND', `进程不存在: ${processId}`);
    }

    return this.ok(runnerProcess);
  }

  /**
   * 列出所有进程
   */
  async listProcesses(): Promise<LocalResult<RunnerProcess[]>> {
    return this.ok(Array.from(this.processes.values()));
  }

  /**
   * 清理已停止的进程
   */
  async cleanup(): Promise<LocalResult<void>> {
    for (const [id, proc] of this.processes) {
      if (proc.state === 'stopped' || proc.state === 'failed') {
        this.processes.delete(id);
        this.childProcesses.delete(id);
      }
    }
    return this.ok(undefined, ['清理已停止进程']);
  }
}
