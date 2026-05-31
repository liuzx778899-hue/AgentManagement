import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronDown, List, Paperclip, Plus, Send, Sparkles, Trash2 } from "lucide-react";
import type { WorkbenchData, WorkflowStep, WorkflowTemplate } from "../domain/workbench";
import { useWorkbenchState } from "../state";
import { StepEditModal } from "./StepEditModal";

interface WorkflowBuilderProps {
  data: WorkbenchData;
  onBack?: () => void;
  selectedTemplateId?: string;
}

// Inline AI workflow design panels (no duplicate header)
function AiWorkflowDesignInline({ data }: { data: WorkbenchData }) {
  const [materialsExpanded, setMaterialsExpanded] = useState(true);
  const [composerText, setComposerText] = useState("");
  const [draftGenerated, setDraftGenerated] = useState(false);
  const [selectedDraftIndex, setSelectedDraftIndex] = useState(0);
  const [editingDraftStepId, setEditingDraftStepId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const materialInputRef = useRef<HTMLInputElement | null>(null);

  // 聊天消息
  const [chatMessages, setChatMessages] = useState<{ id: number; author: string; text: string; isUser: boolean; time: string }[]>([]);

  // 初始状态为空，由用户上传或 AI 生成
  const [materials, setMaterials] = useState<{ name: string; ext: string }[]>([]);
  const [materialNotice, setMaterialNotice] = useState("");

  // 差异对比
  const [diffItems, setDiffItems] = useState<{ type: "add" | "mod" | "same"; title: string; desc: string }[]>([]);

  // 检查清单
  const [checklistItems, setChecklistItems] = useState([
    { label: "步骤完整性检查", done: false },
    { label: "角色绑定检查", done: false },
    { label: "模型配置检查", done: false },
    { label: "Gate 配置检查", done: false },
    { label: "验收标准确认", done: false },
  ]);

  // 草案步骤初始为空，由 AI 生成后填充
  const [draftSteps, setDraftSteps] = useState<WorkflowStep[]>([]);
  const draftTemplate = useMemo<WorkflowTemplate>(() => ({
    id: "ai-draft-template",
    name: "AI 生成流程草案",
    version: 1,
    status: "draft",
    steps: draftSteps,
    workflowMarkdown: "# AI 生成流程草案",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }), [draftSteps]);

  const editingDraftStep = editingDraftStepId ? draftSteps.find((step) => step.id === editingDraftStepId) : null;

  // 从 roleId 提取角色名
  const getRoleName = (roleId: string) => {
    if (!roleId) return "未绑定角色";
    if (roleId.startsWith("role-ai-draft-")) {
      return roleId.replace("role-ai-draft-", "");
    }
    // 尝试从角色池查找
    const role = data.roles.find(r => r.id === roleId);
    return role?.name ?? "未绑定角色";
  };

  const getRunnerName = (runnerId?: string) => data.runnerProfiles.find((runner) => runner.id === runnerId)?.displayName ?? "未绑定 Runner";

  const focusDraftStep = (index: number) => {
    setSelectedDraftIndex(index);
    document.getElementById(`awd-node-${index}`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  };

  const handleAddMaterial = () => {
    materialInputRef.current?.click();
  };

  const handleMaterialFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    setMaterialsExpanded(true);
    setMaterials((items) => [
      ...items,
      ...files.map((file) => {
        const dotIndex = file.name.lastIndexOf(".");
        return {
          name: dotIndex > 0 ? file.name.slice(0, dotIndex) : file.name,
          ext: file.name,
        };
      }),
    ]);
    setMaterialNotice(`已添加 ${files.length} 个文件，可在资料列表中查看。`);
    event.target.value = "";
  };

  // 获取当前时间
  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
  };

  // 发送聊天消息
  const handleSendMessage = async () => {
    const text = composerText.trim();
    if (!text) return;

    // 添加用户消息
    const userMessage = {
      id: Date.now(),
      author: "我",
      text,
      isUser: true,
      time: getCurrentTime(),
    };
    setChatMessages(prev => [...prev, userMessage]);
    setComposerText("");

    // 获取 AI 配置
    try {
      const configResponse = await fetch("/api/settings/model-providers");
      const configResult = await configResponse.json();
      const { aiAssistantModel } = configResult.data || {};

      // 构建上下文
      const materialsContext = materials.length > 0
        ? `上下文文件: ${materials.map(m => `${m.name}.${m.ext}`).join(", ")}`
        : "";

      // 调用 AI
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: text }],
          context: materialsContext,
          providerId: aiAssistantModel?.providerId,
          modelName: aiAssistantModel?.modelName,
        }),
      });

      const result = await response.json();

      if (result.ok && result.data?.content) {
        setChatMessages(prev => [...prev, {
          id: Date.now(),
          author: "AI 助手",
          text: result.data.content,
          isUser: false,
          time: getCurrentTime(),
        }]);
      } else {
        setChatMessages(prev => [...prev, {
          id: Date.now(),
          author: "AI 助手",
          text: "抱歉，我暂时无法处理您的请求。",
          isUser: false,
          time: getCurrentTime(),
        }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages(prev => [...prev, {
        id: Date.now(),
        author: "AI 助手",
        text: "抱歉，连接 AI 服务失败。",
        isUser: false,
        time: getCurrentTime(),
      }]);
    }
  };

  // 生成流程草案
  const handleGenerateDraft = async () => {
    setGenerating(true);

    try {
      // 获取 AI 配置
      const configResponse = await fetch("/api/settings/model-providers");
      const configResult = await configResponse.json();
      const { aiAssistantModel } = configResult.data || {};

      // 构建上下文
      const projectContext = data.projects.length > 0
        ? `当前项目: ${data.projects.map(p => p.name).join(", ")}`
        : "暂无活跃项目";

      const materialsContext = materials.length > 0
        ? `上下文文件: ${materials.map(m => `${m.name}.${m.ext}`).join(", ")}`
        : "";

      // 调用 AI 生成
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `请基于以下上下文，生成一个软件开发工作流程草案：

${projectContext}
${materialsContext}

请按以下格式输出流程步骤（每行一个步骤）：
步骤名|角色名|模型名|Gate类型(auto/manual)

例如：
需求分析|产品经理|glm-5|auto
UI设计|UI设计师|glm-5|manual`
          }],
          context: "AI 流程设计模式",
          providerId: aiAssistantModel?.providerId,
          modelName: aiAssistantModel?.modelName,
        }),
      });

      const result = await response.json();

      if (result.ok && result.data?.content) {
        const content = result.data.content;
        const lines = content.split("\n").filter((line: string) => line.trim());

        // 清空旧数据
        const newSteps: WorkflowStep[] = [];
        const newDiffs: { type: "add" | "mod" | "same"; title: string; desc: string }[] = [];

        lines.forEach((line: string, index: number) => {
          const parts = line.split("|").map((p: string) => p.trim());
          if (parts.length >= 1 && parts[0]) {
            const stepName = parts[0].replace(/^\d+[\.\、\s]*/, "").trim();
            const roleName = parts[1] || "待分配";
            const modelName = parts[2] || "默认模型";
            const gateType = parts[3] || "auto";

            const provider = data.modelProviders.find(p => p.enabled) ?? data.modelProviders[0];

            newSteps.push({
              id: `ai-draft-step-${index + 1}`,
              order: index + 1,
              name: stepName,
              roleId: `role-ai-draft-${roleName}`, // 角色名直接作为 roleId 的一部分
              modelProviderId: provider?.id ?? "",
              modelName,
              inputs: index === 0 ? ["项目目标", "协同资料"] : [`步骤 ${index} 输出`],
              outputs: [`${stepName}结果`],
              gateMode: gateType === "manual" ? "manual" : "auto",
              failureStrategy: "stop",
              projectOverride: false,
            });

            newDiffs.push({
              type: "add",
              title: stepName,
              desc: `角色: ${roleName}, Gate: ${gateType}`,
            });
          }
        });

        if (newSteps.length > 0) {
          setDraftSteps(newSteps);
          setDiffItems(newDiffs);
          setDraftGenerated(true);

          // 更新检查清单
          setChecklistItems(prev => prev.map((item, i) => ({
            ...item,
            done: i < 2,
          })));
        }
      }
    } catch (error) {
      console.error('[AiWorkflowDesignInline] Generate failed:', error);
    }

    setGenerating(false);
  };

  // 键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 统计
  const stats = {
    add: diffItems.filter(d => d.type === "add").length,
    mod: diffItems.filter(d => d.type === "mod").length,
    same: diffItems.filter(d => d.type === "same").length,
  };

  // 检查是否所有清单项都完成
  const allChecksDone = checklistItems.every(item => item.done);

  return (
    <div className="awd-inline-content">
      {/* Three panels */}
      <div className="awd-inline-grid">
        {/* Left: Discussion */}
        <section className="awd-panel awd-discussion" style={{ minWidth: 260 }}>
          <div className="awd-panel-head-sm">
            <h2>讨论区</h2>
            <div className="awd-ctx-badge">上下文 {materials.length} 项</div>
          </div>
          <div className="awd-chat-compact">
            {chatMessages.length === 0 ? (
              <div className="awd-empty-chat">
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
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="awd-material-box">
            <button className="awd-material-head" onClick={() => setMaterialsExpanded(!materialsExpanded)}>
              <span>已添加资料 {materials.length} 项</span>
              <span>{materialsExpanded ? "收起" : "展开"} <ChevronDown size={14} style={{ transform: materialsExpanded ? "rotate(180deg)" : "none" }} /></span>
            </button>
            {materialsExpanded && (
              <div className="awd-file-list">
                {materials.length === 0 ? (
                  <div className="awd-empty-files">
                    <p>暂无上下文文件</p>
                    <p className="awd-empty-hint">点击下方「添加资料」上传相关文件</p>
                  </div>
                ) : (
                  materials.map((f, i) => (
                    <div key={i} className="awd-file-row">
                      <span>▣</span>
                      <span className="awd-file-name">{f.name}</span>
                      <span className="awd-file-ext">{f.ext}</span>
                      <button
                        className="awd-file-delete-btn"
                        onClick={() => setMaterials(materials.filter((_, idx) => idx !== i))}
                        title="删除文件"
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
                {materialNotice && <div className="awd-material-notice">{materialNotice}</div>}
              </div>
            )}
          </div>
          <div className="awd-composer">
            <textarea
              className="awd-textarea"
              placeholder="输入流程约束、补充说明或优化建议..."
              value={composerText}
              onChange={(e) => setComposerText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
            />
            <div className="awd-composer-actions">
              <span className="awd-counter">{composerText.length} 字</span>
              <input
                ref={materialInputRef}
                type="file"
                multiple
                className="awd-file-input"
                onChange={handleMaterialFiles}
              />
              <button type="button" className="awd-composer-btn" onClick={handleAddMaterial}><Paperclip size={14} /> 添加资料</button>
              <button
                className="awd-send-btn"
                disabled={!composerText.trim()}
                onClick={handleSendMessage}
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </section>

        {/* Center: Analysis + Draft */}
        <section className="awd-panel awd-analysis" style={{ flex: 1 }}>
          <div className="awd-panel-head-sm" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2>分析流程与草案</h2>
            <button
              className="awd-btn awd-btn-primary"
              style={{ height: 28, fontSize: 11, padding: "0 14px" }}
              onClick={handleGenerateDraft}
              disabled={generating}
            >
              <Sparkles size={12} /> {generating ? "生成中..." : "生成草案"}
            </button>
          </div>
          <div className="awd-steps">
            {["收集资料", "分析需求", "识别角色", "生成草案", "差异对比"].map((s, i) => (
              <div key={i} className={`awd-step${i <= (draftGenerated ? 4 : generating ? 3 : materials.length > 0 ? 0 : -1) ? " active" : ""}`}>
                <div className="awd-step-no">{i + 1}</div><span>{s}</span>
              </div>
            ))}
          </div>
          <div className="awd-insights-compact">
            <div className="awd-insight-card">
              <div className="awd-insight-title">◎ 目标摘要 <span className="awd-insight-badge">{draftGenerated ? "已分析" : "待分析"}</span></div>
              <p>{draftGenerated ? "基于上下文资料生成的流程草案，已识别关键步骤和角色分配。" : "点击「生成草案」开始分析..."}</p>
            </div>
            <div className="awd-insight-card">
              <div className="awd-insight-title">♙ 角色建议 <span className="awd-insight-badge">{draftGenerated ? "已分析" : "待分析"}</span></div>
              <div className="awd-insight-roles">
                {draftGenerated && draftSteps.length > 0 ? (
                  draftSteps.slice(0, 5).map((step, i) => (
                    <div key={i} className="awd-role-row">
                      <span className="awd-role-dot" style={{background: ["#4268d9","#7257cc","#2f9b68","#d17e34","#4d78e5"][i % 5]}}>
                        {getRoleName(step.roleId)[0] || "未"}
                      </span>
                      {getRoleName(step.roleId)}
                    </div>
                  ))
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
          <div className="awd-canvas-card">
            <div className="awd-canvas-head">
              <div className="awd-draft-title">
                <span>流程草案</span>
                {draftGenerated && <span className="awd-mini-tag">草案</span>}
              </div>
            </div>
            <div className="awd-canvas">
              {draftSteps.length === 0 ? (
                <div className="awd-empty-canvas">
                  <div className="awd-empty-icon">📋</div>
                  <p>{draftGenerated ? "草案已生成，暂无步骤" : "点击「生成草案」开始"}</p>
                  {!draftGenerated && <p className="awd-empty-hint">AI 将根据上下文自动生成流程步骤</p>}
                </div>
              ) : (
                draftSteps.map((step, i) => {
                  const stateClass = i === 0 ? "active" : "idle";
                  const roleName = getRoleName(step.roleId);
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 0 }}>
                      <div
                        id={`awd-node-${i}`}
                        className={`awd-node-v2 ${stateClass}`}
                        onClick={() => setSelectedDraftIndex(i)}
                        onDoubleClick={() => setEditingDraftStepId(step.id)}
                        title="双击编辑步骤"
                      >
                        <div className="awd-node-v2-hd">
                          <span className="awd-node-v2-no">{String(i + 1).padStart(2, "0")}</span>
                          <span className="awd-node-v2-name">{step.name}</span>
                        </div>
                        <div className="awd-node-v2-body">
                          <div className="awd-node-v2-row">
                            <div className={`awd-node-v2-avatar ${stateClass}`}>{roleName[0] ?? "未"}</div>
                            <div>
                              <div className="awd-node-v2-label">角色</div>
                              <div className="awd-node-v2-val">{roleName}</div>
                            </div>
                          </div>
                          <div className="awd-node-v2-row">
                            <span className={`awd-node-v2-dot ${stateClass}`} />
                            <div>
                              <div className="awd-node-v2-label">模型</div>
                              <div className="awd-node-v2-val">{step.modelName || "—"}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      {i < draftSteps.length - 1 && <span className="awd-node-arrow"><ArrowRight size={16} /></span>}
                    </div>
                  );
                })
              )}
            </div>
            <div className="awd-canvas-footer">
              <div className="awd-legend">
                <span><span className="awd-legend-dot done" />已完成</span>
                <span><span className="awd-legend-dot active" />运行中</span>
                <span><span className="awd-legend-dot wait" />等待 Gate</span>
                <span><span className="awd-legend-dot idle" />待开始</span>
              </div>
              <span>{draftSteps.length} 个步骤</span>
            </div>
          </div>
        </section>

        {/* Right: Diff */}
        <section className="awd-panel awd-diff" style={{ minWidth: 260 }}>
          <div className="awd-panel-head-sm"><h2>差异对比与应用</h2></div>
          <div className="awd-stats">
            <div className="awd-stat green"><span>新增步骤</span><strong>{stats.add}</strong><span>已识别新增节点</span></div>
            <div className="awd-stat"><span>修改步骤</span><strong>{stats.mod}</strong><span>角色/模型/Gate 变更</span></div>
            <div className="awd-stat warn"><span>保持不变</span><strong>{stats.same}</strong><span>无需变更的步骤</span></div>
          </div>
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
          <div className="awd-checklist">
            <h3>应用前确认</h3>
            {checklistItems.map((item, i) => (
              <div
                key={i}
                className="awd-check-row"
                onClick={() => setChecklistItems(prev => prev.map((c, idx) => idx === i ? { ...c, done: !c.done } : c))}
                style={{ cursor: "pointer" }}
              >
                <div className={`awd-check-box${item.done ? " done" : ""}`}>
                  {item.done && <Check size={10} />}
                </div>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
          <div className="awd-diff-actions">
            <button className="awd-btn awd-btn-apply" disabled={!draftGenerated || diffItems.length === 0 || !allChecksDone}>
              <Check size={14} /> 确认并应用
            </button>
            <button className="awd-btn awd-btn-cancel" disabled={!draftGenerated}>放弃草案</button>
          </div>
        </section>
      </div>
      {editingDraftStep && (
        <StepEditModal
          step={editingDraftStep}
          template={draftTemplate}
          data={data}
          availableRoles={data.roles}
          onSave={(updates) => {
            setDraftSteps((steps) => steps.map((step) => step.id === editingDraftStep.id ? { ...step, ...updates } : step));
            setEditingDraftStepId(null);
          }}
          onDelete={(stepId) => {
            setDraftSteps((steps) => steps.filter((step) => step.id !== stepId).map((step, index) => ({ ...step, order: index + 1 })));
            setSelectedDraftIndex(0);
            setEditingDraftStepId(null);
          }}
          onClose={() => setEditingDraftStepId(null)}
        />
      )}
    </div>
  );
}

export function WorkflowBuilder({ data, onBack, selectedTemplateId: initialTemplateId }: WorkflowBuilderProps) {
  const {
    addRole,
    updateRole,
    addWorkflowTemplate,
    updateWorkflowTemplate,
    deleteWorkflowTemplate,
    addWorkflowStep,
    updateWorkflowStep,
    deleteWorkflowStep,
  } = useWorkbenchState();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(initialTemplateId ?? data.workflowTemplates[0]?.id ?? "");
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleDraft, setRoleDraft] = useState({ name: "", description: "", roleMarkdown: "" });
  const [pendingTemplateName, setPendingTemplateName] = useState<string | null>(null);
  const [pendingRoleName, setPendingRoleName] = useState<string | null>(null);
  const [templateRoleIds, setTemplateRoleIds] = useState<Record<string, string[]>>({});
  const closeStepInspector = () => setSelectedStepIndex(null);
  const selectedTemplate = useMemo(
    () => data.workflowTemplates.find((t) => t.id === selectedTemplateId) ?? null,
    [data, selectedTemplateId]
  );
  const sortedSteps = useMemo(
    () => selectedTemplate ? [...selectedTemplate.steps].sort((a, b) => a.order - b.order) : [],
    [selectedTemplate]
  );

  // Mode switch: 常规配置 / AI 辅助生成
  const [mode, setMode] = useState<"manual" | "ai">(() => {
    const p = new URLSearchParams(window.location.hash.split("?")[1] || "");
    return (p.get("mode") === "ai" ? "ai" : "manual") as "manual" | "ai";
  });

  // Sync mode to URL search params (for refresh persistence)
  useEffect(() => {
    const hash = window.location.hash.replace(/\?.*/, "");
    const newHash = mode === "ai" ? `${hash}?mode=ai` : hash;
    if (window.location.hash !== newHash) {
      window.history.replaceState(null, "", window.location.pathname + newHash);
    }
  }, [mode]);

  useEffect(() => {
    if (!initialTemplateId) return;
    setSelectedTemplateId(initialTemplateId);
    setMode("manual");
    closeStepInspector();
  }, [initialTemplateId]);

  useEffect(() => {
    if (!pendingTemplateName) return;
    const template = data.workflowTemplates.find((item) => item.name === pendingTemplateName);
    if (!template) return;
    setSelectedTemplateId(template.id);
    setPendingTemplateName(null);
    closeStepInspector();
  }, [data.workflowTemplates, pendingTemplateName]);

  useEffect(() => {
    if (!pendingRoleName || !selectedTemplateId) return;
    const role = data.roles.find((item) => item.name === pendingRoleName);
    if (!role) return;
    setTemplateRoleIds((items) => {
      const current = items[selectedTemplateId] ?? [];
      return {
        ...items,
        [selectedTemplateId]: current.includes(role.id) ? current : [...current, role.id],
      };
    });
    openRoleEditor(role);
    setPendingRoleName(null);
  }, [data.roles, pendingRoleName, selectedTemplateId]);

  // Selected step only drives canvas/minimap highlight. Editing happens in the double-click modal.
  const editingStep = editingStepId ? sortedSteps.find((step) => step.id === editingStepId) ?? null : null;
  const editingRole = editingRoleId ? data.roles.find((role) => role.id === editingRoleId) ?? null : null;
  const templateStatus = selectedTemplate?.status ?? (data.workflowTemplates[0]?.id === selectedTemplate?.id ? "enabled" : "draft");
  const templateEnabled = templateStatus === "enabled";
  const templateCanToggleStatus = Boolean(selectedTemplate && templateStatus !== "draft");
  const templateStatusText = templateEnabled ? "已启用" : templateStatus === "disabled" ? "已停用" : "草稿";
  const templateStatusColor = templateEnabled ? "green" : templateStatus === "disabled" ? "muted" : "blue";
  const boundRoles = useMemo(() => {
    const roleIds = selectedTemplate?.steps.map((step) => step.roleId).filter(Boolean) ?? [];
    const extraRoleIds = selectedTemplate ? templateRoleIds[selectedTemplate.id] ?? [] : [];
    const uniqueRoleIds = Array.from(new Set([...roleIds, ...extraRoleIds]));
    return uniqueRoleIds
      .map((roleId) => {
        const role = data.roles.find((item) => item.id === roleId);
        if (!role) return null;
        const boundSteps = selectedTemplate?.steps.filter((step) => step.roleId === roleId) ?? [];
        return { role, boundSteps };
      })
      .filter((item): item is { role: WorkbenchData["roles"][number]; boundSteps: NonNullable<typeof selectedTemplate>["steps"] } => Boolean(item));
  }, [data.roles, selectedTemplate, templateRoleIds]);
  const workflowTemplateCards = useMemo(
    () => [
      ...data.workflowTemplates.map((template, index) => ({
        id: template.id,
        name: template.name,
        steps: template.steps.length,
        desc:
          template.workflowMarkdown?.split("\n").find((line) => line.trim() && !line.startsWith("#")) ??
          template.steps.map((step) => step.name).slice(0, 5).join("、"),
        active: template.id === selectedTemplateId,
        status: template.status === "draft" ? "草稿" : "正式",
        statusColor: (template.status === "draft" ? "blue" : "green") as "green" | "blue" | "muted",
        dashed: false,
      })),
      {
        id: "blank-template",
        name: "自定义空白流程",
        steps: 0,
        desc: "自定义流程从零开始",
        active: false,
        status: "草稿",
        statusColor: "muted" as const,
        dashed: true,
      },
    ],
    [data.workflowTemplates, selectedTemplateId]
  );

  const createDefaultStep = (order: number): WorkflowStep => {
    const provider = data.modelProviders.find((item) => item.enabled) ?? data.modelProviders[0];
    return {
      id: `step-${Date.now()}`,
      order,
      name: "新增步骤",
      roleId: "",
      modelProviderId: provider?.id ?? "",
      modelName: provider?.defaultModel || provider?.models[0]?.name || "",
      inputs: [],
      outputs: [],
      gateMode: "auto",
      failureStrategy: "stop",
      projectOverride: false,
      runnerId: data.runnerProfiles?.find((runner) => runner.enabled)?.id,
    };
  };

  const handleCreateTemplate = () => {
    const templateName = `自定义流程 ${data.workflowTemplates.length + 1}`;
    setPendingTemplateName(templateName);
    addWorkflowTemplate({
      name: templateName,
      version: 1,
      status: "draft",
      steps: [],
      workflowMarkdown: `# ${templateName}\n\n自定义流程从零开始。`,
    });
  };

  const handleAddStep = (afterIndex?: number) => {
    if (!selectedTemplate || templateEnabled) return;
    const insertAt = typeof afterIndex === "number" ? afterIndex : sortedSteps.length - 1;
    const newOrder = insertAt >= 0 ? sortedSteps[insertAt]?.order + 0.5 : sortedSteps.length + 1;
    addWorkflowStep(selectedTemplate.id, createDefaultStep(newOrder || sortedSteps.length + 1));
  };

  const handleDeleteStep = (stepId: string) => {
    if (!selectedTemplate || templateEnabled) return;
    deleteWorkflowStep(selectedTemplate.id, stepId);
    closeStepInspector();
    setEditingStepId(null);
  };

  const handleDeleteTemplate = (templateId: string) => {
    const template = data.workflowTemplates.find((item) => item.id === templateId);
    const current = template?.status ?? (data.workflowTemplates[0]?.id === templateId ? "enabled" : "draft");
    if (current === "enabled") return;
    const nextTemplate = data.workflowTemplates.find((item) => item.id !== templateId);
    if (selectedTemplateId === templateId) {
      setSelectedTemplateId(nextTemplate?.id ?? "");
      closeStepInspector();
      setEditingStepId(null);
    }
    deleteWorkflowTemplate(templateId);
  };

  const handleAddRole = () => {
    if (!selectedTemplate || templateEnabled) return;
    const roleName = `自定义角色 ${data.roles.length + 1}`;
    setPendingRoleName(roleName);
    addRole?.({
      projectId: null,
      name: roleName,
      description: "待补充职责说明，可在步骤编辑中绑定使用。",
      roleMarkdown: `# ${roleName}\n\n待补充职责、输入输出和验收边界。`,
      isBuiltIn: false,
      defaultCapabilities: [],
    });
  };

  const openRoleEditor = (role: WorkbenchData["roles"][number]) => {
    setEditingRoleId(role.id);
    setRoleDraft({
      name: role.name,
      description: role.description ?? "",
      roleMarkdown: role.roleMarkdown ?? "",
    });
  };

  const handleSaveRole = () => {
    if (!editingRole || !roleDraft.name.trim() || templateEnabled) return;
    updateRole?.(editingRole.id, {
      name: roleDraft.name.trim(),
      description: roleDraft.description.trim(),
      roleMarkdown: roleDraft.roleMarkdown,
    });
    setEditingRoleId(null);
  };

  const handleRemoveRoleFromTemplate = (roleId: string) => {
    if (!selectedTemplate || templateEnabled) return;
    setTemplateRoleIds((items) => ({
      ...items,
      [selectedTemplate.id]: (items[selectedTemplate.id] ?? []).filter((id) => id !== roleId),
    }));
  };

  const handleToggleTemplateStatus = (templateId = selectedTemplate?.id) => {
    if (!templateId) return;
    const template = data.workflowTemplates.find((item) => item.id === templateId);
    if (!template) return;
    const current = template.status ?? (data.workflowTemplates[0]?.id === template.id ? "enabled" : "draft");
    updateWorkflowTemplate?.(template.id, { status: current === "enabled" ? "disabled" : "enabled" });
  };

  return (
    <div className="workflow-builder-v2">
      {/* ===== TOPBAR (52px) ===== */}
      <header className="wf-v2-topbar">
        <div className="wf-v2-topbar-left">
          <nav className="wf-v2-breadcrumb">
            <div className="wf-v2-mode-switch">
              <button className={`wf-v2-mode-btn${mode === "manual" ? " active" : ""}`} onClick={() => setMode("manual")}>
                <List size={14} /> 常规流程设计
              </button>
              <button className={`wf-v2-mode-btn${mode === "ai" ? " active" : ""}`} onClick={() => { setMode("ai"); closeStepInspector(); }}>
                <Sparkles size={14} /> AI 流程设计
              </button>
            </div>
          </nav>
          <span className="wf-v2-version-badge">
            <span className="wf-v2-version-dot" /> v1.3 · 草稿有变更
          </span>
        </div>
        <div className="wf-v2-topbar-right">
          {selectedTemplate && (
            <button
              className={`wf-v2-btn ${templateEnabled ? "wf-v2-btn-stop" : "wf-v2-btn-start"}`}
              type="button"
              onClick={() => handleToggleTemplateStatus()}
              disabled={!templateCanToggleStatus}
              title={templateCanToggleStatus ? (templateEnabled ? "停用当前正式流程" : "启用当前正式流程") : "草稿流程需要先保存为正式流程"}
            >
              {templateEnabled ? "停用流程" : "启用流程"}
            </button>
          )}
          {onBack && (
            <button className="wf-v2-back-btn" type="button" onClick={onBack}>
              <ArrowLeft size={14} />
              返回流程管理
            </button>
          )}
          <button className="wf-v2-btn">✓ 校验流程</button>
          <button className="wf-v2-btn wf-v2-btn-primary" disabled={mode === "manual" && templateEnabled}>保存流程</button>
          <button className="wf-v2-btn-icon">⋮</button>
        </div>
      </header>

      {/* ===== TITLE AREA ===== */}
      <div className="wf-v2-title-area">
        <div>
          <h1 className="wf-v2-title">{mode === "manual" ? "常规流程设计" : "AI 流程设计"}</h1>
          <p className="wf-v2-subtitle">{mode === "manual" ? "手动维护成熟流程模板，绑定角色、执行器、模型和能力授权" : "AI 解析需求，生成草案及建议"}</p>
        </div>
        <div className="wf-v2-version-info">
          <span>当前版本 v1.3</span>
          {selectedTemplate && mode === "manual" && <span className={`wf-v2-status-badge ${templateStatusColor}`}>{templateStatusText}</span>}
          <span><span className="wf-v2-status-dot orange" /> 草稿有变更</span>
        </div>
      </div>

      {/* ===== MANUAL MODE: Three-Column Workspace ===== */}
      {mode === "manual" && (
      <div className="wf-v2-workspace">
        {/* LEFT PANEL: 模板与角色 */}
        <aside className="wf-v2-left">
          <div className="wf-v2-panel" style={{ flex: 1 }}>
            <div className="wf-v2-panel-header">
              <h2>模板与角色</h2>
            </div>
            <div className="wf-v2-scroll">
              <div className="wf-v2-section-row">
                <h3 className="wf-v2-section-title">流程模板</h3>
                <button className="wf-v2-btn wf-v2-btn-xs" onClick={handleCreateTemplate} type="button">
                  <Plus size={12} /> 新增
                </button>
              </div>
              {workflowTemplateCards.map((t) => (
                <div
                  key={t.id}
                  className={`wf-v2-template-card${t.active ? " active" : ""}${t.dashed ? " dashed" : ""}`}
                  onClick={() => {
                    if (t.id !== "blank-template") {
                      setSelectedTemplateId(t.id);
                      closeStepInspector();
                    }
                  }}
                  onKeyDown={(event) => {
                    if ((event.key === "Enter" || event.key === " ") && t.id !== "blank-template") {
                      setSelectedTemplateId(t.id);
                      closeStepInspector();
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="wf-v2-template-card-header">
                    <span>{t.name}</span>
                    <div className="wf-v2-template-card-actions">
                      {!t.dashed && (
                        <>
                          <span
                            className={`wf-v2-template-status-badge ${t.statusColor}`}
                            aria-label={`流程模板状态 ${t.status}`}
                          >
                            {t.status}
                          </span>
                          <button
                            className="wf-v2-template-delete"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDeleteTemplate(t.id);
                            }}
                            title="删除流程模板"
                            aria-label={`删除流程模板 ${t.name}`}
                            disabled={t.status !== "草稿"}
                            type="button"
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <p>{t.steps} 个步骤</p>
                  <p>{t.desc}</p>
                </div>
              ))}

              <div className="wf-v2-section-row" style={{ marginTop: 8 }}>
                <h3 className="wf-v2-section-title" style={{ margin: 0 }}>项目角色池</h3>
                <button className="wf-v2-btn wf-v2-btn-xs" onClick={handleAddRole} disabled={!selectedTemplate || templateEnabled} type="button">
                  <Plus size={12} /> 新增
                </button>
              </div>
              {boundRoles.map(({ role, boundSteps }, i) => {
                const initials = role.name.slice(0, 2).toUpperCase();
                const canRemove = !role.isBuiltIn && boundSteps.length === 0;
                return (
                  <div key={role.id} className="wf-v2-role-card">
                    <div className="wf-v2-role-avatar" style={{ background: i === 0 ? "#263451" : i === 1 ? "#2d2746" : "#1d3a2e", color: i === 0 ? "#bdd0ff" : i === 1 ? "#d0bfff" : "#b0e8c8" }}>
                      {initials}
                    </div>
                    <div className="wf-v2-role-content">
                      <div className="wf-v2-role-headline">
                        <strong style={{ fontSize: 13, color: "#e6edf3" }}>{role.name}</strong>
                        <span className="wf-v2-role-actions">
                          <button
                            className="wf-v2-role-edit"
                            onClick={() => openRoleEditor(role)}
                            title={templateEnabled ? "启用状态只能查看，停用后可编辑" : "编辑角色"}
                            aria-label={`编辑角色 ${role.name}`}
                            type="button"
                          >
                            {templateEnabled ? "查看" : "编辑"}
                          </button>
                          {canRemove && (
                            <button
                              className="wf-v2-role-delete"
                              onClick={() => handleRemoveRoleFromTemplate(role.id)}
                              title="删除角色"
                              aria-label={`删除角色 ${role.name}`}
                              disabled={templateEnabled}
                              type="button"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </span>
                      </div>
                      <p style={{ fontSize: 11, color: "#8b949e", margin: "2px 0 0" }}>{role.description ?? "—"}</p>
                      <div className="wf-v2-role-bindings">
                        {boundSteps.map((step) => (
                          <span key={step.id}>{String(step.order).padStart(2, "0")} {step.name}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* CENTER CANVAS */}
        <div className="wf-v2-center">
          <div className="wf-v2-panel wf-v2-canvas">
            <div className="wf-v2-canvas-toolbar">
              <div>
                <h2>流程画布</h2>
                <p>拖拽步骤卡片进行排序，点击节点进行配置</p>
              </div>
              <div className="wf-v2-canvas-toolbar-actions">
                <div className="awd-canvas-zoom-ctrl" style={{ position: "static" }}>
                  <button className="awd-zoom-btn" title="缩小">−</button><span className="awd-zoom-pct">100%</span><button className="awd-zoom-btn" title="放大">+</button><button className="awd-zoom-btn" title="适应画布">⊞</button>
                  <span className="awd-toolbar-sep" />
                  <button
                    className="awd-zoom-btn"
                    style={{ width: "auto", padding: "0 8px", gap: 4 }}
                    onClick={() => handleAddStep()}
                    disabled={templateEnabled}
                    type="button"
                  >
                    <Plus size={12} /> 新增步骤
                  </button>
                  <button className="awd-zoom-btn" style={{width:"auto",padding:"0 8px",gap:4}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h7"/></svg>对齐</button>
                  <button className="awd-zoom-btn" style={{width:"auto",padding:"0 8px",gap:4}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>版本管理</button>
                </div>
              </div>
            </div>
            <div className="wf-v2-canvas-area">
                {selectedTemplate ? (
                  <>
                    <div className="wf-v2-node-track">
                      {sortedSteps.map((step, i) => {
                        const role = data.roles.find(r => r.id === step.roleId) ?? null;
                        const runnerProfile = data.runnerProfiles?.find(r => r.id === step.runnerId) ?? null;
                        const isActive = i === 2;
                        return (
                          <React.Fragment key={step.id}>
                            {i > 0 && (
                              <span className="wf-v2-node-arrow">
                                <ArrowRight size={16} />
                              </span>
                            )}
                            <div
                              className={`wf-v2-node${isActive ? " active" : ""}${selectedStepIndex === i ? " selected" : ""}`}
                              onClick={() => setSelectedStepIndex(i)}
                              onDoubleClick={() => setEditingStepId(step.id)}
                              style={{ cursor: "pointer" }}
                            >
                              <button
                                className="wf-v2-node-delete"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleDeleteStep(step.id);
                                }}
                                title="删除步骤"
                                aria-label={`删除步骤 ${step.name}`}
                                disabled={templateEnabled}
                                type="button"
                              >
                                <Trash2 size={12} />
                              </button>
                              <div className="wf-v2-node-badge">{String(i + 1).padStart(2, "0")}</div>
                              <h3>{step.name}</h3>
                              <div className="wf-v2-node-details">
                                <div>
                                  <label>角色</label>
                                  <span>{role?.name ?? "—"}</span>
                                </div>
                                <div>
                                  <label>Runner</label>
                                  <span>{runnerProfile?.displayName || data.runnerProfiles?.[i % (data.runnerProfiles?.length || 1)]?.displayName || "—"}</span>
                                </div>
                                <div>
                                  <label>模型</label>
                                  <span>{step.modelName || "—"}</span>
                                </div>
                              </div>
                            </div>
                            <button
                              className="wf-v2-insert-step"
                              onClick={() => handleAddStep(i)}
                              title="在此后新增步骤"
                              disabled={templateEnabled}
                              type="button"
                            >
                              <Plus size={12} />
                            </button>
                          </React.Fragment>
                        );
                      })}
                    </div>
                    <div className="wf-v2-minimap" aria-label="流程缩略图">
                      <div className="wf-v2-minimap-title">缩略图</div>
                      <div className="wf-v2-minimap-track">
                        {sortedSteps.map((step, i) => (
                          <button
                            key={step.id}
                            type="button"
                            title={step.name}
                            className={`wf-v2-minimap-node${selectedStepIndex === i ? " active" : ""}`}
                            onClick={() => setSelectedStepIndex(i)}
                          />
                        ))}
                      </div>
                      <div className="wf-v2-minimap-window" />
                    </div>
                  </>
                ) : (
                  <div className="wf-v2-canvas-empty">
                    <div className="wf-v2-empty-icon">
                      <List size={48} />
                    </div>
                    <h3>请选择一个流程模板</h3>
                    <p>从左侧模板列表中选择一个流程模板开始设计</p>
                  </div>
                )}
            </div>
          </div>
        </div>

      </div>
      )}

      {/* ===== AI MODE: AI Workflow Design Panels ===== */}
      {mode === "ai" && (
        <AiWorkflowDesignInline data={data} />
      )}

      {editingStep && selectedTemplate && (
        <StepEditModal
          step={editingStep}
          template={selectedTemplate}
          data={data}
          availableRoles={boundRoles.map(({ role }) => role)}
          readOnly={templateEnabled}
          onSave={(updates) => {
            updateWorkflowStep(selectedTemplate.id, editingStep.id, updates);
            setEditingStepId(null);
          }}
          onDelete={(stepId) => handleDeleteStep(stepId)}
          onClose={() => setEditingStepId(null)}
        />
      )}

      {editingRole && (
        <div className="wf-role-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="wf-role-modal-title">
          <div className="wf-role-modal">
            <div className="wf-role-modal-header">
              <div>
                <h2 id="wf-role-modal-title">编辑角色</h2>
                <p>{editingRole.isBuiltIn ? "系统角色，可调整显示名称与职责说明。" : "自定义角色，保存后会同步到当前流程角色池。"}</p>
              </div>
              <button className="wf-role-modal-close" type="button" onClick={() => setEditingRoleId(null)} aria-label="关闭角色编辑">
                ×
              </button>
            </div>
            <div className="wf-role-modal-body">
              <label className="wf-role-field">
                <span>角色名称</span>
                <input
                  value={roleDraft.name}
                  onChange={(event) => setRoleDraft((draft) => ({ ...draft, name: event.target.value }))}
                  placeholder="例如：测试工程师"
                  disabled={templateEnabled}
                />
              </label>
              <label className="wf-role-field">
                <span>职责说明</span>
                <textarea
                  value={roleDraft.description}
                  onChange={(event) => setRoleDraft((draft) => ({ ...draft, description: event.target.value }))}
                  rows={3}
                  placeholder="描述这个角色负责的输入、输出和边界"
                  disabled={templateEnabled}
                />
              </label>
              <label className="wf-role-field">
                <span>角色提示词 / Markdown</span>
                <textarea
                  value={roleDraft.roleMarkdown}
                  onChange={(event) => setRoleDraft((draft) => ({ ...draft, roleMarkdown: event.target.value }))}
                  rows={7}
                  placeholder="# 角色说明"
                  disabled={templateEnabled}
                />
              </label>
            </div>
            <div className="wf-role-modal-footer">
              <button className="wf-v2-btn" type="button" onClick={() => setEditingRoleId(null)}>
                取消
              </button>
              <button className="wf-v2-btn wf-v2-btn-primary" type="button" onClick={handleSaveRole} disabled={!roleDraft.name.trim() || templateEnabled}>
                保存角色
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
