/**
 * AgentRun Domain Model
 *
 * Represents a single execution run of an AI Agent within a Task.
 * Each run tracks the agent's lifecycle from start to finish, including
 * process information, log location, and associated workflow step context.
 *
 * Design references:
 * - PHASE_2_BLUEPRINT: "每个 AgentRun 记录开始时间、结束时间、退出码、日志位置、关联步骤"
 * - PHASE_2_BLUEPRINT: "AgentRun 状态本地模拟 -> 进程管理：启动/监控/终止 Agent 子进程"
 * - PHASE_2_BLUEPRINT: "State Machine：AgentRun 状态按明确状态迁移处理"
 */

// ---------------------------------------------------------------------------
// Status types
// ---------------------------------------------------------------------------

/**
 * AgentRun lifecycle states.
 *
 * State machine transitions:
 *   starting -> running -> waiting_gate -> running -> done
 *                        \-> failed
 *                        \-> cancelled
 *   starting -> failed
 *   running  -> failed
 *   running  -> cancelled
 *   waiting_gate -> cancelled
 */
export type AgentRunStatus =
  | "starting"
  | "running"
  | "waiting_gate"
  | "done"
  | "failed"
  | "cancelled";

// ---------------------------------------------------------------------------
// AgentRun
// ---------------------------------------------------------------------------

/**
 * A single execution run of an AI Agent.
 *
 * An AgentRun is created when a Task's workflow step begins executing.
 * It tracks the process lifecycle, logs, gate decisions, and step progress.
 */
export interface AgentRun {
  /** Unique run identifier (e.g. "run-1706000000-a1b2c3d") */
  id: string;

  /** The Task this run belongs to */
  taskId: string;

  /** The Role executing this run */
  roleId: string;

  /** Which model provider to use (e.g. "provider-deepseek") */
  modelProviderId: string;

  /** Which model to use (e.g. "deepseek-v4-pro") */
  modelName: string;

  /** The current workflow step being executed */
  currentStepId: string;

  /** Current lifecycle state */
  status: AgentRunStatus;

  /**
   * Accumulated log entries as timestamped strings.
   * Format: "2026-05-15T06:00:00.000Z Agent started"
   */
  log: string[];

  /** ISO timestamp when the run was created */
  startedAt: string;

  /** ISO timestamp when the run finished (set on done/failed/cancelled) */
  finishedAt: string | null;

  // -- Extended fields for Phase 2 runner integration --

  /**
   * The Runner profile used for this run.
   * Links to RunnerProfile.id in domain/runner.ts
   */
  runnerId?: string;

  /**
   * The Runner process ID assigned by ProcessRunnerAdapter.
   * Used to correlate with RunnerProcess.id for log streaming and status polling.
   */
  processId?: string;

  /**
   * OS-level process ID (PID) of the CLI agent subprocess.
   * Available only when a real process was spawned.
   */
  pid?: number;

  /**
   * Exit code from the CLI agent process.
   * null while still running, 0 on success, non-zero on failure.
   */
  exitCode?: number | null;

  /**
   * File path where the full run log is persisted.
   * Relative to project root, e.g. ".agentmanagement/agent-runs/run-001.log"
   */
  logPath?: string;

  /**
   * Error message if the run failed.
   * Human-readable description of what went wrong.
   */
  errorMessage?: string;

  /**
   * Working directory where the agent process was launched.
   * Typically a worktree path for isolation.
   */
  workingDirectory?: string;

  /**
   * Environment variables injected into the agent process.
   * Does not include secrets; those come from RunnerProfile.envVars.
   */
  envOverrides?: Record<string, string>;

  /**
   * Step context injected into the agent process via environment variables.
   * Maps to AGENT_STEP_ID, AGENT_WORKFLOW_ID, AGENT_PROJECT_ID.
   */
  stepContext?: {
    stepId: string;
    workflowId: string;
    projectId: string;
  };

  /**
   * Gate decisions made during this run.
   * References ManualGate.id from domain/gate.ts
   */
  gateIds?: string[];

  /**
   * Artifacts produced by this run (file paths or references).
   * Populated as the agent completes steps.
   */
  artifacts?: string[];

  /**
   * Token usage statistics from the LLM, if available.
   */
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };

  /**
   * Duration in seconds (computed from startedAt/finishedAt).
   * null while still running.
   */
  durationSeconds?: number | null;
}

// ---------------------------------------------------------------------------
// Helper types
// ---------------------------------------------------------------------------

/**
 * Subset of AgentRun fields needed to create a new run.
 * The system generates id, startedAt, log, and status automatically.
 */
export interface CreateAgentRunInput {
  taskId: string;
  roleId: string;
  modelProviderId: string;
  modelName: string;
  currentStepId: string;
  runnerId?: string;
  workingDirectory?: string;
  stepContext?: AgentRun["stepContext"];
  envOverrides?: Record<string, string>;
}

/**
 * Fields that can be updated on an existing AgentRun.
 */
export interface AgentRunUpdate {
  status?: AgentRunStatus;
  currentStepId?: string;
  processId?: string;
  pid?: number;
  exitCode?: number | null;
  logPath?: string;
  errorMessage?: string;
  finishedAt?: string | null;
  gateIds?: string[];
  artifacts?: string[];
  tokenUsage?: AgentRun["tokenUsage"];
  durationSeconds?: number | null;
}
