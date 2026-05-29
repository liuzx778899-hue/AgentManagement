import { useState } from "react";
import { MessageCircle, Sparkles, X, Pin, Minus } from "lucide-react";
import type { WorkbenchView, WorkbenchData } from "../domain/workbench";
import { AiChatPanel } from "./AiChatPanel";

interface AiAssistantProps {
  view: WorkbenchView;
  data: WorkbenchData;
  onNavigate?: (view: WorkbenchView) => void;
  contextMode?: string;
}

export function AiAssistant({ view, data, onNavigate, contextMode }: AiAssistantProps) {
  const [open, setOpen] = useState(false);
  const [docked, setDocked] = useState(false);

  // Dock mode: fixed to right side
  if (docked) {
    return (
      <div className="ai-assistant ai-assistant-docked">
        <div className="ai-assistant-resize-bar">
          <Sparkles size={12} />
          <span>{"工程助手"}{contextMode ? ` \u00b7 ${contextMode}` : ""}</span>
          <div style={{ flex: 1 }} />
          <button className="ai-assistant-panel-btn" onClick={() => setOpen(true)} title="最小化为气泡" type="button">
            <Minus size={12} />
          </button>
          <button className="ai-assistant-panel-btn" onClick={() => setDocked(false)} title="浮动面板" type="button">
            <Pin size={12} />
          </button>
          <button className="ai-assistant-panel-btn" onClick={() => { setDocked(false); setOpen(false); }} title="关闭" type="button">
            <X size={12} />
          </button>
        </div>
        <AiChatPanel view={view} data={data} onNavigate={onNavigate} contextMode={contextMode} />
      </div>
    );
  }

  return (
    <div className="ai-assistant ai-assistant-float">
      {/* Bubble state */}
      {!open && (
        <button className="ai-assistant-bubble" onClick={() => setOpen(true)} type="button" title="打开工程助手">
          <MessageCircle size={20} />
        </button>
      )}
      {/* Panel state */}
      {open && (
        <div className="ai-assistant-panel">
          <div className="ai-assistant-panel-header">
            <Sparkles size={14} />
            <span>{"工程助手"}{contextMode ? ` \u00b7 ${contextMode}` : ""}</span>
            <div style={{ flex: 1 }} />
            <button className="ai-assistant-panel-btn" onClick={() => setDocked(true)} title="固定到右侧" type="button">
              <Pin size={14} />
            </button>
            <button className="ai-assistant-panel-btn" onClick={() => setOpen(false)} title="关闭" type="button">
              <X size={14} />
            </button>
          </div>
          <AiChatPanel view={view} data={data} onNavigate={onNavigate} contextMode={contextMode} />
        </div>
      )}
    </div>
  );
}
