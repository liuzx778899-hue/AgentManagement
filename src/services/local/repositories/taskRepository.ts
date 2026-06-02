import type { FileStoreAdapter } from '../adapters/fileStoreAdapter';
import type { LocalResult } from '../../../types/localEngineering';
import type { Task } from '../../../domain/task';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

/**
 * 持久化任务结构
 */
interface PersistedTask extends Task {
  version: string;
  persistedAt: string;
}

/**
 * 任务 Repository
 *
 * 负责任务数据的持久化操作
 */
export class TaskRepository {
  private fileStore: FileStoreAdapter;
  private basePath: string;

  constructor(fileStore: FileStoreAdapter, basePath: string = '.agentmanagement') {
    this.fileStore = fileStore;
    this.basePath = basePath;
  }

  /**
   * 获取任务文件路径
   */
  private getTaskPath(taskId: string): string {
    return `${this.basePath}/tasks/${taskId}.json`;
  }

  /**
   * 保存任务
   */
  async save(task: Task): Promise<LocalResult<PersistedTask>> {
    const persisted: PersistedTask = {
      ...task,
      version: '1.0',
      persistedAt: new Date().toISOString(),
    };

    const result = await this.fileStore.writeJson(
      this.getTaskPath(task.id),
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
      diagnostics: [`任务已保存: ${task.id}`],
    };
  }

  /**
   * 加载任务
   */
  async load(taskId: string): Promise<LocalResult<PersistedTask>> {
    const result = await this.fileStore.readJson<PersistedTask>(
      this.getTaskPath(taskId)
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
   * 删除任务
   */
  async delete(taskId: string): Promise<LocalResult<void>> {
    const result = await this.fileStore.writeJson(
      this.getTaskPath(taskId),
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
      diagnostics: [`任务已删除: ${taskId}`],
    };
  }

  /**
   * 列出所有任务
   */
  async listAll(): Promise<LocalResult<PersistedTask[]>> {
    const tasks: PersistedTask[] = [];

    try {
      const tasksDir = join(process.cwd(), this.basePath, 'tasks');
      const files = await readdir(tasksDir);

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        try {
          const content = await readFile(join(tasksDir, file), 'utf-8');
          const task = JSON.parse(content) as PersistedTask;

          // Skip deleted tasks
          if ('deleted' in task && (task as any).deleted) continue;

          tasks.push(task);
        } catch {
          // Skip files that can't be read or parsed
          continue;
        }
      }

      return {
        ok: true,
        data: tasks,
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
   * 按项目ID列出任务
   */
  async listByProject(projectId: string): Promise<LocalResult<PersistedTask[]>> {
    const allResult = await this.listAll();

    if (!allResult.ok) {
      return allResult;
    }

    const projectTasks = allResult.data!.filter(t => t.projectId === projectId);

    return {
      ok: true,
      data: projectTasks,
      diagnostics: [`找到 ${projectTasks.length} 个项目任务`],
    };
  }

  /**
   * 批量保存任务
   */
  async saveBatch(tasks: Task[]): Promise<LocalResult<PersistedTask[]>> {
    const results: PersistedTask[] = [];
    const errors: string[] = [];

    for (const task of tasks) {
      const result = await this.save(task);
      if (result.ok) {
        results.push(result.data!);
      } else {
        errors.push(`任务 ${task.id} 保存失败: ${result.error?.message}`);
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
      diagnostics: [`成功保存 ${results.length} 个任务`],
    };
  }
}
