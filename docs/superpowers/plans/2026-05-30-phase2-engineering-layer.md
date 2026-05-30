# Phase 2 工程层实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 从前端 fixtures/mock 行为升级到真实本地工程执行，打通 Git、worktree、CLI Runner、日志流和文件系统持久化。

**Architecture:** 采用 React UI -> UseCase/Service API -> Adapter -> 本地 workspace/CLI/GitHub/LLM 的分层架构。UI 组件不直接执行 shell/文件操作，所有本地能力通过 Adapter 封装，提供 mock fallback。

**Tech Stack:** TypeScript + React + Vite (前端), Node.js child_process/fs/path (本地工程层), JSON/JSONL/MD 文件持久化

---

## 文件结构规划

```
src/
├── services/
│   └── local/
│       ├── adapters/
│       │   ├── gitAdapter.ts          # Git 命令封装
│       │   ├── fileStoreAdapter.ts    # 文件系统读写
│       │   ├── processRunnerAdapter.ts # CLI 进程管理
│       │   └── index.ts               # 统一导出
│       ├── useCases/
│       │   ├── gitStatusUseCase.ts    # Git 状态读取
│       │   ├── worktreeUseCase.ts     # Worktree 管理
│       │   └── index.ts
│       ├── repositories/
│       │   ├── projectRepository.ts   # 项目配置持久化
│       │   └── index.ts
│       ├── schemas/
│       │   └── localEngineering.ts    # 本地工程类型定义
│       └── index.ts
├── types/
│   └── localEngineering.ts            # 共享类型
└── __tests__/
    └── services/
        └── local/
            ├── adapters/
            └── useCases/
```

---

## P2-01: 本地工程服务骨架

### Task 1: 创建类型定义和接口

**Files:**
- Create: `src/types/localEngineering.ts`
- Create: `src/services/local/schemas/localEngineering.ts`

- [ ] **Step 1: 创建共享类型定义**

```typescript
// src/types/localEngineering.ts

/**
 * 本地工程层统一返回结构
 */
export interface LocalResult<T> {
  ok: boolean;
  data?: T;
  error?: LocalError;
  diagnostics?: string[];
}

/**
 * 本地工程错误结构
 */
export interface LocalError {
  code: LocalErrorCode;
  message: string;
  cause?: string;
  recoverable: boolean;
}

export type LocalErrorCode =
  | 'COMMAND_NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'TIMEOUT'
  | 'EXIT_CODE_NON_ZERO'
  | 'DIRECTORY_NOT_FOUND'
  | 'INVALID_INPUT'
  | 'NETWORK_ERROR'
  | 'PARSE_ERROR'
  | 'UNKNOWN';

/**
 * 命令执行配置
 */
export interface CommandConfig {
  command: string;
  args: string[];
  cwd: string;
  timeout?: number;
  env?: Record<string, string>;
}

/**
 * 命令执行结果
 */
export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
}

/**
 * Git 状态信息
 */
export interface LocalGitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: number;
  unstaged: number;
  untracked: number;
  lastCommitSha: string;
  lastCommitMessage: string;
  lastCommitDate: string;
  isClean: boolean;
}

/**
 * Worktree 信息
 */
export interface WorktreeInfo {
  path: string;
  branch: string;
  commitSha: string;
  isMainWorktree: boolean;
}

/**
 * 进程运行状态
 */
export type ProcessState = 'idle' | 'starting' | 'running' | 'stopping' | 'stopped' | 'failed';

/**
 * Runner 进程信息
 */
export interface RunnerProcess {
  id: string;
  runnerId: string;
  pid?: number;
  state: ProcessState;
  startedAt?: string;
  stoppedAt?: string;
  exitCode?: number;
  logs: LogEntry[];
}

/**
 * 日志条目
 */
export interface LogEntry {
  timestamp: string;
  stream: 'stdout' | 'stderr';
  content: string;
}

/**
 * Adapter 配置
 */
export interface AdapterConfig {
  enableMock: boolean;
  defaultTimeout: number;
  projectRoot: string;
}
```

- [ ] **Step 2: 创建 services/local 目录结构**

```bash
mkdir -p src/services/local/adapters
mkdir -p src/services/local/useCases
mkdir -p src/services/local/repositories
mkdir -p src/services/local/schemas
mkdir -p src/__tests__/services/local/adapters
mkdir -p src/__tests__/services/local/useCases
```

- [ ] **Step 3: 验证类型编译通过**

Run: `npx tsc --noEmit src/types/localEngineering.ts`
Expected: 无错误

---

### Task 2: 创建 Adapter 基类和工具函数

**Files:**
- Create: `src/services/local/adapters/baseAdapter.ts`
- Create: `src/services/local/adapters/index.ts`

- [ ] **Step 1: 创建 Adapter 基类**

```typescript
// src/services/local/adapters/baseAdapter.ts

import type { LocalResult, LocalError, AdapterConfig, CommandConfig, CommandResult } from '../../../types/localEngineering';
import { spawn } from 'child_process';

/**
 * Adapter 基类，提供公共方法
 */
export abstract class BaseAdapter {
  protected config: AdapterConfig;
  protected mockData: Map<string, unknown> = new Map();

  constructor(config: AdapterConfig) {
    this.config = config;
  }

  /**
   * 创建成功结果
   */
  protected ok<T>(data: T, diagnostics?: string[]): LocalResult<T> {
    return { ok: true, data, diagnostics };
  }

  /**
   * 创建错误结果
   */
  protected err<T>(code: LocalError['code'], message: string, cause?: string, recoverable = false): LocalResult<T> {
    return {
      ok: false,
      error: { code, message, cause, recoverable },
    };
  }

  /**
   * 执行命令（带超时和错误处理）
   */
  protected async executeCommand(config: CommandConfig): Promise<CommandResult> {
    const { command, args, cwd, timeout = this.config.defaultTimeout, env } = config;

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const proc = spawn(command, args, {
        cwd,
        env: { ...process.env, ...env },
        shell: true,
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      const timer = setTimeout(() => {
        proc.kill('SIGTERM');
        reject(new Error(`Command timeout after ${timeout}ms`));
      }, timeout);

      proc.on('close', (code) => {
        clearTimeout(timer);
        resolve({
          exitCode: code ?? 1,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          duration: Date.now() - startTime,
        });
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  /**
   * 设置 mock 数据
   */
  setMockData(key: string, value: unknown): void {
    this.mockData.set(key, value);
  }

  /**
   * 获取 mock 数据
   */
  getMockData<T>(key: string): T | undefined {
    return this.mockData.get(key) as T | undefined;
  }

  /**
   * 是否启用 mock
   */
  protected get isMockEnabled(): boolean {
    return this.config.enableMock;
  }
}
```

- [ ] **Step 2: 创建 adapters 索引文件**

```typescript
// src/services/local/adapters/index.ts

export { BaseAdapter } from './baseAdapter';
export { GitAdapter } from './gitAdapter';
export { FileStoreAdapter } from './fileStoreAdapter';
export { ProcessRunnerAdapter } from './processRunnerAdapter';
```

- [ ] **Step 3: 验证编译**

Run: `npx tsc --noEmit`
Expected: 无错误

---

### Task 3: 创建 Git Adapter

**Files:**
- Create: `src/services/local/adapters/gitAdapter.ts`
- Create: `src/__tests__/services/local/adapters/gitAdapter.test.ts`

- [ ] **Step 1: 编写 Git Adapter 测试**

```typescript
// src/__tests__/services/local/adapters/gitAdapter.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { GitAdapter } from '../../../../services/local/adapters/gitAdapter';
import type { AdapterConfig } from '../../../../types/localEngineering';

describe('GitAdapter', () => {
  let adapter: GitAdapter;
  const config: AdapterConfig = {
    enableMock: true,
    defaultTimeout: 30000,
    projectRoot: process.cwd(),
  };

  beforeEach(() => {
    adapter = new GitAdapter(config);
  });

  it('should return mock status when mock enabled', async () => {
    adapter.setMockData('status', {
      branch: 'main',
      ahead: 0,
      behind: 0,
      staged: 0,
      unstaged: 0,
      untracked: 0,
      lastCommitSha: 'abc123',
      lastCommitMessage: 'test commit',
      lastCommitDate: '2026-05-30',
      isClean: true,
    });

    const result = await adapter.getStatus();

    expect(result.ok).toBe(true);
    expect(result.data?.branch).toBe('main');
  });

  it('should return error when command fails in real mode', async () => {
    const realAdapter = new GitAdapter({
      ...config,
      enableMock: false,
    });

    // Non-git directory
    const result = await realAdapter.getStatus('/non/existent/path');

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('DIRECTORY_NOT_FOUND');
  });

  it('should list worktrees', async () => {
    adapter.setMockData('worktrees', [
      { path: '.worktrees/issue-1-test', branch: 'issue-1-test', commitSha: 'abc123', isMainWorktree: false },
    ]);

    const result = await adapter.listWorktrees();

    expect(result.ok).toBe(true);
    expect(result.data).toHaveLength(1);
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npm --cache .npm-cache test -- src/__tests__/services/local/adapters/gitAdapter.test.ts`
Expected: FAIL - GitAdapter 不存在

- [ ] **Step 3: 实现 GitAdapter**

```typescript
// src/services/local/adapters/gitAdapter.ts

import { BaseAdapter } from './baseAdapter';
import type { 
  LocalResult, 
  LocalGitStatus, 
  WorktreeInfo, 
  AdapterConfig,
  CommandResult,
} from '../../../types/localEngineering';
import { existsSync } from 'fs';
import { join } from 'path';

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
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npm --cache .npm-cache test -- src/__tests__/services/local/adapters/gitAdapter.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/types/localEngineering.ts src/services/local/adapters/gitAdapter.ts src/__tests__/services/local/adapters/gitAdapter.test.ts
git commit -m "feat(p2-01): add GitAdapter with mock fallback"
```

---

### Task 4: 创建 FileStore Adapter

**Files:**
- Create: `src/services/local/adapters/fileStoreAdapter.ts`
- Create: `src/__tests__/services/local/adapters/fileStoreAdapter.test.ts`

- [ ] **Step 1: 编写 FileStore Adapter 测试**

```typescript
// src/__tests__/services/local/adapters/fileStoreAdapter.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { FileStoreAdapter } from '../../../../services/local/adapters/fileStoreAdapter';
import type { AdapterConfig } from '../../../../types/localEngineering';

describe('FileStoreAdapter', () => {
  let adapter: FileStoreAdapter;
  const config: AdapterConfig = {
    enableMock: true,
    defaultTimeout: 30000,
    projectRoot: process.cwd(),
  };

  beforeEach(() => {
    adapter = new FileStoreAdapter(config);
  });

  it('should read JSON file in mock mode', async () => {
    const mockData = { test: 'value' };
    adapter.setMockData('test.json', mockData);

    const result = await adapter.readJson<{ test: string }>('test.json');

    expect(result.ok).toBe(true);
    expect(result.data?.test).toBe('value');
  });

  it('should write JSON file in mock mode', async () => {
    const result = await adapter.writeJson('test.json', { foo: 'bar' });

    expect(result.ok).toBe(true);
  });

  it('should check file existence', async () => {
    adapter.setMockData('exists.json', { data: 'test' });

    const result = await adapter.exists('exists.json');

    expect(result.ok).toBe(true);
    expect(result.data).toBe(true);
  });

  it('should return error for non-allowed path in real mode', async () => {
    const realAdapter = new FileStoreAdapter({
      ...config,
      enableMock: false,
    });

    const result = await realAdapter.readJson('/etc/passwd');

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('PERMISSION_DENIED');
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npm --cache .npm-cache test -- src/__tests__/services/local/adapters/fileStoreAdapter.test.ts`
Expected: FAIL - FileStoreAdapter 不存在

- [ ] **Step 3: 实现 FileStoreAdapter**

```typescript
// src/services/local/adapters/fileStoreAdapter.ts

import { BaseAdapter } from './baseAdapter';
import type { LocalResult, AdapterConfig } from '../../../types/localEngineering';
import { readFile, writeFile, mkdir, access, rename, unlink } from 'fs/promises';
import { join, resolve, dirname, basename } from 'path';
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
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npm --cache .npm-cache test -- src/__tests__/services/local/adapters/fileStoreAdapter.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/services/local/adapters/fileStoreAdapter.ts src/__tests__/services/local/adapters/fileStoreAdapter.test.ts
git commit -m "feat(p2-01): add FileStoreAdapter with safe file operations"
```

---

### Task 5: 创建 ProcessRunner Adapter

**Files:**
- Create: `src/services/local/adapters/processRunnerAdapter.ts`
- Create: `src/__tests__/services/local/adapters/processRunnerAdapter.test.ts`

- [ ] **Step 1: 编写 ProcessRunner Adapter 测试**

```typescript
// src/__tests__/services/local/adapters/processRunnerAdapter.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { ProcessRunnerAdapter } from '../../../../services/local/adapters/processRunnerAdapter';
import type { AdapterConfig } from '../../../../types/localEngineering';

describe('ProcessRunnerAdapter', () => {
  let adapter: ProcessRunnerAdapter;
  const config: AdapterConfig = {
    enableMock: true,
    defaultTimeout: 30000,
    projectRoot: process.cwd(),
  };

  beforeEach(() => {
    adapter = new ProcessRunnerAdapter(config);
  });

  it('should start a mock process', async () => {
    const result = await adapter.start({
      runnerId: 'test-runner',
      command: 'echo',
      args: ['hello'],
      cwd: process.cwd(),
    });

    expect(result.ok).toBe(true);
    expect(result.data?.state).toBe('running');
  });

  it('should stop a mock process', async () => {
    const startResult = await adapter.start({
      runnerId: 'test-runner',
      command: 'sleep',
      args: ['10'],
      cwd: process.cwd(),
    });

    expect(startResult.ok).toBe(true);
    const processId = startResult.data!.id;

    const stopResult = await adapter.stop(processId);
    expect(stopResult.ok).toBe(true);
    expect(stopResult.data?.state).toBe('stopped');
  });

  it('should get process logs', async () => {
    const startResult = await adapter.start({
      runnerId: 'test-runner',
      command: 'echo',
      args: ['hello'],
      cwd: process.cwd(),
    });

    const processId = startResult.data!.id;
    const logsResult = await adapter.getLogs(processId);

    expect(logsResult.ok).toBe(true);
    expect(Array.isArray(logsResult.data)).toBe(true);
  });

  it('should list running processes', async () => {
    await adapter.start({
      runnerId: 'runner-1',
      command: 'sleep',
      args: ['10'],
      cwd: process.cwd(),
    });

    const result = await adapter.listProcesses();

    expect(result.ok).toBe(true);
    expect(result.data?.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npm --cache .npm-cache test -- src/__tests__/services/local/adapters/processRunnerAdapter.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现 ProcessRunnerAdapter**

```typescript
// src/services/local/adapters/processRunnerAdapter.ts

import { BaseAdapter } from './baseAdapter';
import type { 
  LocalResult, 
  AdapterConfig, 
  RunnerProcess, 
  ProcessState,
  LogEntry,
} from '../../../types/localEngineering';
import { spawn, ChildProcess } from 'child_process';
import { randomUUID } from 'crypto';

/**
 * 进程启动配置
 */
export interface ProcessStartConfig {
  runnerId: string;
  command: string;
  args: string[];
  cwd: string;
  env?: Record<string, string>;
  timeout?: number;
}

/**
 * 进程运行器 Adapter
 * 
 * 负责启动、停止、监控 CLI agent 子进程
 */
export class ProcessRunnerAdapter extends BaseAdapter {
  private processes: Map<string, RunnerProcess> = new Map();
  private childProcesses: Map<string, ChildProcess> = new Map();
  private commandWhitelist: Set<string>;

  constructor(config: AdapterConfig) {
    super(config);
    // 默认命令白名单
    this.commandWhitelist = new Set([
      'npm',
      'node',
      'npx',
      'git',
      'claude',
      'codex',
      'cursor',
    ]);
  }

  /**
   * 添加命令到白名单
   */
  addToWhitelist(command: string): void {
    this.commandWhitelist.add(command);
  }

  /**
   * 检查命令是否在白名单中
   */
  private isCommandAllowed(command: string): boolean {
    // 提取命令名（去除路径）
    const cmdName = command.split('/').pop() ?? command;
    return this.commandWhitelist.has(cmdName);
  }

  /**
   * 启动进程
   */
  async start(config: ProcessStartConfig): Promise<LocalResult<RunnerProcess>> {
    const { runnerId, command, args, cwd, env, timeout } = config;

    // 检查命令白名单
    if (!this.isCommandAllowed(command) && !this.isMockEnabled) {
      return this.err('PERMISSION_DENIED', `命令不在白名单中: ${command}`, command);
    }

    const processId = randomUUID();
    const now = new Date().toISOString();

    // Mock 模式
    if (this.isMockEnabled) {
      const mockProcess: RunnerProcess = {
        id: processId,
        runnerId,
        state: 'running',
        startedAt: now,
        logs: [
          {
            timestamp: now,
            stream: 'stdout',
            content: `Mock process started: ${command} ${args.join(' ')}`,
          },
        ],
      };
      this.processes.set(processId, mockProcess);
      return this.ok(mockProcess);
    }

    try {
      const proc = spawn(command, args, {
        cwd,
        env: { ...process.env, ...env },
        shell: true,
      });

      const runnerProcess: RunnerProcess = {
        id: processId,
        runnerId,
        pid: proc.pid,
        state: 'running',
        startedAt: now,
        logs: [],
      };

      // 收集日志
      proc.stdout?.on('data', (data) => {
        runnerProcess.logs.push({
          timestamp: new Date().toISOString(),
          stream: 'stdout',
          content: data.toString(),
        });
      });

      proc.stderr?.on('data', (data) => {
        runnerProcess.logs.push({
          timestamp: new Date().toISOString(),
          stream: 'stderr',
          content: data.toString(),
        });
      });

      proc.on('close', (code) => {
        runnerProcess.state = code === 0 ? 'stopped' : 'failed';
        runnerProcess.stoppedAt = new Date().toISOString();
        runnerProcess.exitCode = code ?? 1;
        this.childProcesses.delete(processId);
      });

      proc.on('error', (err) => {
        runnerProcess.state = 'failed';
        runnerProcess.logs.push({
          timestamp: new Date().toISOString(),
          stream: 'stderr',
          content: err.message,
        });
      });

      this.processes.set(processId, runnerProcess);
      this.childProcesses.set(processId, proc);

      // 设置超时
      if (timeout) {
        setTimeout(() => {
          if (runnerProcess.state === 'running') {
            proc.kill('SIGTERM');
          }
        }, timeout);
      }

      return this.ok(runnerProcess);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return this.err('UNKNOWN', '启动进程失败', errorMessage);
    }
  }

  /**
   * 停止进程
   */
  async stop(processId: string): Promise<LocalResult<RunnerProcess>> {
    const runnerProcess = this.processes.get(processId);

    if (!runnerProcess) {
      return this.err('DIRECTORY_NOT_FOUND', `进程不存在: ${processId}`);
    }

    if (runnerProcess.state !== 'running') {
      return this.ok(runnerProcess);
    }

    // Mock 模式
    if (this.isMockEnabled) {
      runnerProcess.state = 'stopped';
      runnerProcess.stoppedAt = new Date().toISOString();
      return this.ok(runnerProcess);
    }

    const childProcess = this.childProcesses.get(processId);
    if (childProcess) {
      childProcess.kill('SIGTERM');
      runnerProcess.state = 'stopped';
      runnerProcess.stoppedAt = new Date().toISOString();
    }

    return this.ok(runnerProcess);
  }

  /**
   * 获取进程日志
   */
  async getLogs(processId: string): Promise<LocalResult<LogEntry[]>> {
    const runnerProcess = this.processes.get(processId);

    if (!runnerProcess) {
      return this.err('DIRECTORY_NOT_FOUND', `进程不存在: ${processId}`);
    }

    return this.ok(runnerProcess.logs);
  }

  /**
   * 获取进程状态
   */
  async getStatus(processId: string): Promise<LocalResult<RunnerProcess>> {
    const runnerProcess = this.processes.get(processId);

    if (!runnerProcess) {
      return this.err('DIRECTORY_NOT_FOUND', `进程不存在: ${processId}`);
    }

    return this.ok(runnerProcess);
  }

  /**
   * 列出所有进程
   */
  async listProcesses(): Promise<LocalResult<RunnerProcess[]>> {
    return this.ok(Array.from(this.processes.values()));
  }

  /**
   * 清理已停止的进程
   */
  async cleanup(): Promise<LocalResult<void>> {
    for (const [id, proc] of this.processes) {
      if (proc.state === 'stopped' || proc.state === 'failed') {
        this.processes.delete(id);
        this.childProcesses.delete(id);
      }
    }
    return this.ok(undefined, ['清理已停止进程']);
  }
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npm --cache .npm-cache test -- src/__tests__/services/local/adapters/processRunnerAdapter.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/services/local/adapters/processRunnerAdapter.ts src/__tests__/services/local/adapters/processRunnerAdapter.test.ts src/services/local/adapters/baseAdapter.ts src/services/local/adapters/index.ts
git commit -m "feat(p2-01): add ProcessRunnerAdapter for CLI process management"
```

---

### Task 6: 创建本地工程服务入口

**Files:**
- Create: `src/services/local/index.ts`
- Create: `src/config/localEngineering.ts`

- [ ] **Step 1: 创建服务入口**

```typescript
// src/services/local/index.ts

import { GitAdapter } from './adapters/gitAdapter';
import { FileStoreAdapter } from './adapters/fileStoreAdapter';
import { ProcessRunnerAdapter } from './adapters/processRunnerAdapter';
import type { AdapterConfig } from '../../types/localEngineering';

export interface LocalEngineeringServices {
  git: GitAdapter;
  fileStore: FileStoreAdapter;
  processRunner: ProcessRunnerAdapter;
}

/**
 * 创建本地工程服务实例
 */
export function createLocalServices(config: Partial<AdapterConfig> = {}): LocalEngineeringServices {
  const defaultConfig: AdapterConfig = {
    enableMock: typeof window !== 'undefined', // 浏览器环境默认 mock
    defaultTimeout: 30000,
    projectRoot: config.projectRoot ?? process.cwd(),
  };

  const finalConfig = { ...defaultConfig, ...config };

  return {
    git: new GitAdapter(finalConfig),
    fileStore: new FileStoreAdapter(finalConfig),
    processRunner: new ProcessRunnerAdapter(finalConfig),
  };
}

// 导出类型
export type { LocalResult, LocalError, LocalGitStatus, WorktreeInfo, RunnerProcess } from '../../types/localEngineering';
export { GitAdapter } from './adapters/gitAdapter';
export { FileStoreAdapter } from './adapters/fileStoreAdapter';
export { ProcessRunnerAdapter } from './adapters/processRunnerAdapter';
```

- [ ] **Step 2: 创建配置**

```typescript
// src/config/localEngineering.ts

import type { AdapterConfig } from '../types/localEngineering';

/**
 * 本地工程服务配置
 */
export const localEngineeringConfig: Partial<AdapterConfig> = {
  enableMock: false, // 默认使用真实命令
  defaultTimeout: 30000,
};

/**
 * 获取当前项目根目录
 */
export function getProjectRoot(): string {
  // 在浏览器中返回空或 mock
  if (typeof window !== 'undefined') {
    return '';
  }
  return process.cwd();
}
```

- [ ] **Step 3: 验证编译和测试**

Run: `npm --cache .npm-cache run build`
Expected: PASS

Run: `npm --cache .npm-cache test`
Expected: PASS

- [ ] **Step 4: 提交 P2-01 完成**

```bash
git add src/services/local/index.ts src/config/localEngineering.ts
git commit -m "feat(p2-01): complete local engineering service skeleton"
```

---

## P2-02: Git 状态读取与 UI 集成

### Task 7: 创建 Git 状态 UseCase

**Files:**
- Create: `src/services/local/useCases/gitStatusUseCase.ts`
- Create: `src/__tests__/services/local/useCases/gitStatusUseCase.test.ts`

- [ ] **Step 1: 编写 UseCase 测试**

```typescript
// src/__tests__/services/local/useCases/gitStatusUseCase.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { getGitStatus } from '../../../../services/local/useCases/gitStatusUseCase';
import { GitAdapter } from '../../../../services/local/adapters/gitAdapter';
import type { AdapterConfig } from '../../../../types/localEngineering';

describe('gitStatusUseCase', () => {
  let gitAdapter: GitAdapter;
  const config: AdapterConfig = {
    enableMock: true,
    defaultTimeout: 30000,
    projectRoot: process.cwd(),
  };

  beforeEach(() => {
    gitAdapter = new GitAdapter(config);
  });

  it('should return git status for project', async () => {
    gitAdapter.setMockData('status', {
      branch: 'main',
      ahead: 1,
      behind: 0,
      staged: 2,
      unstaged: 0,
      untracked: 3,
      lastCommitSha: 'abc123',
      lastCommitMessage: 'test',
      lastCommitDate: '2026-05-30',
      isClean: false,
    });

    const result = await getGitStatus(gitAdapter, 'proj-001', '/test/path');

    expect(result.ok).toBe(true);
    expect(result.data?.branch).toBe('main');
    expect(result.data?.projectId).toBe('proj-001');
  });

  it('should handle error gracefully', async () => {
    const realAdapter = new GitAdapter({ ...config, enableMock: false });

    const result = await getGitStatus(realAdapter, 'proj-001', '/non/existent/path');

    expect(result.ok).toBe(false);
  });
});
```

- [ ] **Step 2: 实现 UseCase**

```typescript
// src/services/local/useCases/gitStatusUseCase.ts

import type { GitAdapter } from '../adapters/gitAdapter';
import type { LocalResult, LocalGitStatus } from '../../../types/localEngineering';

/**
 * 项目 Git 状态（扩展自 LocalGitStatus）
 */
export interface ProjectGitStatus extends LocalGitStatus {
  projectId: string;
  repoPath: string;
  fetchedAt: string;
}

/**
 * 获取项目 Git 状态
 */
export async function getGitStatus(
  gitAdapter: GitAdapter,
  projectId: string,
  repoPath: string
): Promise<LocalResult<ProjectGitStatus>> {
  const result = await gitAdapter.getStatus(repoPath);

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
    };
  }

  return {
    ok: true,
    data: {
      ...result.data!,
      projectId,
      repoPath,
      fetchedAt: new Date().toISOString(),
    },
  };
}

/**
 * 获取多个项目的 Git 状态
 */
export async function getBatchGitStatus(
  gitAdapter: GitAdapter,
  projects: Array<{ id: string; repoPath: string }>
): Promise<LocalResult<ProjectGitStatus[]>> {
  const results: ProjectGitStatus[] = [];
  const errors: string[] = [];

  for (const project of projects) {
    const result = await getGitStatus(gitAdapter, project.id, project.repoPath);
    if (result.ok) {
      results.push(result.data!);
    } else {
      errors.push(`${project.id}: ${result.error?.message}`);
    }
  }

  if (errors.length > 0 && results.length === 0) {
    return {
      ok: false,
      error: {
        code: 'UNKNOWN',
        message: '所有项目 Git 状态获取失败',
        cause: errors.join('; '),
        recoverable: true,
      },
    };
  }

  return {
    ok: true,
    data: results,
    diagnostics: errors.length > 0 ? errors : undefined,
  };
}
```

- [ ] **Step 3: 运行测试**

Run: `npm --cache .npm-cache test -- src/__tests__/services/local/useCases/gitStatusUseCase.test.ts`
Expected: PASS

- [ ] **Step 4: 提交**

```bash
git add src/services/local/useCases/gitStatusUseCase.ts src/__tests__/services/local/useCases/gitStatusUseCase.test.ts
git commit -m "feat(p2-02): add gitStatusUseCase for reading real git status"
```

---

### Task 8: 集成 Git 状态到项目卡片

**Files:**
- Modify: `src/components/ProjectCard.tsx`
- Modify: `src/state/workbenchActions.ts`

- [ ] **Step 1: 添加 Git 状态刷新 Action**

在 `src/state/workbenchActions.ts` 中添加：

```typescript
// 在现有 actions 后添加

export function refreshGitStatus(
  dispatch: React.Dispatch<WorkbenchAction>,
  projectId: string
) {
  dispatch({ type: 'REFRESH_GIT_STATUS_START', payload: { projectId } });
  
  // 实际调用会在组件中通过 adapter 完成
}

export function updateGitStatus(
  dispatch: React.Dispatch<WorkbenchAction>,
  projectId: string,
  status: Partial<GitStatus>
) {
  dispatch({ 
    type: 'UPDATE_GIT_STATUS', 
    payload: { projectId, status } 
  });
}
```

在 `src/state/workbenchReducer.ts` 中添加对应 case：

```typescript
// 在 reducer switch 中添加
case 'REFRESH_GIT_STATUS_START':
  // 可以设置 loading 状态
  return state;

case 'UPDATE_GIT_STATUS': {
  const { projectId, status } = action.payload;
  const existingStatus = state.gitStatuses.find(s => s.projectId === projectId);
  
  if (existingStatus) {
    return {
      ...state,
      gitStatuses: state.gitStatuses.map(s =>
        s.projectId === projectId ? { ...s, ...status } : s
      ),
    };
  }
  
  return {
    ...state,
    gitStatuses: [...state.gitStatuses, { projectId, ...status } as GitStatus],
  };
}
```

- [ ] **Step 2: 运行测试验证**

Run: `npm --cache .npm-cache test`
Expected: PASS

- [ ] **Step 3: 提交**

```bash
git add src/state/workbenchActions.ts src/state/workbenchReducer.ts
git commit -m "feat(p2-02): add git status refresh actions"
```

---

### Task 9: 验证 P2-01 和 P2-02 完成

- [ ] **Step 1: 运行完整测试**

Run: `npm --cache .npm-cache test`
Expected: 所有测试通过

- [ ] **Step 2: 运行构建**

Run: `npm --cache .npm-cache run build`
Expected: 构建成功，无错误

- [ ] **Step 3: 提交里程碑**

```bash
git add .
git commit -m "feat(p2-01, p2-02): complete local engineering skeleton and git status reading"
```

---

## 后续里程碑概要

以下是 P2-03 到 P2-10 的任务概要，详细实施计划将在 P2-01/02 完成后展开：

### P2-03: Issue Worktree 创建流程
- WorktreeUseCase 实现
- 基于 Issue 编号创建分支和 worktree
- UI 集成：项目管理页新增"创建 Worktree"按钮
- 验收：`.worktrees/issue-xxx-*` 可创建、打开、清理

### P2-04: CLI Runner 进程管理
- ProcessRunnerUseCase 实现
- Runner 配置与启动逻辑
- 日志流实时显示
- UI：工作台 Runner 控制面板

### P2-05: Workflow 执行引擎 MVP
- WorkflowExecutionEngine 实现
- 步骤调度、角色绑定、Gate 处理
- 状态机管理

### P2-06: 文件系统持久化
- ProjectRepository 实现
- `.agentmanagement/` 目录结构
- JSON/MD 文件读写

### P2-07: GitHub 同步恢复
- GitHubAdapter 实现
- Issue/PR/CI API 调用
- 凭证管理与 API 验证

### P2-08: LLM/API 接入
- LlmAdapter 实现
- 模型配置验证
- AI 助手真实调用

### P2-09: 安全与审计
- 命令白名单完善
- 敏感信息脱敏
- 审计日志记录

### P2-10: 演示闭环
- 端到端流程演示
- 文档更新
- 验收录制

---

## 验收清单

### P2-01 验收
- [ ] `src/types/localEngineering.ts` 类型定义完整
- [ ] GitAdapter 支持 mock 模式和真实命令
- [ ] FileStoreAdapter 路径安全检查
- [ ] ProcessRunnerAdapter 命令白名单
- [ ] 所有 adapter 测试覆盖成功/失败路径
- [ ] `npm run build` 通过
- [ ] `npm test` 通过

### P2-02 验收
- [ ] gitStatusUseCase 可获取真实 Git 状态
- [ ] 项目卡片可显示真实分支/状态
- [ ] 错误态有友好提示
- [ ] Mock 模式可用于浏览器预览

---

## 注意事项

1. **不要在浏览器环境直接执行 shell 命令** - 所有本地能力仅限 Node.js 环境，浏览器使用 mock
2. **保持 mock fallback** - 每个 Adapter 必须支持 mock 模式，确保纯前端可运行
3. **路径安全** - FileStoreAdapter 必须检查路径在允许范围内
4. **命令白名单** - ProcessRunnerAdapter 只允许白名单命令
5. **错误友好** - 所有错误必须有明确的 code 和 message，支持 recoverable 判断
