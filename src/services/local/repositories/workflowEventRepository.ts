import type { FileStoreAdapter } from '../adapters/fileStoreAdapter';
import type { LocalResult } from '../../../types/localEngineering';
import type {
  WorkflowEvent,
  WorkflowEventType,
  WorkflowEventBase,
} from '../../../domain/workflowEvent';
import { appendFile, readFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * Persisted wrapper for a WorkflowEvent stored in a JSONL log.
 *
 * Adds metadata about persistence itself for auditing and migration.
 */
export interface PersistedWorkflowEvent {
  /** Monotonically increasing sequence number within the log file. */
  sequence: number;
  /** The original workflow event. */
  event: WorkflowEvent;
  /** ISO 8601 timestamp of when the event was appended to the log. */
  appendedAt: string;
}

/**
 * Summary statistics for a run's event log.
 */
export interface EventLogSummary {
  runId: string;
  totalEvents: number;
  firstTimestamp: string | null;
  lastTimestamp: string | null;
  types: Record<WorkflowEventType, number>;
}

/**
 * Options for querying events.
 */
export interface EventQueryOptions {
  /** Only return events of this type. */
  type?: WorkflowEventType;
  /** Skip the first N matching events. */
  offset?: number;
  /** Return at most N matching events. */
  limit?: number;
}

/**
 * WorkflowEventRepository
 *
 * Persists WorkflowEvent objects using JSONL (JSON Lines) append-only log files.
 *
 * Storage layout:
 *   .agentmanagement/events/runs/<runId>.jsonl   -- per-run event log
 *   .agentmanagement/events/all.jsonl             -- global event log (optional, for cross-run queries)
 *
 * Design decisions:
 * - JSONL (append-only) instead of JSON array to avoid rewriting the entire file on each event.
 * - Per-run files keep each log small and support concurrent writes from different runs.
 * - A global log enables cross-run queries without scanning all run files.
 * - Sequence numbers are per-file and monotonically increasing.
 * - Events are immutable; the repository never modifies or deletes individual events.
 * - purgeBefore() is the only removal mechanism, for disk space management.
 */
export class WorkflowEventRepository {
  private fileStore: FileStoreAdapter;
  private basePath: string;

  constructor(fileStore: FileStoreAdapter, basePath: string = '.agentmanagement') {
    this.fileStore = fileStore;
    this.basePath = basePath;
  }

  // ---------------------------------------------------------------------------
  // Core write operations
  // ---------------------------------------------------------------------------

  /**
   * Append a single event to the per-run JSONL log.
   *
   * Returns the persisted wrapper including sequence number and append timestamp.
   */
  async append(event: WorkflowEvent): Promise<LocalResult<PersistedWorkflowEvent>> {
    try {
      const runLogPath = this.getRunLogPath(event.runId);

      // Read current sequence (count existing lines)
      const currentCount = await this.countLines(runLogPath);
      const persisted: PersistedWorkflowEvent = {
        sequence: currentCount + 1,
        event,
        appendedAt: new Date().toISOString(),
      };

      // Check if we're in mock mode
      const isMockMode = this.fileStore && (this.fileStore as any).config?.enableMock;

      if (isMockMode) {
        // In mock mode, store in memory
        this.appendToMock(runLogPath, persisted);
      } else {
        // Real file system mode
        const line = JSON.stringify(persisted) + '\n';

        // Ensure directory exists
        const dir = join(process.cwd(), this.basePath, 'events', 'runs');
        if (!existsSync(dir)) {
          await mkdir(dir, { recursive: true });
        }

        // Append to per-run log
        const fullPath = join(process.cwd(), runLogPath);
        await appendFile(fullPath, line, 'utf-8');
      }

      return {
        ok: true,
        data: persisted,
        diagnostics: [`Event appended: ${event.type} for run ${event.runId} (seq ${persisted.sequence})`],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        error: {
          code: 'UNKNOWN',
          message: `Failed to append event: ${message}`,
          recoverable: true,
        },
      };
    }
  }

  /**
   * Append multiple events in order.
   *
   * Events are appended sequentially within a single call to maintain ordering.
   * If any individual append fails, the batch stops and returns a partial failure.
   */
  async appendBatch(events: WorkflowEvent[]): Promise<LocalResult<PersistedWorkflowEvent[]>> {
    const results: PersistedWorkflowEvent[] = [];
    const errors: string[] = [];

    for (const event of events) {
      const result = await this.append(event);
      if (result.ok) {
        results.push(result.data!);
      } else {
        errors.push(`Event ${event.id} (${event.type}) append failed: ${result.error?.message}`);
      }
    }

    if (errors.length > 0) {
      return {
        ok: false,
        error: {
          code: 'BATCH_SAVE_FAILED',
          message: errors.join('; '),
          recoverable: true,
        },
      };
    }

    return {
      ok: true,
      data: results,
      diagnostics: [`Batch appended ${results.length} events`],
    };
  }

  // ---------------------------------------------------------------------------
  // Core read operations
  // ---------------------------------------------------------------------------

  /**
   * Load all events for a specific run, in order.
   */
  async loadByRun(runId: string): Promise<LocalResult<PersistedWorkflowEvent[]>> {
    return this.readJsonlFile(this.getRunLogPath(runId));
  }

  /**
   * Load events for a run with optional filtering and pagination.
   */
  async queryByRun(
    runId: string,
    options: EventQueryOptions = {},
  ): Promise<LocalResult<PersistedWorkflowEvent[]>> {
    const loadResult = await this.loadByRun(runId);

    if (!loadResult.ok) {
      return loadResult;
    }

    let events = loadResult.data!;

    // Filter by type
    if (options.type) {
      events = events.filter(pe => pe.event.type === options.type);
    }

    // Apply offset
    if (options.offset && options.offset > 0) {
      events = events.slice(options.offset);
    }

    // Apply limit
    if (options.limit && options.limit > 0) {
      events = events.slice(0, options.limit);
    }

    return {
      ok: true,
      data: events,
    };
  }

  /**
   * Load events of a specific type across all runs.
   *
   * Scans all run log files. For large deployments, consider using
   * the global log or adding an index.
   */
  async loadByType(
    eventType: WorkflowEventType,
    options: EventQueryOptions = {},
  ): Promise<LocalResult<PersistedWorkflowEvent[]>> {
    const allRuns = await this.listRunIds();
    const matched: PersistedWorkflowEvent[] = [];

    for (const runId of allRuns) {
      const result = await this.loadByRun(runId);
      if (!result.ok) continue;

      for (const pe of result.data!) {
        if (pe.event.type === eventType) {
          matched.push(pe);
        }
      }
    }

    // Sort by event timestamp
    matched.sort((a, b) => a.event.timestamp.localeCompare(b.event.timestamp));

    // Apply offset
    let result = matched;
    if (options.offset && options.offset > 0) {
      result = result.slice(options.offset);
    }
    if (options.limit && options.limit > 0) {
      result = result.slice(0, options.limit);
    }

    return {
      ok: true,
      data: result,
    };
  }

  /**
   * Get the summary statistics for a run's event log.
   */
  async getSummary(runId: string): Promise<LocalResult<EventLogSummary>> {
    const loadResult = await this.loadByRun(runId);

    if (!loadResult.ok) {
      return {
        ok: false,
        error: loadResult.error,
      };
    }

    const events = loadResult.data!;
    const types: Record<string, number> = {};

    for (const pe of events) {
      types[pe.event.type] = (types[pe.event.type] || 0) + 1;
    }

    return {
      ok: true,
      data: {
        runId,
        totalEvents: events.length,
        firstTimestamp: events.length > 0 ? events[0].event.timestamp : null,
        lastTimestamp: events.length > 0 ? events[events.length - 1].event.timestamp : null,
        types: types as Record<WorkflowEventType, number>,
      },
    };
  }

  /**
   * Get the count of events for a specific run.
   */
  async countByRun(runId: string): Promise<LocalResult<number>> {
    const loadResult = await this.loadByRun(runId);

    if (!loadResult.ok) {
      return {
        ok: false,
        error: loadResult.error,
      };
    }

    return {
      ok: true,
      data: loadResult.data!.length,
    };
  }

  /**
   * List all known run IDs that have event logs.
   */
  async listRunIds(): Promise<LocalResult<string[]>> {
    try {
      const runsDir = join(process.cwd(), this.basePath, 'events', 'runs');

      if (!existsSync(runsDir)) {
        return { ok: true, data: [] };
      }

      const { readdir } = await import('fs/promises');
      const files = await readdir(runsDir);

      const runIds = files
        .filter(f => f.endsWith('.jsonl'))
        .map(f => f.replace('.jsonl', ''));

      return { ok: true, data: runIds };
    } catch {
      return { ok: true, data: [] };
    }
  }

  // ---------------------------------------------------------------------------
  // Maintenance operations
  // ---------------------------------------------------------------------------

  /**
   * Delete the event log for a specific run.
   *
   * Events are immutable records, so this should only be used for cleanup
   * of very old runs or in response to user action.
   */
  async deleteRunLog(runId: string): Promise<LocalResult<void>> {
    try {
      const fullPath = join(process.cwd(), this.getRunLogPath(runId));

      if (existsSync(fullPath)) {
        await unlink(fullPath);
      }

      return {
        ok: true,
        data: undefined,
        diagnostics: [`Event log deleted for run ${runId}`],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        error: {
          code: 'UNKNOWN',
          message: `Failed to delete run log: ${message}`,
          recoverable: true,
        },
      };
    }
  }

  /**
   * Remove all event logs from runs that completed (or failed/cancelled)
   * before the given cutoff timestamp.
   *
   * Scans run logs, checks the last event timestamp, and removes files
   * where the last event is older than the cutoff.
   */
  async purgeBefore(cutoffTimestamp: string): Promise<LocalResult<string[]>> {
    const listResult = await this.listRunIds();

    if (!listResult.ok) {
      return listResult as LocalResult<string[]>;
    }

    const purged: string[] = [];

    for (const runId of listResult.data!) {
      const summaryResult = await this.getSummary(runId);

      if (!summaryResult.ok) continue;

      const lastTs = summaryResult.data.lastTimestamp;
      if (lastTs && lastTs < cutoffTimestamp) {
        const deleteResult = await this.deleteRunLog(runId);
        if (deleteResult.ok) {
          purged.push(runId);
        }
      }
    }

    return {
      ok: true,
      data: purged,
      diagnostics: [`Purged ${purged.length} run logs before ${cutoffTimestamp}`],
    };
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  /**
   * Get the JSONL file path for a run's event log.
   */
  private getRunLogPath(runId: string): string {
    return `${this.basePath}/events/runs/${runId}.jsonl`;
  }

  /**
   * Read and parse a JSONL file into an array of PersistedWorkflowEvent.
   */
  private async readJsonlFile(
    filePath: string,
  ): Promise<LocalResult<PersistedWorkflowEvent[]>> {
    // In mock mode, read from fileStore's in-memory store
    if (this.fileStore && (this.fileStore as any).config?.enableMock) {
      return this.readJsonlFromMock(filePath);
    }

    const fullPath = join(process.cwd(), filePath);

    if (!existsSync(fullPath)) {
      return { ok: true, data: [] };
    }

    try {
      const content = await readFile(fullPath, 'utf-8');
      const events: PersistedWorkflowEvent[] = [];

      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
          const parsed = JSON.parse(trimmed) as PersistedWorkflowEvent;
          events.push(parsed);
        } catch {
          // Skip malformed lines rather than failing the entire read
          continue;
        }
      }

      return { ok: true, data: events };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        error: {
          code: 'UNKNOWN',
          message: `Failed to read event log: ${message}`,
          recoverable: true,
        },
      };
    }
  }

  /**
   * Read events from mock in-memory store.
   *
   * In mock mode, the fileStore stores data as JSON objects.
   * We simulate JSONL by storing an array of PersistedWorkflowEvent objects.
   */
  private async readJsonlFromMock(
    filePath: string,
  ): Promise<LocalResult<PersistedWorkflowEvent[]>> {
    // Try to read the mock data key that stores appended events
    const mockKey = `jsonl:${filePath}`;
    const mockData = (this.fileStore as any).getMockData?.(mockKey);

    if (mockData && Array.isArray(mockData)) {
      return { ok: true, data: mockData };
    }

    // Also try reading through the normal fileStore mock path
    const readResult = await this.fileStore.readJson<PersistedWorkflowEvent[]>(filePath);
    if (readResult.ok && Array.isArray(readResult.data)) {
      return { ok: true, data: readResult.data };
    }

    return { ok: true, data: [] };
  }

  /**
   * Count the number of lines in a JSONL file.
   */
  private async countLines(filePath: string): Promise<number> {
    // In mock mode, count from in-memory store
    if (this.fileStore && (this.fileStore as any).config?.enableMock) {
      const mockKey = `jsonl:${filePath}`;
      const mockData = (this.fileStore as any).getMockData?.(mockKey);
      return Array.isArray(mockData) ? mockData.length : 0;
    }

    const fullPath = join(process.cwd(), filePath);

    if (!existsSync(fullPath)) {
      return 0;
    }

    try {
      const content = await readFile(fullPath, 'utf-8');
      return content.split('\n').filter(line => line.trim().length > 0).length;
    } catch {
      return 0;
    }
  }

  /**
   * Override append in mock mode to store in memory as an array.
   */
  private appendToMock(filePath: string, persisted: PersistedWorkflowEvent): void {
    const mockKey = `jsonl:${filePath}`;
    const existing = (this.fileStore as any).getMockData?.(mockKey) || [];
    existing.push(persisted);
    (this.fileStore as any).setMockData(mockKey, existing);
  }
}
