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