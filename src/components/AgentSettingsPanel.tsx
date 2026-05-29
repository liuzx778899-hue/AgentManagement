import { useState, useMemo } from "react";
import { Edit3, RefreshCw, RotateCcw, X, FileText, Terminal, Cpu } from "lucide-react";
import type { AgentRole } from "../domain/role";
import type { WorkbenchData } from "../domain/workbench";

interface AgentSettingsPanelProps {
  role: AgentRole;
  data: WorkbenchData;
  selectedModelKey: string;
  selectedRunnerId: string | undefined;
  onClose: () => void;
  onSaveModel: (modelKey: string) => void;
  onSaveRunner: (runnerId: string | undefined) => void;
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

export function AgentSettingsPanel({
  role,
  data,
  selectedModelKey,
  selectedRunnerId,
  onClose,
  onSaveModel,
  onSaveRunner,
}: AgentSettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<"prompt" | "model" | "runner">("prompt");

  const [markdown, setMarkdown] = useState<string>(() => {
    if (role.roleMarkdown?.trim()) return role.roleMarkdown;
    return generateInitialMarkdown(role);
  });

  const [localModelKey, setLocalModelKey] = useState(selectedModelKey);
  const [localRunnerId, setLocalRunnerId] = useState<string | undefined>(selectedRunnerId);

  const previewHtml = useMemo(() => simpleMarkdownToHtml(markdown), [markdown]);

  const enabledProviders = data.modelProviders.filter((p) => p.enabled);
  const enabledRunners = data.runnerProfiles?.filter((r) => r.enabled) || [];

  const handleRegenerate = () => {
    setMarkdown(generateInitialMarkdown(role));
  };

  const handleReset = () => {
    setMarkdown(role.roleMarkdown?.trim() ? role.roleMarkdown : generateInitialMarkdown(role));
  };

  const handleSave = () => {
    role.roleMarkdown = markdown;
    if (localModelKey !== selectedModelKey) {
      onSaveModel(localModelKey);
    }
    if (localRunnerId !== selectedRunnerId) {
      onSaveRunner(localRunnerId);
    }
    onClose();
  };

  return (
    <div className="agent-settings-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="agent-settings-panel">
        {/* Header */}
        <header className="agent-settings-header">
          <h3>
            <Edit3 size={16} />
            Agent 设置 — {role.name}
          </h3>
          <button className="btn-icon" onClick={onClose} aria-label="关闭">
            <X size={18} />
          </button>
        </header>

        {/* Tabs */}
        <div className="agent-settings-tabs">
          <button
            className={`agent-settings-tab${activeTab === "prompt" ? " active" : ""}`}
            onClick={() => setActiveTab("prompt")}
            type="button"
          >
            <FileText size={14} />
            <span>角色指令</span>
          </button>
          <button
            className={`agent-settings-tab${activeTab === "model" ? " active" : ""}`}
            onClick={() => setActiveTab("model")}
            type="button"
          >
            <Cpu size={14} />
            <span>模型选择</span>
          </button>
          <button
            className={`agent-settings-tab${activeTab === "runner" ? " active" : ""}`}
            onClick={() => setActiveTab("runner")}
            type="button"
          >
            <Terminal size={14} />
            <span>CLI Runner</span>
          </button>
        </div>

        {/* Content */}
        <div className="agent-settings-body">
          {activeTab === "prompt" && (
            <div className="agent-settings-prompt">
              <div className="agent-settings-toolbar">
                <button className="btn ghost btn-sm" onClick={handleRegenerate} type="button">
                  <RefreshCw size={14} /> 重新生成
                </button>
                <button className="btn ghost btn-sm" onClick={handleReset} type="button">
                  <RotateCcw size={14} /> 重置
                </button>
              </div>
              <div className="agent-settings-editor">
                <div className="md-editor-left">
                  <label className="md-editor-label">编辑</label>
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
            </div>
          )}

          {activeTab === "model" && (
            <div className="agent-settings-model">
              <p className="agent-settings-desc">选择此 Agent 使用的模型供应商和模型。</p>
              <div className="agent-settings-select-group">
                <label>当前模型</label>
                <select
                  value={localModelKey}
                  onChange={(e) => setLocalModelKey(e.target.value)}
                >
                  <option value="">选择模型</option>
                  {enabledProviders.flatMap((provider) =>
                    provider.models.map((m) => (
                      <option key={`${provider.id}/${m.name}`} value={`${provider.name} / ${m.name}`}>
                        {provider.name} / {m.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
              {localModelKey && (
                <div className="agent-settings-current">
                  <span className="pw-badge pw-badge-v">{localModelKey}</span>
                </div>
              )}
            </div>
          )}

          {activeTab === "runner" && (
            <div className="agent-settings-runner">
              <p className="agent-settings-desc">选择此 Agent 执行代码时使用的 CLI Runner。</p>
              <div className="agent-settings-select-group">
                <label>CLI Runner</label>
                <select
                  value={localRunnerId || ""}
                  onChange={(e) => setLocalRunnerId(e.target.value || undefined)}
                >
                  <option value="">使用默认</option>
                  {enabledRunners.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.displayName} ({r.command})
                    </option>
                  ))}
                </select>
              </div>
              {localRunnerId && (
                <div className="agent-settings-current">
                  <span className="pw-badge pw-badge-b">
                    {enabledRunners.find((r) => r.id === localRunnerId)?.displayName || localRunnerId}
                  </span>
                </div>
              )}
              <div className="agent-settings-runner-info">
                <strong>默认 Runner:</strong>{" "}
                {data.defaultRunner
                  ? data.runnerProfiles?.find((r) => r.id === data.defaultRunner)?.displayName || data.defaultRunner
                  : "未配置"}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="agent-settings-footer">
          <button className="btn ghost btn-sm" onClick={onClose} type="button">
            取消
          </button>
          <button className="btn primary btn-sm" onClick={handleSave} type="button">
            保存
          </button>
        </footer>
      </div>
    </div>
  );
}
