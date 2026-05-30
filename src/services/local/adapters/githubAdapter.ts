import { BaseAdapter } from './baseAdapter';
import type { LocalResult, AdapterConfig } from '../../../types/localEngineering';

/**
 * GitHub Issue
 */
export interface GitHubIssue {
  number: number;
  title: string;
  body?: string;
  state: 'open' | 'closed';
  labels: string[];
  assignees: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * GitHub Pull Request
 */
export interface GitHubPullRequest {
  number: number;
  title: string;
  body?: string;
  state: 'open' | 'closed' | 'merged';
  head: string;
  base: string;
  user: string;
  createdAt: string;
  mergedAt?: string;
}

/**
 * CI 状态
 */
export interface CIStatus {
  status: 'pending' | 'success' | 'failure' | 'error';
  conclusion?: string;
  workflowRuns: Array<{
    name: string;
    status: string;
    conclusion?: string;
  }>;
}

/**
 * 创建 Issue 配置
 */
export interface CreateIssueConfig {
  title: string;
  body?: string;
  labels?: string[];
  assignees?: string[];
}

/**
 * 创建 PR 配置
 */
export interface CreatePRConfig {
  title: string;
  body?: string;
  head: string;
  base: string;
  draft?: boolean;
}

/**
 * GitHub API 封装 Adapter
 */
export class GitHubAdapter extends BaseAdapter {
  private token?: string;

  constructor(config: AdapterConfig) {
    super(config);
    // 从环境变量或配置读取 token
    this.token = process.env.GITHUB_TOKEN;
  }

  /**
   * 设置访问令牌
   */
  setToken(token: string): void {
    this.token = token;
  }

  /**
   * 列出 Issues
   */
  async listIssues(
    owner: string,
    repo: string,
    options?: { state?: 'open' | 'closed' | 'all'; labels?: string[] }
  ): Promise<LocalResult<GitHubIssue[]>> {
    if (this.isMockEnabled) {
      const mockIssues = this.getMockData<GitHubIssue[]>('issues') ?? [];
      let filtered = mockIssues;

      if (options?.state && options.state !== 'all') {
        filtered = filtered.filter(i => i.state === options.state);
      }

      return this.ok(filtered);
    }

    // 实际 GitHub API 调用
    try {
      const response = await this.executeCommand({
        command: 'gh',
        args: [
          'issue',
          'list',
          '--repo',
          `${owner}/${repo}`,
          '--state',
          options?.state ?? 'open',
          '--json',
          'number,title,body,state,labels,assignees,createdAt,updatedAt',
        ],
        cwd: this.config.projectRoot,
      });

      if (response.exitCode !== 0) {
        return this.err('UNKNOWN', '获取 Issues 失败', response.stderr);
      }

      const issues = JSON.parse(response.stdout) as GitHubIssue[];
      return this.ok(issues);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return this.err('UNKNOWN', '获取 Issues 失败', errorMessage);
    }
  }

  /**
   * 获取单个 Issue
   */
  async getIssue(
    owner: string,
    repo: string,
    issueNumber: number
  ): Promise<LocalResult<GitHubIssue>> {
    if (this.isMockEnabled) {
      const mockIssue = this.getMockData<GitHubIssue>(`issue-${issueNumber}`);
      if (mockIssue) {
        return this.ok(mockIssue);
      }
      return this.err('DIRECTORY_NOT_FOUND', `Issue ${issueNumber} 不存在`);
    }

    try {
      const response = await this.executeCommand({
        command: 'gh',
        args: [
          'issue',
          'view',
          String(issueNumber),
          '--repo',
          `${owner}/${repo}`,
          '--json',
          'number,title,body,state,labels,assignees,createdAt,updatedAt',
        ],
        cwd: this.config.projectRoot,
      });

      if (response.exitCode !== 0) {
        return this.err('DIRECTORY_NOT_FOUND', `Issue ${issueNumber} 不存在`);
      }

      const issue = JSON.parse(response.stdout) as GitHubIssue;
      return this.ok(issue);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return this.err('UNKNOWN', '获取 Issue 失败', errorMessage);
    }
  }

  /**
   * 列出 Pull Requests
   */
  async listPullRequests(
    owner: string,
    repo: string,
    options?: { state?: 'open' | 'closed' | 'all' }
  ): Promise<LocalResult<GitHubPullRequest[]>> {
    if (this.isMockEnabled) {
      const mockPRs = this.getMockData<GitHubPullRequest[]>('prs') ?? [];
      let filtered = mockPRs;

      if (options?.state && options.state !== 'all') {
        filtered = filtered.filter(pr =>
          options.state === 'open' ? pr.state === 'open' : pr.state !== 'open'
        );
      }

      return this.ok(filtered);
    }

    try {
      const response = await this.executeCommand({
        command: 'gh',
        args: [
          'pr',
          'list',
          '--repo',
          `${owner}/${repo}`,
          '--state',
          options?.state ?? 'open',
          '--json',
          'number,title,body,state,head,base,user,createdAt,mergedAt',
        ],
        cwd: this.config.projectRoot,
      });

      if (response.exitCode !== 0) {
        return this.err('UNKNOWN', '获取 PRs 失败', response.stderr);
      }

      const prs = JSON.parse(response.stdout) as GitHubPullRequest[];
      return this.ok(prs);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return this.err('UNKNOWN', '获取 PRs 失败', errorMessage);
    }
  }

  /**
   * 获取 CI 状态
   */
  async getCIStatus(
    owner: string,
    repo: string,
    ref: string
  ): Promise<LocalResult<CIStatus>> {
    if (this.isMockEnabled) {
      const mockStatus = this.getMockData<CIStatus>(`ci-${ref}`);
      if (mockStatus) {
        return this.ok(mockStatus);
      }
      // 默认返回成功
      return this.ok({
        status: 'success',
        conclusion: 'success',
        workflowRuns: [],
      });
    }

    try {
      const response = await this.executeCommand({
        command: 'gh',
        args: [
          'api',
          `repos/${owner}/${repo}/commits/${ref}/check-runs`,
          '--jq',
          '{status: .check_runs[0].status, conclusion: .check_runs[0].conclusion, workflowRuns: [.check_runs[] | {name: .name, status: .status, conclusion: .conclusion}]}',
        ],
        cwd: this.config.projectRoot,
      });

      if (response.exitCode !== 0) {
        return this.err('UNKNOWN', '获取 CI 状态失败', response.stderr);
      }

      const status = JSON.parse(response.stdout) as CIStatus;
      return this.ok(status);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return this.err('UNKNOWN', '获取 CI 状态失败', errorMessage);
    }
  }

  /**
   * 创建 Issue
   */
  async createIssue(
    owner: string,
    repo: string,
    config: CreateIssueConfig
  ): Promise<LocalResult<GitHubIssue>> {
    if (this.isMockEnabled) {
      const newIssue: GitHubIssue = {
        number: Math.floor(Math.random() * 1000) + 100,
        title: config.title,
        body: config.body,
        state: 'open',
        labels: config.labels ?? [],
        assignees: config.assignees ?? [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return this.ok(newIssue);
    }

    try {
      const args = [
        'issue',
        'create',
        '--repo',
        `${owner}/${repo}`,
        '--title',
        config.title,
      ];

      if (config.body) {
        args.push('--body', config.body);
      }

      if (config.labels?.length) {
        args.push('--label', config.labels.join(','));
      }

      if (config.assignees?.length) {
        args.push('--assignee', config.assignees.join(','));
      }

      const response = await this.executeCommand({
        command: 'gh',
        args,
        cwd: this.config.projectRoot,
      });

      if (response.exitCode !== 0) {
        return this.err('UNKNOWN', '创建 Issue 失败', response.stderr);
      }

      // 解析返回的 URL 获取 Issue 编号
      const issueUrl = response.stdout.trim();
      const issueNumber = parseInt(issueUrl.split('/').pop() ?? '0', 10);

      return this.ok({
        number: issueNumber,
        title: config.title,
        body: config.body,
        state: 'open',
        labels: config.labels ?? [],
        assignees: config.assignees ?? [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return this.err('UNKNOWN', '创建 Issue 失败', errorMessage);
    }
  }

  /**
   * 创建 Pull Request
   */
  async createPullRequest(
    owner: string,
    repo: string,
    config: CreatePRConfig
  ): Promise<LocalResult<GitHubPullRequest>> {
    if (this.isMockEnabled) {
      const newPR: GitHubPullRequest = {
        number: Math.floor(Math.random() * 1000) + 100,
        title: config.title,
        body: config.body,
        state: 'open',
        head: config.head,
        base: config.base,
        user: 'mock-user',
        createdAt: new Date().toISOString(),
      };
      return this.ok(newPR);
    }

    try {
      const args = [
        'pr',
        'create',
        '--repo',
        `${owner}/${repo}`,
        '--title',
        config.title,
        '--head',
        config.head,
        '--base',
        config.base,
      ];

      if (config.body) {
        args.push('--body', config.body);
      }

      if (config.draft) {
        args.push('--draft');
      }

      const response = await this.executeCommand({
        command: 'gh',
        args,
        cwd: this.config.projectRoot,
      });

      if (response.exitCode !== 0) {
        return this.err('UNKNOWN', '创建 PR 失败', response.stderr);
      }

      const prUrl = response.stdout.trim();
      const prNumber = parseInt(prUrl.split('/').pop() ?? '0', 10);

      return this.ok({
        number: prNumber,
        title: config.title,
        body: config.body,
        state: 'open',
        head: config.head,
        base: config.base,
        user: 'current-user',
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return this.err('UNKNOWN', '创建 PR 失败', errorMessage);
    }
  }

  /**
   * 验证凭证
   */
  async validateCredentials(): Promise<LocalResult<{ valid: boolean; user?: string }>> {
    if (this.isMockEnabled) {
      return this.ok({ valid: true, user: 'mock-user' });
    }

    try {
      const response = await this.executeCommand({
        command: 'gh',
        args: ['auth', 'status', '--show-token'],
        cwd: this.config.projectRoot,
      });

      const valid = response.exitCode === 0;

      return this.ok({
        valid,
        user: valid ? 'authenticated' : undefined,
      });
    } catch (error) {
      return this.ok({ valid: false });
    }
  }
}