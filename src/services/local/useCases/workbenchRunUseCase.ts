/**
 * WorkbenchRun UseCase
 *
 * Bridges workflowExecutionUseCase and runnerUseCase to provide a unified
 * workbench execution API. Orchestrates workflow run lifecycle with real
 * runner process management.
 *
 * Runner exit synchronization:
 * When a Runner process exits (normally or with error), the close event
 * updates RunnerProcess in memory. The getWorkbenchRunView function
 * detects the state change during polling and syncs it to the WorkflowRun
 * via syncProcessExitIfNeeded.
 */

import type { ProcessRunnerAdapter } from '../adapters/processRunnerAdapter';
import type { LocalResult, RunnerProcess, LogEntry } from '../../../types/localEngineering';
import type { RunnerKind } from '../../../domain/runner';
import type { Workflow, WorkflowStep } from '../../../domain/workflow';
import type { Project } from '../../../domain/project';
import type { Task } from '../../../domain/task';
import {
  createWorkflowRun,
  advanceWorkflowStep,
  handleWorkflowGate as wfHandleGate,
  getWorkflowRunStatus,
  pauseWorkflowRun,
  resumeWorkflowRun,
  cancelWorkflowRun,
  getWorkflowRun,
  listProjectWorkflowRuns,
  workflowRuns,
  type WorkflowRun,
  type WorkflowRunState,
  type WorkflowRunProgress,
  type StepExecution,
} from './workflowExecutionUseCase';
import {
  startRunnerProcess,
  stopRunnerProcess,
  getProcessLogs,
  getProcessStatus,
  listRunningProcesses,
  type StartRunnerConfig,
  type RunnerProcessInfo,
} from './runnerUseCase';

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

/**
 * Combined view of a workflow step plus its live runner process (if any).
 */
export interface StepWithProcess {
  execution: StepExecution;
  process?: RunnerProcessInfo;
}

/**
 * Full workbench run view returned to the UI.
 */
export interface WorkbenchRunView {
  run: WorkflowRun;
  steps: StepWithProcess[];
  /** The process id of the currently active runner, if any. */
  activeProcessId?: string;
}

/**
 * Configuration for starting a new workbench run.
 */
export interface StartWorkbenchRunConfig {
  /** The workflow template to run. */
  workflow: Workflow;
  /** The project this run belongs to. */
  project: Project;
  /** The task being executed. */
  task: Task;
  /** Who triggered the run. */
  triggeredBy: string;
  /** The runner kind to use. */
  runnerKind: RunnerKind;
  /** Working directory for the runner process. */
  cwd: string;
  /** Optional runner command override. */
  command?: string;
  /** Optional args override. */
  args?: string[];
  /** Optional env vars. */
  env?: Record<string, string>;
}

/**
 * Configuration for advancing a workbench step.
 */
export interface AdvanceWorkbenchStepConfig {
  runId: string;
  completedStepId: string;
  outputArtifacts?: string[];
  error?: string;
  /** The workflow template (needed for step lookup). */
  workflow: Workflow;
}

/**
 * Configuration for handling a gate decision.
 */
export interface HandleWorkbenchGateConfig {
  runId: string;
  decision: 'approve' | 'reject';
  decidedBy: string;
  reason?: string;
}

/**
 * Configuration for stopping a workbench run.
 */
export interface StopWorkbenchRunConfig {
  runId: string;
  reason?: string;
  /** Task ID to clean up the taskActiveRuns reverse index. */
  taskId?: string;
}

// ---------------------------------------------------------------------------
// Internal state: map of runId -> activeProcessId
// ---------------------------------------------------------------------------

const activeProcesses = new Map<string, string>();

/**
 * Tracks the last-known process state for each run.
 * Used to detect state transitions (running -> stopped/failed) for exit sync.
 */
const lastKnownProcessState = new Map<string, string>();

/**
 * Reverse index: taskId -> runId.
 * Used for duplicate-start detection — ensures we never start two concurrent
 * runs for the same task.
 */
const taskActiveRuns = new Map<string, string>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function runError(code: string, message: string, recoverable = false): LocalResult<never> {
  return {
    ok: false,
    error: { code: code as any, message, recoverable },
  };
}

/**
 * Build a StartRunnerConfig for the given workflow step.
 */
function buildRunnerConfig(
  step: WorkflowStep,
  config: StartWorkbenchRunConfig,
  runId: string,
): StartRunnerConfig {
  return {
    runnerId: `runner-${runId}-${step.id}`,
    runnerKind: config.runnerKind,
    command: config.command || '',
    args: config.args || [],
    cwd: config.cwd,
    env: config.env,
    stepContext: {
      stepId: step.id,
      workflowId: config.workflow.id,
      projectId: config.project.id,
    },
  };
}

/**
 * Enrich a WorkflowRun with live process info.
 *
 * Also detects Runner process exit and syncs the WorkflowRun state.
 * This is the primary mechanism for "Runner 退出同步":
 *
 * 1. Look up the active process for this run
 * 2. Poll the process state from ProcessRunnerAdapter
 * 3. If the process has transitioned from "running" to "stopped"/"failed",
 *    sync the WorkflowRun state accordingly
 */
async function enrichRun(
  run: WorkflowRun,
  adapter: ProcessRunnerAdapter,
): Promise<WorkbenchRunView> {
  const steps: StepWithProcess[] = run.steps.map((exec) => ({
    execution: exec,
  }));

  // Attach process info for the currently active step
  const activeProcessId = activeProcesses.get(run.id);
  let activeProcess: RunnerProcessInfo | undefined;

  if (activeProcessId) {
    const procResult = await getProcessStatus(adapter, activeProcessId);
    if (procResult.ok && procResult.data) {
      activeProcess = {
        ...procResult.data,
        runnerKind: 'claude-code', // default; real kind tracked by caller
      };
      const activeExec = steps.find(
        (s) => s.execution.stepId === run.currentStepId,
      );
      if (activeExec) {
        activeExec.process = activeProcess;
      }
    }
  }

  return {
    run,
    steps,
    activeProcessId,
  };
}

/**
 * Check if the runner process for a workbench run has exited and sync state.
 *
 * This is the core of "Runner 退出同步". Called during getWorkbenchRunView
 * polling to detect when a process has gone from "running" to "stopped"/"failed".
 *
 * Sync rules (per Issue #28):
 *   RunnerProcess.state = stopped, exitCode = 0
 *     -> WorkflowRun state = completed (if was running)
 *   RunnerProcess.state = failed or exitCode != 0
 *     -> WorkflowRun state = failed
 *
 * Returns the updated WorkflowRun if state was synced, or the original if no sync needed.
 */
async function syncProcessExitIfNeeded(
  run: WorkflowRun,
  adapter: ProcessRunnerAdapter,
): Promise<WorkflowRun> {
  const activeProcessId = activeProcesses.get(run.id);
  if (!activeProcessId) {
    return run;
  }

  // Only sync if the workflow run is still in an active state
  if (run.state !== 'running' && run.state !== 'waiting-gate' && run.state !== 'paused') {
    return run;
  }

  const procResult = await getProcessStatus(adapter, activeProcessId);
  if (!procResult.ok || !procResult.data) {
    return run;
  }

  const processState = procResult.data.state;
  const exitCode = procResult.data.exitCode;
  const previousState = lastKnownProcessState.get(run.id);

  // Update last known state
  lastKnownProcessState.set(run.id, processState);

  // If process is still running or starting, no sync needed
  if (processState === 'running' || processState === 'starting' || processState === 'idle') {
    return run;
  }

  // Process has exited (stopped, failed, or other terminal state)
  // Clean up the active process mapping
  activeProcesses.delete(run.id);
  lastKnownProcessState.delete(run.id);

  // Clean up the task->run reverse index since this run is now terminal
  for (const [tid, rid] of taskActiveRuns) {
    if (rid === run.id) {
      taskActiveRuns.delete(tid);
      break;
    }
  }

  if (processState === 'stopped' && (exitCode === 0 || exitCode === undefined)) {
    // Normal exit with code 0 -> mark workflow as completed
    const completedRun: WorkflowRun = {
      ...run,
      state: 'completed',
      completedAt: new Date().toISOString(),
      currentStepId: null,
      currentStepIndex: -1,
      steps: run.steps.map((s, i) => {
        if (i === run.currentStepIndex) {
          return {
            ...s,
            state: 'completed' as const,
            completedAt: new Date().toISOString(),
          };
        }
        return s;
      }),
    };
    // Update the stored run
    workflowRuns.set(run.id, completedRun);
    return completedRun;
  }

  // Failed exit or non-zero exit code -> mark workflow as failed
  const failedRun: WorkflowRun = {
    ...run,
    state: 'failed',
    completedAt: new Date().toISOString(),
    error: exitCode !== undefined && exitCode !== 0
      ? `Runner process exited with code ${exitCode}`
      : 'Runner process failed',
    steps: run.steps.map((s, i) => {
      if (i === run.currentStepIndex) {
        return {
          ...s,
          state: 'failed' as const,
          completedAt: new Date().toISOString(),
          error: exitCode !== undefined && exitCode !== 0
            ? `Process exited with code ${exitCode}`
            : 'Process failed',
        };
      }
      return s;
    }),
  };
  workflowRuns.set(run.id, failedRun);
  return failedRun;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check whether a task already has an active (running/starting) workbench run.
 *
 * Returns:
 *  - `{ duplicate: false }` if no active run exists — caller may proceed.
 *  - `{ duplicate: true, runId, view }` if there is an active run whose
 *    runner process is still running — caller should return this view.
 *  - `{ duplicate: true, runId, view: null }` if there is a tracked run but
 *    the underlying process has exited — the caller should call
 *    `markRunStale()` and then allow a restart.
 */
export async function checkDuplicateStart(
  adapter: ProcessRunnerAdapter,
  taskId: string,
): Promise<
  | { duplicate: false }
  | { duplicate: true; runId: string; view: WorkbenchRunView | null }
> {
  const trackedRunId = taskActiveRuns.get(taskId);
  if (!trackedRunId) {
    return { duplicate: false };
  }

  // Check if the workflow run still exists and is active
  const runResult = await getWorkflowRun(trackedRunId);
  if (!runResult.ok || !runResult.data) {
    // Run no longer tracked in workflowExecutionUseCase — clean up
    taskActiveRuns.delete(taskId);
    return { duplicate: false };
  }

  const run = runResult.data;
  if (
    run.state === 'completed' ||
    run.state === 'failed' ||
    run.state === 'cancelled'
  ) {
    // Run finished — allow restart
    taskActiveRuns.delete(taskId);
    activeProcesses.delete(trackedRunId);
    lastKnownProcessState.delete(trackedRunId);
    return { duplicate: false };
  }

  // Run is tracked and in an active state. Check the process.
  const activeProcessId = activeProcesses.get(trackedRunId);
  if (activeProcessId) {
    const procResult = await getProcessStatus(adapter, activeProcessId);
    if (procResult.ok && procResult.data && procResult.data.state === 'running') {
      // Process is genuinely running — return the existing view
      const view = await enrichRun(run, adapter);
      return { duplicate: true, runId: trackedRunId, view };
    }
    // Process exited but run is still "active" — stale
    return { duplicate: true, runId: trackedRunId, view: null };
  }

  // No process tracked but run is still active — stale
  return { duplicate: true, runId: trackedRunId, view: null };
}

/**
 * Mark an existing run as stale (its process disappeared) and release
 * the task so a new run can be started.
 *
 * After calling this, the caller can safely call `startWorkbenchRun` again.
 */
export async function markRunStale(
  adapter: ProcessRunnerAdapter,
  runId: string,
  taskId: string,
): Promise<void> {
  const activeProcessId = activeProcesses.get(runId);
  if (activeProcessId) {
    // Best-effort stop
    await stopRunnerProcess(adapter, activeProcessId).catch(() => {});
    activeProcesses.delete(runId);
  }
  lastKnownProcessState.delete(runId);
  taskActiveRuns.delete(taskId);

  // Cancel the workflow run so it doesn't linger
  await cancelWorkflowRun(runId, 'Run marked stale: process disappeared').catch(() => {});
}

/**
 * Get the runId currently associated with a task (if any).
 */
export function getTaskActiveRunId(taskId: string): string | undefined {
  return taskActiveRuns.get(taskId);
}

/**
 * Start a new workbench run.
 *
 * 1. Creates a WorkflowRun via workflowExecutionUseCase
 * 2. Starts a runner process for the first step
 * 3. Returns the enriched run view
 */
export async function startWorkbenchRun(
  adapter: ProcessRunnerAdapter,
  config: StartWorkbenchRunConfig,
): Promise<LocalResult<WorkbenchRunView>> {
  const { workflow, project, task, triggeredBy, runnerKind, cwd, command, args, env } = config;

  // Validate
  if (!workflow.steps || workflow.steps.length === 0) {
    return runError('INVALID_INPUT', 'Workflow has no steps');
  }
  if (!project.id) {
    return runError('INVALID_INPUT', 'Project ID is required');
  }
  if (!task.id) {
    return runError('INVALID_INPUT', 'Task ID is required');
  }
  if (!cwd) {
    return runError('INVALID_INPUT', 'Working directory (cwd) is required');
  }

  // --- Duplicate start check ---
  // If this task already has an active run, prevent creating a duplicate.
  const dupCheck = await checkDuplicateStart(adapter, task.id);
  if (dupCheck.duplicate) {
    if (dupCheck.view) {
      // Process is still running — return existing session
      return {
        ok: true,
        data: dupCheck.view,
        diagnostics: [
          `Duplicate start prevented: task ${task.id} already has active run ${dupCheck.runId}`,
          'Returning existing session',
        ],
      };
    }
    // Process gone but run tracked — mark stale and allow restart
    await markRunStale(adapter, dupCheck.runId, task.id);
  }

  // 1. Create workflow run
  const runResult = await createWorkflowRun({
    workflow,
    project,
    triggeredBy,
  });

  if (!runResult.ok || !runResult.data) {
    return {
      ok: false,
      error: runResult.error || { code: 'UNKNOWN', message: 'Failed to create workflow run', recoverable: false },
    };
  }

  const run = runResult.data;

  // 2. Start runner for the first step
  const firstStep = workflow.steps[0];
  const runnerConfig = buildRunnerConfig(firstStep, config, run.id);

  const procResult = await startRunnerProcess(adapter, runnerConfig);

  if (!procResult.ok || !procResult.data) {
    // Runner failed to start - the workflow run is still created but in error state
    // We cancel it to keep things clean
    await cancelWorkflowRun(run.id, `Runner failed to start: ${procResult.error?.message || 'unknown error'}`);
    return {
      ok: false,
      error: procResult.error || { code: 'UNKNOWN', message: 'Runner process failed to start', recoverable: true },
    };
  }

  // Track the active process and task->run mapping
  activeProcesses.set(run.id, procResult.data.id);
  taskActiveRuns.set(task.id, run.id);
  lastKnownProcessState.set(run.id, 'running');

  // 3. Return enriched view
  const view = await enrichRun(run, adapter);

  return {
    ok: true,
    data: view,
    diagnostics: [
      `Workbench run started: ${run.id}`,
      `Step 1: ${firstStep.name}`,
      `Runner process: ${procResult.data.id}`,
      `Project: ${project.name}`,
      `Task: ${task.goal}`,
    ],
  };
}

/**
 * Get the current workbench run status with enriched step/process info.
 *
 * Also calls syncProcessExitIfNeeded to detect and handle stale sessions:
 * if the underlying Runner process has exited but the WorkflowRun still
 * shows "running", the state is synced automatically.
 */
export async function getWorkbenchRunView(
  adapter: ProcessRunnerAdapter,
  runId: string,
): Promise<LocalResult<WorkbenchRunView>> {
  const runResult = await getWorkflowRun(runId);

  if (!runResult.ok || !runResult.data) {
    return {
      ok: false,
      error: runResult.error,
    };
  }

  // Sync runner process exit state before enriching
  const syncedRun = await syncProcessExitIfNeeded(runResult.data, adapter);

  const view = await enrichRun(syncedRun, adapter);
  return { ok: true, data: view };
}

/**
 * Get the progress of a workbench run.
 */
export async function getWorkbenchRunProgress(
  runId: string,
): Promise<LocalResult<WorkflowRunProgress>> {
  return getWorkflowRunStatus(runId);
}

/**
 * Advance the workbench run to the next step.
 *
 * 1. Stops the current runner process
 * 2. Advances the workflow step
 * 3. Starts a runner for the next step (if not completed/gate)
 */
export async function advanceWorkbenchStepRun(
  adapter: ProcessRunnerAdapter,
  config: AdvanceWorkbenchStepConfig,
): Promise<LocalResult<WorkbenchRunView>> {
  const { runId, completedStepId, outputArtifacts, error, workflow } = config;

  // Get current run
  const runResult = await getWorkflowRun(runId);
  if (!runResult.ok || !runResult.data) {
    return { ok: false, error: runResult.error };
  }
  const currentRun = runResult.data;

  // Stop current runner process
  const activeProcessId = activeProcesses.get(runId);
  if (activeProcessId) {
    await stopRunnerProcess(adapter, activeProcessId);
    activeProcesses.delete(runId);
  }

  // Advance the step
  const advanceResult = await advanceWorkflowStep({
    run: currentRun,
    workflow,
    completedStepId,
    outputArtifacts,
    error,
  });

  if (!advanceResult.ok || !advanceResult.data) {
    return { ok: false, error: advanceResult.error };
  }

  const advancedRun = advanceResult.data;

  // If the run completed, failed, or is waiting at a gate, no new process needed
  if (
    advancedRun.state === 'completed' ||
    advancedRun.state === 'failed' ||
    advancedRun.state === 'cancelled' ||
    advancedRun.state === 'waiting-gate' ||
    advancedRun.state === 'paused'
  ) {
    const view = await enrichRun(advancedRun, adapter);
    return {
      ok: true,
      data: view,
      diagnostics: advanceResult.diagnostics,
    };
  }

  // Start runner for next step
  const nextStepIndex = advancedRun.currentStepIndex;
  const nextStep = workflow.steps[nextStepIndex];
  if (!nextStep) {
    // Shouldn't happen but guard
    const view = await enrichRun(advancedRun, adapter);
    return { ok: true, data: view, diagnostics: advanceResult.diagnostics };
  }

  // Build runner config - we need the original config context
  // Since we don't have it here, we use a basic config
  const runnerConfig: StartRunnerConfig = {
    runnerId: `runner-${runId}-${nextStep.id}`,
    runnerKind: 'claude-code',
    command: '',
    args: [],
    cwd: process.cwd(),
    stepContext: {
      stepId: nextStep.id,
      workflowId: workflow.id,
      projectId: advancedRun.projectId,
    },
  };

  const procResult = await startRunnerProcess(adapter, runnerConfig);

  if (!procResult.ok || !procResult.data) {
    // Runner failed to start for next step - still return the run but log the error
    const view = await enrichRun(advancedRun, adapter);
    return {
      ok: true,
      data: view,
      diagnostics: [
        ...(advanceResult.diagnostics || []),
        `WARNING: Runner failed to start for step ${nextStep.name}: ${procResult.error?.message || 'unknown'}`,
      ],
    };
  }

  activeProcesses.set(runId, procResult.data.id);

  const view = await enrichRun(advancedRun, adapter);
  return {
    ok: true,
    data: view,
    diagnostics: [
      ...(advanceResult.diagnostics || []),
      `Runner started for step: ${nextStep.name} (process: ${procResult.data.id})`,
    ],
  };
}

/**
 * Handle a gate decision on a workbench run.
 *
 * After gate approval, starts the runner for the next step.
 */
export async function handleWorkbenchGateRun(
  adapter: ProcessRunnerAdapter,
  workflow: Workflow,
  config: HandleWorkbenchGateConfig,
): Promise<LocalResult<WorkbenchRunView>> {
  const { runId, decision, decidedBy, reason } = config;

  // Get current run
  const runResult = await getWorkflowRun(runId);
  if (!runResult.ok || !runResult.data) {
    return { ok: false, error: runResult.error };
  }
  const currentRun = runResult.data;

  if (currentRun.state !== 'waiting-gate') {
    return runError('INVALID_INPUT', 'Run is not in waiting-gate state');
  }

  // Handle the gate
  const gateResult = await wfHandleGate({
    run: currentRun,
    decision,
    decidedBy,
    reason,
  });

  if (!gateResult.ok || !gateResult.data) {
    return { ok: false, error: gateResult.error };
  }

  const gatedRun = gateResult.data;

  // If rejected or completed, no new process needed
  if (
    gatedRun.state === 'failed' ||
    gatedRun.state === 'completed' ||
    gatedRun.state === 'cancelled'
  ) {
    const view = await enrichRun(gatedRun, adapter);
    return {
      ok: true,
      data: view,
      diagnostics: gateResult.diagnostics,
    };
  }

  // Start runner for next step
  const nextStepIndex = gatedRun.currentStepIndex;
  const nextStep = workflow.steps[nextStepIndex];
  if (!nextStep) {
    const view = await enrichRun(gatedRun, adapter);
    return { ok: true, data: view, diagnostics: gateResult.diagnostics };
  }

  const runnerConfig: StartRunnerConfig = {
    runnerId: `runner-${runId}-${nextStep.id}`,
    runnerKind: 'claude-code',
    command: '',
    args: [],
    cwd: process.cwd(),
    stepContext: {
      stepId: nextStep.id,
      workflowId: workflow.id,
      projectId: gatedRun.projectId,
    },
  };

  const procResult = await startRunnerProcess(adapter, runnerConfig);

  if (!procResult.ok || !procResult.data) {
    const view = await enrichRun(gatedRun, adapter);
    return {
      ok: true,
      data: view,
      diagnostics: [
        ...(gateResult.diagnostics || []),
        `WARNING: Runner failed to start for step ${nextStep.name}: ${procResult.error?.message || 'unknown'}`,
      ],
    };
  }

  activeProcesses.set(runId, procResult.data.id);

  const view = await enrichRun(gatedRun, adapter);
  return {
    ok: true,
    data: view,
    diagnostics: [
      ...(gateResult.diagnostics || []),
      `Runner started for step: ${nextStep.name} (process: ${procResult.data.id})`,
    ],
  };
}

/**
 * Stop a workbench run.
 *
 * 1. Stops the active runner process
 * 2. Cancels the workflow run
 */
export async function stopWorkbenchRun(
  adapter: ProcessRunnerAdapter,
  config: StopWorkbenchRunConfig,
): Promise<LocalResult<WorkbenchRunView>> {
  const { runId, reason, taskId } = config;

  // Stop the active process
  const activeProcessId = activeProcesses.get(runId);
  if (activeProcessId) {
    await stopRunnerProcess(adapter, activeProcessId);
    activeProcesses.delete(runId);
  }
  lastKnownProcessState.delete(runId);

  // Clean up task->run index
  if (taskId) {
    taskActiveRuns.delete(taskId);
  } else {
    // Best-effort: scan for any task pointing to this run
    for (const [tid, rid] of taskActiveRuns) {
      if (rid === runId) {
        taskActiveRuns.delete(tid);
        break;
      }
    }
  }

  // Cancel the workflow run
  const cancelResult = await cancelWorkflowRun(runId, reason || 'User stopped');

  if (!cancelResult.ok || !cancelResult.data) {
    return { ok: false, error: cancelResult.error };
  }

  const view = await enrichRun(cancelResult.data, adapter);
  return {
    ok: true,
    data: view,
    diagnostics: [
      `Workbench run stopped: ${runId}`,
      `Reason: ${reason || 'User stopped'}`,
    ],
  };
}

/**
 * Pause a workbench run.
 *
 * Stops the runner process but keeps the run in paused state.
 */
export async function pauseWorkbenchRunAction(
  adapter: ProcessRunnerAdapter,
  runId: string,
): Promise<LocalResult<WorkbenchRunView>> {
  // Stop active process
  const activeProcessId = activeProcesses.get(runId);
  if (activeProcessId) {
    await stopRunnerProcess(adapter, activeProcessId);
    activeProcesses.delete(runId);
  }

  const pauseResult = await pauseWorkflowRun(runId);
  if (!pauseResult.ok || !pauseResult.data) {
    return { ok: false, error: pauseResult.error };
  }

  const view = await enrichRun(pauseResult.data, adapter);
  return {
    ok: true,
    data: view,
    diagnostics: ['Workbench run paused'],
  };
}

/**
 * Resume a workbench run.
 *
 * Restarts the runner process for the current step.
 */
export async function resumeWorkbenchRunAction(
  adapter: ProcessRunnerAdapter,
  workflow: Workflow,
  runId: string,
  cwd?: string,
): Promise<LocalResult<WorkbenchRunView>> {
  const resumeResult = await resumeWorkflowRun(runId);
  if (!resumeResult.ok || !resumeResult.data) {
    return { ok: false, error: resumeResult.error };
  }

  const resumedRun = resumeResult.data;

  // Start runner for current step
  const currentStepIndex = resumedRun.currentStepIndex;
  const currentStep = workflow.steps[currentStepIndex];
  if (currentStep) {
    const runnerConfig: StartRunnerConfig = {
      runnerId: `runner-${runId}-${currentStep.id}`,
      runnerKind: 'claude-code',
      command: '',
      args: [],
      cwd: cwd || process.cwd(),
      stepContext: {
        stepId: currentStep.id,
        workflowId: workflow.id,
        projectId: resumedRun.projectId,
      },
    };

    const procResult = await startRunnerProcess(adapter, runnerConfig);
    if (procResult.ok && procResult.data) {
      activeProcesses.set(runId, procResult.data.id);
    }
  }

  const view = await enrichRun(resumedRun, adapter);
  return {
    ok: true,
    data: view,
    diagnostics: ['Workbench run resumed'],
  };
}

/**
 * List all workbench runs for a project.
 */
export async function listProjectWorkbenchRuns(
  projectId: string,
): Promise<LocalResult<WorkflowRun[]>> {
  return listProjectWorkflowRuns(projectId);
}

/**
 * Get runner logs for the active process of a workbench run.
 */
export async function getWorkbenchRunLogs(
  adapter: ProcessRunnerAdapter,
  runId: string,
): Promise<LocalResult<LogEntry[]>> {
  const activeProcessId = activeProcesses.get(runId);
  if (!activeProcessId) {
    return { ok: true, data: [] };
  }
  return getProcessLogs(adapter, activeProcessId);
}

// ---------------------------------------------------------------------------
// Stale Session Detection & Recovery
// ---------------------------------------------------------------------------

/**
 * Result of a stale session detection check.
 */
export interface StaleSessionResult {
  /** Whether the session was detected as stale */
  isStale: boolean;
  /** The runId that was checked */
  runId: string;
  /** Reason the session is stale, if applicable */
  reason?: string;
  /** The process state found (or 'not-found') */
  processState?: string;
}

/**
 * Detect whether a workbench run has a stale session.
 *
 * A session is considered "stale" when any of these conditions hold:
 * 1. The activeProcesses map tracks a processId, but that process has
 *    exited (state is stopped/failed) in the ProcessRunnerAdapter.
 * 2. The WorkflowRun is in "running" state but no process is tracked
 *    in activeProcesses (e.g. after a page refresh that lost the in-memory map).
 * 3. The processId is tracked but the ProcessRunnerAdapter no longer
 *    knows about it (adapter was recreated, process garbage-collected).
 *
 * This function does NOT modify any state. It only reports findings.
 */
export async function detectStaleSession(
  adapter: ProcessRunnerAdapter,
  runId: string,
): Promise<StaleSessionResult> {
  const runResult = await getWorkflowRun(runId);

  // If the run doesn't exist at all, it's not stale - it's gone
  if (!runResult.ok || !runResult.data) {
    return { isStale: false, runId };
  }

  const run = runResult.data;

  // Only active-state runs can be stale
  if (run.state !== 'running' && run.state !== 'waiting-gate' && run.state !== 'paused') {
    return { isStale: false, runId };
  }

  const activeProcessId = activeProcesses.get(runId);

  // Case 2: running WorkflowRun but no process tracked in memory
  if (!activeProcessId) {
    if (run.state === 'running') {
      return {
        isStale: true,
        runId,
        reason: 'WorkflowRun is running but no process is tracked (possible page refresh)',
        processState: 'not-tracked',
      };
    }
    // waiting-gate and paused states legitimately have no process
    return { isStale: false, runId };
  }

  // Check the actual process state
  const procResult = await getProcessStatus(adapter, activeProcessId);

  // Case 3: adapter doesn't know about the process
  if (!procResult.ok || !procResult.data) {
    return {
      isStale: true,
      runId,
      reason: `Process ${activeProcessId} not found in adapter (adapter recreated or process GC'd)`,
      processState: 'not-found',
    };
  }

  const procState = procResult.data.state;

  // Case 1: process has exited but run still thinks it's running
  if (procState === 'stopped' || procState === 'failed') {
    return {
      isStale: true,
      runId,
      reason: `Process exited with state "${procState}" but WorkflowRun still in "${run.state}"`,
      processState: procState,
    };
  }

  // Process is still running or in a non-terminal state
  return { isStale: false, runId, processState: procState };
}

/**
 * Recover from a stale session by cleaning up the stale mapping and
 * cancelling the associated WorkflowRun.
 *
 * After calling this, the task can be started again with a fresh run.
 *
 * Returns whether recovery was performed and why.
 */
export async function recoverStaleSession(
  adapter: ProcessRunnerAdapter,
  runId: string,
): Promise<{ recovered: boolean; runId: string; reason?: string }> {
  const detection = await detectStaleSession(adapter, runId);

  if (!detection.isStale) {
    return { recovered: false, runId };
  }

  // Find the task associated with this run to clean up taskActiveRuns
  let taskId: string | undefined;
  for (const [tid, rid] of taskActiveRuns) {
    if (rid === runId) {
      taskId = tid;
      break;
    }
  }

  // Delegate to markRunStale which does the cleanup
  if (taskId) {
    await markRunStale(adapter, runId, taskId);
  } else {
    // No task mapping found - just clean up the process tracking
    const activeProcessId = activeProcesses.get(runId);
    if (activeProcessId) {
      await stopRunnerProcess(adapter, activeProcessId).catch(() => {});
      activeProcesses.delete(runId);
    }
    lastKnownProcessState.delete(runId);
    await cancelWorkflowRun(runId, 'Stale session recovered: no task mapping found').catch(() => {});
  }

  return {
    recovered: true,
    runId,
    reason: detection.reason,
  };
}

/**
 * Scan all tracked active runs and clean up any that have stale sessions.
 *
 * This is designed to be called periodically (e.g. on a timer) to ensure
 * that stale sessions don't accumulate.
 *
 * Returns the list of runIds that were cleaned up.
 */
export async function cleanupStaleSessions(
  adapter: ProcessRunnerAdapter,
): Promise<{ cleanedRunIds: string[]; errors: string[] }> {
  const cleanedRunIds: string[] = [];
  const errors: string[] = [];

  // Take a snapshot of current active processes
  const currentMappings = new Map(activeProcesses);

  for (const [runId] of currentMappings) {
    try {
      const detection = await detectStaleSession(adapter, runId);
      if (detection.isStale) {
        const recovery = await recoverStaleSession(adapter, runId);
        if (recovery.recovered) {
          cleanedRunIds.push(runId);
        }
      }
    } catch (err) {
      errors.push(`Failed to check/clean run ${runId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { cleanedRunIds, errors };
}

/**
 * Clear the active process tracking (for cleanup/testing).
 */
export function clearActiveProcess(runId: string): void {
  activeProcesses.delete(runId);
  lastKnownProcessState.delete(runId);
  // Also clean up any task pointing to this run
  for (const [tid, rid] of taskActiveRuns) {
    if (rid === runId) {
      taskActiveRuns.delete(tid);
      break;
    }
  }
}

/**
 * Reset all internal state (for testing).
 */
export function resetAllState(): void {
  activeProcesses.clear();
  lastKnownProcessState.clear();
  taskActiveRuns.clear();
}

/**
 * Get all active process mappings (for diagnostics).
 */
export function getActiveProcessMappings(): ReadonlyMap<string, string> {
  return new Map(activeProcesses);
}

/**
 * Get all task->run mappings (for diagnostics).
 */
export function getTaskRunMappings(): ReadonlyMap<string, string> {
  return new Map(taskActiveRuns);
}
