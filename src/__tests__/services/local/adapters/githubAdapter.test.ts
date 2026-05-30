import { describe, it, expect, beforeEach } from 'vitest';
import { GitHubAdapter } from '../../../../services/local/adapters/githubAdapter';
import type { AdapterConfig } from '../../../../types/localEngineering';

describe('GitHubAdapter', () => {
  let adapter: GitHubAdapter;
  const config: AdapterConfig = {
    enableMock: true,
    defaultTimeout: 30000,
    projectRoot: process.cwd(),
  };

  beforeEach(() => {
    adapter = new GitHubAdapter(config);
  });

  describe('listIssues', () => {
    it('should list issues in mock mode', async () => {
      adapter.setMockData('issues', [
        { number: 1, title: 'Test Issue', state: 'open' },
        { number: 2, title: 'Another Issue', state: 'closed' },
      ]);

      const result = await adapter.listIssues('owner', 'repo');

      expect(result.ok).toBe(true);
      expect(result.data?.length).toBe(2);
    });

    it('should filter issues by state', async () => {
      adapter.setMockData('issues', [
        { number: 1, title: 'Test Issue', state: 'open' },
        { number: 2, title: 'Another Issue', state: 'closed' },
      ]);

      const result = await adapter.listIssues('owner', 'repo', { state: 'open' });

      expect(result.ok).toBe(true);
      expect(result.data?.every(i => i.state === 'open')).toBe(true);
    });
  });

  describe('getIssue', () => {
    it('should get single issue', async () => {
      adapter.setMockData('issue-1', {
        number: 1,
        title: 'Test Issue',
        body: 'Issue description',
        state: 'open',
      });

      const result = await adapter.getIssue('owner', 'repo', 1);

      expect(result.ok).toBe(true);
      expect(result.data?.number).toBe(1);
    });
  });

  describe('listPullRequests', () => {
    it('should list pull requests', async () => {
      adapter.setMockData('prs', [
        { number: 10, title: 'PR 1', state: 'open' },
        { number: 11, title: 'PR 2', state: 'merged' },
      ]);

      const result = await adapter.listPullRequests('owner', 'repo');

      expect(result.ok).toBe(true);
      expect(result.data?.length).toBe(2);
    });
  });

  describe('getCIStatus', () => {
    it('should get CI status for ref', async () => {
      adapter.setMockData('ci-main', {
        status: 'success',
        conclusion: 'success',
        workflowRuns: [
          { name: 'CI', status: 'completed', conclusion: 'success' },
        ],
      });

      const result = await adapter.getCIStatus('owner', 'repo', 'main');

      expect(result.ok).toBe(true);
      expect(result.data?.status).toBe('success');
    });
  });

  describe('createIssue', () => {
    it('should create issue in mock mode', async () => {
      const result = await adapter.createIssue('owner', 'repo', {
        title: 'New Issue',
        body: 'Issue body',
        labels: ['bug'],
      });

      expect(result.ok).toBe(true);
      expect(result.data?.number).toBeDefined();
    });
  });

  describe('createPullRequest', () => {
    it('should create PR in mock mode', async () => {
      const result = await adapter.createPullRequest('owner', 'repo', {
        title: 'New PR',
        body: 'PR body',
        head: 'feature-branch',
        base: 'main',
      });

      expect(result.ok).toBe(true);
      expect(result.data?.number).toBeDefined();
    });
  });

  describe('validateCredentials', () => {
    it('should validate credentials in mock mode', async () => {
      const result = await adapter.validateCredentials();

      expect(result.ok).toBe(true);
      expect(result.data?.valid).toBe(true);
    });
  });
});