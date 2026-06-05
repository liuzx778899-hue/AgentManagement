import { useState } from "react";
import { CircleDot, MessageSquare, Search } from "lucide-react";
import type { RepoIssue } from "../domain/workbench";
import { IconBadge } from "./IconBadge";

interface IssueListProps {
  issues: RepoIssue[];
}

const LABEL_COLORS: Record<string, string> = {
  enhancement: "blue",
  bug: "red",
  docs: "green",
  done: "violet",
};

export function IssueList({ issues }: IssueListProps) {
  const [stateFilter, setStateFilter] = useState<"all" | "open" | "closed">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredIssues = issues.filter((issue) => {
    if (stateFilter !== "all" && issue.state !== stateFilter) return false;
    if (searchQuery && !issue.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="issue-list">
      <div className="panel-header">
        <div className="panel-title">
          <IconBadge icon={MessageSquare} label="Issues" />
          <h3>Issues</h3>
        </div>
        <div className="panel-filters">
          <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value as "all" | "open" | "closed")}>
            <option value="all">全部</option>
            <option value="open">打开</option>
            <option value="closed">已关闭</option>
          </select>
          <div className="search-field">
            <Search size={14} />
            <input placeholder="搜索..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>
      </div>
      <div className="panel-body">
        <div className="list-items">
          {filteredIssues.length === 0 ? (
            <div className="empty-state">暂无 Issue</div>
          ) : (
            filteredIssues.map((issue) => (
              <div key={issue.id} className="list-item">
                <div className="item-icon">
                  <CircleDot size={16} className={issue.state === "open" ? "text-blue" : "text-gray"} />
                </div>
                <div className="item-content">
                  <div className="item-title">
                    <span className="item-number">#{issue.issueNumber}</span>
                    <span className="item-text">{issue.title}</span>
                  </div>
                  <div className="item-meta">
                    {issue.labels.map((label) => (
                      <span key={label} className={`badge ${LABEL_COLORS[label] || "gray"}`}>
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
