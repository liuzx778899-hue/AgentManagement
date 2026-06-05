import { useState } from "react";
import { Edit3, RotateCcw, X } from "lucide-react";
import type { AgentRole } from "../domain/role";

export interface RoleMdViewerProps {
  role: AgentRole;
  markdown: string;
  source: "默认配置" | "项目级覆盖";
  onClose: () => void;
}

export function RoleMdViewer({ role, markdown, source, onClose }: RoleMdViewerProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(markdown);

  const handleEditToggle = () => {
    if (editing) {
      // Save: for now, just close the editing mode
      setEditing(false);
    } else {
      setEditValue(markdown);
      setEditing(true);
    }
  };

  const handleResetToDefault = () => {
    // For now, just close the panel
    onClose();
  };

  return (
    <div className="md-viewer-overlay" onClick={onClose}>
      <div
        className="md-viewer-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top: Title Bar */}
        <header className="md-viewer-header">
          <div className="md-viewer-title">
            <strong>角色指令 &mdash; {role.name}</strong>
          </div>
          <div className="md-viewer-header-actions">
            <button
              className="btn btn-sm"
              onClick={handleEditToggle}
              title={editing ? "保存并退出编辑" : "编辑角色指令"}
            >
              <Edit3 size={14} />
              <span>{editing ? "保存" : "编辑"}</span>
            </button>
            <button
              className="btn-icon"
              onClick={onClose}
              aria-label="关闭"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Middle: Content Area */}
        <div className="md-viewer-body">
          {editing ? (
            <textarea
              className="md-viewer-textarea"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder="输入角色 Markdown 指令..."
            />
          ) : (
            <pre className="md-viewer-content">{markdown}</pre>
          )}
        </div>

        {/* Bottom: Info Bar */}
        <footer className="md-viewer-footer">
          <span className="md-viewer-source">
            当前使用：{source}
          </span>
          {source === "项目级覆盖" && (
            <button
              className="btn btn-sm ghost"
              onClick={handleResetToDefault}
            >
              <RotateCcw size={14} />
              <span>重置为默认</span>
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
