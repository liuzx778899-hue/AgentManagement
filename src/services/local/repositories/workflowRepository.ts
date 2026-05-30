import type { FileStoreAdapter } from '../adapters/fileStoreAdapter';
import type { LocalResult } from '../../../types/localEngineering';
import type { Workflow } from '../../../domain/workflow';

/**
 * 持久化 Workflow 结构
 */
interface PersistedWorkflow extends Workflow {
  version: string;
  persistedAt: string;
}

/**
 * Workflow Repository
 */
export class WorkflowRepository {
  private fileStore: FileStoreAdapter;
  private basePath: string;

  constructor(fileStore: FileStoreAdapter, basePath: string = '.agentmanagement') {
    this.fileStore = fileStore;
    this.basePath = basePath;
  }

  /**
   * 获取 Workflow 文件路径
   */
  private getWorkflowPath(workflowId: string): string {
    return `${this.basePath}/workflows/${workflowId}.json`;
  }

  /**
   * 保存 Workflow
   */
  async save(workflow: Workflow): Promise<LocalResult<PersistedWorkflow>> {
    const persisted: PersistedWorkflow = {
      ...workflow,
      version: '1.0',
      persistedAt: new Date().toISOString(),
    };

    const result = await this.fileStore.writeJson(
      this.getWorkflowPath(workflow.id),
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
      diagnostics: [`Workflow 已保存: ${workflow.id}`],
    };
  }

  /**
   * 加载 Workflow
   */
  async load(workflowId: string): Promise<LocalResult<PersistedWorkflow>> {
    const result = await this.fileStore.readJson<PersistedWorkflow>(
      this.getWorkflowPath(workflowId)
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
   * 删除 Workflow
   */
  async delete(workflowId: string): Promise<LocalResult<void>> {
    const result = await this.fileStore.writeJson(
      this.getWorkflowPath(workflowId),
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
      diagnostics: [`Workflow 已删除: ${workflowId}`],
    };
  }

  /**
   * 列出所有 Workflow
   */
  async listAll(): Promise<LocalResult<PersistedWorkflow[]>> {
    const workflows: PersistedWorkflow[] = [];

    try {
      const { readdir } = await import('fs/promises');
      const { join } = await import('path');
      const workflowsDir = join(process.cwd(), this.basePath, 'workflows');
      const files = await readdir(workflowsDir);

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        try {
          const result = await this.fileStore.readJson<PersistedWorkflow>(
            `${this.basePath}/workflows/${file}`
          );
          if (result.ok && result.data) {
            // Skip deleted workflows
            if ('deleted' in result.data && (result.data as any).deleted) continue;
            workflows.push(result.data);
          }
        } catch {
          continue;
        }
      }

      return {
        ok: true,
        data: workflows,
      };
    } catch {
      return {
        ok: true,
        data: [],
      };
    }
  }

  /**
   * 列出活跃的 Workflow
   */
  async listActive(): Promise<LocalResult<PersistedWorkflow[]>> {
    const result = await this.listAll();

    if (!result.ok) {
      return result;
    }

    return {
      ok: true,
      data: result.data!.filter(w => w.status === 'active'),
    };
  }

  /**
   * 更新 Workflow
   */
  async update(workflow: Partial<Workflow> & { id: string }): Promise<LocalResult<PersistedWorkflow>> {
    const existingResult = await this.load(workflow.id);

    if (!existingResult.ok) {
      return {
        ok: false,
        error: existingResult.error,
      };
    }

    const updated: PersistedWorkflow = {
      ...existingResult.data!,
      ...workflow,
      updatedAt: new Date().toISOString(),
      persistedAt: new Date().toISOString(),
    };

    return this.save(updated);
  }

  /**
   * 归档 Workflow
   */
  async archive(workflowId: string): Promise<LocalResult<PersistedWorkflow>> {
    return this.update({
      id: workflowId,
      status: 'archived' as Workflow['status'],
    });
  }

  /**
   * 恢复 Workflow
   */
  async restore(workflowId: string): Promise<LocalResult<PersistedWorkflow>> {
    return this.update({
      id: workflowId,
      status: 'active' as Workflow['status'],
    });
  }
}