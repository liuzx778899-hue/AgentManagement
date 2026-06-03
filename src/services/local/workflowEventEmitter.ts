/**
 * WorkflowEventEmitter - Concrete Implementation
 *
 * Implements the WorkflowEventEmitter interface from domain/workflowEvent.ts.
 * This is the central event bus for workflow lifecycle events.
 *
 * Design:
 * - In-memory pub/sub pattern with typed event filtering
 * - Supports global subscribers, type-specific subscribers, and run-specific subscribers
 * - Thread-safe for Node.js single-threaded event loop
 * - Cleanup on disconnect/test reset via clear()
 *
 * Integration points:
 * - workflowExecutionUseCase emits events after each state transition
 * - workbenchRunUseCase emits runner/process events
 * - SSE route subscribes to stream events to frontend
 * - IM adapters can subscribe for notification triggers
 * - Audit logger can subscribe for persistence
 */

import {
  type WorkflowEvent,
  type WorkflowEventType,
  type WorkflowEventHandler,
  type WorkflowEventEmitter,
  type WorkflowEventBase,
} from '../../domain/workflowEvent';

// ---------------------------------------------------------------------------
// Internal state: subscriber collections
// ---------------------------------------------------------------------------

/**
 * Global subscribers receive ALL events.
 */
const globalSubscribers: Set<WorkflowEventHandler> = new Set();

/**
 * Type-specific subscribers, keyed by WorkflowEventType.
 */
const typeSubscribers: Map<WorkflowEventType, Set<WorkflowEventHandler>> = new Map();

/**
 * Run-specific subscribers, keyed by runId.
 */
const runSubscribers: Map<string, Set<WorkflowEventHandler>> = new Map();

// ---------------------------------------------------------------------------
// WorkflowEventEmitter Implementation
// ---------------------------------------------------------------------------

/**
 * Concrete implementation of WorkflowEventEmitter.
 */
export const workflowEventEmitter: WorkflowEventEmitter = {
  /**
   * Emit a workflow event to all relevant subscribers.
   *
   * Dispatch order:
   * 1. Global subscribers (receive all events)
   * 2. Type-specific subscribers (receive events of matching type)
   * 3. Run-specific subscribers (receive events for matching runId)
   *
   * Errors from handlers are caught and logged to prevent one bad handler
   * from breaking the entire dispatch chain.
   */
  emit(event: WorkflowEvent): void {
    const eventType = event.type;
    const runId = event.runId;

    // Dispatch to global subscribers
    for (const handler of globalSubscribers) {
      try {
        handler(event);
      } catch (err) {
        console.error('[WorkflowEventEmitter] Global handler error:', err);
      }
    }

    // Dispatch to type-specific subscribers
    const typeHandlers = typeSubscribers.get(eventType);
    if (typeHandlers) {
      for (const handler of typeHandlers) {
        try {
          handler(event);
        } catch (err) {
          console.error(`[WorkflowEventEmitter] Type handler error for ${eventType}:`, err);
        }
      }
    }

    // Dispatch to run-specific subscribers
    const runHandlers = runSubscribers.get(runId);
    if (runHandlers) {
      for (const handler of runHandlers) {
        try {
          handler(event);
        } catch (err) {
          console.error(`[WorkflowEventEmitter] Run handler error for ${runId}:`, err);
        }
      }
    }
  },

  /**
   * Subscribe to ALL workflow events.
   * Returns an unsubscribe function.
   */
  subscribe(handler: WorkflowEventHandler): () => void {
    globalSubscribers.add(handler);
    return () => {
      globalSubscribers.delete(handler);
    };
  },

  /**
   * Subscribe to events of a specific type.
   * Returns an unsubscribe function.
   */
  on(type: WorkflowEventType, handler: WorkflowEventHandler): () => void {
    let handlers = typeSubscribers.get(type);
    if (!handlers) {
      handlers = new Set();
      typeSubscribers.set(type, handlers);
    }
    handlers.add(handler);
    return () => {
      handlers!.delete(handler);
      if (handlers!.size === 0) {
        typeSubscribers.delete(type);
      }
    };
  },

  /**
   * Subscribe to events for a specific run.
   * Returns an unsubscribe function.
   */
  onRun(runId: string, handler: WorkflowEventHandler): () => void {
    let handlers = runSubscribers.get(runId);
    if (!handlers) {
      handlers = new Set();
      runSubscribers.set(runId, handlers);
    }
    handlers.add(handler);
    return () => {
      handlers!.delete(handler);
      if (handlers!.size === 0) {
        runSubscribers.delete(runId);
      }
    };
  },

  /**
   * Remove all subscribers. Useful for cleanup in tests.
   */
  clear(): void {
    globalSubscribers.clear();
    typeSubscribers.clear();
    runSubscribers.clear();
  },
};

// ---------------------------------------------------------------------------
// Diagnostics utilities
// ---------------------------------------------------------------------------

/**
 * Get the current subscriber counts (for diagnostics/debugging).
 */
export function getSubscriberStats(): {
  global: number;
  byType: Record<WorkflowEventType, number>;
  byRun: Record<string, number>;
} {
  const byType: Record<WorkflowEventType, number> = {} as any;
  for (const [type, handlers] of typeSubscribers) {
    byType[type] = handlers.size;
  }

  const byRun: Record<string, number> = {};
  for (const [runId, handlers] of runSubscribers) {
    byRun[runId] = handlers.size;
  }

  return {
    global: globalSubscribers.size,
    byType,
    byRun,
  };
}

/**
 * Check if there are any subscribers for a given run.
 * Useful for determining if SSE streaming is active.
 */
export function hasRunSubscribers(runId: string): boolean {
  const handlers = runSubscribers.get(runId);
  return handlers !== undefined && handlers.size > 0;
}

/**
 * Reset all state (alias for clear, for test convenience).
 */
export function resetEventEmitter(): void {
  workflowEventEmitter.clear();
}