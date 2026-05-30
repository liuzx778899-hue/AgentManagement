import { describe, it, expect, beforeEach } from 'vitest';
import { getGitStatus, getBatchGitStatus } from '../../../../services/local/useCases/gitStatusUseCase';
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
    expect(result.error?.code).toBe('DIRECTORY_NOT_FOUND');
  });

  it('should get batch git status for multiple projects', async () => {
    gitAdapter.setMockData('status', {
      branch: 'main',
      ahead: 0,
      behind: 0,
      staged: 0,
      unstaged: 0,
      untracked: 0,
      lastCommitSha: 'sha1',
      lastCommitMessage: 'msg',
      lastCommitDate: '2026-05-30',
      isClean: true,
    });

    const result = await getBatchGitStatus(gitAdapter, [
      { id: 'proj-001', repoPath: '/path/1' },
      { id: 'proj-002', repoPath: '/path/2' },
    ]);

    expect(result.ok).toBe(true);
    expect(result.data?.length).toBe(2);
  });
});