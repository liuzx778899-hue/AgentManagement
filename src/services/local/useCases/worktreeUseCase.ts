import type { GitAdapter } from '../adapters/gitAdapter';
import type { LocalResult, WorktreeInfo } from '../../../types/localEngineering';

/**
 * Worktree 创建配置
 */
export interface CreateWorktreeConfig {
  issueNumber: number;
  issueTitle: string;
  baseBranch: string;
  worktreesDir: string;
  projectRoot: string;
}

/**
 * Worktree 创建结果
 */
export interface CreatedWorktree extends WorktreeInfo {
  issueNumber: number;
  issueTitle: string;
  createdAt: string;
}

/**
 * 生成安全的分支名
 * 格式: issue-{number}-{slugified-title}
 */
function generateBranchName(issueNumber: number, issueTitle: string): string {
  // 将标题转为安全的 slug
  const slug = issueTitle
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-') // 保留中文、字母、数字
    .replace(/^-+|-+$/g, '') // 去除首尾连字符
    .slice(0, 30); // 限制长度

  return `issue-${issueNumber}-${slug || 'task'}`;
}

/**
 * 创建 Issue 驱动的 worktree
 */
export async function createIssueWorktree(
  gitAdapter: GitAdapter,
  config: CreateWorktreeConfig
): Promise<LocalResult<CreatedWorktree>> {
  const { issueNumber, issueTitle, baseBranch, worktreesDir, projectRoot } = config;

  // 生成分支名和路径
  const branchName = generateBranchName(issueNumber, issueTitle);
  const worktreePath = `${worktreesDir}/issue-${issueNumber}-${Date.now().toString(36)}`;

  // 创建分支
  const branchResult = await gitAdapter.createBranch(branchName, projectRoot);
  if (!branchResult.ok) {
    return {
      ok: false,
      error: branchResult.error,
    };
  }

  // 创建 worktree
  const worktreeResult = await gitAdapter.createWorktree(worktreePath, branchName, projectRoot);
  if (!worktreeResult.ok) {
    return {
      ok: false,
      error: worktreeResult.error,
    };
  }

  return {
    ok: true,
    data: {
      path: worktreePath,
      branch: branchName,
      commitSha: '', // 新创建的 worktree commit 和 base 相同
      isMainWorktree: false,
      issueNumber,
      issueTitle,
      createdAt: new Date().toISOString(),
    },
    diagnostics: [`创建 worktree: ${worktreePath}`, `分支: ${branchName}`],
  };
}

/**
 * 列出项目的所有 worktree
 */
export async function listProjectWorktrees(
  gitAdapter: GitAdapter,
  projectRoot: string
): Promise<LocalResult<WorktreeInfo[]>> {
  const result = await gitAdapter.listWorktrees(projectRoot);

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
 * 删除 worktree 配置
 */
export interface RemoveWorktreeConfig {
  worktreePath: string;
  projectRoot: string;
  force?: boolean;
}

/**
 * 删除 worktree
 */
export async function removeWorktree(
  gitAdapter: GitAdapter,
  config: RemoveWorktreeConfig
): Promise<LocalResult<void>> {
  const { worktreePath, projectRoot } = config;

  // 防止删除主 worktree
  if (worktreePath === '.' || worktreePath === projectRoot ||
      worktreePath.endsWith('/') && worktreePath.slice(0, -1) === projectRoot) {
    return {
      ok: false,
      error: {
        code: 'PERMISSION_DENIED',
        message: '不能删除主 worktree',
        recoverable: false,
      },
    };
  }

  const result = await gitAdapter.removeWorktree(worktreePath, projectRoot);

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
    };
  }

  return {
    ok: true,
    data: undefined,
    diagnostics: [`已删除 worktree: ${worktreePath}`],
  };
}

/**
 * 清理已合并的 worktrees
 */
export async function cleanupMergedWorktrees(
  gitAdapter: GitAdapter,
  projectRoot: string,
  mainBranch: string = 'main'
): Promise<LocalResult<string[]>> {
  const listResult = await listProjectWorktrees(gitAdapter, projectRoot);

  if (!listResult.ok) {
    return {
      ok: false,
      error: listResult.error,
    };
  }

  const cleaned: string[] = [];
  const errors: string[] = [];

  for (const wt of listResult.data!) {
    if (wt.isMainWorktree) continue;

    // 在真实实现中，需要检查分支是否已合并到 main
    // 这里简化为只返回列表
    cleaned.push(wt.path);
  }

  return {
    ok: true,
    data: cleaned,
    diagnostics: errors.length > 0 ? errors : undefined,
  };
}