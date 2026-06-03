/**
 * WorkflowEvent Domain Model
 *
 * Defines all events emitted during workflow execution lifecycle.
 * These events are the backbone of the event-driven architecture that
 * connects the workflow engine, SSE push, state management, and IM notifications.
 *
 * Design Principles:
 * - Discriminated union via `type` field for exhaustive pattern matching
 * - Each event carries only the data relevant to that transition
 * - Timestamps in ISO 8601; IDs are opaque strings
 * - Events are immutable records of what happened; they never change after creation
 *
 * Future integration points (reserved, not yet wired):
 * - SSE route: /api/workflow/events?runId=xxx  (stream WorkflowEvent via EventSource)
 * - Reducer: DISPATCH_WORKFLOW_EVENT action processes events into state updates
 * - IM notifications: ImRouteRule.eventType maps to WorkflowEventType
 * - Audit log: persist events for workflow run history
 */

// ---------------------------------------------------------------------------
// Event Types
// ---------------------------------------------------------------------------

/**
 * Every distinct kind of workflow lifecycle event.
 *
 * Naming convention: `<NOUN>_<VERB/PAST_PARTICIPLE>` in SCREAMING_SNAKE_CASE.
 */
export type WorkflowEventType =
  // --- Run-level lifecycle ---
  | 'RUN_CREATED'
  | 'RUN_STARTED'
  | 'RUN_PAUSED'
  | 'RUN_RESUMED'
  | 'RUN_COMPLETED'
  | 'RUN_FAILED'
  | 'RUN_CANCELLED'

  // --- Step-level lifecycle ---
  | 'STEP_STARTED'
  | 'STEP_COMPLETED'
  | 'STEP_FAILED'
  | 'STEP_SKIPPED'

  // --- Gate lifecycle ---
  | 'GATE_OPENED'
  | 'GATE_APPROVED'
  | 'GATE_REJECTED'
  | 'CHANGE_REQUESTED'

  // --- Process / Runner lifecycle ---
  | 'RUNNER_STARTED'
  | 'RUNNER_STOPPED'
  | 'RUNNER_LOG'

  // --- Artifact events ---
  | 'ARTIFACT_PRODUCED'

  // --- Error / recovery ---
  | 'RUN_ERROR';

// ---------------------------------------------------------------------------
// Event Payloads
// ---------------------------------------------------------------------------

/** Common fields present on every workflow event. */
export interface WorkflowEventBase {
  /** Unique event identifier. */
  id: string;
  /** The kind of event. */
  type: WorkflowEventType;
  /** ISO 8601 timestamp of when the event occurred. */
  timestamp: string;
  /** The workflow run this event belongs to. */
  runId: string;
  /** The project this run belongs to. */
  projectId: string;
  /** The workflow template ID. */
  workflowId: string;
}

// --- Run-level event payloads ---

export interface RunCreatedEvent extends WorkflowEventBase {
  type: 'RUN_CREATED';
  payload: {
    triggeredBy: string;
    totalSteps: number;
  };
}

export interface RunStartedEvent extends WorkflowEventBase {
  type: 'RUN_STARTED';
  payload: {
    triggeredBy: string;
    firstStepId: string;
    firstStepName: string;
  };
}

export interface RunPausedEvent extends WorkflowEventBase {
  type: 'RUN_PAUSED';
  payload: {
    pausedAtStepId: string;
    pausedAtStepName: string;
  };
}

export interface RunResumedEvent extends WorkflowEventBase {
  type: 'RUN_RESUMED';
  payload: {
    resumedAtStepId: string;
    resumedAtStepName: string;
  };
}

export interface RunCompletedEvent extends WorkflowEventBase {
  type: 'RUN_COMPLETED';
  payload: {
    completedSteps: number;
    totalSteps: number;
    durationMs: number;
  };
}

export interface RunFailedEvent extends WorkflowEventBase {
  type: 'RUN_FAILED';
  payload: {
    failedAtStepId: string;
    failedAtStepName: string;
    error: string;
  };
}

export interface RunCancelledEvent extends WorkflowEventBase {
  type: 'RUN_CANCELLED';
  payload: {
    reason: string;
    cancelledBy: string;
  };
}

// --- Step-level event payloads ---

export interface StepStartedEvent extends WorkflowEventBase {
  type: 'STEP_STARTED';
  payload: {
    stepId: string;
    stepName: string;
    roleId: string;
    stepIndex: number;
    /** Input artifact IDs passed into this step. */
    inputArtifacts: string[];
  };
}

export interface StepCompletedEvent extends WorkflowEventBase {
  type: 'STEP_COMPLETED';
  payload: {
    stepId: string;
    stepName: string;
    roleId: string;
    stepIndex: number;
    /** Artifact IDs produced by this step. */
    outputArtifacts: string[];
    durationMs: number;
  };
}

export interface StepFailedEvent extends WorkflowEventBase {
  type: 'STEP_FAILED';
  payload: {
    stepId: string;
    stepName: string;
    roleId: string;
    stepIndex: number;
    error: string;
  };
}

export interface StepSkippedEvent extends WorkflowEventBase {
  type: 'STEP_SKIPPED';
  payload: {
    stepId: string;
    stepName: string;
    stepIndex: number;
    reason: string;
  };
}

// --- Gate event payloads ---

export interface GateOpenedEvent extends WorkflowEventBase {
  type: 'GATE_OPENED';
  payload: {
    stepId: string;
    stepName: string;
    gateType: 'manual';
    /** Who is expected to decide (role ID). */
    requiredDeciderRoleId: string;
  };
}

export interface GateApprovedEvent extends WorkflowEventBase {
  type: 'GATE_APPROVED';
  payload: {
    stepId: string;
    stepName: string;
    decidedBy: string;
    reason?: string;
  };
}

export interface GateRejectedEvent extends WorkflowEventBase {
  type: 'GATE_REJECTED';
  payload: {
    stepId: string;
    stepName: string;
    decidedBy: string;
    reason?: string;
  };
}

export interface ChangeRequestedEvent extends WorkflowEventBase {
  type: 'CHANGE_REQUESTED';
  payload: {
    stepId: string;
    stepName: string;
    decidedBy: string;
    /** The step index to return to for modifications. */
    returnToStepId: string;
    returnToStepName: string;
    returnToStepIndex: number;
    /** Specific feedback on what needs to change. */
    requestedChanges: string;
    reason?: string;
  };
}

// --- Runner / Process event payloads ---

export interface RunnerStartedEvent extends WorkflowEventBase {
  type: 'RUNNER_STARTED';
  payload: {
    stepId: string;
    processId: string;
    runnerKind: string;
  };
}

export interface RunnerStoppedEvent extends WorkflowEventBase {
  type: 'RUNNER_STOPPED';
  payload: {
    stepId: string;
    processId: string;
    exitCode: number | null;
    reason: 'completed' | 'error' | 'user_stop';
  };
}

export interface RunnerLogEvent extends WorkflowEventBase {
  type: 'RUNNER_LOG';
  payload: {
    stepId: string;
    processId: string;
    stream: 'stdout' | 'stderr';
    content: string;
  };
}

// --- Artifact event payload ---

export interface ArtifactProducedEvent extends WorkflowEventBase {
  type: 'ARTIFACT_PRODUCED';
  payload: {
    stepId: string;
    artifactId: string;
    artifactType: string;
    /** Relative path or URI to the artifact. */
    location: string;
  };
}

// --- Error / recovery event payload ---

export interface RunErrorEvent extends WorkflowEventBase {
  type: 'RUN_ERROR';
  payload: {
    stepId?: string;
    errorCode: string;
    message: string;
    recoverable: boolean;
  };
}

// ---------------------------------------------------------------------------
// Discriminated Union
// ---------------------------------------------------------------------------

/**
 * The complete set of workflow events.
 * Use `event.type` in a switch/if to narrow the payload.
 */
export type WorkflowEvent =
  | RunCreatedEvent
  | RunStartedEvent
  | RunPausedEvent
  | RunResumedEvent
  | RunCompletedEvent
  | RunFailedEvent
  | RunCancelledEvent
  | StepStartedEvent
  | StepCompletedEvent
  | StepFailedEvent
  | StepSkippedEvent
  | GateOpenedEvent
  | GateApprovedEvent
  | GateRejectedEvent
  | ChangeRequestedEvent
  | RunnerStartedEvent
  | RunnerStoppedEvent
  | RunnerLogEvent
  | ArtifactProducedEvent
  | RunErrorEvent;

// ---------------------------------------------------------------------------
// Event Emitter Interface (reserved)
// ---------------------------------------------------------------------------

/**
 * Observer callback for workflow events.
 */
export type WorkflowEventHandler = (event: WorkflowEvent) => void;

/**
 * Interface for emitting and subscribing to workflow events.
 *
 * This is the contract that the workflow engine will use to broadcast events,
 * and that SSE routes / IM adapters / state reducers will implement to consume them.
 *
 * NOT YET WIRED — this interface is reserved for future implementation.
 */
export interface WorkflowEventEmitter {
  /**
   * Emit a workflow event to all subscribers.
   */
  emit(event: WorkflowEvent): void;

  /**
   * Subscribe to all workflow events.
   * Returns an unsubscribe function.
   */
  subscribe(handler: WorkflowEventHandler): () => void;

  /**
   * Subscribe to events of a specific type.
   * Returns an unsubscribe function.
   */
  on(type: WorkflowEventType, handler: WorkflowEventHandler): () => void;

  /**
   * Subscribe to events for a specific run.
   * Returns an unsubscribe function.
   */
  onRun(runId: string, handler: WorkflowEventHandler): () => void;

  /**
   * Remove all subscribers. Useful for cleanup in tests.
   */
  clear(): void;
}

// ---------------------------------------------------------------------------
// Event Factory Helpers
// ---------------------------------------------------------------------------

let eventCounter = 0;

/**
 * Generate a unique event ID.
 */
export function generateEventId(): string {
  eventCounter += 1;
  return `evt-${Date.now().toString(36)}-${eventCounter.toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Create the base fields shared by all events.
 */
export function createEventBase(
  type: WorkflowEventType,
  runId: string,
  projectId: string,
  workflowId: string,
): WorkflowEventBase {
  return {
    id: generateEventId(),
    type,
    timestamp: new Date().toISOString(),
    runId,
    projectId,
    workflowId,
  };
}

/**
 * Reset the event counter (for testing).
 */
export function resetEventCounter(): void {
  eventCounter = 0;
}
