/**
 * 本地工程层类型定义
 */

/**
 * 本地工程层统一返回结构
 */
export interface LocalResult<T> {
  ok: boolean;
  data?: T;
  error?: LocalError;
  diagnostics?: string[];
}

/**
 * 本地工程错误结构
 */
export interface LocalError {
  code: LocalErrorCode;
  message: string;
  cause?: string;
  recoverable: boolean;
}

export type LocalErrorCode =
  | 'COMMAND_NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'TIMEOUT'
  | 'EXIT_CODE_NON_ZERO'
  | 'DIRECTORY_NOT_FOUND'
  | 'INVALID_INPUT'
  | 'NETWORK_ERROR'
  | 'PARSE_ERROR'
  | 'API_ERROR'
  | 'UNKNOWN'
  | 'BATCH_SAVE_FAILED'
  | 'WORKFLOW_NOT_FOUND'
  | 'TASK_NOT_FOUND'
  | 'INVALID_STEP_ORDER'
  | 'STATE_CONFLICT'
  | 'UNKNOWN_ACTION';

/**
 * 命令执行配置
 */
export interface CommandConfig {
  command: string;
  args: string[];
  cwd: string;
  timeout?: number;
  env?: Record<string, string>;
}

/**
 * 命令执行结果
 */
export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
}

/**
 * Git 状态信息
 */
export interface LocalGitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: number;
  unstaged: number;
  untracked: number;
  lastCommitSha: string;
  lastCommitMessage: string;
  lastCommitDate: string;
  isClean: boolean;
}

/**
 * Worktree 信息
 */
export interface WorktreeInfo {
  path: string;
  branch: string;
  commitSha: string;
  isMainWorktree: boolean;
}

/**
 * 进程运行状态
 */
export type ProcessState = 'idle' | 'starting' | 'running' | 'stopping' | 'stopped' | 'failed';

/**
 * Runner 进程信息
 */
export interface RunnerProcess {
  id: string;
  runnerId: string;
  pid?: number;
  state: ProcessState;
  startedAt?: string;
  stoppedAt?: string;
  exitCode?: number;
  logs: LogEntry[];
}

/**
 * 日志条目
 */
export interface LogEntry {
  timestamp: string;
  stream: 'stdout' | 'stderr';
  content: string;
}

/**
 * Adapter 配置
 */
export interface AdapterConfig {
  enableMock: boolean;
  defaultTimeout: number;
  projectRoot: string;
}
