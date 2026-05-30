import { useState } from "react";
import {
  ArrowRight, Check, ChevronDown,
  MoreHorizontal, Paperclip,
  Plus, Save, Send, Sparkles, Upload,
} from "lucide-react";
import type { WorkbenchData } from "../domain/workbench";

interface AiWorkflowDesignProps {
  data: WorkbenchData;
}

// Types
interface ChatMessage {
  id: number;
  author: string;
  time: string;
  text: string;
  isUser: boolean;
  typing?: boolean;
}

interface ContextFile {
  name: string;
  ext: string;
}

interface DraftNode {
  no: string;
  name: string;
  role: string;
  model: string;
  gate: string;
  status: "done" | "active" | "wait" | "idle";
}

interface DiffItem {
  type: "add" | "mod" | "same";
  title: string;
  desc: string;
}

interface ChecklistItem {
  label: string;
  done: boolean;
}

// Empty state helpers
const EMPTY_CHAT_MESSAGES: ChatMessage[] = [];
const EMPTY_CONTEXT_FILES: ContextFile[] = [];
const EMPTY_DRAFT_NODES: DraftNode[] = [];
const EMPTY_DIFF_ITEMS: DiffItem[] = [];

// Default checklist items (static configuration)
const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { label: "步骤完整性检查", done: false },
  { label: "角色绑定检查", done: false },
  { label: "模型配置检查", done: false },
  { label: "Gate 配置检查", done: false },
  { label: "验收标准确认", done: false },
];

export function AiWorkflowDesign({ data }: AiWorkflowDesignProps) {
  // State
  const [materialsExpanded, setMaterialsExpanded] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(EMPTY_CHAT_MESSAGES);
  const [inputText, setInputText] = useState("");
  const [draftGenerated, setDraftGenerated] = useState(false);
  const [draftNodes, setDraftNodes] = useState<DraftNode[]>(EMPTY_DRAFT_NODES);
  const [diffItems, setDiffItems] = useState<DiffItem[]>(EMPTY_DIFF_ITEMS);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(DEFAULT_CHECKLIST);
  const [generating, setGenerating] = useState(false);

  // Context files from props (projects)
  const contextFiles: ContextFile[] = data.projects.length > 0
    ? data.projects.map(p => ({
        name: p.name,
        ext: p.status === "running" ? "进行中" : p.status === "completed" ? "已完成" : "等待中",
      }))
    : EMPTY_CONTEXT_FILES;

  // Get current time in HH:MM format
  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
  };

  // Send message
  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now(),
      author: "我",
      time: getCurrentTime(),
      text: inputText.trim(),
      isUser: true,
    };

    setChatMessages(prev => [...prev, userMessage]);
    setInputText("");

    // Add typing indicator
    const typingId = Date.now() + 1;
    setChatMessages(prev => [...prev, {
      id: typingId,
      author: "AI 助手",
      time: getCurrentTime(),
      text: "",
      isUser: false,
      typing: true,
    }]);

    // Call AI API
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...chatMessages.filter(m => !m.typing), userMessage].map(m => ({
            role: m.isUser ? "user" : "assistant",
            content: m.text,
          })),
          context: `当前有 ${contextFiles.length} 个上下文文件`,
        }),
      });

      const result = await response.json();

      // Remove typing indicator and add response
      setChatMessages(prev => {
        const filtered = prev.filter(m => m.id !== typingId);
        if (result.ok) {
          return [...filtered, {
            id: Date.now(),
            author: "AI 助手",
            time: getCurrentTime(),
            text: result.data.content,
            isUser: false,
          }];
        }
        return [...filtered, {
          id: Date.now(),
          author: "AI 助手",
          time: getCurrentTime(),
          text: "抱歉，我暂时无法处理您的请求。请稍后再试。",
          isUser: false,
        }];
      });
    } catch (error) {
      // Remove typing indicator and show error
      setChatMessages(prev => {
        const filtered = prev.filter(m => m.id !== typingId);
        return [...filtered, {
          id: Date.now(),
          author: "AI 助手",
          time: getCurrentTime(),
          text: "抱歉，连接 AI 服务失败。请检查服务是否正常。",
          isUser: false,
        }];
      });
    }
  };

  // Generate workflow draft
  const handleGenerateDraft = async () => {
    setGenerating(true);

    try {
      // TODO: Implement actual AI workflow generation
      // For now, simulate with a delay and empty state
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Set empty draft (would be populated by AI)
      setDraftNodes([]);
      setDiffItems([]);
      setDraftGenerated(true);

      // Update checklist based on generation
      setChecklistItems(prev => prev.map((item, i) => ({
        ...item,
        done: i < 2, // Mark first two as done
      })));
    } catch (error) {
      console.error("生成失败:", error);
    }

    setGenerating(false);
  };

  // Handle keyboard events in textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Stats for diff section
  const stats = {
    add: diffItems.filter(d => d.type === "add").length,
    mod: diffItems.filter(d => d.type === "mod").length,
    same: diffItems.filter(d => d.type === "same").length,
  };

  return (
    <div className="awd-page">
      {/* ===== GLOBAL BAR (breadcrumb) ===== */}
      <header className="awd-globalbar">
        <div className="awd-breadcrumb">
          <span>AgentManagement</span><span>/</span><span>流程管理</span><span>/</span><strong>AI 流程设计</strong>
        </div>
        <div className="awd-top-chip"><span className="awd-dot" /> 个人本地版</div>
      </header>

      {/* ===== TOOLBAR ===== */}
      <div className="awd-toolbar">
        <div className="awd-toolbar-left">
          <div className="awd-select-pill"><span>▣</span> AgentManagement <ChevronDown size={14} /></div>
          <div className="awd-select-pill wide"><span>上下文：</span> 项目计划 + 协同文件 + 当前流程 <ChevronDown size={14} /></div>
          <div className="awd-select-pill flow"><span>目标流程：</span> 软件开发完整流程 <ChevronDown size={14} /></div>
          <div className="awd-source-chip">已收集 {contextFiles.length} 个来源 · {draftGenerated ? "草案已生成" : "草案未生成"}</div>
        </div>
        <div className="awd-toolbar-right">
          <button className="awd-btn" onClick={() => { const ev = new CustomEvent("navigate", { detail: { view: "workflows" } }); window.dispatchEvent(ev); }}>
            ← 常规流程设计
          </button>
          <button
            className="awd-btn awd-btn-primary"
            onClick={handleGenerateDraft}
            disabled={generating}
          >
            <Sparkles size={14} /> {generating ? "生成中..." : "生成流程草案"}
          </button>
          <button className="awd-btn" disabled={!draftGenerated}><Save size={14} /> 保存草稿</button>
          <button className="awd-btn" disabled={!draftGenerated}><Upload size={14} /> 应用到流程</button>
          <button className="awd-btn-icon"><MoreHorizontal size={14} /></button>
        </div>
      </div>

      {/* ===== THREE-COLUMN CONTENT ===== */}
      <div className="awd-content">
        {/* ===== LEFT: Discussion ===== */}
        <section className="awd-panel awd-discussion">
          <div className="awd-panel-head">
            <div><h2>讨论区</h2><p>原始输入与资料收集</p></div>
            <div className="awd-ctx-badge">上下文 {contextFiles.length} 项</div>
          </div>

          {/* Chat */}
          <div className="awd-chat">
            {chatMessages.length === 0 ? (
              <div className="awd-empty-chat">
                <div className="awd-empty-icon">💬</div>
                <p>开始与 AI 助手对话</p>
                <p className="awd-empty-hint">输入您的需求，AI 将帮助您设计和优化工作流程</p>
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div key={msg.id} className={`awd-bubble-row${msg.isUser ? " me" : ""}`}>
                  <div className="awd-bubble-icon">{msg.isUser ? "我" : "AI"}</div>
                  <div className={`awd-bubble${msg.isUser ? " me" : ""}`}>
                    <div className="awd-bubble-time">{msg.author}　{msg.time}</div>
                    {msg.text.split("\n").map((line, j) => <p key={j}>{line}</p>)}
                    {msg.typing && (
                      <div className="awd-typing"><span /><span /><span /></div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Materials */}
          <div className="awd-material-box">
            <button className="awd-material-head" onClick={() => setMaterialsExpanded(!materialsExpanded)}>
              <span>已添加资料 {contextFiles.length} 项</span>
              <span>{materialsExpanded ? "收起" : "展开"} <ChevronDown size={14} style={{ transform: materialsExpanded ? "rotate(180deg)" : "none" }} /></span>
            </button>
            {materialsExpanded && (
              <div className="awd-file-list">
                {contextFiles.length === 0 ? (
                  <div className="awd-empty-files">
                    <p>暂无上下文文件</p>
                    <p className="awd-empty-hint">点击下方"添加资料"上传相关文件</p>
                  </div>
                ) : (
                  contextFiles.map((f, i) => (
                    <div key={i} className="awd-file-row">
                      <span>▣</span><span className="awd-file-name">{f.name}</span><span className="awd-file-ext">{f.ext}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="awd-composer">
            <textarea
              className="awd-textarea"
              placeholder="输入流程约束、补充说明或优化建议..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
            />
            <div className="awd-composer-actions">
              <span className="awd-counter">{inputText.length} 字</span>
              <button className="awd-composer-btn"><Paperclip size={14} /> 添加资料</button>
              <button className="awd-composer-btn"><span>粘贴内容</span></button>
              <button
                className="awd-send-btn"
                disabled={!inputText.trim()}
                onClick={handleSendMessage}
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </section>

        {/* ===== CENTER: AI Analysis ===== */}
        <section className="awd-panel awd-analysis">
          <div className="awd-panel-head">
            <div><h2>分析流程与草案</h2><p>分析来源 → 结构化建议 → 生成草案</p></div>
          </div>

          {/* AI Action Bar */}
          <div className="awd-ai-action">
            <button
              className="awd-btn awd-btn-primary"
              onClick={handleGenerateDraft}
              disabled={generating}
            >
              <Sparkles size={14} /> {generating ? "生成中..." : "生成流程草案"}
            </button>
            <span className="awd-ai-note">基于上下文资料和 AI 解析结果生成结构化草案</span>
          </div>

          {/* 5-Step Process */}
          <div className="awd-steps">
            {["收集资料", "分析需求", "识别角色", "生成草案", "差异对比"].map((s, i) => (
              <div key={i} className={`awd-step${draftGenerated ? " active" : i <= (contextFiles.length > 0 ? 0 : -1) ? " active" : ""}`}>
                <div className="awd-step-no">{i + 1}</div>
                <span>{s}</span>
              </div>
            ))}
          </div>

          {/* 4 Insight Cards */}
          <div className="awd-insights">
            <div className="awd-insight-card">
              <div className="awd-insight-title">◎ 目标摘要 <span className="awd-insight-badge">{draftGenerated ? "已分析" : "待分析"}</span></div>
              <p>{draftGenerated
                ? "优化软件开发完整流程，补齐角色、模型与能力授权，提升交付质量与效率。"
                : '点击"生成流程草案"开始分析...'}</p>
            </div>
            <div className="awd-insight-card">
              <div className="awd-insight-title">♙ 角色建议 <span className="awd-insight-badge">{draftGenerated ? "已分析" : "待分析"}</span></div>
              <div className="awd-insight-roles">
                {draftGenerated ? (
                  <>
                    <div className="awd-role-row"><span className="awd-role-dot" style={{background:"#4268d9"}}>P</span>产品经理</div>
                    <div className="awd-role-row"><span className="awd-role-dot" style={{background:"#7257cc"}}>U</span>UI/UX 设计师</div>
                    <div className="awd-role-row"><span className="awd-role-dot" style={{background:"#2f9b68"}}>F</span>前端工程师</div>
                    <div className="awd-role-row"><span className="awd-role-dot" style={{background:"#d17e34"}}>R</span>代码审查员</div>
                    <div className="awd-role-row"><span className="awd-role-dot" style={{background:"#4d78e5"}}>T</span>测试工程师</div>
                  </>
                ) : (
                  <p className="awd-empty-hint">等待生成草案...</p>
                )}
              </div>
            </div>
            <div className="awd-insight-card">
              <div className="awd-insight-title">◇ 能力授权建议 <span className="awd-insight-badge">{draftGenerated ? "已分析" : "待分析"}</span></div>
              <div className="awd-cap-grid">
                <div className={`awd-cap ${draftGenerated ? "green" : ""}`}><strong>MCP</strong><span>{draftGenerated ? "已启用" : "待确认"}</span></div>
                <div className={`awd-cap ${draftGenerated ? "green" : ""}`}><strong>Skills</strong><span>{draftGenerated ? "已启用" : "待确认"}</span></div>
                <div className={`awd-cap ${draftGenerated ? "green" : ""}`}><strong>Git</strong><span>{draftGenerated ? "已启用" : "待确认"}</span></div>
                <div className="awd-cap warn"><strong>Local Shell</strong><span>待确认</span></div>
              </div>
            </div>
            <div className="awd-insight-card">
              <div className="awd-insight-title">⚙ 风险与假设 <span className="awd-insight-badge">{draftGenerated ? "已分析" : "待分析"}</span></div>
              {draftGenerated ? (
                <ul>
                  <li>依赖第三方服务稳定性</li>
                  <li>模型输出质量波动</li>
                  <li>多人协作冲突</li>
                  <li>测试覆盖不足</li>
                </ul>
              ) : (
                <p className="awd-empty-hint">等待生成草案...</p>
              )}
            </div>
          </div>

          {/* Draft Canvas */}
          <div className="awd-canvas-card">
            <div className="awd-canvas-head">
              <div className="awd-draft-title">
                <span>流程草案</span><span className="awd-mini-tag">v1.4 · 草案</span>
              </div>
              <div className="awd-zoom">100%</div>
            </div>
            <div className="awd-canvas">
              {draftNodes.length === 0 ? (
                <div className="awd-empty-canvas">
                  <div className="awd-empty-icon">📋</div>
                  <p>{draftGenerated ? "草案已生成，暂无步骤" : '点击"生成流程草案"开始'}</p>
                  {!draftGenerated && <p className="awd-empty-hint">AI 将根据上下文自动生成流程步骤</p>}
                </div>
              ) : (
                draftNodes.map((node, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 0 }}>
                    <div className={`awd-node ${node.status}`}>
                      <div className="awd-node-no">{node.no}</div>
                      <h3>{node.name}</h3>
                      <div className="awd-node-field">
                        <label>角色</label>
                        <div className="awd-node-value">{node.role}</div>
                      </div>
                      <div className="awd-node-field">
                        <label>模型</label>
                        <div className="awd-node-value">{node.model}</div>
                      </div>
                      <div className="awd-node-field">
                        <label>Gate</label>
                        <div className="awd-node-value">{node.gate}</div>
                      </div>
                      <div className={`awd-node-state ${node.status}`}>
                        {node.status === "done" && "✓ 已完成"}
                        {node.status === "active" && "◉ 运行中"}
                        {node.status === "wait" && "⌛ 等待 Gate"}
                        {node.status === "idle" && "○ 待开始"}
                      </div>
                    </div>
                    {i < draftNodes.length - 1 && (
                      <span className="awd-node-arrow"><ArrowRight size={16} /></span>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="awd-canvas-footer">
              <div className="awd-legend">
                <span><span className="awd-legend-dot done" />已完成</span>
                <span><span className="awd-legend-dot active" />运行中</span>
                <span><span className="awd-legend-dot wait" />等待 Gate</span>
                <span><span className="awd-legend-dot idle" />待开始</span>
              </div>
              <span>{draftNodes.length} 个步骤</span>
            </div>
          </div>
        </section>

        {/* ===== RIGHT: Diff & Apply ===== */}
        <section className="awd-panel awd-diff">
          <div className="awd-panel-head">
            <div><h2>差异对比与应用</h2><p>审查变更 → 确认清单 → 应用</p></div>
          </div>

          {/* Stats */}
          <div className="awd-stats">
            <div className="awd-stat green">
              <span>新增步骤</span><strong>{stats.add}</strong><span>已识别新增节点</span>
            </div>
            <div className="awd-stat">
              <span>修改步骤</span><strong>{stats.mod}</strong><span>角色/模型/Gate 变更</span>
            </div>
            <div className="awd-stat warn">
              <span>保持不变</span><strong>{stats.same}</strong><span>无需变更的步骤</span>
            </div>
          </div>

          {/* Diff List */}
          <div className="awd-diff-list">
            {diffItems.length === 0 ? (
              <div className="awd-empty-diff">
                <div className="awd-empty-icon">📊</div>
                <p>{draftGenerated ? "暂无差异" : "生成草案后显示差异对比"}</p>
              </div>
            ) : (
              diffItems.map((item, i) => (
                <div key={i} className={`awd-diff-row ${item.type}`}>
                  <div className="awd-diff-icon">
                    {item.type === "add" && <Plus size={14} />}
                    {item.type === "mod" && <ArrowRight size={14} />}
                    {item.type === "same" && <Check size={14} />}
                  </div>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.desc}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Checklist */}
          <div className="awd-checklist">
            <h3>应用前确认</h3>
            {checklistItems.map((item, i) => (
              <div key={i} className="awd-check-row">
                <div className={`awd-check-box${item.done ? " done" : ""}`}>
                  {item.done && <Check size={10} />}
                </div>
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          {/* Apply Actions */}
          <div className="awd-diff-actions">
            <button className="awd-btn awd-btn-apply" disabled={!draftGenerated || diffItems.length === 0}>
              <Check size={14} /> 确认并应用
            </button>
            <button className="awd-btn awd-btn-cancel" disabled={!draftGenerated}>放弃草案</button>
          </div>
        </section>
      </div>
    </div>
  );
}
