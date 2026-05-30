import type { ProcessRunnerAdapter, ProcessStartConfig } from '../adapters/processRunnerAdapter';
import type { LocalResult, RunnerProcess, LogEntry } from '../../../types/localEngineering';
import type { RunnerKind } from '../../../domain/runner';

/**
 * Runner 启动配置
 */
export interface StartRunnerConfig {
  runnerId: string;
  runnerKind: RunnerKind;
  command: string;
  args: string[];
  cwd: string;
  env?: Record<string, string>;
  timeout?: number;
  stepContext?: {
    stepId: string;
    workflowId: string;
    projectId: string;
  };
}

/**
 * Runner 进程扩展信息
 */
export interface RunnerProcessInfo extends RunnerProcess {
  runnerKind: RunnerKind;
  stepContext?: StartRunnerConfig['stepContext'];
}

/**
 * Runner 默认命令映射
 */
const DEFAULT_RUNNER_COMMANDS: Record<RunnerKind, { command: string; defaultArgs: string[] }> = {
  'claude-code': { command: 'claude', defaultArgs: [] },
  'codex-cli': { command: 'codex', defaultArgs: [] },
  'cursor-cli': { command: 'cursor', defaultArgs: ['--agent'] },
  'gemini-cli': { command: 'gemini', defaultArgs: [] },
  'custom': { command: '', defaultArgs: [] },
};

/**
 * 启动 Runner 进程
 */
export async function startRunnerProcess(
  adapter: ProcessRunnerAdapter,
  config: StartRunnerConfig
): Promise<LocalResult<RunnerProcessInfo>> {
  const { runnerId, runnerKind, command, args, cwd, env, timeout, stepContext } = config;

  // 获取默认命令配置
  const defaultConfig = DEFAULT_RUNNER_COMMANDS[runnerKind];
  const finalCommand = command || defaultConfig.command;
  const finalArgs = args.length > 0 ? args : defaultConfig.defaultArgs;

  if (!finalCommand) {
    return {
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: `未配置 ${runnerKind} 的命令`,
        recoverable: true,
      },
    };
  }

  // 合并环境变量
  const finalEnv = {
    ...env,
    // 添加 step context 环境变量
    ...(stepContext && {
      AGENT_STEP_ID: stepContext.stepId,
      AGENT_WORKFLOW_ID: stepContext.workflowId,
      AGENT_PROJECT_ID: stepContext.projectId,
    }),
  };

  const startConfig: ProcessStartConfig = {
    runnerId,
    command: finalCommand,
    args: finalArgs,
    cwd,
    env: finalEnv,
    timeout,
  };

  const result = await adapter.start(startConfig);

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
    };
  }

  return {
    ok: true,
    data: {
      ...result.data!,
      runnerKind,
      stepContext,
    },
  };
}

/**
 * 停止 Runner 进程
 */
export async function stopRunnerProcess(
  adapter: ProcessRunnerAdapter,
  processId: string
): Promise<LocalResult<RunnerProcess>> {
  const result = await adapter.stop(processId);

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
    };
  }

  return {
    ok: true,
    data: result.data,
  };
}

/**
 * 获取进程日志
 */
export async function getProcessLogs(
  adapter: ProcessRunnerAdapter,
  processId: string
): Promise<LocalResult<LogEntry[]>> {
  const result = await adapter.getLogs(processId);

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
    };
  }

  return {
    ok: true,
    data: result.data,
  };
}

/**
 * 获取进程状态
 */
export async function getProcessStatus(
  adapter: ProcessRunnerAdapter,
  processId: string
): Promise<LocalResult<RunnerProcess>> {
  const result = await adapter.getStatus(processId);

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
    };
  }

  return {
    ok: true,
    data: result.data,
  };
}

/**
 * 列出所有运行中的进程
 */
export async function listRunningProcesses(
  adapter: ProcessRunnerAdapter
): Promise<LocalResult<RunnerProcess[]>> {
  const result = await adapter.listProcesses();

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
    };
  }

  // 只返回运行中的进程
  const running = result.data!.filter(p => p.state === 'running');

  return {
    ok: true,
    data: running,
  };
}

/**
 * 清理已停止的进程
 */
export async function cleanupProcesses(
  adapter: ProcessRunnerAdapter
): Promise<LocalResult<void>> {
  const result = await adapter.cleanup();

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
    };
  }

  return {
    ok: true,
    data: undefined,
    diagnostics: result.diagnostics,
  };
}