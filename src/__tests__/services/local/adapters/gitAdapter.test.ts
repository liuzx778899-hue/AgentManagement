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

  it('should create branch in mock mode', async () => {
    const result = await adapter.createBranch('test-branch');

    expect(result.ok).toBe(true);
    expect(result.diagnostics).toContain('Mock: 创建分支 test-branch');
  });

  it('should create worktree in mock mode', async () => {
    const result = await adapter.createWorktree('.worktrees/test', 'test-branch');

    expect(result.ok).toBe(true);
    expect(result.diagnostics?.[0]).toContain('Mock: 创建 worktree');
  });

  it('should list branches in mock mode', async () => {
    const result = await adapter.listBranches();

    expect(result.ok).toBe(true);
    expect(result.data).toContain('main');
    expect(result.data).toContain('develop');
  });
});
