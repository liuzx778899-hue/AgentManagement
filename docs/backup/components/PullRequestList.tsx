import { useState } from "react";
import { GitMerge, GitPullRequest, Search } from "lucide-react";
import type { RepoPullRequest } from "../domain/workbench";
import { IconBadge } from "./IconBadge";

interface PullRequestListProps {
  pullRequests: RepoPullRequest[];
}

const REVIEW_ICONS: Record<string, { icon: React.ReactNode; label: string; class: string }> = {
  pending: { icon: <Search size={14} />, label: "待审查", class: "warn" },
  approved: { icon: <GitMerge size={14} />, label: "已批准", class: "ok" },
  changes_requested: { icon: <GitPullRequest size={14} />, label: "需修改", class: "danger" },
};

export function PullRequestList({ pullRequests }: PullRequestListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPRs = pullRequests.filter((pr) => {
    if (searchQuery && !pr.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="pull-request-list">
      <div className="panel-header">
        <div className="panel-title">
          <IconBadge icon={GitPullRequest} label="Pull Requests" />
          <h3>Pull Requests</h3>
        </div>
        <div className="panel-filters">
          <div className="search-field">
            <Search size={14} />
            <input placeholder="搜索..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>
      </div>
      <div className="panel-body">
        <div className="list-items">
          {filteredPRs.length === 0 ? (
            <div className="empty-state">暂无 Pull Request</div>
          ) : (
            filteredPRs.map((pr) => {
              const review = REVIEW_ICONS[pr.reviewStatus];
              return (
                <div key={pr.id} className="list-item">
                  <div className="item-icon">
                    {pr.state === "merged" ? (
                      <GitMerge size={16} className="text-violet" />
                    ) : (
                      <GitPullRequest size={16} className={pr.state === "open" ? "text-green" : "text-red"} />
                    )}
                  </div>
                  <div className="item-content">
                    <div className="item-title">
                      <span className="item-number">PR #{pr.prNumber}</span>
                      <span className="item-text">{pr.title}</span>
                    </div>
                    <div className="item-branches">
                      <span className="branch">{pr.sourceBranch}</span>
                      <span className="arrow">→</span>
                      <span className="branch">{pr.targetBranch}</span>
                    </div>
                  </div>
                  <div className="item-status">
                    <span className={`status-badge ${review.class}`}>{review.label}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
