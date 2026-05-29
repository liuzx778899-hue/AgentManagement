import { useState, useMemo } from "react";
import { Brain, X } from "lucide-react";
import type { MemoryItem, MemoryKind } from "../domain/memory";

interface PwMemoryPanelProps {
  show: boolean;
  onClose: () => void;
  memories: MemoryItem[];
  projectId: string;
}

export function PwMemoryPanel({ show, onClose, memories, projectId }: PwMemoryPanelProps) {
  const [memoryTab, setMemoryTab] = useState<MemoryKind>("project");
  const [memoryInput, setMemoryInput] = useState("");

  // Filter memories by active tab
  const filteredMemories = useMemo(() => {
    return memories.filter((m) => m.projectId === projectId && m.kind === memoryTab);
  }, [memories, projectId, memoryTab]);

  if (!show) return null;

  return (
    <div className="pw-memory-overlay" onClick={onClose}>
      <div className="pw-memory-panel" onClick={(e) => e.stopPropagation()}>
        <header className="pw-pd-header">
          <div className="pw-pd-title">
            <Brain size={18} />
            <strong>项目记忆</strong>
          </div>
          <button
            className="btn-icon"
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </header>

        {/* Memory Tabs */}
        <div className="pw-memory-tabs">
          {(["project", "role", "task"] as const).map((tab) => (
            <button
              key={tab}
              className={`pw-memory-tab ${memoryTab === tab ? "active" : ""}`}
              onClick={() => setMemoryTab(tab)}
              type="button"
            >
              {tab === "project" && "项目记忆"}
              {tab === "role" && "角色记忆"}
              {tab === "task" && "任务记忆"}
            </button>
          ))}
        </div>

        {/* Manual Input */}
        <div className="pw-memory-input">
          <textarea
            placeholder="输入新的记忆内容..."
            value={memoryInput}
            onChange={(e) => setMemoryInput(e.target.value)}
          />
          <button
            className="btn primary"
            onClick={() => {
              if (memoryInput.trim()) {
                setMemoryInput("");
              }
            }}
            disabled={!memoryInput.trim()}
          >
            保存
          </button>
        </div>

        {/* Memory List */}
        <div className="pw-memory-list">
          {filteredMemories.length === 0 ? (
            <div className="pw-memory-empty">暂无{memoryTab === "project" ? "项目" : memoryTab === "role" ? "角色" : "任务"}记忆</div>
          ) : (
            filteredMemories.map((memory) => (
              <div key={memory.id} className="pw-memory-item">
                <div className="pw-memory-item-title">{memory.title}</div>
                <div className="pw-memory-item-body">{memory.body}</div>
                <div className="pw-memory-item-meta">
                  <span>来源: {memory.citation[0]?.source ?? "未知"}</span>
                  <span>引用: {memory.citation.length}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <footer className="pw-pd-footer">
          <button
            className="btn ghost"
            onClick={onClose}
          >
            关闭
          </button>
        </footer>
      </div>
    </div>
  );
}