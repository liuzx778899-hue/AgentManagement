import { X } from "lucide-react";

interface PwProjectMdPanelProps {
  show: boolean;
  onClose: () => void;
  projectMd: string;
  projectName: string;
  isCustom: boolean;
}

export function PwProjectMdPanel({ show, onClose, projectMd, projectName, isCustom }: PwProjectMdPanelProps) {
  if (!show) return null;

  return (
    <div className="md-viewer-overlay" onClick={onClose}>
      <div
        className="md-viewer-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="md-viewer-header">
          <div className="md-viewer-title">
            <strong>项目指令 &mdash; {projectName}</strong>
          </div>
          <div className="md-viewer-header-actions">
            <button
              className="btn-icon"
              onClick={onClose}
              aria-label="关闭"
            >
              <X size={18} />
            </button>
          </div>
        </header>
        <div className="md-viewer-body">
          <pre className="md-viewer-content">{projectMd}</pre>
        </div>
        <footer className="md-viewer-footer">
          <span className="md-viewer-source">
            {isCustom ? "项目自定义" : "自动生成"}
          </span>
          <button
            className="btn btn-sm ghost"
            onClick={onClose}
          >
            <X size={14} />
            <span>关闭</span>
          </button>
        </footer>
      </div>
    </div>
  );
}