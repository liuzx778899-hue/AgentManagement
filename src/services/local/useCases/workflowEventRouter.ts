/**
 * WorkflowEventRouter - Event Routing Use Case
 *
 * Routes WorkflowEvents to the correct side effects:
 * - SSE streaming clients (push real-time events)
 * - WorkflowRun state synchronization (update in-memory run state)
 * - IM notification triggers (send notifications for important events)
 * - Audit logging (persist events for history/audit)
 *
 * This is the central coordination point for event-driven architecture.
 * It subscribes to workflowEventEmitter and dispatches to handlers.
 *
 * Usage:
 * 1. Call initializeEventRouter() at server startup to attach handlers
 * 2. Call shutdownEventRouter() at server shutdown to clean up
 * 3. Use registerSseClient/unregisterSseClient for SSE stream management
 */

import {
  type WorkflowEvent,
  type WorkflowEventType,
  type WorkflowEventHandler,
} from '../../../domain/workflowEvent';
import {
  workflowEventEmitter,
  resetEventEmitter,
} from '../workflowEventEmitter';
import {
  workflowRuns,
  type WorkflowRun,
  type WorkflowRunState,
} from './workflowExecutionUseCase';

// ---------------------------------------------------------------------------
// SSE Client Registry
// ---------------------------------------------------------------------------

/**
 * SSE client handler interface.
 * Each SSE client has a send function to push events.
 */
export interface SseClient {
  id: string;
  runId: string;
  send: (event: WorkflowEvent) => void;
}

/**
 * Map of SSE clients, keyed by client.id.
 */
const sseClients = new Map<string, SseClient>();

/**
 * Map of runId -> Set of clientIds (for efficient dispatch to run subscribers).
 */
const sseClientsByRun = new Map<string, Set<string>>();

/**
 * Register an SSE client for streaming events of a specific run.
 */
export function registerSseClient(client: SseClient): () => void {
  sseClients.set(client.id, client);

  let runClients = sseClientsByRun.get(client.runId);
  if (!runClients) {
    runClients = new Set();
    sseClientsByRun.set(client.runId, runClients);
  }
  runClients.add(client.id);

  // Return unsubscribe function
  return () => {
    unregisterSseClient(client.id);
  };
}

/**
 * Unregister an SSE client.
 */
export function unregisterSseClient(clientId: string): void {
  const client = sseClients.get(clientId);
  if (!client) return;

  sseClients.delete(clientId);

  const runClients = sseClientsByRun.get(client.runId);
  if (runClients) {
    runClients.delete(clientId);
    if (runClients.size === 0) {
      sseClientsByRun.delete(client.runId);
    }
  }
}

/**
 * Get all SSE clients for a specific run.
 */
export function getSseClientsForRun(runId: string): SseClient[] {
  const runClients = sseClientsByRun.get(runId);
  if (!runClients) return [];

  const clients: SseClient[] = [];
  for (const clientId of runClients) {
    const client = sseClients.get(clientId);
    if (client) clients.push(client);
  }
  return clients;
}

/**
 * Check if there are SSE clients for a run.
 */
export function hasSseClientsForRun(runId: string): boolean {
  const runClients = sseClientsByRun.get(runId);
  return runClients !== undefined && runClients.size > 0;
}

// ---------------------------------------------------------------------------
// IM Notification Triggers
// ---------------------------------------------------------------------------

/**
 * IM notification handler interface.
 */
export interface ImNotificationHandler {
  (event: WorkflowEvent): Promise<void> | void;
}

/**
 * Registered IM notification handler.
 */
let imNotificationHandler: ImNotificationHandler | null = null;

/**
 * Register an IM notification handler.
 * The handler will be called for events that should trigger notifications.
 */
export function registerImNotificationHandler(handler: ImNotificationHandler): void {
  imNotificationHandler = handler;
}

/**
 * Unregister the IM notification handler.
 */
export function unregisterImNotificationHandler(): void {
  imNotificationHandler = null;
}

/**
 * Events that trigger IM notifications.
 */
const IM_NOTIFY_TYPES: WorkflowEventType[] = [
  'RUN_STARTED',
  'RUN_COMPLETED',
  'RUN_FAILED',
  'RUN_CANCELLED',
  'STEP_FAILED',
  'GATE_OPENED',
  'GATE_APPROVED',
  'GATE_REJECTED',
  'RUN_ERROR',
];

// ---------------------------------------------------------------------------
// Audit Logging
// ---------------------------------------------------------------------------

/**
 * Audit log handler interface.
 */
export interface AuditLogHandler {
  (event: WorkflowEvent): Promise<void> | void;
}

/**
 * Registered audit log handler.
 */
let auditLogHandler: AuditLogHandler | null = null;

/**
 * Register an audit log handler.
 */
export function registerAuditLogHandler(handler: AuditLogHandler): void {
  auditLogHandler = handler;
}

/**
 * Unregister the audit log handler.
 */
export function unregisterAuditLogHandler(): void {
  auditLogHandler = null;
}

// ---------------------------------------------------------------------------
// Event Router Core
// ---------------------------------------------------------------------------

/**
 * Unsubscribe functions from workflowEventEmitter.
 */
let unsubscribeGlobal: (() => void) | null = null;

/**
 * Initialize the event router by subscribing to workflowEventEmitter.
 *
 * This attaches the following handlers:
 * 1. SSE dispatch - pushes events to connected SSE clients
 * 2. IM notification - calls registered handler for notification-worthy events
 * 3. Audit logging - calls registered handler for all events
 */
export function initializeEventRouter(): void {
  // Subscribe to all events for routing
  unsubscribeGlobal = workflowEventEmitter.subscribe((event: WorkflowEvent) => {
    // 1. Dispatch to SSE clients
    dispatchToSse(event);

    // 2. Trigger IM notifications if handler registered
    if (imNotificationHandler && IM_NOTIFY_TYPES.includes(event.type)) {
      try {
        imNotificationHandler(event);
      } catch (err) {
        console.error('[WorkflowEventRouter] IM notification handler error:', err);
      }
    }

    // 3. Audit logging if handler registered
    if (auditLogHandler) {
      try {
        auditLogHandler(event);
      } catch (err) {
        console.error('[WorkflowEventRouter] Audit log handler error:', err);
      }
    }
  });
}

/**
 * Shutdown the event router by unsubscribing and clearing state.
 */
export function shutdownEventRouter(): void {
  if (unsubscribeGlobal) {
    unsubscribeGlobal();
    unsubscribeGlobal = null;
  }

  // Clear all SSE clients
  sseClients.clear();
  sseClientsByRun.clear();

  // Clear handlers
  imNotificationHandler = null;
  auditLogHandler = null;
}

/**
 * Dispatch an event to SSE clients.
 *
 * SSE clients receive ALL events for the run they subscribed to.
 */
function dispatchToSse(event: WorkflowEvent): void {
  const runId = event.runId;
  const clients = getSseClientsForRun(runId);

  for (const client of clients) {
    try {
      client.send(event);
    } catch (err) {
      // Client send failed - likely disconnected
      // Clean up the client
      console.error(`[WorkflowEventRouter] SSE client ${client.id} send error:`, err);
      unregisterSseClient(client.id);
    }
  }
}

// ---------------------------------------------------------------------------
// WorkflowRun State Synchronization (Optional)
// ---------------------------------------------------------------------------

/**
 * Sync WorkflowRun state from events.
 *
 * This is an alternative path for updating WorkflowRun state via events,
 * in case the useCase-level state management is not the primary source.
 * Currently, workflowExecutionUseCase directly manages state in workflowRuns Map.
 * This function is provided for future flexibility.
 */
export function syncWorkflowRunFromEvent(event: WorkflowEvent): void {
  const run = workflowRuns.get(event.runId);
  if (!run) return;

  // Update run state based on event type
  switch (event.type) {
    case 'RUN_STARTED':
      run.state = 'running';
      run.currentStepId = event.payload.firstStepId;
      break;

    case 'RUN_PAUSED':
      run.state = 'paused';
      break;

    case 'RUN_RESUMED':
      run.state = 'running';
      run.currentStepId = event.payload.resumedAtStepId;
      break;

    case 'RUN_COMPLETED':
      run.state = 'completed';
      run.completedAt = event.timestamp;
      run.currentStepId = null;
      break;

    case 'RUN_FAILED':
      run.state = 'failed';
      run.completedAt = event.timestamp;
      run.error = event.payload.error;
      run.currentStepId = null;
      break;

    case 'RUN_CANCELLED':
      run.state = 'cancelled';
      run.completedAt = event.timestamp;
      run.error = event.payload.reason;
      break;

    case 'GATE_OPENED':
      run.state = 'waiting-gate';
      break;

    case 'GATE_APPROVED':
      // Gate approved - run continues (state updated by advanceWorkflowStep)
      break;

    case 'GATE_REJECTED':
      run.state = 'failed';
      run.completedAt = event.timestamp;
      run.error = `Gate rejected: ${event.payload.reason || 'No reason'}`;
      break;

    // Step events handled by workflowExecutionUseCase directly
    case 'STEP_STARTED':
    case 'STEP_COMPLETED':
    case 'STEP_FAILED':
    case 'STEP_SKIPPED':
      // These are handled by workflowExecutionUseCase
      break;

    // Runner events - informational only
    case 'RUNNER_STARTED':
    case 'RUNNER_STOPPED':
    case 'RUNNER_LOG':
      // No run state change from runner events
      break;

    case 'ARTIFACT_PRODUCED':
      // Update step outputArtifacts (optional)
      const step = run.steps.find(s => s.stepId === event.payload.stepId);
      if (step && !step.outputArtifacts.includes(event.payload.artifactId)) {
        step.outputArtifacts.push(event.payload.artifactId);
      }
      break;

    case 'RUN_ERROR':
      // Recoverable errors don't change run state
      if (!event.payload.recoverable) {
        run.state = 'failed';
        run.error = event.payload.message;
      }
      break;
  }
}

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

/**
 * Get event router statistics.
 */
export function getEventRouterStats(): {
  sseClients: number;
  sseClientsByRun: Record<string, number>;
  hasImHandler: boolean;
  hasAuditHandler: boolean;
  isInitialized: boolean;
} {
  const clientsByRun: Record<string, number> = {};
  for (const [runId, clients] of sseClientsByRun) {
    clientsByRun[runId] = clients.size;
  }

  return {
    sseClients: sseClients.size,
    sseClientsByRun: clientsByRun,
    hasImHandler: imNotificationHandler !== null,
    hasAuditHandler: auditLogHandler !== null,
    isInitialized: unsubscribeGlobal !== null,
  };
}

/**
 * Reset all event router state (for testing).
 */
export function resetEventRouter(): void {
  shutdownEventRouter();
  resetEventEmitter();
}