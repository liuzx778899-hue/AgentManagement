/**
 * AgentRun Repository - Issue #28
 *
 * Agent 运行记录持久化
 */

import type { FileStoreAdapter } from '../adapters/fileStoreAdapter';
import type { LocalResult } from '../../../types/localEngineering';
import type { AgentRun } from '../../../domain/task';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

interface PersistedAgentRun extends AgentRun {
  version: string;
  persistedAt: string;
}

export class AgentRunRepository {
  private fileStore: FileStoreAdapter;
  private basePath: string;

  constructor(fileStore: FileStoreAdapter, basePath: string = '.agentmanagement') {
    this.fileStore = fileStore;
    this.basePath = basePath;
  }

  private getRunPath(runId: string): string {
    return `${this.basePath}/agent-runs/${runId}.json`;
  }

  async save(run: AgentRun): Promise<LocalResult<PersistedAgentRun>> {
    const persisted: PersistedAgentRun = {
      ...run,
      version: '1.0',
      persistedAt: new Date().toISOString(),
    };

    const result = await this.fileStore.writeJson(
      this.getRunPath(run.id),
      persisted
    );

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    return { ok: true, data: persisted };
  }

  async load(runId: string): Promise<LocalResult<PersistedAgentRun>> {
    const result = await this.fileStore.readJson<PersistedAgentRun>(
      this.getRunPath(runId)
    );

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    return { ok: true, data: result.data };
  }

  async update(runId: string, updates: Partial<AgentRun>): Promise<LocalResult<PersistedAgentRun>> {
    const existing = await this.load(runId);
    if (!existing.ok) {
      return existing;
    }

    const updated: PersistedAgentRun = {
      ...existing.data!,
      ...updates,
      version: '1.0',
      persistedAt: new Date().toISOString(),
    };

    const result = await this.fileStore.writeJson(
      this.getRunPath(runId),
      updated
    );

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    return { ok: true, data: updated };
  }

  async listByTask(taskId: string): Promise<LocalResult<PersistedAgentRun[]>> {
    const all = await this.listAll();
    if (!all.ok) return all;

    const taskRuns = all.data!.filter(r => r.taskId === taskId);
    return { ok: true, data: taskRuns };
  }

  async listByProject(projectId: string): Promise<LocalResult<PersistedAgentRun[]>> {
    const all = await this.listAll();
    if (!all.ok) return all;

    const projectRuns = all.data!.filter(r => r.projectId === projectId);
    return { ok: true, data: projectRuns };
  }

  async listAll(): Promise<LocalResult<PersistedAgentRun[]>> {
    const runs: PersistedAgentRun[] = [];

    try {
      const runsDir = join(process.cwd(), this.basePath, 'agent-runs');
      const files = await readdir(runsDir);

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        try {
          const content = await readFile(join(runsDir, file), 'utf-8');
          const run = JSON.parse(content) as PersistedAgentRun;
          runs.push(run);
        } catch {
          continue;
        }
      }

      return { ok: true, data: runs };
    } catch {
      return { ok: true, data: [] };
    }
  }
}
