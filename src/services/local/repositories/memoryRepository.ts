import type { FileStoreAdapter } from '../adapters/fileStoreAdapter';
import type { LocalResult } from '../../../types/localEngineering';
import type { Memory } from '../../../domain/memory';

/**
 * 持久化记忆结构
 */
interface PersistedMemory extends Memory {
  version: string;
  persistedAt: string;
}

/**
 * 记忆 Repository
 */
export class MemoryRepository {
  private fileStore: FileStoreAdapter;
  private basePath: string;

  constructor(fileStore: FileStoreAdapter, basePath: string = '.agentmanagement') {
    this.fileStore = fileStore;
    this.basePath = basePath;
  }

  /**
   * 获取记忆文件路径
   */
  private getMemoryPath(memoryId: string): string {
    return `${this.basePath}/memory/${memoryId}.json`;
  }

  /**
   * 保存记忆
   */
  async save(memory: Memory): Promise<LocalResult<PersistedMemory>> {
    const persisted: PersistedMemory = {
      ...memory,
      version: '1.0',
      persistedAt: new Date().toISOString(),
    };

    const result = await this.fileStore.writeJson(
      this.getMemoryPath(memory.id),
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
      diagnostics: [`记忆已保存: ${memory.id}`],
    };
  }

  /**
   * 加载记忆
   */
  async load(memoryId: string): Promise<LocalResult<PersistedMemory>> {
    const result = await this.fileStore.readJson<PersistedMemory>(
      this.getMemoryPath(memoryId)
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
   * 删除记忆
   */
  async delete(memoryId: string): Promise<LocalResult<void>> {
    const result = await this.fileStore.writeJson(
      this.getMemoryPath(memoryId),
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
      diagnostics: [`记忆已删除: ${memoryId}`],
    };
  }

  /**
   * 按项目列出记忆
   */
  async listByProject(projectId: string): Promise<LocalResult<PersistedMemory[]>> {
    const result = await this.fileStore.readJson<PersistedMemory[]>(
      `${this.basePath}/memory/by-project/${projectId}.json`
    );

    if (!result.ok) {
      return {
        ok: true,
        data: [],
      };
    }

    return {
      ok: true,
      data: result.data!.filter(m => !('deleted' in m)),
    };
  }

  /**
   * 按角色列出记忆
   */
  async listByRole(roleId: string): Promise<LocalResult<PersistedMemory[]>> {
    const result = await this.fileStore.readJson<PersistedMemory[]>(
      `${this.basePath}/memory/by-role/${roleId}.json`
    );

    if (!result.ok) {
      return {
        ok: true,
        data: [],
      };
    }

    return {
      ok: true,
      data: result.data!.filter(m => !('deleted' in m)),
    };
  }

  /**
   * 列出知识库（已确认可复用的记忆）
   */
  async listKnowledgeBase(): Promise<LocalResult<PersistedMemory[]>> {
    const result = await this.fileStore.readJson<PersistedMemory[]>(
      `${this.basePath}/memory/knowledge-base.json`
    );

    if (!result.ok) {
      return {
        ok: true,
        data: [],
      };
    }

    return {
      ok: true,
      data: result.data!.filter(m => !('deleted' in m)),
    };
  }

  /**
   * 更新记忆
   */
  async update(memory: Partial<Memory> & { id: string }): Promise<LocalResult<PersistedMemory>> {
    const existingResult = await this.load(memory.id);

    if (!existingResult.ok) {
      return {
        ok: false,
        error: existingResult.error,
      };
    }

    const updated: PersistedMemory = {
      ...existingResult.data!,
      ...memory,
      updatedAt: new Date().toISOString(),
      persistedAt: new Date().toISOString(),
    };

    return this.save(updated);
  }

  /**
   * 标记记忆为已过期
   */
  async markExpired(memoryId: string): Promise<LocalResult<PersistedMemory>> {
    return this.update({
      id: memoryId,
      status: 'expired' as Memory['status'],
    });
  }

  /**
   * 列出所有记忆
   */
  async listAll(): Promise<LocalResult<PersistedMemory[]>> {
    const result = await this.fileStore.readJson<PersistedMemory[]>(
      `${this.basePath}/memory/index.json`
    );

    if (!result.ok) {
      return {
        ok: true,
        data: [],
      };
    }

    return {
      ok: true,
      data: result.data!.filter(m => !('deleted' in m)),
    };
  }
}