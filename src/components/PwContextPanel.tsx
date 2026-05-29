import { Brain, X } from "lucide-react";

interface PwContextPanelProps {
  show: boolean;
  onClose: () => void;
  projectName: string;
  activeAgentLabel: string;
}

const DOCUMENTS_COUNT = 8;

export function PwContextPanel({ show, onClose, projectName, activeAgentLabel }: PwContextPanelProps) {
  if (!show) return null;

  return (
    <div className="pw-context-overlay" onClick={onClose}>
      <div className="pw-context-panel" onClick={(e) => e.stopPropagation()}>
        <header className="pw-context-panel-header">
          <div className="pw-context-panel-title">
            <Brain size={16} />
            <strong>/context — 当前上下文</strong>
          </div>
          <button className="btn ghost btn-sm" onClick={onClose} type="button">
            <X size={16} /> 关闭
          </button>
        </header>
        <div className="pw-context-panel-body">
          {/* Usage summary */}
          <div className="pw-context-usage">
            <div className="pw-context-usage-bar">
              <div className="pw-context-usage-track">
                <div className="pw-context-usage-fill" style={{ width: "45%" }} />
              </div>
              <div className="pw-context-usage-labels">
                <span>~14K / 32K tokens</span>
                <span className="pw-context-usage-pct">45%</span>
              </div>
            </div>
          </div>
          {/* Context file list */}
          <div className="pw-context-section">
            <div className="pw-context-section-title">系统 Prompt</div>
            <div className="pw-context-file-item">
              <span className="pw-context-file-name">CLAUDE.md</span>
              <span className="pw-context-file-tokens">1.2K</span>
            </div>
            <div className="pw-context-file-item">
              <span className="pw-context-file-name">项目指令 ({projectName})</span>
              <span className="pw-context-file-tokens">0.8K</span>
            </div>
            <div className="pw-context-file-item">
              <span className="pw-context-file-name">角色指令 ({activeAgentLabel})</span>
              <span className="pw-context-file-tokens">0.6K</span>
            </div>
          </div>
          <div className="pw-context-section">
            <div className="pw-context-section-title">源码文件 ({DOCUMENTS_COUNT > 0 ? DOCUMENTS_COUNT : 0})</div>
            <div className="pw-context-file-item">
              <span className="pw-context-file-name">src/components/ProjectWorkspace.tsx</span>
              <span className="pw-context-file-tokens">3.2K</span>
            </div>
            <div className="pw-context-file-item">
              <span className="pw-context-file-name">src/domain/workbench.ts</span>
              <span className="pw-context-file-tokens">1.1K</span>
            </div>
            <div className="pw-context-file-item">
              <span className="pw-context-file-name">src/domain/workflow.ts</span>
              <span className="pw-context-file-tokens">0.9K</span>
            </div>
            <div className="pw-context-file-item">
              <span className="pw-context-file-name">src/domain/project.ts</span>
              <span className="pw-context-file-tokens">0.7K</span>
            </div>
            <div className="pw-context-file-item">
              <span className="pw-context-file-name">src/domain/role.ts</span>
              <span className="pw-context-file-tokens">0.5K</span>
            </div>
            <div className="pw-context-file-item">
              <span className="pw-context-file-name">src/data/fixtures.ts</span>
              <span className="pw-context-file-tokens">1.8K</span>
            </div>
            <div className="pw-context-file-item">
              <span className="pw-context-file-name">src/styles/pages.css</span>
              <span className="pw-context-file-tokens">2.4K</span>
            </div>
            <div className="pw-context-file-item">
              <span className="pw-context-file-name">src/App.tsx</span>
              <span className="pw-context-file-tokens">0.8K</span>
            </div>
          </div>
          <div className="pw-context-section">
            <div className="pw-context-section-title">会话历史</div>
            <div className="pw-context-file-item">
              <span className="pw-context-file-name">对话消息 (3 条)</span>
              <span className="pw-context-file-tokens">1.2K</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
