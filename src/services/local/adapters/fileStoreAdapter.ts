import { BaseAdapter } from './baseAdapter';
import type { LocalResult, AdapterConfig } from '../../../types/localEngineering';
import { readFile, writeFile, mkdir, access, rename, unlink } from 'fs/promises';
import { resolve, dirname } from 'path';
import { existsSync } from 'fs';

/**
 * 文件存储 Adapter
 *
 * 安全约束：
 * - 只允许在项目根目录及授权目录内读写
 * - 写文件前先写临时文件，成功后再替换
 */
export class FileStoreAdapter extends BaseAdapter {
  private allowedPaths: Set<string>;

  constructor(config: AdapterConfig) {
    super(config);
    this.allowedPaths = new Set([config.projectRoot]);
  }

  /**
   * 添加允许访问的路径
   */
  addAllowedPath(path: string): void {
    this.allowedPaths.add(path);
  }

  /**
   * 检查路径是否在允许范围内
   */
  private isPathAllowed(targetPath: string): boolean {
    const resolved = resolve(targetPath);
    for (const allowed of this.allowedPaths) {
      if (resolved.startsWith(allowed)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 读取 JSON 文件
   */
  async readJson<T>(filePath: string, cwd?: string): Promise<LocalResult<T>> {
    const fullPath = this.resolvePath(filePath, cwd);

    if (this.isMockEnabled) {
      const mockData = this.getMockData<T>(filePath);
      if (mockData !== undefined) {
        return this.ok(mockData);
      }
      return this.err('DIRECTORY_NOT_FOUND', `Mock 数据不存在: ${filePath}`, undefined, true);
    }

    if (!this.isPathAllowed(fullPath)) {
      return this.err('PERMISSION_DENIED', `路径不在允许范围内: ${fullPath}`, fullPath);
    }

    if (!existsSync(fullPath)) {
      return this.err('DIRECTORY_NOT_FOUND', `文件不存在: ${fullPath}`, fullPath, true);
    }

    try {
      const content = await readFile(fullPath, 'utf-8');
      const data = JSON.parse(content) as T;
      return this.ok(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('JSON')) {
        return this.err('PARSE_ERROR', 'JSON 解析失败', errorMessage);
      }
      return this.err('UNKNOWN', '读取文件失败', errorMessage);
    }
  }

  /**
   * 写入 JSON 文件
   */
  async writeJson<T>(filePath: string, data: T, cwd?: string): Promise<LocalResult<void>> {
    const fullPath = this.resolvePath(filePath, cwd);

    if (this.isMockEnabled) {
      this.setMockData(filePath, data);
      return this.ok(undefined, [`Mock: 写入 ${filePath}`]);
    }

    if (!this.isPathAllowed(fullPath)) {
      return this.err('PERMISSION_DENIED', `路径不在允许范围内: ${fullPath}`, fullPath);
    }

    try {
      // 确保目录存在
      const dir = dirname(fullPath);
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }

      // 先写临时文件
      const tempPath = `${fullPath}.tmp`;
      const content = JSON.stringify(data, null, 2);
      await writeFile(tempPath, content, 'utf-8');

      // 备份现有文件
      if (existsSync(fullPath)) {
        const backupPath = `${fullPath}.backup`;
        await rename(fullPath, backupPath);
        await rename(tempPath, fullPath);
        // 删除备份
        await unlink(backupPath).catch(() => {});
      } else {
        await rename(tempPath, fullPath);
      }

      return this.ok(undefined, [`写入文件: ${filePath}`]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return this.err('UNKNOWN', '写入文件失败', errorMessage);
    }
  }

  /**
   * 检查文件是否存在
   */
  async exists(filePath: string, cwd?: string): Promise<LocalResult<boolean>> {
    const fullPath = this.resolvePath(filePath, cwd);

    if (this.isMockEnabled) {
      const mockData = this.getMockData(filePath);
      return this.ok(mockData !== undefined);
    }

    if (!this.isPathAllowed(fullPath)) {
      return this.err('PERMISSION_DENIED', `路径不在允许范围内: ${fullPath}`);
    }

    try {
      await access(fullPath);
      return this.ok(true);
    } catch {
      return this.ok(false);
    }
  }

  /**
   * 读取文本文件
   */
  async readText(filePath: string, cwd?: string): Promise<LocalResult<string>> {
    const fullPath = this.resolvePath(filePath, cwd);

    if (this.isMockEnabled) {
      const mockData = this.getMockData<string>(filePath);
      if (mockData !== undefined) {
        return this.ok(mockData);
      }
      return this.err('DIRECTORY_NOT_FOUND', `Mock 数据不存在: ${filePath}`);
    }

    if (!this.isPathAllowed(fullPath)) {
      return this.err('PERMISSION_DENIED', `路径不在允许范围内: ${fullPath}`);
    }

    if (!existsSync(fullPath)) {
      return this.err('DIRECTORY_NOT_FOUND', `文件不存在: ${fullPath}`, fullPath, true);
    }

    try {
      const content = await readFile(fullPath, 'utf-8');
      return this.ok(content);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return this.err('UNKNOWN', '读取文件失败', errorMessage);
    }
  }

  /**
   * 写入文本文件
   */
  async writeText(filePath: string, content: string, cwd?: string): Promise<LocalResult<void>> {
    const fullPath = this.resolvePath(filePath, cwd);

    if (this.isMockEnabled) {
      this.setMockData(filePath, content);
      return this.ok(undefined, [`Mock: 写入 ${filePath}`]);
    }

    if (!this.isPathAllowed(fullPath)) {
      return this.err('PERMISSION_DENIED', `路径不在允许范围内: ${fullPath}`);
    }

    try {
      const dir = dirname(fullPath);
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }

      const tempPath = `${fullPath}.tmp`;
      await writeFile(tempPath, content, 'utf-8');

      if (existsSync(fullPath)) {
        const backupPath = `${fullPath}.backup`;
        await rename(fullPath, backupPath);
        await rename(tempPath, fullPath);
        await unlink(backupPath).catch(() => {});
      } else {
        await rename(tempPath, fullPath);
      }

      return this.ok(undefined, [`写入文件: ${filePath}`]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return this.err('UNKNOWN', '写入文件失败', errorMessage);
    }
  }

  /**
   * 解析路径
   */
  private resolvePath(filePath: string, cwd?: string): string {
    if (filePath.startsWith('/')) {
      return filePath;
    }
    const base = cwd ?? this.config.projectRoot;
    return resolve(base, filePath);
  }
}
