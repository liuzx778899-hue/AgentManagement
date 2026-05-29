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

const CHAT_MESSAGES = [
  { author: "我", time: "09:32", text: "基于当前项目计划和协同文件，帮我优化软件开发流程，补齐角色、模型和能力授权。", isUser: true },
  { author: "AI 助手", time: "09:33", text: "好的，我已收集的资料，可以为你优化软件开发流程。\n\n在生成草案前，请确认：\n1. 是否保留当前流程 v1.3 作为基准版本？\n2. 仅生成草案变更，不直接覆盖当前流程？", isUser: false },
  { author: "我", time: "09:34", text: "是的，保留 v1.3，只生成草案变更。", isUser: true },
  { author: "AI 助手", time: "09:34", text: "收到，我将基于当前资料生成优化后的流程草案，请稍等。", isUser: false, typing: true },
];

const MOCK_FILES = [
  { name: "当前项目计划", ext: "项目计划.md" },
  { name: "HANDOFF", ext: "HANDOFF_NEXT_TASKS.md" },
  { name: "AI 建项结果", ext: "ai_project_analysis.md" },
  { name: "当前流程 v1.3", ext: "software_flow_v1.3.json" },
  { name: "CODE_REVIEW", ext: "CODE_REVIEW_AND_FIX.md" },
];

const DRAFT_NODES = [
  { no: "01", name: "需求分析", role: "产品经理", model: "DeepSeek v4", gate: "人工 Gate", status: "done" },
  { no: "02", name: "UI/UX 设计", role: "设计师", model: "Claude Sonnet", gate: "人工 Gate", status: "done" },
  { no: "03", name: "前端开发", role: "前端工程师", model: "GPT-5.3", gate: "自动继续", status: "active" },
  { no: "04", name: "代码审查", role: "审查员", model: "Claude Opus", gate: "人工 Gate", status: "wait" },
  { no: "05", name: "测试验证", role: "测试工程师", model: "Gemini Pro", gate: "人工 Gate", status: "idle" },
];

const DIFF_ITEMS = [
  { type: "add", title: "新增步骤：部署发布", desc: "新增步骤 06，绑定 DevOps 角色" },
  { type: "add", title: "新增 Gate：代码审查", desc: "步骤 04 新增自动 Gate 检查" },
  { type: "mod", title: "角色变更：测试工程师", desc: "替换为 Gemini Pro 模型" },
  { type: "mod", title: "步骤优化：前端开发", desc: "增加能力授权 MCP + Skills" },
  { type: "same", title: "保持不变：需求分析", desc: "产品经理角色和模型不变" },
  { type: "same", title: "保持不变：UI/UX 设计", desc: "设计师角色和模型不变" },
];

const CHECKLIST_ITEMS = [
  { label: "已检查步骤完整性（5 个步骤已添加）", done: true },
  { label: "已验证角色绑定（4 个绑定已更新）", done: true },
  { label: "待确认 Runner 配置", done: false },
  { label: "待确认模型切换影响范围", done: false },
  { label: "待确认验收标准更新", done: false },
];

export function AiWorkflowDesign({ data: _data }: AiWorkflowDesignProps) {
  const [materialsExpanded, setMaterialsExpanded] = useState(true);
  const [composerText, setComposerText] = useState("");
  const [draftGenerated, setDraftGenerated] = useState(false);

  return (
    <div className="awd-page">
      {/* ===== GLOBAL BAR (breadcrumb) ===== */}
      <header className="awd-globalbar">
        <div className="awd-breadcrumb">
          <span>AgentDevelop</span><span>/</span><span>流程管理</span><span>/</span><strong>AI 流程设计</strong>
        </div>
        <div className="awd-top-chip"><span className="awd-dot" /> 个人本地版</div>
      </header>

      {/* ===== TOOLBAR ===== */}
      <div className="awd-toolbar">
        <div className="awd-toolbar-left">
          <div className="awd-select-pill"><span>▣</span> AgentDevelop <ChevronDown size={14} /></div>
          <div className="awd-select-pill wide"><span>上下文：</span> 项目计划 + 协同文件 + 当前流程 <ChevronDown size={14} /></div>
          <div className="awd-select-pill flow"><span>目标流程：</span> 软件开发完整流程 <ChevronDown size={14} /></div>
          <div className="awd-source-chip">已收集 {MOCK_FILES.length} 个来源 · {draftGenerated ? "草案已生成" : "草案未生成"}</div>
        </div>
        <div className="awd-toolbar-right">
          <button className="awd-btn" onClick={() => { const ev = new CustomEvent("navigate", { detail: { view: "workflows" } }); window.dispatchEvent(ev); }}>
            ← 常规流程设计
          </button>
          <button className="awd-btn awd-btn-primary" onClick={() => setDraftGenerated(true)}>
            <Sparkles size={14} /> 生成流程草案
          </button>
          <button className="awd-btn"><Save size={14} /> 保存草稿</button>
          <button className="awd-btn"><Upload size={14} /> 应用到流程</button>
          <button className="awd-btn-icon"><MoreHorizontal size={14} /></button>
        </div>
      </div>

      {/* ===== THREE-COLUMN CONTENT ===== */}
      <div className="awd-content">
        {/* ===== LEFT: Discussion ===== */}
        <section className="awd-panel awd-discussion">
          <div className="awd-panel-head">
            <div><h2>讨论区</h2><p>原始输入与资料收集</p></div>
            <div className="awd-ctx-badge">上下文 {MOCK_FILES.length} 项</div>
          </div>

          {/* Chat */}
          <div className="awd-chat">
            {CHAT_MESSAGES.map((msg, i) => (
              <div key={i} className={`awd-bubble-row${msg.isUser ? " me" : ""}`}>
                <div className="awd-bubble-icon">{msg.isUser ? "我" : "AI"}</div>
                <div className={`awd-bubble${msg.isUser ? " me" : ""}`}>
                  <div className="awd-bubble-time">{msg.author}　{msg.time}</div>
                  {msg.text.split("\n").map((line, j) => <p key={j}>{line}</p>)}
                  {msg.typing && (
                    <div className="awd-typing"><span /><span /><span /></div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Materials */}
          <div className="awd-material-box">
            <button className="awd-material-head" onClick={() => setMaterialsExpanded(!materialsExpanded)}>
              <span>已添加资料 {MOCK_FILES.length} 项</span>
              <span>{materialsExpanded ? "收起" : "展开"} <ChevronDown size={14} style={{ transform: materialsExpanded ? "rotate(180deg)" : "none" }} /></span>
            </button>
            {materialsExpanded && (
              <div className="awd-file-list">
                {MOCK_FILES.map((f, i) => (
                  <div key={i} className="awd-file-row">
                    <span>▣</span><span className="awd-file-name">{f.name}</span><span className="awd-file-ext">{f.ext}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="awd-composer">
            <textarea
              className="awd-textarea"
              placeholder="输入流程约束、补充说明或优化建议..."
              value={composerText}
              onChange={(e) => setComposerText(e.target.value)}
              rows={3}
            />
            <div className="awd-composer-actions">
              <span className="awd-counter">{composerText.length} 字</span>
              <button className="awd-composer-btn"><Paperclip size={14} /> 添加资料</button>
              <button className="awd-composer-btn"><span>粘贴内容</span></button>
              <button className="awd-send-btn" disabled={!composerText.trim()}><Send size={14} /></button>
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
            <button className="awd-btn awd-btn-primary" onClick={() => setDraftGenerated(true)}>
              <Sparkles size={14} /> 生成流程草案
            </button>
            <span className="awd-ai-note">基于上下文资料和 AI 解析结果生成结构化草案</span>
          </div>

          {/* 5-Step Process */}
          <div className="awd-steps">
            {["收集资料", "分析需求", "识别角色", "生成草案", "差异对比"].map((s, i) => (
              <div key={i} className={`awd-step${i <= 2 ? " active" : ""}`}>
                <div className="awd-step-no">{i + 1}</div>
                <span>{s}</span>
              </div>
            ))}
          </div>

          {/* 4 Insight Cards — matching prototype */}
          <div className="awd-insights">
            <div className="awd-insight-card">
              <div className="awd-insight-title">◎ 目标摘要 <span className="awd-insight-badge">待分析</span></div>
              <p>优化软件开发完整流程，补齐角色、模型与能力授权，提升交付质量与效率。</p>
            </div>
            <div className="awd-insight-card">
              <div className="awd-insight-title">♙ 角色建议 (5) <span className="awd-insight-badge">待分析</span></div>
              <div className="awd-insight-roles">
                <div className="awd-role-row"><span className="awd-role-dot" style={{background:"#4268d9"}}>P</span>产品经理</div>
                <div className="awd-role-row"><span className="awd-role-dot" style={{background:"#7257cc"}}>U</span>UI/UX 设计师</div>
                <div className="awd-role-row"><span className="awd-role-dot" style={{background:"#2f9b68"}}>F</span>前端工程师</div>
                <div className="awd-role-row"><span className="awd-role-dot" style={{background:"#d17e34"}}>R</span>代码审查员</div>
                <div className="awd-role-row"><span className="awd-role-dot" style={{background:"#4d78e5"}}>T</span>测试工程师</div>
              </div>
            </div>
            <div className="awd-insight-card">
              <div className="awd-insight-title">◇ 能力授权建议 <span className="awd-insight-badge">待分析</span></div>
              <div className="awd-cap-grid">
                <div className="awd-cap green"><strong>MCP</strong><span>已启用</span></div>
                <div className="awd-cap green"><strong>Skills</strong><span>已启用</span></div>
                <div className="awd-cap green"><strong>Git</strong><span>已启用</span></div>
                <div className="awd-cap warn"><strong>Local Shell</strong><span>待确认</span></div>
              </div>
            </div>
            <div className="awd-insight-card">
              <div className="awd-insight-title">⚙ 风险与假设 <span className="awd-insight-badge">待分析</span></div>
              <ul>
                <li>依赖第三方服务稳定性</li>
                <li>模型输出质量波动</li>
                <li>多人协作冲突</li>
                <li>测试覆盖不足</li>
              </ul>
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
              {DRAFT_NODES.map((node, i) => (
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
                  {i < DRAFT_NODES.length - 1 && (
                    <span className="awd-node-arrow"><ArrowRight size={16} /></span>
                  )}
                </div>
              ))}
            </div>
            <div className="awd-canvas-footer">
              <div className="awd-legend">
                <span><span className="awd-legend-dot done" />已完成</span>
                <span><span className="awd-legend-dot active" />运行中</span>
                <span><span className="awd-legend-dot wait" />等待 Gate</span>
                <span><span className="awd-legend-dot idle" />待开始</span>
              </div>
              <span>5 个步骤</span>
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
              <span>新增步骤</span><strong>2</strong><span>已识别新增节点</span>
            </div>
            <div className="awd-stat">
              <span>修改步骤</span><strong>2</strong><span>角色/模型/Gate 变更</span>
            </div>
            <div className="awd-stat warn">
              <span>保持不变</span><strong>2</strong><span>无需变更的步骤</span>
            </div>
          </div>

          {/* Diff List */}
          <div className="awd-diff-list">
            {DIFF_ITEMS.map((item, i) => (
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
            ))}
          </div>

          {/* Checklist */}
          <div className="awd-checklist">
            <h3>应用前确认</h3>
            {CHECKLIST_ITEMS.map((item, i) => (
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
            <button className="awd-btn awd-btn-apply" disabled={!draftGenerated}>
              <Check size={14} /> 确认并应用
            </button>
            <button className="awd-btn awd-btn-cancel">放弃草案</button>
          </div>
        </section>
      </div>
    </div>
  );
}
