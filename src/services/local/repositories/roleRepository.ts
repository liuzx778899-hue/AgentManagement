import type { FileStoreAdapter } from '../adapters/fileStoreAdapter';
import type { LocalResult } from '../../../types/localEngineering';
import type { AgentRole } from '../../../domain/workbench';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

/**
 * 持久化角色结构
 */
interface PersistedRole extends AgentRole {
  version?: string;
  persistedAt?: string;
}

/**
 * 角色 Repository
 */
export class RoleRepository {
  private fileStore: FileStoreAdapter;
  private basePath: string;

  constructor(fileStore: FileStoreAdapter, basePath: string = '.agentmanagement') {
    this.fileStore = fileStore;
    this.basePath = basePath;
  }

  /**
   * 获取角色文件路径
   */
  private getRolePath(roleId: string): string {
    return `${this.basePath}/roles/${roleId}.json`;
  }

  /**
   * 列出所有角色
   */
  async listAll(): Promise<LocalResult<AgentRole[]>> {
    const roles: AgentRole[] = [];

    try {
      const rolesDir = join(process.cwd(), this.basePath, 'roles');
      const files = await readdir(rolesDir);

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        try {
          const content = await readFile(join(rolesDir, file), 'utf-8');
          const role = JSON.parse(content) as PersistedRole;

          // Skip deleted roles
          if ('deleted' in role && (role as any).deleted) continue;

          roles.push({
            id: role.id,
            projectId: role.projectId || null,
            name: role.name,
            description: role.description || '',
            roleMarkdown: role.roleMarkdown || '',
            isBuiltIn: role.isBuiltIn ?? false,
            defaultCapabilities: role.defaultCapabilities || [],
          });
        } catch {
          // Skip files that can't be read or parsed
          continue;
        }
      }

      return {
        ok: true,
        data: roles,
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
   * 加载单个角色
   */
  async load(roleId: string): Promise<LocalResult<PersistedRole>> {
    const result = await this.fileStore.readJson<PersistedRole>(
      this.getRolePath(roleId)
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
}