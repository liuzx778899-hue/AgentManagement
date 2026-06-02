/**
 * Git API client
 */
import { apiCall, type ApiResponse } from './client';
import type { WorktreeInfo } from '../../types/localEngineering';

export interface GitStatus {
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
  projectId: string;
  repoPath: string;
  fetchedAt: string;
}

export const gitApi = {
  getStatus: (repoPath: string) =>
    apiCall<GitStatus>('GET', `/git/status?path=${encodeURIComponent(repoPath)}`),

  getBranches: (repoPath: string) =>
    apiCall<string[]>('GET', `/git/branches?path=${encodeURIComponent(repoPath)}`),

  getWorktrees: (repoPath: string) =>
    apiCall<WorktreeInfo[]>('GET', `/git/worktrees?path=${encodeURIComponent(repoPath)}`),
};
