import { AlertCircle, CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import type { CiPipeline } from "../domain/workbench";
import { IconBadge } from "./IconBadge";
import { GitBranch } from "lucide-react";

interface CiPipelinePanelProps {
  pipelines: CiPipeline[];
}

const STATUS_ICONS: Record<string, { icon: React.ReactNode; label: string; class: string }> = {
  success: { icon: <CheckCircle2 size={16} />, label: "成功", class: "ok" },
  failed: { icon: <XCircle size={16} />, label: "失败", class: "danger" },
  running: { icon: <Loader2 size={16} className="spin" />, label: "运行中", class: "warn" },
  pending: { icon: <Clock size={16} />, label: "等待中", class: "gray" },
  canceled: { icon: <AlertCircle size={16} />, label: "已取消", class: "gray" },
};

export function CiPipelinePanel({ pipelines }: CiPipelinePanelProps) {
  return (
    <div className="ci-pipeline-panel">
      <div className="panel-header">
        <div className="panel-title">
          <IconBadge icon={GitBranch} label="CI/CD 流水线" />
          <h3>CI/CD 流水线</h3>
        </div>
      </div>
      <div className="panel-body">
        <div className="pipeline-list">
          {pipelines.length === 0 ? (
            <div className="empty-state">暂无流水线记录</div>
          ) : (
            pipelines.map((pipeline) => {
              const status = STATUS_ICONS[pipeline.status];
              return (
                <div key={pipeline.id} className="pipeline-item">
                  <div className={`pipeline-status ${status.class}`}>{status.icon}</div>
                  <div className="pipeline-content">
                    <div className="pipeline-name">{pipeline.pipelineName}</div>
                    <div className="pipeline-meta">
                      <span className="pipeline-branch">{pipeline.branch}</span>
                      <span className="pipeline-commit">{pipeline.commitSha}</span>
                      <span className="pipeline-duration">{pipeline.duration}</span>
                    </div>
                    <div className="pipeline-message">{pipeline.commitMessage}</div>
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
