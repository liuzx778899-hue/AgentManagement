import type { FileStoreAdapter } from '../adapters/fileStoreAdapter';
import type { LocalResult } from '../../../types/localEngineering';
import type { AgentRun } from '../../../domain/agentRun';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

/**
 * 持久化运行记录结构
 */
interface PersistedAgentRun extends AgentRun {
  version: string;
  persistedAt: string;
}

/**
 * AgentRun Repository
 *
 * 负责运行记录的持久化操作
 */
export class AgentRunRepository {
  private fileStore: FileStoreAdapter;
  private basePath: string;

  constructor(fileStore: FileStoreAdapter, basePath: string = '.agentmanagement') {
    this.fileStore = fileStore;
    this.basePath = basePath;
  }

  /**
   * 获取运行记录文件路径
   */
  private getAgentRunPath(runId: string): string {
    return `${this.basePath}/agent-runs/${runId}.json`;
  }

  /**
   * 保存运行记录
   */
  async save(run: AgentRun): Promise<LocalResult<PersistedAgentRun>> {
    const persisted: PersistedAgentRun = {
      ...run,
      version: '1.0',
      persistedAt: new Date().toISOString(),
    };

    const result = await this.fileStore.writeJson(
      this.getAgentRunPath(run.id),
      persisted
    );

    if (!result.ok) {
      return {
        ok: false,
        error: result.error,
      };
    }

    return {
      ok: true,
      data: persisted,
      diagnostics: [`运行记录已保存: ${run.id}`],
    };
  }

  /**
   * 加载运行记录
   */
  async load(runId: string): Promise<LocalResult<PersistedAgentRun>> {
    const result = await this.fileStore.readJson<PersistedAgentRun>(
      this.getAgentRunPath(runId)
    );

    if (!result.ok) {
      return {
        ok: false,
        error: result.error,
      };
    }

    return {
      ok: true,
      data: result.data,
    };
  }

  /**
   * 删除运行记录（软删除）
   */
  async delete(runId: string): Promise<LocalResult<void>> {
    const result = await this.fileStore.writeJson(
      this.getAgentRunPath(runId),
      { deleted: true, deletedAt: new Date().toISOString() }
    );

    if (!result.ok) {
      return {
        ok: false,
        error: result.error,
      };
    }

    return {
      ok: true,
      data: undefined,
      diagnostics: [`运行记录已删除: ${runId}`],
    };
  }

  /**
   * 列出所有运行记录
   */
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

          // Skip deleted runs
          if ('deleted' in run && (run as any).deleted) continue;

          runs.push(run);
        } catch {
          // Skip files that can't be read or parsed
          continue;
        }
      }

      return {
        ok: true,
        data: runs,
      };
    } catch {
      // Directory doesn't exist or can't be read
      return {
        ok: true,
        data: [],
      };
    }
  }

  /**
   * 按任务ID列出运行记录
   */
  async listByTask(taskId: string): Promise<LocalResult<PersistedAgentRun[]>> {
    const allResult = await this.listAll();

    if (!allResult.ok) {
      return allResult;
    }

    const taskRuns = allResult.data!.filter(r => r.taskId === taskId);

    return {
      ok: true,
      data: taskRuns,
      diagnostics: [`找到 ${taskRuns.length} 个任务运行记录`],
    };
  }

  /**
   * 查找任务的活跃运行记录
   */
  async findActiveByTask(taskId: string): Promise<LocalResult<PersistedAgentRun | null>> {
    const allResult = await this.listAll();

    if (!allResult.ok) {
      return {
        ok: false,
        error: allResult.error,
      };
    }

    const activeRun = allResult.data!.find(
      r => r.taskId === taskId && (r.status === 'running' || r.status === 'starting' || r.status === 'waiting_gate')
    );

    return {
      ok: true,
      data: activeRun ?? null,
    };
  }

  /**
   * 批量保存运行记录
   */
  async saveBatch(runs: AgentRun[]): Promise<LocalResult<PersistedAgentRun[]>> {
    const results: PersistedAgentRun[] = [];
    const errors: string[] = [];

    for (const run of runs) {
      const result = await this.save(run);
      if (result.ok) {
        results.push(result.data!);
      } else {
        errors.push(`运行记录 ${run.id} 保存失败: ${result.error?.message}`);
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
      diagnostics: [`成功保存 ${results.length} 个运行记录`],
    };
  }
}
