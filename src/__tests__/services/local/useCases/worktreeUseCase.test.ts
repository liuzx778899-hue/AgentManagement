import { describe, it, expect, beforeEach } from 'vitest';
import { createIssueWorktree, listProjectWorktrees, removeWorktree } from '../../../../services/local/useCases/worktreeUseCase';
import { GitAdapter } from '../../../../services/local/adapters/gitAdapter';
import type { AdapterConfig, WorktreeInfo } from '../../../../types/localEngineering';

describe('worktreeUseCase', () => {
  let gitAdapter: GitAdapter;
  const config: AdapterConfig = {
    enableMock: true,
    defaultTimeout: 30000,
    projectRoot: process.cwd(),
  };

  beforeEach(() => {
    gitAdapter = new GitAdapter(config);
  });

  describe('createIssueWorktree', () => {
    it('should create worktree with issue-based naming', async () => {
      const result = await createIssueWorktree(gitAdapter, {
        issueNumber: 123,
        issueTitle: 'Add feature X',
        baseBranch: 'main',
        worktreesDir: '.worktrees',
        projectRoot: process.cwd(),
      });

      expect(result.ok).toBe(true);
      expect(result.data?.branch).toBe('issue-123-add-feature-x');
      expect(result.data?.path).toContain('.worktrees/issue-123');
    });

    it('should handle special characters in issue title', async () => {
      const result = await createIssueWorktree(gitAdapter, {
        issueNumber: 456,
        issueTitle: 'Fix: "Quotes" & <Special> Characters!',
        baseBranch: 'main',
        worktreesDir: '.worktrees',
        projectRoot: process.cwd(),
      });

      expect(result.ok).toBe(true);
      expect(result.data?.branch).toMatch(/^issue-456-/);
    });

    it('should return error if worktree creation fails', async () => {
      const realAdapter = new GitAdapter({ ...config, enableMock: false });

      const result = await createIssueWorktree(realAdapter, {
        issueNumber: 789,
        issueTitle: 'Test',
        baseBranch: 'main',
        worktreesDir: '/non/existent/path',
        projectRoot: '/non/existent/path',
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('UNKNOWN');
    });
  });

  describe('listProjectWorktrees', () => {
    it('should list all worktrees for a project', async () => {
      gitAdapter.setMockData('worktrees', [
        { path: '.worktrees/issue-1-test', branch: 'issue-1-test', commitSha: 'abc123', isMainWorktree: false },
        { path: '.', branch: 'main', commitSha: 'def456', isMainWorktree: true },
      ]);

      const result = await listProjectWorktrees(gitAdapter, process.cwd());

      expect(result.ok).toBe(true);
      expect(result.data?.length).toBe(2);
    });

    it('should return empty array when no worktrees', async () => {
      const result = await listProjectWorktrees(gitAdapter, process.cwd());

      expect(result.ok).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe('removeWorktree', () => {
    it('should remove worktree successfully', async () => {
      const result = await removeWorktree(gitAdapter, {
        worktreePath: '.worktrees/issue-123-test',
        projectRoot: process.cwd(),
      });

      expect(result.ok).toBe(true);
    });

    it('should prevent removing main worktree', async () => {
      const result = await removeWorktree(gitAdapter, {
        worktreePath: '.',
        projectRoot: process.cwd(),
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('PERMISSION_DENIED');
    });
  });
});