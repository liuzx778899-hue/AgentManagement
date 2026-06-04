/**
 * Result Store - Task result and artifacts storage
 *
 * Issue: #33
 */

/**
 * Task Result with artifacts
 */
export interface TaskResult {
  taskId: string;
  status: 'success' | 'failure' | 'cancelled';
  artifacts: Artifact[];
  output?: string;
  error?: string;
  startedAt: string;
  finishedAt: string;
}

/**
 * Artifact produced by task execution
 */
export interface Artifact {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory' | 'output';
  size?: number;
  createdAt: string;
}

// Memory storage
const results = new Map<string, TaskResult>();

/**
 * Save task result
 */
export function saveResult(result: TaskResult): void {
  results.set(result.taskId, result);
}

/**
 * Get task result
 */
export function getResult(taskId: string): TaskResult | undefined {
  return results.get(taskId);
}

/**
 * Delete task result
 */
export function deleteResult(taskId: string): boolean {
  return results.delete(taskId);
}

/**
 * List all results
 */
export function listResults(): TaskResult[] {
  return Array.from(results.values());
}
