import { useState, useEffect, useCallback, useRef } from "react";
import {
  MessageSquare,
  FileText,
  History,
  Sparkles,
  Loader2,
  Check,
  ArrowLeft,
  Edit3,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  Paperclip,
  Play,
  Save,
  Send,
} from "lucide-react";
import type { WorkbenchData, WorkflowStep } from "../domain/workbench";
import { useWorkbenchState } from "../App";
import { projectApi } from "../services/api/projectApi";
import { useWorkbenchDispatch } from "../state/WorkbenchProvider";
import { addProject as addProjectAction, addWorkflowTemplate as addWorkflowTemplateAction } from "../state/workbenchActions";

interface AiProjectBriefingProps {
  data: WorkbenchData;
  onBack: () => void;
}

type BriefingStep = "input" | "parsing" | "clarify" | "draft" | "confirm";

interface DraftData {
  productBrief: string;
  pages: string[];
  roles: { name: string; description: string }[];
  workflow: string[];
  tasks: { title: string; priority: string; description: string }[];
  projectPlan: string[];
}

interface ClarifyQuestion {
  id: string;
  question: string;
  answer: string;
}

const PROGRESS_STAGES = [
  "理解需求...",
  "分析产品形态...",
  "拆解功能模块...",
  "生成项目草案...",
];

type AiFlowRoleBinding = {
  step: string;
  role: string;
  runner: string;
  model: string;
};

const AI_FLOW_ROLE_BINDINGS: AiFlowRoleBinding[] = [
  { step: "需求分析", role: "产品经理", runner: "Claude Code CLI", model: "deepseek-v4-pro" },
  { step: "UI/UX 设计", role: "UI/UX 设计师", runner: "Codex CLI", model: "gpt-5.3-codex" },
  { step: "前端开发", role: "前端工程师", runner: "Cursor CLI", model: "gpt-5.3-codex" },
  { step: "代码审查", role: "代码审查员", runner: "Gemini CLI", model: "gemini-pro" },
  { step: "测试验证", role: "测试工程师", runner: "Claude Code CLI", model: "deepseek-v4-pro" },
];

function generateDraftFromInput(input: string): DraftData {
  const topic = input.length > 50 ? input.slice(0, 50) + "..." : input;

  const productBrief = `基于你的描述"${topic}"，这是一个面向用户的管理与协作平台。核心目标是提供直观的项目管理、任务追踪和团队协作能力，支持多角色协同工作。`;

  const pages = [
    "工作台首页 - 概览仪表盘，关键指标和快速入口",
    "项目管理 - 项目列表、创建、导入",
    "任务看板 - 看板视图的任务追踪",
    "团队管理 - 成员与角色配置",
    "设置 - 个人和系统配置",
  ];

  const roles = [
    { name: "产品经理", description: "负责需求定义和产品方向" },
    { name: "设计师", description: "负责界面设计和交互体验" },
    { name: "前端开发", description: "负责客户端界面开发" },
    { name: "后端开发", description: "负责服务端API和数据层" },
    { name: "测试工程师", description: "负责质量保证和测试用例" },
  ];

  const workflow = [
    "第一步：需求分析 - 产品经理收集并整理需求，产出PRD文档",
    "第二步：设计评审 - 设计师产出交互稿，团队评审确认",
    "第三步：开发实现 - 前后端并行开发，每日站会同步进度",
    "第四步：测试验证 - QA进行功能测试和回归测试",
    "第五步：发布上线 - 通过Gate审批后发布到生产环境",
  ];

  const tasks = [
    { title: "项目初始化与脚手架搭建", priority: "P0", description: "搭建前端React项目和后端服务项目的基础框架" },
    { title: "用户认证模块", priority: "P0", description: "实现登录、注册和权限验证功能" },
    { title: "项目管理CRUD接口", priority: "P0", description: "实现项目的创建、读取、更新、删除API" },
    { title: "工作台首页仪表盘", priority: "P1", description: "开发首页概览面板，展示关键指标" },
    { title: "任务看板页面", priority: "P1", description: "实现看板视图的任务管理和拖拽操作" },
    { title: "团队与角色管理", priority: "P2", description: "团队成员邀请、角色分配和权限配置" },
    { title: "项目设置页", priority: "P2", description: "个人设置和系统配置页面" },
    { title: "CI/CD流水线集成", priority: "P3", description: "集成GitHub Actions或Jenkins自动化构建部署" },
  ];

  const projectPlan = [
    "第1周：项目初始化、技术选型、基础架构搭建",
    "第2-3周：核心功能开发（认证、项目管理、任务系统）",
    "第4周：工作台仪表盘、看板视图",
    "第5-6周：团队管理、设置页面、集成测试",
    "第7周：性能优化、安全审计、部署上线",
  ];

  return { productBrief, pages, roles, workflow, tasks, projectPlan };
}

export function AiProjectBriefing({ data: _data, onBack }: AiProjectBriefingProps) {
  const { addProject, addWorkflowTemplate } = useWorkbenchState();
  const [step, setStep] = useState<BriefingStep>("input");
  const [composerInput, setComposerInput] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]); // file names for display
  const [progressStage, setProgressStage] = useState(0);
  const [parsingError, setParsingError] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftData | null>(null);
  const [questions, setQuestions] = useState<ClarifyQuestion[]>([]);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [creating, setCreating] = useState(false);
  const [analysisStarted, setAnalysisStarted] = useState(false);
  const [materialsExpanded, setMaterialsExpanded] = useState(false);
  const [flowInserted, setFlowInserted] = useState(false);
  const [flowBindings, setFlowBindings] = useState<AiFlowRoleBinding[]>(() => AI_FLOW_ROLE_BINDINGS.map((item) => ({ ...item })));
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const materialFileInputRef = useRef<HTMLInputElement | null>(null);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, []);

  // Start AI parsing
  const handleStartAnalysis = useCallback(() => {
    if (!composerInput.trim()) return;
    setStep("parsing");
    setParsingError(null);
    setProgressStage(0);

    let stage = 0;
    progressTimerRef.current = setInterval(() => {
      stage++;
      if (stage < PROGRESS_STAGES.length) {
        setProgressStage(stage);
      } else {
        if (progressTimerRef.current) clearInterval(progressTimerRef.current);
        // Simulate parsing completion - generate draft and questions
        setTimeout(() => {
          setDraft(generateDraftFromInput(composerInput));
          setQuestions([
            { id: "q1", question: "这个产品的主要目标用户是谁？比如：企业管理员、普通员工、外部客户？", answer: "" },
            { id: "q2", question: "是否有需要对接的第三方系统或已有数据源？", answer: "" },
            { id: "q3", question: "你期望的交付时间线是怎样的？", answer: "" },
          ]);
          setStep("clarify");
        }, 400);
      }
    }, 500);
  }, [composerInput]);

  // Retry parsing
  const handleRetry = useCallback(() => {
    handleStartAnalysis();
  }, [handleStartAnalysis]);

  // Move from clarify to draft
  const handleConfirmClarify = useCallback(() => {
    setStep("draft");
  }, []);

  // Edit a section
  const handleStartEdit = useCallback((sectionId: string, currentContent: string) => {
    setEditingSection(sectionId);
    setEditText(currentContent);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!draft || !editingSection) return;

    setDraft((prev) => {
      if (!prev) return prev;
      const next = { ...prev };

      if (editingSection === "productBrief") {
        next.productBrief = editText;
      } else if (editingSection === "pages") {
        next.pages = editText.split("\n").filter((l) => l.trim());
      } else if (editingSection.startsWith("role-")) {
        const idx = parseInt(editingSection.replace("role-", ""), 10);
        const newRoles = [...next.roles];
        if (newRoles[idx]) {
          newRoles[idx] = { ...newRoles[idx], description: editText };
          next.roles = newRoles;
        }
      } else if (editingSection.startsWith("workflow-")) {
        const idx = parseInt(editingSection.replace("workflow-", ""), 10);
        const newWf = [...next.workflow];
        if (newWf[idx]) {
          newWf[idx] = editText;
          next.workflow = newWf;
        }
      } else if (editingSection.startsWith("task-")) {
        const idx = parseInt(editingSection.replace("task-", ""), 10);
        const newTasks = [...next.tasks];
        if (newTasks[idx]) {
          newTasks[idx] = { ...newTasks[idx], description: editText };
          next.tasks = newTasks;
        }
      } else if (editingSection.startsWith("plan-")) {
        const idx = parseInt(editingSection.replace("plan-", ""), 10);
        const newPlan = [...next.projectPlan];
        if (newPlan[idx]) {
          newPlan[idx] = editText;
          next.projectPlan = newPlan;
        }
      }

      return next;
    });

    setEditingSection(null);
  }, [draft, editingSection, editText]);

  // Go to confirm step
  const handleGoToConfirm = useCallback(() => {
    setStep("confirm");
  }, []);

  const persistFlowTemplate = useCallback(() => {
    if (!analysisStarted || flowInserted) return;

    const provider = _data.modelProviders.find((item) => item.enabled) ?? _data.modelProviders[0];
    const runner = _data.runnerProfiles.find((item) => item.enabled) ?? _data.runnerProfiles[0];
    const now = new Date().toISOString();
    const steps: WorkflowStep[] = flowBindings.map((binding, index) => {
      const role =
        _data.roles.find((item) => item.name === binding.role) ??
        _data.roles.find((item) => binding.role.includes(item.name) || item.name.includes(binding.role)) ??
        _data.roles[index % Math.max(_data.roles.length, 1)];

      return {
        id: `ai-briefing-step-${index + 1}`,
        order: index + 1,
        name: binding.step,
        roleId: role?.id ?? "",
        modelProviderId: provider?.id ?? "",
        modelName: binding.model || provider?.models?.[0]?.name || "",
        inputs: index === 0 ? ["讨论上下文", "协同资料"] : ["上一步输出"],
        outputs: index === flowBindings.length - 1 ? ["验收报告", "创建前确认"] : [`${binding.step}输出`],
        gateMode: "manual",
        failureStrategy: "stop",
        stepMarkdown: [
          `# ${binding.step}`,
          "",
          `绑定角色：${binding.role}`,
          `Runner：${binding.runner}`,
          `模型：${binding.model}`,
        ].join("\n"),
        projectOverride: false,
        runnerId: runner?.id,
      };
    });

    addWorkflowTemplate({
      name: "AI 建项生成流程",
      version: 1,
      steps,
      workflowMarkdown: [
        "# AI 建项生成流程",
        "由 AI 建项助手根据讨论、资料和协同文件生成，已包含用户确认后的流程步骤与角色绑定。",
        "",
        ...flowBindings.map((binding, index) => `${index + 1}. ${binding.step} - ${binding.role}`),
      ].join("\n"),
      versions: [
        {
          label: "draft",
          version: 1,
          updatedAt: now,
          changedSteps: steps.map((item) => item.id),
        },
      ],
    });
    setFlowInserted(true);
  }, [analysisStarted, flowInserted, flowBindings, addWorkflowTemplate, _data.modelProviders, _data.roles, _data.runnerProfiles]);

  // Final confirmation - create project
  const handleCreateProject = useCallback(() => {
    if (!draft) return;
    persistFlowTemplate();
    setCreating(true);
    setTimeout(() => {
      addProject({
        name: "AI 建项 - " + new Date().toLocaleDateString("zh-CN"),
        repoPath: "",
        defaultBranch: "main",
        worktreeRoot: ".claude/worktrees",
        scope: "personal",
        desktopIntegrationStatus: "deferred",
        permissions: { permissionLevel: "owner" },
        settings: {
          installCommand: "npm install",
          testCommand: "npm test",
          buildCommand: "npm run build",
          previewCommand: "npm run dev",
          detectedStack: "Unknown",
          riskSummary: "AI建项项目",
          projectDescription: draft.productBrief,
        },
        workflowTemplateId: _data.workflowTemplates[0]?.id ?? "",
        sourceType: "ai-briefing",
        phase: "planning",
        projectMarkdown: [
          `# 产品方案`,
          draft.productBrief,
          "",
          `# 页面结构`,
          ...draft.pages.map((p: string) => `- ${p}`),
          "",
          `# 建议角色`,
          ...draft.roles.map((r: { name: string; description: string }) => `- **${r.name}**: ${r.description}`),
          "",
          `# 工作流建议`,
          ...draft.workflow.map((w: string) => `1. ${w}`),
          "",
          `# 项目计划`,
          ...draft.projectPlan.map((p: string) => `- ${p}`),
        ].join("\n"),
      });
      setCreating(false);
      onBack();
    }, 800);
  }, [draft, persistFlowTemplate, addProject, _data, onBack]);

  // Mock handlers for attachment strip
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) {
      setAttachments((prev) => {
        const next = [...prev];
        files.forEach((file) => {
          if (!next.includes(file.name)) next.push(file.name);
        });
        return next;
      });
      setComposerInput((prev) => {
        const fileNotes = files.map((file) => `[已读取文件: ${file.name}]`).join("\n");
        return prev.trim() ? `${prev}\n${fileNotes}` : fileNotes;
      });
      setMaterialsExpanded(true);
      e.target.value = "";
    }
  }, []);

  const handleAttachSession = useCallback(() => {
    if (!composerInput.includes("当前会话上下文已加载")) {
      setComposerInput((prev) => "当前会话上下文已加载\n---\n" + prev);
    }
  }, [composerInput]);

  const handleAttachCollabFiles = useCallback(() => {
    const mockFiles = ["project-overview.md", "team-roles.md", "workflow-spec.md"];
    setAttachments((prev) => {
      const newFiles = mockFiles.filter((f) => !prev.includes(f));
      return [...prev, ...newFiles];
    });
  }, []);

  const handleAddMaterial = useCallback(() => {
    materialFileInputRef.current?.click();
  }, []);

  const handleV2StartAnalysis = useCallback(() => {
    const source = composerInput.trim() || "企业知识平台，包含文档管理、全文检索、权限控制和知识共享。";
    setComposerInput(source);
    setDraft(generateDraftFromInput(source));
    setFlowBindings(AI_FLOW_ROLE_BINDINGS.map((item) => ({ ...item })));
    setAnalysisStarted(true);
    setFlowInserted(false);
    setStep("draft");
  }, [composerInput]);

  const handleInsertWorkflowTemplate = useCallback(() => {
    persistFlowTemplate();
  }, [persistFlowTemplate]);

  const handleUpdateFlowBinding = useCallback((index: number, updates: Partial<AiFlowRoleBinding>) => {
    setFlowBindings((prev) => prev.map((binding, currentIndex) => (
      currentIndex === index ? { ...binding, ...updates } : binding
    )));
    setFlowInserted(false);
  }, []);

  return (
    <div className="briefing-page briefing-v2-page">
      <div className="briefing-v2-header">
        <div className="briefing-v2-title">
          <button className="briefing-v2-back-btn" type="button" onClick={onBack} aria-label="返回项目管理">
            <ArrowLeft size={16} />
          </button>
          <span className="briefing-v2-title-icon"><Sparkles size={20} /></span>
          <div>
            <h1>AI 建项助手</h1>
            <p>从讨论、资料和协同文件中生成可确认的项目计划。</p>
          </div>
        </div>
        <div className="briefing-v2-header-actions">
          <span className="briefing-v2-chip primary">已收集 {attachments.length + 1} 条上下文 · {analysisStarted ? "草案已生成" : "未开始分析"}</span>
          <button className="briefing-v2-btn" type="button"><Save size={14} />保存草案</button>
        </div>
      </div>

      <div className="briefing-v2-workspace">
        <section className="briefing-v2-panel briefing-v2-discussion">
          <div className="briefing-v2-panel-head">
            <div>
              <h2>讨论区</h2>
              <p>原始输入与资料收集</p>
            </div>
            <span className="briefing-v2-chip ok">上下文池 {attachments.length + 1} 项</span>
          </div>

          <div className="briefing-v2-panel-body">
            <div className="briefing-v2-chat">
              <div className="briefing-v2-bubble user">
                我们要做一个企业内部知识平台，包含文档管理、全文检索、权限控制和知识共享。
              </div>
              <div className="briefing-v2-bubble ai">
                收到。我会先把目标、范围、角色、流程、风险和待确认问题整理成草案，确认前不会创建正式项目。
              </div>
            </div>

            <div className="briefing-v2-materials">
              <button className="briefing-v2-materials-head" type="button" aria-label={materialsExpanded ? "收起资料列表" : "展开资料列表"} onClick={() => setMaterialsExpanded(!materialsExpanded)}>
                <span>已添加资料 {attachments.length + 1} 项</span>
                <span>{materialsExpanded ? "收起" : "展开"}</span>
              </button>
              {materialsExpanded && (
                <div className="briefing-v2-file-list">
                  <div className="briefing-v2-file-row"><FileText size={13} /><span>当前讨论</span><small>chat_context</small></div>
                  {attachments.map((name) => (
                    <div key={name} className="briefing-v2-file-row"><FileText size={13} /><span>{name}</span><small>material</small></div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="briefing-v2-composer">
            <input
              ref={materialFileInputRef}
              type="file"
              multiple
              accept=".md,.txt,.json,.pdf,.doc,.docx"
              style={{ display: "none" }}
              onChange={handleFileUpload}
            />
            <div className="briefing-v2-materials">
              <button className="briefing-v2-materials-head" type="button" aria-label={materialsExpanded ? "收起资料列表" : "展开资料列表"} onClick={() => setMaterialsExpanded(!materialsExpanded)}>
                <span>已添加资料 {attachments.length + 1} 项</span>
                <span>{materialsExpanded ? "收起" : "展开"}</span>
              </button>
              {materialsExpanded && (
                <div className="briefing-v2-file-list">
                  <div className="briefing-v2-file-row"><FileText size={13} /><span>当前讨论</span><small>chat_context</small></div>
                  {attachments.map((name) => (
                    <div key={name} className="briefing-v2-file-row"><FileText size={13} /><span>{name}</span><small>material</small></div>
                  ))}
                </div>
              )}
            </div>
            <textarea
              className="briefing-v2-textarea"
              placeholder="继续描述项目想法、粘贴资料或提出约束..."
              value={composerInput}
              onChange={(e) => setComposerInput(e.target.value)}
              rows={4}
            />
            <div className="briefing-v2-send-line">
              <div className="briefing-v2-compose-actions">
                <button className="briefing-v2-btn" type="button" onClick={handleAddMaterial}><Paperclip size={14} />添加资料</button>
                <span>{composerInput.length} 字</span>
              </div>
              <button className="briefing-v2-btn primary" type="button" onClick={handleV2StartAnalysis}>
                发送<Send size={14} />
              </button>
            </div>
          </div>
        </section>

        <section className="briefing-v2-panel briefing-v2-analysis">
          <div className="briefing-v2-panel-head">
            <div>
              <h2>AI 分析区</h2>
              <p>从讨论和资料中提炼关键判断</p>
            </div>
          </div>
          <div className="briefing-v2-panel-body">
            <div className="briefing-v2-analysis-hero">
              <button className="briefing-v2-btn primary" type="button" onClick={handleV2StartAnalysis}>
                <Play size={14} />开始分析
              </button>
              <span>只生成草案，不创建项目</span>
            </div>
            <div className="briefing-v2-steps">
              {["收集上下文", "提取目标", "识别角色", "拆解流程", "生成草案"].map((item, index) => (
                <div key={item} className={`briefing-v2-step ${analysisStarted || index === 0 ? "active" : ""}`}>
                  <strong>{String(index + 1).padStart(2, "0")}</strong>
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div className="briefing-v2-analysis-grid">
              {[
                ["项目目标识别", "提炼项目核心目标、成功指标和 MVP 边界。"],
                ["范围边界", "识别包含与排除的功能范围。"],
                ["关键需求", "提取功能性与非功能性需求。"],
                ["角色候选", "识别项目所需角色与职责分工。"],
                ["流程候选", "生成端到端流程候选方案。"],
                ["风险与假设", "识别潜在风险、依赖与关键假设。"],
                ["缺失信息", "列出需要补充的输入和上下文。"],
                ["待确认问题", "生成需要用户确认的问题列表。"],
              ].map(([title, desc]) => (
                <div key={title} className={`briefing-v2-card ${analysisStarted ? "ready" : ""}`}>
                  <div><h3>{title}</h3><span>{analysisStarted ? "已分析" : "待分析"}</span></div>
                  <p>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="briefing-v2-panel briefing-v2-output">
          <div className="briefing-v2-panel-head">
            <div>
              <h2>输出结果区</h2>
              <p>分析完成后生成正式创建前草案</p>
            </div>
          </div>
          <div className="briefing-v2-panel-body">
            <div className="briefing-v2-output-status">
              <span className="briefing-v2-chip">{analysisStarted ? "草案已生成，等待确认" : "等待分析结果"}</span>
              <div className="briefing-v2-progress"><span style={{ width: analysisStarted ? "100%" : "0%" }} /></div>
            </div>
            <div className={`briefing-v2-draft-card ${analysisStarted ? "ready" : ""}`}>
              <h3>项目草案</h3>
              <p>{analysisStarted ? "企业知识平台 MVP" : "项目名称、目标摘要将在分析后生成。"}</p>
            </div>
            <div className={`briefing-v2-draft-card ${analysisStarted ? "ready" : ""}`}>
              <h3>建议角色</h3>
              <div className="briefing-v2-chip-list">
                {["产品经理", "UI/UX 设计师", "前端工程师", "代码审查员", "测试工程师"].map((role) => <span key={role}>{role}</span>)}
              </div>
            </div>
            <div className={`briefing-v2-draft-card ${analysisStarted ? "ready" : ""}`}>
              <div className="briefing-v2-draft-head">
                <h3>流程绑定角色</h3>
                <span>{flowInserted ? "已入库" : analysisStarted ? "可编辑，确认后入库" : "待分析"}</span>
              </div>
              <div className="briefing-v2-flow-binding-list">
                {flowBindings.map((binding, index) => (
                  <div className="briefing-v2-flow-binding-row" key={binding.step}>
                    <strong>{String(index + 1).padStart(2, "0")}</strong>
                    <span>{binding.step}</span>
                    <select
                      aria-label={`${binding.step} 绑定角色`}
                      value={binding.role}
                      onChange={(event) => handleUpdateFlowBinding(index, { role: event.target.value })}
                    >
                      {_data.roles.map((role) => (
                        <option key={role.id} value={role.name}>{role.name}</option>
                      ))}
                    </select>
                    <input
                      aria-label={`${binding.step} Runner`}
                      value={binding.runner}
                      onChange={(event) => handleUpdateFlowBinding(index, { runner: event.target.value })}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className={`briefing-v2-draft-card ${analysisStarted ? "ready" : ""}`}>
              <h3>任务计划</h3>
              <div className="briefing-v2-mini-table">
                <div><strong>P0</strong><span>核心功能开发与基础能力建设</span></div>
                <div><strong>P1</strong><span>集成与完善，权限与安全增强</span></div>
                <div><strong>P2</strong><span>体验优化，文档与运营准备</span></div>
              </div>
            </div>
            <div className={`briefing-v2-draft-card ${analysisStarted ? "ready" : ""}`}>
              <h3>风险与验收</h3>
              <div className="briefing-v2-chip-list warn">
                <span>LDAP / SSO 集成不稳定</span>
                <span>数据迁移复杂度高</span>
              </div>
            </div>
          </div>
          <div className="briefing-v2-action-bar">
            <button className="briefing-v2-btn" type="button" disabled={!analysisStarted}>查看计划差异</button>
            <button className="briefing-v2-btn primary" type="button" disabled={!analysisStarted || creating} onClick={handleCreateProject}>
              {creating ? <><Loader2 size={14} className="spin" />创建中...</> : <><Check size={14} />确认创建项目</>}
            </button>
          </div>
        </section>
      </div>
    </div>
  );

  // ---- Step: Input ----
  if (step === "input") {
    return (
      <div className="briefing-page">
        <header className="briefing-header">
          <button className="btn btn-sm" onClick={onBack} type="button">
            <ArrowLeft size={14} />
            返回
          </button>
          <div className="briefing-header-center">
            <Sparkles size={20} color="var(--accent)" />
            <h1>AI 建项助手</h1>
          </div>
          <div />
        </header>

        <div className="briefing-content">
          <div className="briefing-composer">
            <div className="briefing-composer-header">
              <Sparkles size={18} />
              <h2>AI 建项助手</h2>
            </div>
            <p className="briefing-composer-desc">和 AI 讨论项目，或上传/粘贴已有资料，自动整理为可执行项目计划。</p>

            {/* Unified input area */}
            <textarea
              className="briefing-composer-input"
              placeholder="描述你的项目想法，或粘贴已有文档内容..."
              value={composerInput}
              onChange={(e) => setComposerInput(e.target.value)}
              rows={6}
            />

            {/* Attachment strip */}
            <div className="briefing-attachment-strip">
              <label className="briefing-attach-btn" title="上传文档 (.md)">
                <Paperclip size={14} />
                上传文档
                <input
                  type="file"
                  accept=".md"
                  style={{ display: "none" }}
                  onChange={handleFileUpload}
                />
              </label>
              <button className="briefing-attach-btn" onClick={handleAttachSession} title="引用当前会话" type="button">
                <History size={14} />
                引用当前会话
              </button>
              <button className="briefing-attach-btn" onClick={handleAttachCollabFiles} title="读取协同文件" type="button">
                <FileText size={14} />
                读取协同文件
              </button>
            </div>

            {/* Attachment list display */}
            {attachments.length > 0 && (
              <div className="briefing-attachment-list">
                {attachments.map((name, i) => (
                  <span key={i} className="briefing-attachment-tag">
                    <FileText size={12} />
                    {name}
                  </span>
                ))}
              </div>
            )}

            <div className="briefing-input-footer">
              <span className="briefing-char-count">{composerInput.length} 字</span>
              <button
                className="btn primary"
                onClick={handleStartAnalysis}
                disabled={!composerInput.trim()}
                type="button"
              >
                <Sparkles size={16} />
                开始分析
              </button>
            </div>
          </div>

          {/* Tips */}
          <div className="briefing-tips">
            <h3>使用技巧</h3>
            <ul>
              <li>描述越详细，AI 生成的方案越精准</li>
              <li>可以粘贴已有的PRD或需求文档</li>
              <li>支持从当前会话上下文中提取关键信息</li>
              <li>生成后可在草案阶段自由编辑每个模块</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // ---- Step: Parsing ----
  if (step === "parsing") {
    return (
      <div className="briefing-page">
        <header className="briefing-header">
          <button className="btn btn-sm" onClick={onBack} type="button">
            <ArrowLeft size={14} />
            返回
          </button>
          <div className="briefing-header-center">
            <Sparkles size={20} color="var(--accent)" />
            <h1>AI 建项助手</h1>
          </div>
          <div />
        </header>

        <div className="briefing-content">
          <div className="briefing-progress">
            <div className="briefing-progress-icon">
              <Loader2 size={32} style={{ animation: "spin 1s linear infinite" }} />
            </div>
            <h2 className="briefing-progress-title">AI 正在分析你的想法...</h2>

            <div className="briefing-progress-stages">
              {PROGRESS_STAGES.map((stage, i) => (
                <div
                  key={stage}
                  className={`briefing-progress-stage ${i < progressStage ? "done" : ""} ${i === progressStage ? "active" : ""}`}
                >
                  <div className="briefing-progress-dot">
                    {i < progressStage ? (
                      <Check size={12} />
                    ) : i === progressStage ? (
                      <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                    ) : (
                      <div className="briefing-progress-dot-empty" />
                    )}
                  </div>
                  <span>{stage}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- Step: Clarify ----
  if (step === "clarify") {
    return (
      <div className="briefing-page">
        <header className="briefing-header">
          <button className="btn btn-sm" onClick={onBack} type="button">
            <ArrowLeft size={14} />
            返回
          </button>
          <div className="briefing-header-center">
            <Sparkles size={20} color="var(--accent)" />
            <h1>AI 建项助手</h1>
          </div>
          <div />
        </header>

        <div className="briefing-content">
          <div className="briefing-card">
            <h2 className="briefing-card-title">AI 需要确认几个问题</h2>
            <p className="briefing-card-desc">
              回答以下问题可以帮助 AI 生成更准确的方案。所有问题都可以跳过。
            </p>

            <div className="briefing-questions">
              {questions.map((q) => (
                <div key={q.id} className="briefing-question-item">
                  <label className="briefing-question-label">{q.question}</label>
                  <input
                    type="text"
                    className="briefing-question-input"
                    placeholder="输入你的回答（可选）"
                    value={q.answer}
                    onChange={(e) => {
                      setQuestions((prev) =>
                        prev.map((item) =>
                          item.id === q.id ? { ...item, answer: e.target.value } : item
                        )
                      );
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="briefing-input-footer">
              <span />
              <button
                className="btn accent-btn"
                onClick={handleConfirmClarify}
                type="button"
              >
                确认并生成草案
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- Step: Draft ----
  if (step === "draft" && draft) {
    return (
      <div className="briefing-page">
        <header className="briefing-header">
          <button className="btn btn-sm" onClick={onBack} type="button">
            <ArrowLeft size={14} />
            返回
          </button>
          <div className="briefing-header-center">
            <Sparkles size={20} color="var(--accent)" />
            <h1>AI 建项助手 - 草案预览</h1>
          </div>
          <div />
        </header>

        <div className="briefing-content briefing-draft-content">
          {/* Section: Product Brief */}
          <div className="briefing-draft">
            <div className="briefing-section">
              <div className="briefing-section-header">
                <h3>
                  <Sparkles size={14} />
                  产品方案
                </h3>
                <button
                  className="btn btn-sm"
                  onClick={() => handleStartEdit("productBrief", draft!.productBrief)}
                  type="button"
                >
                  <Edit3 size={12} />
                  编辑
                </button>
              </div>
              {editingSection === "productBrief" ? (
                <div className="briefing-edit-area">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={4}
                  />
                  <div className="briefing-edit-actions">
                    <button
                      className="btn btn-sm"
                      onClick={() => setEditingSection(null)}
                      type="button"
                    >
                      取消
                    </button>
                    <button className="btn btn-sm primary-btn" onClick={handleSaveEdit} type="button">
                      保存
                    </button>
                  </div>
                </div>
              ) : (
                <p className="briefing-section-body">{draft!.productBrief}</p>
              )}
            </div>

            {/* Section: Pages */}
            <div className="briefing-section">
              <div className="briefing-section-header">
                <h3>
                  <FileText size={14} />
                  页面结构
                </h3>
                <button
                  className="btn btn-sm"
                  onClick={() => handleStartEdit("pages", draft!.pages.join("\n"))}
                  type="button"
                >
                  <Edit3 size={12} />
                  编辑
                </button>
              </div>
              {editingSection === "pages" ? (
                <div className="briefing-edit-area">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={6}
                  />
                  <div className="briefing-edit-actions">
                    <button
                      className="btn btn-sm"
                      onClick={() => setEditingSection(null)}
                      type="button"
                    >
                      取消
                    </button>
                    <button className="btn btn-sm primary-btn" onClick={handleSaveEdit} type="button">
                      保存
                    </button>
                  </div>
                </div>
              ) : (
                <ul className="briefing-section-list">
                  {draft!.pages.map((page, i) => (
                    <li key={i}>{page}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Section: Roles */}
            <div className="briefing-section">
              <div className="briefing-section-header">
                <h3>
                  <MessageSquare size={14} />
                  建议角色
                </h3>
              </div>
              <div className="briefing-roles-grid">
                {draft!.roles.map((role, i) => (
                  <div key={i} className="briefing-role-card">
                    {editingSection === `role-${i}` ? (
                      <div className="briefing-edit-area">
                        <div className="briefing-edit-label">{role.name}</div>
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={2}
                        />
                        <div className="briefing-edit-actions">
                          <button
                            className="btn btn-sm"
                            onClick={() => setEditingSection(null)}
                            type="button"
                          >
                            取消
                          </button>
                          <button className="btn btn-sm primary-btn" onClick={handleSaveEdit} type="button">
                            保存
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <strong>{role.name}</strong>
                        <p>{role.description}</p>
                        <button
                          className="btn-sm briefing-role-edit-btn"
                          onClick={() => handleStartEdit(`role-${i}`, role.description)}
                          type="button"
                        >
                          <Edit3 size={10} />
                          编辑
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Section: Workflow */}
            <div className="briefing-section">
              <div className="briefing-section-header">
                <h3>
                  <ChevronRight size={14} />
                  工作流建议
                </h3>
              </div>
              <div className="briefing-workflow-list">
                {draft!.workflow.map((w, i) => (
                  <div key={i} className="briefing-workflow-item">
                    <span className="briefing-workflow-num">{i + 1}</span>
                    {editingSection === `workflow-${i}` ? (
                      <div className="briefing-edit-area" style={{ flex: 1 }}>
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={2}
                        />
                        <div className="briefing-edit-actions">
                          <button
                            className="btn btn-sm"
                            onClick={() => setEditingSection(null)}
                            type="button"
                          >
                            取消
                          </button>
                          <button className="btn btn-sm primary-btn" onClick={handleSaveEdit} type="button">
                            保存
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="briefing-workflow-content">
                        <span>{w}</span>
                        <button
                          className="btn-sm briefing-inline-edit-btn"
                          onClick={() => handleStartEdit(`workflow-${i}`, w)}
                          type="button"
                        >
                          <Edit3 size={10} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Section: Tasks */}
            <div className="briefing-section">
              <div className="briefing-section-header">
                <h3>
                  <Check size={14} />
                  初始任务
                </h3>
              </div>
              <div className="briefing-tasks-list">
                {draft!.tasks.map((task, i) => (
                  <div key={i} className="briefing-task-item">
                    <span className={`briefing-task-priority priority-${task.priority.toLowerCase()}`}>
                      {task.priority}
                    </span>
                    <div className="briefing-task-info">
                      <strong>{task.title}</strong>
                      {editingSection === `task-${i}` ? (
                        <div className="briefing-edit-area">
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            rows={2}
                          />
                          <div className="briefing-edit-actions">
                            <button
                              className="btn btn-sm"
                              onClick={() => setEditingSection(null)}
                              type="button"
                            >
                              取消
                            </button>
                            <button className="btn btn-sm primary-btn" onClick={handleSaveEdit} type="button">
                              保存
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="briefing-task-desc">
                          <p>{task.description}</p>
                          <button
                            className="btn-sm briefing-inline-edit-btn"
                            onClick={() => handleStartEdit(`task-${i}`, task.description)}
                            type="button"
                          >
                            <Edit3 size={10} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section: Project Plan */}
            <div className="briefing-section">
              <div className="briefing-section-header">
                <h3>
                  <History size={14} />
                  项目计划
                </h3>
              </div>
              <div className="briefing-plan-list">
                {draft!.projectPlan.map((p, i) => (
                  <div key={i} className="briefing-plan-item">
                    <div className="briefing-plan-dot" />
                    {editingSection === `plan-${i}` ? (
                      <div className="briefing-edit-area" style={{ flex: 1 }}>
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={2}
                        />
                        <div className="briefing-edit-actions">
                          <button
                            className="btn btn-sm"
                            onClick={() => setEditingSection(null)}
                            type="button"
                          >
                            取消
                          </button>
                          <button className="btn btn-sm primary-btn" onClick={handleSaveEdit} type="button">
                            保存
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="briefing-plan-content">
                        <span>{p}</span>
                        <button
                          className="btn-sm briefing-inline-edit-btn"
                          onClick={() => handleStartEdit(`plan-${i}`, p)}
                          type="button"
                        >
                          <Edit3 size={10} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Create button */}
          <div className="briefing-draft-footer">
            <button
              className="btn"
              onClick={() => setStep("clarify")}
              type="button"
            >
              <ArrowLeft size={14} />
              返回修改问题
            </button>
            <button className="btn accent-btn" onClick={handleGoToConfirm} type="button">
              创建项目
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Step: Confirm ----
  if (step === "confirm" && draft) {
    return (
      <div className="briefing-page">
        <header className="briefing-header">
          <button className="btn btn-sm" onClick={onBack} type="button">
            <ArrowLeft size={14} />
            返回
          </button>
          <div className="briefing-header-center">
            <Sparkles size={20} color="var(--accent)" />
            <h1>AI 建项助手 - 确认创建</h1>
          </div>
          <div />
        </header>

        <div className="briefing-content">
          <div className="briefing-confirm-card">
            <h2 className="briefing-card-title">确认创建项目</h2>

            <div className="briefing-confirm-summary">
              <div className="briefing-confirm-item">
                <strong>项目名称</strong>
                <span>AI 建项 - {new Date().toLocaleDateString("zh-CN")}</span>
              </div>
              <div className="briefing-confirm-item">
                <strong>来源类型</strong>
                <span className="badge badge-accent">AI 建项</span>
              </div>
              <div className="briefing-confirm-item">
                <strong>产品方案</strong>
                <span>{draft!.productBrief.slice(0, 100)}...</span>
              </div>
              <div className="briefing-confirm-item">
                <strong>包含页面</strong>
                <span>{draft!.pages.length} 个页面</span>
              </div>
              <div className="briefing-confirm-item">
                <strong>建议角色</strong>
                <span>{draft!.roles.map((r) => r.name).join("、")}</span>
              </div>
              <div className="briefing-confirm-item">
                <strong>工作流</strong>
                <span>{draft!.workflow.length} 个步骤</span>
              </div>
              <div className="briefing-confirm-item">
                <strong>初始任务</strong>
                <span>{draft!.tasks.length} 个任务（P0-P3）</span>
              </div>
              <div className="briefing-confirm-item">
                <strong>项目计划</strong>
                <span>{draft!.projectPlan.length} 个阶段</span>
              </div>
            </div>

            <div className="briefing-confirm-actions">
              <button
                className="btn"
                onClick={() => setStep("draft")}
                disabled={creating}
                type="button"
              >
                返回修改
              </button>
              <button
                className="btn accent-btn"
                onClick={handleCreateProject}
                disabled={creating}
                type="button"
              >
                {creating ? (
                  <>
                    <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                    创建中...
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    确认创建
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- Error state ----
  if (parsingError) {
    return (
      <div className="briefing-page">
        <header className="briefing-header">
          <button className="btn btn-sm" onClick={onBack} type="button">
            <ArrowLeft size={14} />
            返回
          </button>
          <div className="briefing-header-center">
            <Sparkles size={20} color="var(--accent)" />
            <h1>AI 建项助手</h1>
          </div>
          <div />
        </header>

        <div className="briefing-content">
          <div className="briefing-card" style={{ textAlign: "center" }}>
            <div style={{ color: "var(--danger)", marginBottom: "var(--space-md)" }}>
              <AlertTriangle size={48} />
            </div>
            <h2 className="briefing-card-title">分析失败</h2>
            <p className="briefing-card-desc">{parsingError}</p>
            <div style={{ marginTop: "var(--space-lg)" }}>
              <button className="btn accent-btn" onClick={handleRetry} type="button">
                <RefreshCw size={14} />
                重试
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="briefing-page">
      <header className="briefing-header">
        <button className="btn btn-sm" onClick={onBack} type="button">
          <ArrowLeft size={14} />
          返回
        </button>
        <div className="briefing-header-center">
          <Sparkles size={20} color="var(--accent)" />
          <h1>AI 建项助手</h1>
        </div>
        <div />
      </header>
      <div className="briefing-content">
        <div className="briefing-card" style={{ textAlign: "center", padding: "var(--space-2xl)" }}>
          <Loader2 size={32} style={{ animation: "spin 1s linear infinite", marginBottom: "var(--space-md)" }} />
          <p>加载中...</p>
        </div>
      </div>
    </div>
  );
}
