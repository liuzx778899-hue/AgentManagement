import { BaseAdapter } from './baseAdapter';
import type {
  LocalResult,
  LocalGitStatus,
  WorktreeInfo,
  AdapterConfig,
} from '../../../types/localEngineering';
import { existsSync } from 'fs';

/**
 * Git 命令封装 Adapter
 */
export class GitAdapter extends BaseAdapter {
  constructor(config: AdapterConfig) {
    super(config);
  }

  /**
   * 读取 Git 状态
   */
  async getStatus(cwd?: string): Promise<LocalResult<LocalGitStatus>> {
    const workDir = cwd ?? this.config.projectRoot;

    // Mock 模式
    if (this.isMockEnabled) {
      const mockStatus = this.getMockData<LocalGitStatus>('status');
      if (mockStatus) {
        return this.ok(mockStatus);
      }
      // 默认 mock 数据
      return this.ok({
        branch: 'main',
        ahead: 0,
        behind: 0,
        staged: 0,
        unstaged: 0,
        untracked: 0,
        lastCommitSha: 'mock-sha',
        lastCommitMessage: 'mock commit',
        lastCommitDate: new Date().toISOString(),
        isClean: true,
      });
    }

    // 检查目录是否存在
    if (!existsSync(workDir)) {
      return this.err('DIRECTORY_NOT_FOUND', `目录不存在: ${workDir}`, workDir);
    }

    try {
      // 检查是否是 Git 仓库
      const revParseResult = await this.executeCommand({
        command: 'git',
        args: ['rev-parse', '--is-inside-work-tree'],
        cwd: workDir,
      });

      if (revParseResult.exitCode !== 0) {
        return this.err('DIRECTORY_NOT_FOUND', '不是 Git 仓库', workDir);
      }

      // 获取分支名
      const branchResult = await this.executeCommand({
        command: 'git',
        args: ['rev-parse', '--abbrev-ref', 'HEAD'],
        cwd: workDir,
      });

      // 获取状态
      const statusResult = await this.executeCommand({
        command: 'git',
        args: ['status', '--porcelain=v1'],
        cwd: workDir,
      });

      // 获取 ahead/behind
      const aheadBehindResult = await this.executeCommand({
        command: 'git',
        args: ['rev-list', '--left-right', '--count', '@{upstream}...HEAD'],
        cwd: workDir,
      });

      // 获取最后一次提交
      const logResult = await this.executeCommand({
        command: 'git',
        args: ['log', '-1', '--format=%H|%s|%ci'],
        cwd: workDir,
      });

      const [sha, message, date] = logResult.stdout.split('|');
      const [behind, ahead] = aheadBehindResult.stdout.split(/\s+/).map(Number);

      // 解析状态
      const lines = statusResult.stdout.split('\n').filter(Boolean);
      let staged = 0;
      let unstaged = 0;
      let untracked = 0;

      for (const line of lines) {
        const index = line[0];
        const workTree = line[1];

        if (index !== ' ' && index !== '?') staged++;
        if (workTree !== ' ' && workTree !== '?') unstaged++;
        if (index === '?' && workTree === '?') untracked++;
      }

      return this.ok({
        branch: branchResult.stdout.trim(),
        ahead: ahead ?? 0,
        behind: behind ?? 0,
        staged,
        unstaged,
        untracked,
        lastCommitSha: sha?.trim() ?? '',
        lastCommitMessage: message?.trim() ?? '',
        lastCommitDate: date?.trim() ?? '',
        isClean: lines.length === 0,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (errorMessage.includes('timeout')) {
        return this.err('TIMEOUT', 'Git 命令超时', errorMessage, true);
      }

      if (errorMessage.includes('ENOENT')) {
        return this.err('COMMAND_NOT_FOUND', 'git 命令未找到', errorMessage, false);
      }

      return this.err('UNKNOWN', 'Git 命令执行失败', errorMessage, true);
    }
  }

  /**
   * 列出 worktrees
   */
  async listWorktrees(cwd?: string): Promise<LocalResult<WorktreeInfo[]>> {
    const workDir = cwd ?? this.config.projectRoot;

    if (this.isMockEnabled) {
      const mockWorktrees = this.getMockData<WorktreeInfo[]>('worktrees');
      return this.ok(mockWorktrees ?? []);
    }

    if (!existsSync(workDir)) {
      return this.err('DIRECTORY_NOT_FOUND', `目录不存在: ${workDir}`);
    }

    try {
      const result = await this.executeCommand({
        command: 'git',
        args: ['worktree', 'list', '--porcelain'],
        cwd: workDir,
      });

      if (result.exitCode !== 0) {
        return this.err('EXIT_CODE_NON_ZERO', '获取 worktree 列表失败', result.stderr);
      }

      const worktrees: WorktreeInfo[] = [];
      const lines = result.stdout.split('\n');
      let currentWorktree: Partial<WorktreeInfo> = {};

      for (const line of lines) {
        if (line.startsWith('worktree ')) {
          if (currentWorktree.path) {
            worktrees.push({
              path: currentWorktree.path,
              branch: currentWorktree.branch ?? '',
              commitSha: currentWorktree.commitSha ?? '',
              isMainWorktree: currentWorktree.isMainWorktree ?? false,
            });
          }
          currentWorktree = {
            path: line.substring(9),
            isMainWorktree: worktrees.length === 0,
          };
        } else if (line.startsWith('HEAD ')) {
          currentWorktree.commitSha = line.substring(5);
        } else if (line.startsWith('branch ')) {
          currentWorktree.branch = line.substring(7);
        }
      }

      // 添加最后一个
      if (currentWorktree.path) {
        worktrees.push({
          path: currentWorktree.path,
          branch: currentWorktree.branch ?? '',
          commitSha: currentWorktree.commitSha ?? '',
          isMainWorktree: currentWorktree.isMainWorktree ?? false,
        });
      }

      return this.ok(worktrees);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return this.err('UNKNOWN', '获取 worktree 列表失败', errorMessage);
    }
  }

  /**
   * 创建分支
   */
  async createBranch(branchName: string, cwd?: string): Promise<LocalResult<void>> {
    const workDir = cwd ?? this.config.projectRoot;

    if (this.isMockEnabled) {
      return this.ok(undefined, [`Mock: 创建分支 ${branchName}`]);
    }

    try {
      const result = await this.executeCommand({
        command: 'git',
        args: ['branch', branchName],
        cwd: workDir,
      });

      if (result.exitCode !== 0) {
        return this.err('EXIT_CODE_NON_ZERO', '创建分支失败', result.stderr);
      }

      return this.ok(undefined, [`创建分支: ${branchName}`]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return this.err('UNKNOWN', '创建分支失败', errorMessage);
    }
  }

  /**
   * 创建 worktree
   */
  async createWorktree(
    path: string,
    branchName: string,
    cwd?: string
  ): Promise<LocalResult<void>> {
    const workDir = cwd ?? this.config.projectRoot;

    if (this.isMockEnabled) {
      return this.ok(undefined, [`Mock: 创建 worktree ${path}`]);
    }

    try {
      // 先检查分支是否存在
      const branchCheck = await this.executeCommand({
        command: 'git',
        args: ['rev-parse', '--verify', branchName],
        cwd: workDir,
      });

      const args = branchCheck.exitCode === 0
        ? ['worktree', 'add', path, branchName]
        : ['worktree', 'add', '-b', branchName, path];

      const result = await this.executeCommand({
        command: 'git',
        args,
        cwd: workDir,
      });

      if (result.exitCode !== 0) {
        return this.err('EXIT_CODE_NON_ZERO', '创建 worktree 失败', result.stderr);
      }

      return this.ok(undefined, [`创建 worktree: ${path}, 分支: ${branchName}`]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return this.err('UNKNOWN', '创建 worktree 失败', errorMessage);
    }
  }

  /**
   * 删除 worktree
   */
  async removeWorktree(path: string, cwd?: string): Promise<LocalResult<void>> {
    const workDir = cwd ?? this.config.projectRoot;

    if (this.isMockEnabled) {
      return this.ok(undefined, [`Mock: 删除 worktree ${path}`]);
    }

    try {
      const result = await this.executeCommand({
        command: 'git',
        args: ['worktree', 'remove', path],
        cwd: workDir,
      });

      if (result.exitCode !== 0) {
        return this.err('EXIT_CODE_NON_ZERO', '删除 worktree 失败', result.stderr);
      }

      return this.ok(undefined, [`删除 worktree: ${path}`]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return this.err('UNKNOWN', '删除 worktree 失败', errorMessage);
    }
  }

  /**
   * 获取分支列表
   */
  async listBranches(cwd?: string): Promise<LocalResult<string[]>> {
    const workDir = cwd ?? this.config.projectRoot;

    if (this.isMockEnabled) {
      return this.ok(['main', 'develop']);
    }

    try {
      const result = await this.executeCommand({
        command: 'git',
        args: ['branch', '--format=%(refname:short)'],
        cwd: workDir,
      });

      if (result.exitCode !== 0) {
        return this.err('EXIT_CODE_NON_ZERO', '获取分支列表失败', result.stderr);
      }

      const branches = result.stdout.split('\n').filter(Boolean);
      return this.ok(branches);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return this.err('UNKNOWN', '获取分支列表失败', errorMessage);
    }
  }
}
