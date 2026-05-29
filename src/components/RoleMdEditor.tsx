import { useState, useMemo } from "react";
import { Edit3, RefreshCw, RotateCcw, UserPlus, X } from "lucide-react";
import type { AgentRole } from "../domain/role";

interface RoleMdEditorProps {
  role: AgentRole;
  onClose: () => void;
  onDelete?: () => void;
}

function generateInitialMarkdown(role: AgentRole): string {
  const caps = role.defaultCapabilities;
  const capList =
    caps.length > 0 ? caps.map((c) => `- ${c}`).join("\n") : "- 无默认能力";

  return `# ${role.name}

## 角色描述
${role.description || "（未定义）"}

## 默认能力
${capList}

## 行为指令
你是一个 **${role.name}** 角色，请根据上述能力和描述执行任务。

## 约束
- 仅使用已配置的能力
- 遵循项目规范和最佳实践
`;
}

function simpleMarkdownToHtml(md: string): string {
  let html = md;
  html = html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  html = html.replace(/^#### (.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>");
  const lines = html.split("\n");
  const outLines: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "") {
      outLines.push("<br/>");
      continue;
    }
    if (
      /^<(h[1-4]|ul|li|strong|em|br)/.test(trimmed) ||
      /^<\/?(ul|li|h[1-4])/.test(trimmed)
    ) {
      outLines.push(line);
    } else {
      outLines.push(`<p>${trimmed}</p>`);
    }
  }
  return outLines.join("\n");
}

export function RoleMdEditor({ role, onClose, onDelete }: RoleMdEditorProps) {
  const isNew = !role.name;

  const [name, setName] = useState(role.name || "");
  const [description, setDescription] = useState(role.description || "");
  const [markdown, setMarkdown] = useState<string>(() => {
    if (role.roleMarkdown?.trim()) return role.roleMarkdown;
    return generateInitialMarkdown(role);
  });

  const effectiveRole: AgentRole = { ...role, name, description, roleMarkdown: markdown };

  const previewHtml = useMemo(() => simpleMarkdownToHtml(markdown), [markdown]);

  const handleRegenerate = () => {
    const md = generateInitialMarkdown(effectiveRole);
    setMarkdown(md);
  };

  const handleReset = () => {
    setName(role.name);
    setDescription(role.description);
    setMarkdown(role.roleMarkdown?.trim() ? role.roleMarkdown : generateInitialMarkdown(role));
  };

  const handleSave = () => {
    // Update role in place
    role.name = name;
    role.description = description;
    role.roleMarkdown = markdown;
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="md-editor-overlay" onClick={handleOverlayClick}>
      <div className="md-editor-panel md-editor-panel-wide">
        {/* Title bar */}
        <div className="md-editor-header">
          <h3>
            {isNew ? <UserPlus size={16} /> : <Edit3 size={16} />}
            {isNew ? "新增角色" : `编辑角色 — ${role.name}`}
          </h3>
          <div className="md-editor-header-actions">
            {!isNew && (
              <>
                <button className="btn ghost btn-sm" onClick={handleRegenerate} title="重新生成默认 Markdown" type="button">
                  <RefreshCw size={14} /> 重新生成
                </button>
                <button className="btn ghost btn-sm" onClick={handleReset} title="重置为默认" type="button">
                  <RotateCcw size={14} /> 重置
                </button>
                {onDelete && (
                  <button className="btn ghost btn-sm" onClick={onDelete} title="删除角色" type="button" style={{ color: "var(--danger)" }}>
                    <X size={14} /> 删除
                  </button>
                )}
              </>
            )}
            <button className="btn ghost btn-sm" onClick={onClose} title="关闭" type="button">
              <X size={16} /> 关闭
            </button>
          </div>
        </div>

        {/* Role info fields */}
        <div className="md-editor-role-form">
          <div className="form-field">
            <label>角色名称</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="如：产品经理"
            />
          </div>
          <div className="form-field">
            <label>角色描述</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简述角色职责"
            />
          </div>
        </div>

        {/* Dual pane body */}
        <div className="md-editor-body">
          <div className="md-editor-left">
            <label className="md-editor-label">角色 Prompt (Markdown)</label>
            <textarea
              className="md-editor-textarea"
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              placeholder="在此编辑角色的 Markdown 行为定义..."
              spellCheck={false}
            />
          </div>
          <div className="md-editor-right">
            <label className="md-editor-label">预览</label>
            <div
              className="md-editor-preview"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="md-editor-footer">
          <button className="btn ghost btn-sm" onClick={onClose} type="button">
            取消
          </button>
          <button className="btn primary btn-sm" onClick={handleSave} type="button" disabled={!name.trim()}>
            {isNew ? "确认新增" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
