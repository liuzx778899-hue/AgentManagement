import { Activity, X } from "lucide-react";
import { GitBranch as GitBranchIcon, History } from "lucide-react";
import { Grid3X3 } from "lucide-react";
import type { RepoIssue, CiPipeline, GitBranch, RepoCommit } from "../domain/git";

// ─── Issues Panel ───────────────────────────────────────────────

interface PwIssuesPanelProps {
  show: boolean;
  onClose: () => void;
  repoOwner: string | undefined;
  repoName: string | undefined;
  issues: RepoIssue[];
}

export function PwIssuesPanel({ show, onClose, repoOwner, repoName, issues }: PwIssuesPanelProps) {
  if (!show) return null;

  return (
    <div className="pw-overlay" onClick={onClose}>
      <div className="pw-overlay-panel pw-issues-panel" onClick={(e) => e.stopPropagation()}>
        <header className="pw-overlay-header">
          <div className="pw-overlay-title">
            <Grid3X3 size={18} />
            <strong>议题 · {repoOwner}/{repoName}</strong>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <div className="pw-overlay-body">
          {issues.length === 0 ? (
            <div className="pw-empty-state-inline">暂无议题</div>
          ) : (
            <div className="pw-issue-list">
              {issues.map((issue) => (
                <div key={issue.id} className="pw-issue-row">
                  <span className={`pw-issue-state ${issue.state}`}>{issue.state === "open" ? "○" : "●"}</span>
                  <span className="pw-issue-num">#{issue.issueNumber}</span>
                  <span className="pw-issue-title">{issue.title}</span>
                  <span className="pw-issue-labels">{issue.labels.map((l) => <span key={l} className="pw-label">{l}</span>)}</span>
                  <span className="pw-issue-date">{new Date(issue.updatedAt).toLocaleDateString("zh-CN")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CI Panel ───────────────────────────────────────────────────

interface PwCiPanelProps {
  show: boolean;
  onClose: () => void;
  repoOwner: string | undefined;
  repoName: string | undefined;
  pipelines: CiPipeline[];
}

export function PwCiPanel({ show, onClose, repoOwner, repoName, pipelines }: PwCiPanelProps) {
  if (!show) return null;

  return (
    <div className="pw-overlay" onClick={onClose}>
      <div className="pw-overlay-panel pw-ci-panel" onClick={(e) => e.stopPropagation()}>
        <header className="pw-overlay-header">
          <div className="pw-overlay-title">
            <Activity size={18} />
            <strong>流水线 · {repoOwner}/{repoName}</strong>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <div className="pw-overlay-body">
          {pipelines.length === 0 ? (
            <div className="pw-empty-state-inline">暂无流水线</div>
          ) : (
            <div className="pw-ci-list">
              {pipelines.map((ci) => (
                <div key={ci.id} className="pw-ci-row">
                  <span className={`pw-ci-status ${ci.status}`}>
                    {ci.status === "success" ? "✓" : ci.status === "failed" ? "✗" : ci.status === "running" ? "●" : "○"}
                  </span>
                  <span className="pw-ci-name">{ci.pipelineName}</span>
                  <span className="pw-ci-branch">{ci.branch}</span>
                  <span className="pw-ci-commit">{ci.commitSha.slice(0, 7)}</span>
                  <span className="pw-ci-duration">{ci.duration}</span>
                  <span className="pw-ci-date">{new Date(ci.createdAt).toLocaleDateString("zh-CN")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Branch Panel ───────────────────────────────────────────────

interface PwBranchPanelProps {
  show: boolean;
  onClose: () => void;
  branches: GitBranch[];
}

export function PwBranchPanel({ show, onClose, branches }: PwBranchPanelProps) {
  if (!show) return null;

  return (
    <div className="pw-branch-overlay" onClick={onClose}>
      <div className="pw-branch-panel" onClick={(e) => e.stopPropagation()}>
        <header className="pw-branch-header">
          <div className="pw-branch-title">
            <GitBranchIcon size={16} />
            <strong>分支列表</strong>
          </div>
          <button className="btn ghost btn-sm" onClick={onClose} type="button">
            <X size={16} /> 关闭
          </button>
        </header>
        <div className="pw-branch-list">
          {branches.map((branch) => (
            <div key={branch.id} className={`pw-branch-row ${branch.isDefault ? "default" : ""}`}>
              <div className="pw-branch-name">
                {branch.isRemote && <span className="pw-branch-remote">remote/</span>}
                {branch.name}
                {branch.isDefault && <span className="pw-branch-default-badge">默认</span>}
              </div>
              <code className="pw-branch-sha">{branch.lastCommitSha}</code>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Commit Panel ───────────────────────────────────────────────

interface PwCommitPanelProps {
  show: boolean;
  onClose: () => void;
  commits: RepoCommit[];
}

export function PwCommitPanel({ show, onClose, commits }: PwCommitPanelProps) {
  if (!show) return null;

  return (
    <div className="pw-commit-overlay" onClick={onClose}>
      <div className="pw-commit-panel" onClick={(e) => e.stopPropagation()}>
        <header className="pw-commit-header">
          <div className="pw-commit-title">
            <History size={16} />
            <strong>提交历史</strong>
          </div>
          <button className="btn ghost btn-sm" onClick={onClose} type="button">
            <X size={16} /> 关闭
          </button>
        </header>
        <div className="pw-commit-list">
          {commits.map((commit) => (
            <div key={commit.id} className="pw-commit-row">
              <code className="pw-commit-sha">{commit.sha}</code>
              <div className="pw-commit-info">
                <div className="pw-commit-msg">{commit.message}</div>
                <div className="pw-commit-meta">
                  <span className="pw-commit-author">{commit.author}</span>
                  <span className="pw-commit-date">{new Date(commit.date).toLocaleString("zh-CN")}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
