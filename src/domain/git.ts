export type GitPlatform = "github" | "gitlab" | "gitee";

export interface GitCredential {
  id: string;
  platform: GitPlatform;
  name: string;
  token: string;
  apiUrl: string;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RemoteRepo {
  platform: GitPlatform;
  credentialId: string;
  repoOwner: string;
  repoName: string;
  defaultBranch: string;
  syncEnabled: boolean;
  lastSyncAt?: string;
  syncStatus: "idle" | "syncing" | "success" | "failed";
}

export interface RepoIssue {
  id: string;
  platform: GitPlatform;
  credentialId: string;
  repoOwner: string;
  repoName: string;
  issueNumber: number;
  title: string;
  state: "open" | "closed";
  labels: string[];
  assignee: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RepoPullRequest {
  id: string;
  platform: GitPlatform;
  credentialId: string;
  repoOwner: string;
  repoName: string;
  prNumber: number;
  title: string;
  state: "open" | "merged" | "closed";
  sourceBranch: string;
  targetBranch: string;
  author: string;
  reviewStatus: "pending" | "approved" | "changes_requested";
  createdAt: string;
  updatedAt: string;
}

export interface CiPipeline {
  id: string;
  platform: GitPlatform;
  credentialId: string;
  repoOwner: string;
  repoName: string;
  pipelineName: string;
  status: "running" | "success" | "failed" | "pending" | "canceled";
  branch: string;
  commitSha: string;
  commitMessage: string;
  duration: string;
  createdAt: string;
}

export interface GitStatus {
  projectId: string;
  branch: string;
  ahead: number;
  behind: number;
  changedFiles: number;
  untracked: number;
  lastCommitSha: string;
  lastCommitMessage: string;
  lastCommitDate: string;
}

export interface RepoCommit {
  id: string;
  projectId: string;
  sha: string;
  message: string;
  author: string;
  date: string;
}

export interface GitBranch {
  id: string;
  projectId: string;
  name: string;
  isRemote: boolean;
  isDefault: boolean;
  lastCommitSha: string;
}