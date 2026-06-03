/**
 * WorkflowEventUseCase
 *
 * Implements the WorkflowEventEmitter interface from the domain model and
 * provides an event-driven integration layer over the workflow execution
 * and workbench run use cases.
 *
 * Architecture:
 *   workflowExecutionUseCase / workbenchRunUseCase  (business logic)
 *          |
 *          v
 *   workflowEventUseCase  (emits typed WorkflowEvents for each state transition)
 *          |
 *          v
 *   Subscribers: SSE routes, state reducer, IM notifications, audit log
 *
 * The emitter is a synchronous in-process pub/sub. SSE routes will call
 * `subscribe()` or `onRun()` to receive events and stream them to clients.
 * The state reducer will call `on()` to translate events into state updates.
 *
 * All public functions that orchestrate workflow operations return the
 * underlying LocalResult AND emit the corresponding events as side effects.
 */

import type {
  WorkflowEvent,
  WorkflowEventType,
  WorkflowEventHandler,
  WorkflowEventEmitter,
  WorkflowEventBase,
} from '../../../domain/workflowEvent';
import {
  createEventBase,
  generateEventId,
} from '../../../domain/workflowEvent';
import type { Workflow, WorkflowStep } from '../../../domain/workflow';
import type { Project } from '../../../domain/project';
import type { Task } from '../../../domain/task';
import type { ProcessRunnerAdapter, LocalResult } from '../../../types/localEngineering';
import type { RunnerKind } from '../../../domain/runner';
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
  type StepExecution,
  type WorkflowRunProgress,
} from './workflowExecutionUseCase';
import {
  startRunnerProcess,
  stopRunnerProcess,
  getProcessLogs,
  getProcessStatus,
  type StartRunnerConfig,
  type RunnerProcessInfo,
} from './runnerUseCase';

// ---------------------------------------------------------------------------
// Emitter implementation
// ---------------------------------------------------------------------------

/**
 * In-memory WorkflowEventEmitter.
 *
 * Keeps track of:
 *  - global subscribers (receive every event)
 *  - type-keyed subscribers (receive events of a specific type)
 *  - run-keyed subscribers (receive events for a specific runId)
 *
 * All subscriber callbacks are invoked synchronously during emit().
 * This keeps ordering deterministic and avoids race conditions.
 */
class WorkflowEventEmitterImpl implements WorkflowEventEmitter {
  private globalHandlers: Set<WorkflowEventHandler> = new Set();
  private typeHandlers: Map<WorkflowEventType, Set<WorkflowEventHandler>> = new Map();
  private runHandlers: Map<string, Set<WorkflowEventHandler>> = new Map();

  /** Event history, capped to prevent unbounded growth. */
  private history: WorkflowEvent[] = [];
  private readonly maxHistory = 1000;

  emit(event: WorkflowEvent): void {
    // Record history
    if (this.history.length >= this.maxHistory) {
      this.history.shift();
    }
    this.history.push(event);

    // Global subscribers
    for (const handler of this.globalHandlers) {
      try { handler(event); } catch { /* swallow subscriber errors */ }
    }

    // Type-specific subscribers
    const typeSet = this.typeHandlers.get(event.type);
    if (typeSet) {
      for (const handler of typeSet) {
        try { handler(event); } catch { /* swallow subscriber errors */ }
      }
    }

    // Run-specific subscribers
    const runSet = this.runHandlers.get(event.runId);
    if (runSet) {
      for (const handler of runSet) {
        try { handler(event); } catch { /* swallow subscriber errors */ }
      }
    }
  }

  subscribe(handler: WorkflowEventHandler): () => void {
    this.globalHandlers.add(handler);
    return () => { this.globalHandlers.delete(handler); };
  }

  on(type: WorkflowEventType, handler: WorkflowEventHandler): () => void {
    let set = this.typeHandlers.get(type);
    if (!set) {
      set = new Set();
      this.typeHandlers.set(type, set);
    }
    set.add(handler);
    return () => {
      set!.delete(handler);
      if (set!.size === 0) this.typeHandlers.delete(type);
    };
  }

  onRun(runId: string, handler: WorkflowEventHandler): () => void {
    let set = this.runHandlers.get(runId);
    if (!set) {
      set = new Set();
      this.runHandlers.set(runId, set);
    }
    set.add(handler);
    return () => {
      set!.delete(handler);
      if (set!.size === 0) this.runHandlers.delete(runId);
    };
  }

  clear(): void {
    this.globalHandlers.clear();
    this.typeHandlers.clear();
    this.runHandlers.clear();
    this.history = [];
  }

  // --- Extended API (not on the domain interface, but useful for routes) ---

  /** Get the event history for a specific run. */
  getHistory(runId?: string): WorkflowEvent[] {
    if (runId) {
      return this.history.filter(e => e.runId === runId);
    }
    return [...this.history];
  }

  /** Number of active subscribers (for diagnostics). */
  get subscriberCount(): number {
    let count = this.globalHandlers.size;
    for (const set of this.typeHandlers.values()) count += set.size;
    for (const set of this.runHandlers.values()) count += set.size;
    return count;
  }
}

// ---------------------------------------------------------------------------
// Singleton emitter
// ---------------------------------------------------------------------------

/**
 * The global WorkflowEventEmitter instance.
 *
 * Shared across all use case calls so that SSE routes, reducers, and
 * IM adapters can subscribe to the same event stream.
 */
let globalEmitter: WorkflowEventEmitterImpl = new WorkflowEventEmitterImpl();

/**
 * Get the global emitter instance.
 * Use this to subscribe to events from routes or other consumers.
 */
export function getWorkflowEventEmitter(): WorkflowEventEmitter & {
  getHistory(runId?: string): WorkflowEvent[];
  readonly subscriberCount: number;
} {
  return globalEmitter;
}

/**
 * Reset the global emitter (for testing).
 */
export function resetWorkflowEventEmitter(): void {
  globalEmitter.clear();
  globalEmitter = new WorkflowEventEmitterImpl();
}

// ---------------------------------------------------------------------------
// Internal state: map of runId -> activeProcessId
// (mirrors workbenchRunUseCase; kept here for event-emitting orchestration)
// ---------------------------------------------------------------------------

const activeProcesses = new Map<string, string>();
const taskActiveRuns = new Map<string, string>();

// ---------------------------------------------------------------------------
// Event factory helpers
// ---------------------------------------------------------------------------

type EventContext = {
  runId: string;
  projectId: string;
  workflowId: string;
};

function emitEvent(event: WorkflowEvent): void {
  globalEmitter.emit(event);
}

// ---------------------------------------------------------------------------
// Event-emitting orchestration functions
// ---------------------------------------------------------------------------

/**
 * Create a workflow run and emit RUN_CREATED + RUN_STARTED events.
 */
export async function createEventedWorkflowRun(
  config: {
    workflow: Workflow;
    project: Project;
    triggeredBy: string;
  },
): Promise<LocalResult<WorkflowRun>> {
  const { workflow, project, triggeredBy } = config;

  const runResult = await createWorkflowRun({ workflow, project, triggeredBy });

  if (!runResult.ok || !runResult.data) {
    return runResult;
  }

  const run = runResult.data;
  const ctx: EventContext = {
    runId: run.id,
    projectId: project.id,
    workflowId: workflow.id,
  };

  // Emit RUN_CREATED
  emitEvent({
    ...createEventBase('RUN_CREATED', ctx.runId, ctx.projectId, ctx.workflowId),
    type: 'RUN_CREATED',
    payload: { triggeredBy, totalSteps: workflow.steps.length },
  });

  // Emit RUN_STARTED
  const firstStep = workflow.steps[0];
  emitEvent({
    ...createEventBase('RUN_STARTED', ctx.runId, ctx.projectId, ctx.workflowId),
    type: 'RUN_STARTED',
    payload: {
      triggeredBy,
      firstStepId: firstStep.id,
      firstStepName: firstStep.name,
    },
  });

  // Emit STEP_STARTED for the first step
  emitEvent({
    ...createEventBase('STEP_STARTED', ctx.runId, ctx.projectId, ctx.workflowId),
    type: 'STEP_STARTED',
    payload: {
      stepId: firstStep.id,
      stepName: firstStep.name,
      roleId: firstStep.roleId || '',
      stepIndex: 0,
      inputArtifacts: [],
    },
  });

  return runResult;
}

/**
 * Start a workbench run with event emission.
 *
 * Combines workflow run creation + runner process start.
 * Emits: RUN_CREATED, RUN_STARTED, STEP_STARTED, RUNNER_STARTED
 */
export async function startEventedWorkbenchRun(
  adapter: ProcessRunnerAdapter,
  config: {
    workflow: Workflow;
    project: Project;
    task: Task;
    triggeredBy: string;
    runnerKind: RunnerKind;
    cwd: string;
    command?: string;
    args?: string[];
    env?: Record<string, string>;
  },
): Promise<LocalResult<{
  run: WorkflowRun;
  processId: string;
}>> {
  const { workflow, project, task, triggeredBy, runnerKind, cwd, command, args, env } = config;

  // Validate
  if (!workflow.steps || workflow.steps.length === 0) {
    return { ok: false, error: { code: 'INVALID_INPUT', message: 'Workflow has no steps', recoverable: false } };
  }

  // Duplicate check
  const existingRunId = taskActiveRuns.get(task.id);
  if (existingRunId) {
    const existingRun = workflowRuns.get(existingRunId);
    if (existingRun && existingRun.state !== 'completed' && existingRun.state !== 'failed' && existingRun.state !== 'cancelled') {
      return { ok: false, error: { code: 'DUPLICATE_START', message: `Task ${task.id} already has active run ${existingRunId}`, recoverable: true } };
    }
    taskActiveRuns.delete(task.id);
  }

  // Create run
  const runResult = await createEventedWorkflowRun({ workflow, project, triggeredBy });
  if (!runResult.ok || !runResult.data) {
    return { ok: false, error: runResult.error || { code: 'UNKNOWN', message: 'Failed to create workflow run', recoverable: false } };
  }

  const run = runResult.data;

  // Start runner for first step
  const firstStep = workflow.steps[0];
  const runnerConfig: StartRunnerConfig = {
    runnerId: `runner-${run.id}-${firstStep.id}`,
    runnerKind,
    command: command || '',
    args: args || [],
    cwd,
    env,
    stepContext: {
      stepId: firstStep.id,
      workflowId: workflow.id,
      projectId: project.id,
    },
  };

  const procResult = await startRunnerProcess(adapter, runnerConfig);
  if (!procResult.ok || !procResult.data) {
    await cancelWorkflowRun(run.id, `Runner failed to start: ${procResult.error?.message || 'unknown'}`);
    return { ok: false, error: procResult.error || { code: 'UNKNOWN', message: 'Runner failed to start', recoverable: true } };
  }

  const processId = procResult.data.id;
  activeProcesses.set(run.id, processId);
  taskActiveRuns.set(task.id, run.id);

  const ctx: EventContext = {
    runId: run.id,
    projectId: project.id,
    workflowId: workflow.id,
  };

  // Emit RUNNER_STARTED
  emitEvent({
    ...createEventBase('RUNNER_STARTED', ctx.runId, ctx.projectId, ctx.workflowId),
    type: 'RUNNER_STARTED',
    payload: {
      stepId: firstStep.id,
      processId,
      runnerKind: String(runnerKind),
    },
  });

  return {
    ok: true,
    data: { run, processId },
    diagnostics: [
      `Evented workbench run started: ${run.id}`,
      `Step 1: ${firstStep.name}`,
      `Runner process: ${processId}`,
    ],
  };
}

/**
 * Advance a workflow step with event emission.
 *
 * Emits: STEP_COMPLETED (or STEP_FAILED), STEP_STARTED (next step), RUNNER_STARTED (next step),
 *        RUN_COMPLETED or RUN_FAILED (if terminal).
 */
export async function advanceEventedStep(
  config: {
    runId: string;
    completedStepId: string;
    outputArtifacts?: string[];
    error?: string;
    workflow: Workflow;
  },
): Promise<LocalResult<WorkflowRun>> {
  const { runId, completedStepId, outputArtifacts, error, workflow } = config;

  const runResult = await getWorkflowRun(runId);
  if (!runResult.ok || !runResult.data) {
    return { ok: false, error: runResult.error };
  }
  const currentRun = runResult.data;

  const ctx: EventContext = {
    runId,
    projectId: currentRun.projectId,
    workflowId: workflow.id,
  };

  const completedIndex = currentRun.steps.findIndex(s => s.stepId === completedStepId);
  if (completedIndex === -1) {
    return { ok: false, error: { code: 'INVALID_INPUT', message: `Step not found: ${completedStepId}`, recoverable: false } };
  }

  const completedStep = currentRun.steps[completedIndex];
  const workflowStep = workflow.steps[completedIndex];
  const startedAt = completedStep.startedAt ? new Date(completedStep.startedAt).getTime() : Date.now();
  const durationMs = Date.now() - startedAt;

  // Advance the step
  const advanceResult = await advanceWorkflowStep({
    run: currentRun,
    workflow,
    completedStepId,
    outputArtifacts,
    error,
  });

  if (!advanceResult.ok || !advanceResult.data) {
    // Emit STEP_FAILED
    emitEvent({
      ...createEventBase('STEP_FAILED', ctx.runId, ctx.projectId, ctx.workflowId),
      type: 'STEP_FAILED',
      payload: {
        stepId: completedStepId,
        stepName: completedStep.stepName,
        roleId: completedStep.roleId,
        stepIndex: completedIndex,
        error: advanceResult.error?.message || 'Advance failed',
      },
    });
    return { ok: false, error: advanceResult.error };
  }

  const advancedRun = advanceResult.data;

  if (error) {
    // Step failed
    emitEvent({
      ...createEventBase('STEP_FAILED', ctx.runId, ctx.projectId, ctx.workflowId),
      type: 'STEP_FAILED',
      payload: {
        stepId: completedStepId,
        stepName: completedStep.stepName,
        roleId: completedStep.roleId,
        stepIndex: completedIndex,
        error,
      },
    });

    // Emit RUN_FAILED
    emitEvent({
      ...createEventBase('RUN_FAILED', ctx.runId, ctx.projectId, ctx.workflowId),
      type: 'RUN_FAILED',
      payload: {
        failedAtStepId: completedStepId,
        failedAtStepName: completedStep.stepName,
        error,
      },
    });
  } else {
    // Step completed
    emitEvent({
      ...createEventBase('STEP_COMPLETED', ctx.runId, ctx.projectId, ctx.workflowId),
      type: 'STEP_COMPLETED',
      payload: {
        stepId: completedStepId,
        stepName: completedStep.stepName,
        roleId: completedStep.roleId,
        stepIndex: completedIndex,
        outputArtifacts: outputArtifacts || [],
        durationMs,
      },
    });

    // Emit ARTIFACT_PRODUCED for each output artifact
    if (outputArtifacts) {
      for (const artifactId of outputArtifacts) {
        emitEvent({
          ...createEventBase('ARTIFACT_PRODUCED', ctx.runId, ctx.projectId, ctx.workflowId),
          type: 'ARTIFACT_PRODUCED',
          payload: {
            stepId: completedStepId,
            artifactId,
            artifactType: 'unknown',
            location: `outputs/${artifactId}`,
          },
        });
      }
    }
  }

  // If run completed
  if (advancedRun.state === 'completed') {
    const totalMs = advancedRun.startedAt
      ? Date.now() - new Date(advancedRun.startedAt).getTime()
      : 0;
    emitEvent({
      ...createEventBase('RUN_COMPLETED', ctx.runId, ctx.projectId, ctx.workflowId),
      type: 'RUN_COMPLETED',
      payload: {
        completedSteps: advancedRun.steps.filter(s => s.state === 'completed').length,
        totalSteps: advancedRun.steps.length,
        durationMs: totalMs,
      },
    });
    return advanceResult;
  }

  // If run failed (e.g. step error propagated)
  if (advancedRun.state === 'failed') {
    if (!error) {
      // The step itself didn't error but the run transitioned to failed (shouldn't normally happen without step error)
      emitEvent({
        ...createEventBase('RUN_FAILED', ctx.runId, ctx.projectId, ctx.workflowId),
        type: 'RUN_FAILED',
        payload: {
          failedAtStepId: completedStepId,
          failedAtStepName: completedStep.stepName,
          error: advancedRun.error || 'Run failed',
        },
      });
    }
    return advanceResult;
  }

  // If waiting at gate
  if (advancedRun.state === 'waiting-gate') {
    const gateStep = workflow.steps[advancedRun.currentStepIndex];
    if (gateStep) {
      emitEvent({
        ...createEventBase('STEP_STARTED', ctx.runId, ctx.projectId, ctx.workflowId),
        type: 'STEP_STARTED',
        payload: {
          stepId: gateStep.id,
          stepName: gateStep.name,
          roleId: gateStep.roleId || '',
          stepIndex: advancedRun.currentStepIndex,
          inputArtifacts: outputArtifacts || [],
        },
      });
      emitEvent({
        ...createEventBase('GATE_OPENED', ctx.runId, ctx.projectId, ctx.workflowId),
        type: 'GATE_OPENED',
        payload: {
          stepId: gateStep.id,
          stepName: gateStep.name,
          gateType: 'manual',
          requiredDeciderRoleId: gateStep.roleId || 'lead',
        },
      });
    }
    return advanceResult;
  }

  // Next step started
  if (advancedRun.state === 'running' && advancedRun.currentStepId) {
    const nextStep = workflow.steps[advancedRun.currentStepIndex];
    if (nextStep) {
      emitEvent({
        ...createEventBase('STEP_STARTED', ctx.runId, ctx.projectId, ctx.workflowId),
        type: 'STEP_STARTED',
        payload: {
          stepId: nextStep.id,
          stepName: nextStep.name,
          roleId: nextStep.roleId || '',
          stepIndex: advancedRun.currentStepIndex,
          inputArtifacts: outputArtifacts || [],
        },
      });
    }
  }

  return advanceResult;
}

/**
 * Handle a gate decision with event emission.
 *
 * Emits: GATE_APPROVED or GATE_REJECTED, STEP_COMPLETED, STEP_STARTED (next step),
 *        RUN_COMPLETED or RUN_FAILED (if terminal).
 */
export async function handleEventedGate(
  config: {
    runId: string;
    decision: 'approve' | 'reject';
    decidedBy: string;
    reason?: string;
    workflow: Workflow;
  },
): Promise<LocalResult<WorkflowRun>> {
  const { runId, decision, decidedBy, reason, workflow } = config;

  const runResult = await getWorkflowRun(runId);
  if (!runResult.ok || !runResult.data) {
    return { ok: false, error: runResult.error };
  }
  const currentRun = runResult.data;

  if (currentRun.state !== 'waiting-gate') {
    return { ok: false, error: { code: 'INVALID_INPUT', message: 'Run is not in waiting-gate state', recoverable: false } };
  }

  const ctx: EventContext = {
    runId,
    projectId: currentRun.projectId,
    workflowId: workflow.id,
  };

  const gateStepIndex = currentRun.currentStepIndex;
  const gateStep = currentRun.steps[gateStepIndex];

  // Emit GATE_APPROVED or GATE_REJECTED
  if (decision === 'approve') {
    emitEvent({
      ...createEventBase('GATE_APPROVED', ctx.runId, ctx.projectId, ctx.workflowId),
      type: 'GATE_APPROVED',
      payload: {
        stepId: gateStep.stepId,
        stepName: gateStep.stepName,
        decidedBy,
        reason,
      },
    });
  } else {
    emitEvent({
      ...createEventBase('GATE_REJECTED', ctx.runId, ctx.projectId, ctx.workflowId),
      type: 'GATE_REJECTED',
      payload: {
        stepId: gateStep.stepId,
        stepName: gateStep.stepName,
        decidedBy,
        reason,
      },
    });
  }

  // Handle gate
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

  if (decision === 'reject') {
    // Emit STEP_FAILED and RUN_FAILED
    emitEvent({
      ...createEventBase('STEP_FAILED', ctx.runId, ctx.projectId, ctx.workflowId),
      type: 'STEP_FAILED',
      payload: {
        stepId: gateStep.stepId,
        stepName: gateStep.stepName,
        roleId: gateStep.roleId,
        stepIndex: gateStepIndex,
        error: `Gate rejected: ${reason || 'No reason given'}`,
      },
    });
    emitEvent({
      ...createEventBase('RUN_FAILED', ctx.runId, ctx.projectId, ctx.workflowId),
      type: 'RUN_FAILED',
      payload: {
        failedAtStepId: gateStep.stepId,
        failedAtStepName: gateStep.stepName,
        error: `Gate rejected: ${reason || 'No reason given'}`,
      },
    });
    return gateResult;
  }

  // Gate approved — emit STEP_COMPLETED for the gate step
  emitEvent({
    ...createEventBase('STEP_COMPLETED', ctx.runId, ctx.projectId, ctx.workflowId),
    type: 'STEP_COMPLETED',
    payload: {
      stepId: gateStep.stepId,
      stepName: gateStep.stepName,
      roleId: gateStep.roleId,
      stepIndex: gateStepIndex,
      outputArtifacts: gateStep.outputArtifacts || [],
      durationMs: gateStep.startedAt ? Date.now() - new Date(gateStep.startedAt).getTime() : 0,
    },
  });

  // Check if run completed after gate
  if (gatedRun.state === 'completed') {
    const totalMs = gatedRun.startedAt ? Date.now() - new Date(gatedRun.startedAt).getTime() : 0;
    emitEvent({
      ...createEventBase('RUN_COMPLETED', ctx.runId, ctx.projectId, ctx.workflowId),
      type: 'RUN_COMPLETED',
      payload: {
        completedSteps: gatedRun.steps.filter(s => s.state === 'completed').length,
        totalSteps: gatedRun.steps.length,
        durationMs: totalMs,
      },
    });
    return gateResult;
  }

  // Next step started
  if (gatedRun.state === 'running' && gatedRun.currentStepId) {
    const nextWorkflowStep = workflow.steps[gatedRun.currentStepIndex];
    if (nextWorkflowStep) {
      emitEvent({
        ...createEventBase('STEP_STARTED', ctx.runId, ctx.projectId, ctx.workflowId),
        type: 'STEP_STARTED',
        payload: {
          stepId: nextWorkflowStep.id,
          stepName: nextWorkflowStep.name,
          roleId: nextWorkflowStep.roleId || '',
          stepIndex: gatedRun.currentStepIndex,
          inputArtifacts: gateStep.outputArtifacts || [],
        },
      });
    }
  }

  return gateResult;
}

/**
 * Pause a workflow run with event emission.
 *
 * Emits: RUN_PAUSED
 */
export async function pauseEventedRun(
  runId: string,
): Promise<LocalResult<WorkflowRun>> {
  const runResult = await getWorkflowRun(runId);
  if (!runResult.ok || !runResult.data) {
    return { ok: false, error: runResult.error };
  }
  const run = runResult.data;

  const pauseResult = await pauseWorkflowRun(runId);
  if (!pauseResult.ok || !pauseResult.data) {
    return { ok: false, error: pauseResult.error };
  }

  emitEvent({
    ...createEventBase('RUN_PAUSED', runId, run.projectId, run.workflowId),
    type: 'RUN_PAUSED',
    payload: {
      pausedAtStepId: run.currentStepId || '',
      pausedAtStepName: run.steps[run.currentStepIndex]?.stepName || '',
    },
  });

  return pauseResult;
}

/**
 * Resume a workflow run with event emission.
 *
 * Emits: RUN_RESUMED, STEP_STARTED (if re-entering a step)
 */
export async function resumeEventedRun(
  runId: string,
  workflow?: Workflow,
): Promise<LocalResult<WorkflowRun>> {
  const runResult = await getWorkflowRun(runId);
  if (!runResult.ok || !runResult.data) {
    return { ok: false, error: runResult.error };
  }
  const run = runResult.data;

  const resumeResult = await resumeWorkflowRun(runId);
  if (!resumeResult.ok || !resumeResult.data) {
    return { ok: false, error: resumeResult.error };
  }

  const resumedRun = resumeResult.data;

  emitEvent({
    ...createEventBase('RUN_RESUMED', runId, run.projectId, run.workflowId),
    type: 'RUN_RESUMED',
    payload: {
      resumedAtStepId: resumedRun.currentStepId || '',
      resumedAtStepName: resumedRun.steps[resumedRun.currentStepIndex]?.stepName || '',
    },
  });

  return resumeResult;
}

/**
 * Cancel a workflow run with event emission.
 *
 * Emits: RUN_CANCELLED
 */
export async function cancelEventedRun(
  runId: string,
  reason?: string,
  cancelledBy?: string,
): Promise<LocalResult<WorkflowRun>> {
  const runResult = await getWorkflowRun(runId);
  if (!runResult.ok || !runResult.data) {
    return { ok: false, error: runResult.error };
  }
  const run = runResult.data;

  const cancelResult = await cancelWorkflowRun(runId, reason);
  if (!cancelResult.ok || !cancelResult.data) {
    return { ok: false, error: cancelResult.error };
  }

  emitEvent({
    ...createEventBase('RUN_CANCELLED', runId, run.projectId, run.workflowId),
    type: 'RUN_CANCELLED',
    payload: {
      reason: reason || 'User cancelled',
      cancelledBy: cancelledBy || 'user',
    },
  });

  // Clean up internal tracking
  activeProcesses.delete(runId);
  for (const [tid, rid] of taskActiveRuns) {
    if (rid === runId) {
      taskActiveRuns.delete(tid);
      break;
    }
  }

  return cancelResult;
}

/**
 * Emit a RUNNER_LOG event.
 *
 * Called when the runner produces stdout/stderr output.
 */
export function emitRunnerLogEvent(
  ctx: EventContext,
  stepId: string,
  processId: string,
  stream: 'stdout' | 'stderr',
  content: string,
): void {
  emitEvent({
    ...createEventBase('RUNNER_LOG', ctx.runId, ctx.projectId, ctx.workflowId),
    type: 'RUNNER_LOG',
    payload: { stepId, processId, stream, content },
  });
}

/**
 * Emit a RUNNER_STOPPED event.
 *
 * Called when a runner process exits.
 */
export function emitRunnerStoppedEvent(
  ctx: EventContext,
  stepId: string,
  processId: string,
  exitCode: number | null,
  reason: 'completed' | 'error' | 'user_stop',
): void {
  emitEvent({
    ...createEventBase('RUNNER_STOPPED', ctx.runId, ctx.projectId, ctx.workflowId),
    type: 'RUNNER_STOPPED',
    payload: { stepId, processId, exitCode, reason },
  });
}

/**
 * Emit a RUN_ERROR event.
 */
export function emitRunErrorEvent(
  ctx: EventContext,
  errorCode: string,
  message: string,
  recoverable: boolean,
  stepId?: string,
): void {
  emitEvent({
    ...createEventBase('RUN_ERROR', ctx.runId, ctx.projectId, ctx.workflowId),
    type: 'RUN_ERROR',
    payload: { stepId, errorCode, message, recoverable },
  });
}

/**
 * Emit a STEP_SKIPPED event.
 */
export function emitStepSkippedEvent(
  ctx: EventContext,
  stepId: string,
  stepName: string,
  stepIndex: number,
  reason: string,
): void {
  emitEvent({
    ...createEventBase('STEP_SKIPPED', ctx.runId, ctx.projectId, ctx.workflowId),
    type: 'STEP_SKIPPED',
    payload: { stepId, stepName, stepIndex, reason },
  });
}

// ---------------------------------------------------------------------------
// Event replay for SSE reconnection
// ---------------------------------------------------------------------------

/**
 * Get all events for a specific run from the history buffer.
 * Used when an SSE client reconnects and needs events it may have missed.
 */
export function getRunEvents(runId: string): WorkflowEvent[] {
  return globalEmitter.getHistory(runId);
}

/**
 * Get all events from the history buffer.
 */
export function getAllEvents(): WorkflowEvent[] {
  return globalEmitter.getHistory();
}

// ---------------------------------------------------------------------------
// Testing helpers
// ---------------------------------------------------------------------------

/**
 * Reset all internal state (for testing).
 */
export function resetEventUseCaseState(): void {
  activeProcesses.clear();
  taskActiveRuns.clear();
  resetWorkflowEventEmitter();
}
