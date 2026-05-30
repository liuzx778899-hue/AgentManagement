import type { FileStoreAdapter } from '../adapters/fileStoreAdapter';
import type { LocalResult } from '../../../types/localEngineering';
import type { Project } from '../../../domain/project';

/**
 * 持久化项目配置结构
 */
interface PersistedProject extends Project {
  version: string;
  persistedAt: string;
}

/**
 * 项目配置 Repository
 */
export class ProjectRepository {
  private fileStore: FileStoreAdapter;
  private basePath: string;

  constructor(fileStore: FileStoreAdapter, basePath: string = '.agentmanagement') {
    this.fileStore = fileStore;
    this.basePath = basePath;
  }

  /**
   * 获取项目文件路径
   */
  private getProjectPath(projectId: string): string {
    return `${this.basePath}/projects/${projectId}.json`;
  }

  /**
   * 保存项目配置
   */
  async save(project: Project): Promise<LocalResult<PersistedProject>> {
    const persisted: PersistedProject = {
      ...project,
      version: '1.0',
      persistedAt: new Date().toISOString(),
    };

    const result = await this.fileStore.writeJson(
      this.getProjectPath(project.id),
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
      diagnostics: [`项目配置已保存: ${project.id}`],
    };
  }

  /**
   * 加载项目配置
   */
  async load(projectId: string): Promise<LocalResult<PersistedProject>> {
    const result = await this.fileStore.readJson<PersistedProject>(
      this.getProjectPath(projectId)
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
   * 删除项目配置
   */
  async delete(projectId: string): Promise<LocalResult<void>> {
    // 在 mock 模式下，我们通过写入空对象来模拟删除
    // 实际实现中应该使用文件删除
    const result = await this.fileStore.writeJson(
      this.getProjectPath(projectId),
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
      diagnostics: [`项目配置已删除: ${projectId}`],
    };
  }

  /**
   * 列出所有项目
   */
  async listAll(): Promise<LocalResult<PersistedProject[]>> {
    // 在 mock 模式下，我们需要从存储中获取所有项目
    // 实际实现中应该列出目录下的所有 JSON 文件
    const result = await this.fileStore.readJson<PersistedProject[]>(
      `${this.basePath}/projects/index.json`
    );

    if (!result.ok) {
      // 如果索引文件不存在，返回空数组
      return {
        ok: true,
        data: [],
      };
    }

    return {
      ok: true,
      data: result.data!.filter(p => !('deleted' in p)),
    };
  }

  /**
   * 更新项目配置
   */
  async update(project: Partial<Project> & { id: string }): Promise<LocalResult<PersistedProject>> {
    const existingResult = await this.load(project.id);

    if (!existingResult.ok) {
      return {
        ok: false,
        error: existingResult.error,
      };
    }

    const updated: PersistedProject = {
      ...existingResult.data!,
      ...project,
      updatedAt: new Date().toISOString(),
      persistedAt: new Date().toISOString(),
    };

    return this.save(updated);
  }
}