import { Brain, X } from "lucide-react";

interface ContextFile {
  name: string;
  tokens: number;
}

interface PwContextPanelProps {
  show: boolean;
  onClose: () => void;
  projectName: string;
  activeAgentLabel: string;
  contextFiles?: ContextFile[];
  totalTokens?: number;
  maxTokens?: number;
  systemPrompts?: ContextFile[];
}

export function PwContextPanel({
  show,
  onClose,
  projectName,
  activeAgentLabel,
  contextFiles = [],
  totalTokens = 0,
  maxTokens = 32000,
  systemPrompts = [],
}: PwContextPanelProps) {
  if (!show) return null;

  const usagePct = Math.round((totalTokens / maxTokens) * 100);
  const documentsCount = contextFiles.length;

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
                <div className="pw-context-usage-fill" style={{ width: `${usagePct}%` }} />
              </div>
              <div className="pw-context-usage-labels">
                <span>~{Math.round(totalTokens / 1000)}K / {Math.round(maxTokens / 1000)}K tokens</span>
                <span className="pw-context-usage-pct">{usagePct}%</span>
              </div>
            </div>
          </div>
          {/* Context file list */}
          {systemPrompts.length > 0 && (
            <div className="pw-context-section">
              <div className="pw-context-section-title">系统 Prompt</div>
              {systemPrompts.map((file, i) => (
                <div key={i} className="pw-context-file-item">
                  <span className="pw-context-file-name">{file.name}</span>
                  <span className="pw-context-file-tokens">{Math.round(file.tokens / 1000)}K</span>
                </div>
              ))}
            </div>
          )}
          {contextFiles.length > 0 && (
            <div className="pw-context-section">
              <div className="pw-context-section-title">源码文件 ({documentsCount})</div>
              {contextFiles.map((file, i) => (
                <div key={i} className="pw-context-file-item">
                  <span className="pw-context-file-name">{file.name}</span>
                  <span className="pw-context-file-tokens">{Math.round(file.tokens / 1000)}K</span>
                </div>
              ))}
            </div>
          )}
          {/* Empty state when no files */}
          {contextFiles.length === 0 && systemPrompts.length === 0 && (
            <div className="pw-context-section">
              <div className="pw-context-section-title">上下文文件</div>
              <div className="pw-context-file-item">
                <span className="pw-context-file-name">暂无上下文文件</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
