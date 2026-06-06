import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
  X,
  Users,
} from "lucide-react";
import type { WorkbenchData, WorkflowStep } from "../domain/workbench";
import { projectApi, workflowApi, rolesApi, taskApi, aiApi, type ChatMessage as ApiChatMessage } from "../services/api";

interface AiProjectBriefingProps {
  data: WorkbenchData;
  onBack: () => void;
}

type BriefingStep = "input" | "parsing" | "clarify" | "draft" | "confirm";

interface DraftData {
  productBrief: string;
  pages: string[];
  roles: { name: string; description: string; roleMarkdown?: string }[];
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
  stepId?: string;
  roles: string[];
  runner: string;
  model: string;
};

const AI_FLOW_ROLE_BINDINGS: AiFlowRoleBinding[] = [
  { step: "需求分析", roles: ["产品经理"], runner: "Claude Code CLI", model: "deepseek-v4-pro" },
  { step: "UI/UX 设计", roles: ["UI/UX 设计师"], runner: "Codex CLI", model: "gpt-5.3-codex" },
  { step: "前端开发", roles: ["前端工程师"], runner: "Cursor CLI", model: "gpt-5.3-codex" },
  { step: "代码审查", roles: ["代码审查员"], runner: "Gemini CLI", model: "gemini-pro" },
  { step: "测试验证", roles: ["测试工程师"], runner: "Claude Code CLI", model: "deepseek-v4-pro" },
];

/** Resolve the configured AI assistant model from WorkbenchData. */
function getAiAssistantModelInfo(data: WorkbenchData): { providerId: string; modelName: string } | null {
  if (data.aiAssistantModel) {
    const provider = data.modelProviders.find(p => p.id === data.aiAssistantModel?.providerId);
    if (provider && provider.apiKeyStatus === 'configured') {
      return { providerId: data.aiAssistantModel.providerId, modelName: data.aiAssistantModel.modelName };
    }
  }
  const fallbackProvider = data.modelProviders.find(p => p.enabled && p.apiKeyStatus === 'configured');
  if (fallbackProvider) {
    return { providerId: fallbackProvider.id, modelName: fallbackProvider.defaultModel || fallbackProvider.models[0]?.name || '' };
  }
  return null;
}

const DRAFT_GENERATION_SYSTEM_PROMPT = `你是 AI 建项助手，专门帮助用户为项目建立合适的工程流程。

你的核心任务：
1. 根据项目描述，从已有流程模板中优先匹配最合适的流程
2. 如果没有完全匹配的，基于最接近的模板调整生成新流程
3. 如果完全无匹配，从零设计一个适合该项目的工程流程
4. 流程设计要覆盖完整工程闭环：需求→设计→开发→测试→发布

你必须只输出一个 JSON 对象，不要输出任何其他文字。JSON 结构：

{
  "productBrief": "项目类型和工程流程适配说明（1-2句话，重点说明为什么选择这个流程）",
  "matchedTemplate": "匹配到的已有流程模板名，或null",
  "pages": ["页面1 - 描述"],
  "roles": [{"name": "角色名", "description": "该角色在流程中的职责（1-2句话）", "roleMarkdown": "# 角色名\\n\\n## 角色职责\\n- 在该流程中的具体职责1\\n- 具体职责2\\n\\n## 工作规范\\n- 需要遵循的规范1\\n- 规范2\\n\\n## 交付标准\\n- 该角色的交付物标准"}],
  "workflow": [
    {"step": "步骤名", "roles": ["角色A", "角色B"], "description": "步骤描述"}
  ],
  "tasks": [{"title": "任务标题", "priority": "P0", "description": "任务描述"}],
  "projectPlan": ["第1周：描述"],
  "clarifyQuestions": ["关于流程设计需要确认的问题"]
}

要求：
- productBrief 要说明流程适配理由，不是产品功能描述
- matchedTemplate 如果有匹配的已有流程就填模板名，否则填null
- roles 是流程执行角色（产品经理、开发、测试等），不是项目团队角色
- **每个 role 的 roleMarkdown 是必须字段**，必须包含该角色在本流程中的具体职责、工作规范和交付标准，至少 6 行内容，用 Markdown 格式
- workflow 中每个步骤必须包含 roles 数组，指定该步骤由哪些角色执行（可以是多个）
- tasks 是流程初始化任务，6-8个，priority为P0/P1/P2
- clarifyQuestions 是关于流程设计的问题，不是项目功能问题
- 所有内容中文
- 只输出 JSON，不要 markdown 代码块标记`;

/** Extract JSON from AI response content (handles code blocks and mixed text). */
function extractJsonFromAiContent(content: string): unknown {
  let jsonStr = content;
  const codeBlockMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  } else {
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
    }
  }
  return JSON.parse(jsonStr);
}

/** Mock draft data, used as fallback when AI API fails. */
function generateMockDraft(input: string): DraftData {
  const topic = input.length > 50 ? input.slice(0, 50) + "..." : input;
  return {
    productBrief: `基于你的描述"${topic}"，这是一个面向用户的管理与协作平台。核心目标是提供直观的项目管理、任务追踪和团队协作能力，支持多角色协同工作。`,
    pages: [
      "工作台首页 - 概览仪表盘，关键指标和快速入口",
      "项目管理 - 项目列表、创建、导入",
      "任务看板 - 看板视图的任务追踪",
      "团队管理 - 成员与角色配置",
      "设置 - 个人和系统配置",
    ],
    roles: [
      { name: "产品经理", description: "负责需求定义和产品方向" },
      { name: "设计师", description: "负责界面设计和交互体验" },
      { name: "前端开发", description: "负责客户端界面开发" },
      { name: "后端开发", description: "负责服务端API和数据层" },
      { name: "测试工程师", description: "负责质量保证和测试用例" },
    ],
    workflow: [
      "第一步：需求分析 - 产品经理收集并整理需求，产出PRD文档",
      "第二步：设计评审 - 设计师产出交互稿，团队评审确认",
      "第三步：开发实现 - 前后端并行开发，每日站会同步进度",
      "第四步：测试验证 - QA进行功能测试和回归测试",
      "第五步：发布上线 - 通过Gate审批后发布到生产环境",
    ],
    tasks: [
      { title: "项目初始化与脚手架搭建", priority: "P0", description: "搭建前端React项目和后端服务项目的基础框架" },
      { title: "用户认证模块", priority: "P0", description: "实现登录、注册和权限验证功能" },
      { title: "项目管理CRUD接口", priority: "P0", description: "实现项目的创建、读取、更新、删除API" },
      { title: "工作台首页仪表盘", priority: "P1", description: "开发首页概览面板，展示关键指标" },
      { title: "任务看板页面", priority: "P1", description: "实现看板视图的任务管理和拖拽操作" },
      { title: "团队与角色管理", priority: "P2", description: "团队成员邀请、角色分配和权限配置" },
      { title: "项目设置页", priority: "P2", description: "个人设置和系统配置页面" },
      { title: "CI/CD流水线集成", priority: "P3", description: "集成GitHub Actions或Jenkins自动化构建部署" },
    ],
    projectPlan: [
      "第1周：项目初始化、技术选型、基础架构搭建",
      "第2-3周：核心功能开发（认证、项目管理、任务系统）",
      "第4周：工作台仪表盘、看板视图",
      "第5-6周：团队管理、设置页面、集成测试",
      "第7周：性能优化、安全审计、部署上线",
    ],
  };
}

const MOCK_CLARIFY_QUESTIONS: ClarifyQuestion[] = [
  { id: "q1", question: "这个产品的主要目标用户是谁？比如：企业管理员、普通员工、外部客户？", answer: "" },
  { id: "q2", question: "是否有需要对接的第三方系统或已有数据源？", answer: "" },
  { id: "q3", question: "你期望的交付时间线是怎样的？", answer: "" },
];

/** Parsed workflow step with roles */
interface ParsedWorkflowStep {
  step: string;
  roles: string[];
  description: string;
}

/** Call AI API to generate draft, fallback to mock on failure. */
async function generateDraftFromAI(
  input: string,
  data: WorkbenchData,
  templatesContext?: string
): Promise<{ draft: DraftData; questions: ClarifyQuestion[]; workflowSteps: ParsedWorkflowStep[] }> {
  const modelInfo = getAiAssistantModelInfo(data);
  if (!modelInfo) {
    console.warn('[AiProjectBriefing] No AI model configured, using mock data');
    return { draft: generateMockDraft(input), questions: MOCK_CLARIFY_QUESTIONS, workflowSteps: [] };
  }

  try {
    const apiMessages: ApiChatMessage[] = [
      { role: "system", content: DRAFT_GENERATION_SYSTEM_PROMPT },
      ...(templatesContext ? [{ role: "system" as const, content: templatesContext }] : []),
      { role: "user", content: input },
    ];

    const result = await aiApi.chat(apiMessages, {
      context: "AI 建项助手 - 流程设计与项目建立",
      providerId: modelInfo.providerId,
      modelName: modelInfo.modelName,
    });

    if (!result.ok || !result.data?.content) {
      console.warn('[AiProjectBriefing] AI API error, falling back to mock:', result.error);
      return { draft: generateMockDraft(input), questions: MOCK_CLARIFY_QUESTIONS, workflowSteps: [] };
    }

    const parsed = extractJsonFromAiContent(result.data.content) as Record<string, unknown>;
    const mock = generateMockDraft(input);

    // Parse workflow steps with roles for flow bindings
    const workflowSteps: ParsedWorkflowStep[] = Array.isArray(parsed.workflow)
      ? parsed.workflow.map((w: unknown) => {
          if (typeof w === 'string') return { step: w.replace(/[（(].+?[)）]/, '').replace(/\s*[-–—]\s*.+$/, '').trim(), roles: [], description: '' };
          const step = w as Record<string, unknown>;
          return {
            step: typeof step.step === 'string' ? step.step : '未命名步骤',
            roles: Array.isArray(step.roles) ? step.roles.map(String) : [],
            description: typeof step.description === 'string' ? step.description : '',
          };
        })
      : [];

    const draft: DraftData = {
      productBrief: typeof parsed.productBrief === 'string' ? parsed.productBrief : mock.productBrief,
      pages: Array.isArray(parsed.pages) ? parsed.pages.map(String) : mock.pages,
      roles: Array.isArray(parsed.roles)
        ? parsed.roles.map((r: unknown) => {
            const role = r as Record<string, unknown>;
            return { name: typeof role.name === 'string' ? role.name : '未命名角色', description: typeof role.description === 'string' ? role.description : '', roleMarkdown: typeof role.roleMarkdown === 'string' ? role.roleMarkdown : undefined };
          })
        : mock.roles,
      workflow: Array.isArray(parsed.workflow)
        ? parsed.workflow.map((w: unknown) => {
            if (typeof w === 'string') return w;
            const step = w as Record<string, unknown>;
            const name = typeof step.step === 'string' ? step.step : '未命名步骤';
            const roles = Array.isArray(step.roles) ? step.roles.map(String) : [];
            const desc = typeof step.description === 'string' ? step.description : '';
            return roles.length > 0 ? `${name}（${roles.join('、')}）${desc ? ' - ' + desc : ''}` : name;
          })
        : mock.workflow,
      tasks: Array.isArray(parsed.tasks)
        ? parsed.tasks.map((t: unknown) => {
            const task = t as Record<string, unknown>;
            return { title: typeof task.title === 'string' ? task.title : '未命名任务', priority: typeof task.priority === 'string' ? task.priority : 'P1', description: typeof task.description === 'string' ? task.description : '' };
          })
        : mock.tasks,
      projectPlan: Array.isArray(parsed.projectPlan) ? parsed.projectPlan.map(String) : mock.projectPlan,
    };

    const questions: ClarifyQuestion[] = Array.isArray(parsed.clarifyQuestions)
      ? (parsed.clarifyQuestions as string[]).map((q, i) => ({ id: `q${i + 1}`, question: typeof q === 'string' ? q : '', answer: '' }))
      : MOCK_CLARIFY_QUESTIONS;

    return { draft, questions, workflowSteps };
  } catch (error) {
    console.error('[AiProjectBriefing] AI API call failed, falling back to mock:', error);
    return { draft: generateMockDraft(input), questions: MOCK_CLARIFY_QUESTIONS, workflowSteps: [] };
  }
}

const DRAFT_STORAGE_KEY = 'ai-project-briefing-draft';

interface SavedDraft {
  draft: DraftData;
  flowBindings: AiFlowRoleBinding[];
  chatMessages: { role: "user" | "ai"; content: string }[];
  questions: ClarifyQuestion[];
  composerInput: string;
  attachments: string[];
  projectName: string;
  projectPath: string;
  projectBranch: string;
  projectWorktree: string;
  projectTechStack: string;
}

function saveDraftToStorage(data: SavedDraft): void {
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(data));
  } catch { /* quota exceeded or private mode */ }
}

function loadDraftFromStorage(): SavedDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedDraft;
  } catch {
    return null;
  }
}

function clearDraftStorage(): void {
  try { localStorage.removeItem(DRAFT_STORAGE_KEY); } catch { /* noop */ }
}

export function AiProjectBriefing({ data: _data, onBack }: AiProjectBriefingProps) {
  // Component uses API directly for AI briefing creation
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
  const [analyzing, setAnalyzing] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "ai"; content: string }[]>([]);
  const [materialsExpanded, setMaterialsExpanded] = useState(false);
  const [flowInserted, setFlowInserted] = useState(false);
  const [createdTemplateId, setCreatedTemplateId] = useState<string | null>(null);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [flowBindings, setFlowBindings] = useState<AiFlowRoleBinding[]>(() => AI_FLOW_ROLE_BINDINGS.map((item) => ({ ...item })));
  const [draftSaved, setDraftSaved] = useState(false);
  const [showProjectInfoModal, setShowProjectInfoModal] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectPath, setProjectPath] = useState("");
  const [projectBranch, setProjectBranch] = useState("main");
  const [projectWorktree, setProjectWorktree] = useState(".claude/worktrees");
  const [projectTechStack, setProjectTechStack] = useState("");
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const materialFileInputRef = useRef<HTMLInputElement | null>(null);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, []);

  // Restore saved draft on mount
  useEffect(() => {
    const saved = loadDraftFromStorage();
    if (saved && saved.draft) {
      setDraft(saved.draft);
      setFlowBindings(saved.flowBindings);
      setChatMessages(saved.chatMessages);
      setQuestions(saved.questions);
      setComposerInput(saved.composerInput ?? "");
      setAttachments(saved.attachments ?? []);
      setProjectName(saved.projectName ?? "");
      setProjectPath(saved.projectPath ?? "");
      setProjectBranch(saved.projectBranch ?? "main");
      setProjectWorktree(saved.projectWorktree ?? ".claude/worktrees");
      setProjectTechStack(saved.projectTechStack ?? "");
      setAnalysisStarted(true);
      setStep("draft");
    }
  }, []);

  // Save draft handler
  const handleSaveDraft = useCallback(() => {
    if (!draft) return;
    saveDraftToStorage({
      draft,
      flowBindings,
      chatMessages,
      questions,
      composerInput,
      attachments,
      projectName,
      projectPath,
      projectBranch,
      projectWorktree,
      projectTechStack,
    });
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 2000);
  }, [draft, flowBindings, chatMessages, questions, composerInput, attachments, projectName, projectPath, projectBranch, projectWorktree, projectTechStack]);

  // Start AI parsing
  const handleStartAnalysis = useCallback(async () => {
    if (!composerInput.trim()) return;
    setStep("parsing");
    setParsingError(null);
    setProgressStage(0);

    let stage = 0;
    const progressInterval = setInterval(() => {
      stage++;
      if (stage < PROGRESS_STAGES.length) {
        setProgressStage(stage);
      }
    }, 800);

    try {
      const result = await generateDraftFromAI(composerInput, _data);
      clearInterval(progressInterval);
      setProgressStage(PROGRESS_STAGES.length - 1);
      setDraft(result.draft);
      setQuestions(result.questions);
      setStep("clarify");
    } catch (error) {
      clearInterval(progressInterval);
      setParsingError(error instanceof Error ? error.message : "分析失败，请重试");
      setStep("input");
    }
  }, [composerInput, _data]);

  // Retry parsing
  const handleRetry = useCallback(() => {
    setParsingError(null);
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

  const persistFlowTemplate = useCallback(async (): Promise<string | null> => {
    if (!analysisStarted || flowInserted) return null;

    const provider = _data.modelProviders.find((item) => item.enabled) ?? _data.modelProviders[0];
    const runner = _data.runnerProfiles.find((item) => item.enabled) ?? _data.runnerProfiles[0];
    const now = new Date().toISOString();

    // Ensure all roles from draft exist — create missing ones first
    const allRoleNames = new Set(flowBindings.flatMap(b => b.roles));
    const existingRoleNames = new Set(_data.roles.map(r => r.name));
    const missingRoleNames = [...allRoleNames].filter(name => !existingRoleNames.has(name));

    let rolesMap = new Map(_data.roles.map(r => [r.name, r]));

    // Create missing roles
    if (missingRoleNames.length > 0) {
      const rolesInput = missingRoleNames.map(name => {
        const draftRole = draft?.roles.find(r => r.name === name);
        return {
          name,
          description: draftRole?.description ?? "",
          roleMarkdown: draftRole?.roleMarkdown ?? `# ${name}\n\n## 职责\n- 待补充\n\n## 工作规范\n- 遵循团队编码规范\n- 及时同步进度\n\n## 交付标准\n- 按时交付`,
          projectId: null,
          isBuiltIn: false,
          defaultCapabilities: [],
        };
      });
      const batchResult = await rolesApi.createBatch(rolesInput);
      if (batchResult.ok && batchResult.data) {
        for (const created of batchResult.data) {
          rolesMap.set(created.name, created);
        }
      }
    }

    // Update existing roles that lack roleMarkdown
    const existingRolesToUpdate = _data.roles.filter(r => allRoleNames.has(r.name) && !r.roleMarkdown);
    if (existingRolesToUpdate.length > 0) {
      const updateInputs = existingRolesToUpdate.map(r => {
        const draftRole = draft?.roles.find(dr => dr.name === r.name);
        return {
          id: r.id,
          name: r.name,
          description: r.description || draftRole?.description || "",
          roleMarkdown: draftRole?.roleMarkdown ?? `# ${r.name}\n\n## 职责\n- ${r.description || '待补充'}\n\n## 工作规范\n- 遵循团队编码规范\n- 及时同步进度\n\n## 交付标准\n- 按时交付`,
          projectId: r.projectId,
          isBuiltIn: r.isBuiltIn ?? false,
          defaultCapabilities: r.defaultCapabilities || [],
        };
      });
      const batchResult = await rolesApi.createBatch(updateInputs);
      if (batchResult.ok && batchResult.data) {
        for (const updated of batchResult.data) {
          rolesMap.set(updated.name, updated);
        }
      }
    }

    let assignmentCounter = 0;
    const steps: WorkflowStep[] = flowBindings.map((binding, index) => {
      // Merge multi-role into single assignment to avoid task duplication
      const primaryRole = rolesMap.get(binding.roles[0]);
      assignmentCounter++;
      const assignments = [{
        id: `ai-briefing-assignment-${assignmentCounter}`,
        order: 1,
        roleId: primaryRole?.id ?? "",
        modelProviderId: provider?.id ?? "",
        modelName: binding.model || provider?.models?.[0]?.name || "",
        runnerId: runner?.id,
        goal: binding.step,
        acceptanceCriteria: [],
        inputs: index === 0 ? ["讨论上下文", "协同资料"] : ["上一步输出"],
        outputs: index === flowBindings.length - 1 ? ["验收报告", "创建前确认"] : [`${binding.step}输出`],
        dependsOnAssignmentIds: index > 0 ? [`ai-briefing-assignment-${assignmentCounter - 1}`] : [],
        notifyAssignmentIds: index < flowBindings.length - 1 ? [`ai-briefing-assignment-${assignmentCounter + 1}`] : [],
        eventRoutes: [],
      }];

      return {
        id: `ai-briefing-step-${index + 1}`,
        order: index + 1,
        name: binding.step,
        assignments,
        inputs: index === 0 ? ["讨论上下文", "协同资料"] : ["上一步输出"],
        outputs: index === flowBindings.length - 1 ? ["验收报告", "创建前确认"] : [`${binding.step}输出`],
        gateMode: "auto",
        failureStrategy: "stop",
        stepMarkdown: [
          `# ${binding.step}`,
          "",
          `绑定角色：${binding.roles.join("、")}`,
          `Runner：${binding.runner}`,
          `模型：${binding.model}`,
        ].join("\n"),
        projectOverride: false,
      };
    });

    const result = await workflowApi.createTemplate({
      name: `AI生成-${projectName.trim() || "未命名项目"}`,
      version: 1,
      status: "enabled",
      steps,
      workflowMarkdown: [
        `# AI生成-${projectName.trim() || "未命名项目"}`,
        "由 AI 建项助手根据讨论、资料和协同文件生成，已包含用户确认后的流程步骤与角色绑定。",
        "",
        ...flowBindings.map((binding, index) => `${index + 1}. ${binding.step} - ${binding.roles.join("、")}`),
      ].join("\n"),
      versions: [
        {
          label: "applied",
          version: 1,
          updatedAt: now,
          changedSteps: steps.map((item) => item.id),
        },
      ],
    });

    if (!result.ok || !result.data) {
      throw new Error(result.error?.message || "Failed to create workflow template");
    }

    setCreatedTemplateId(result.data.id);
    setFlowInserted(true);
    return result.data.id;
  }, [analysisStarted, flowInserted, flowBindings, draft, projectName, _data.modelProviders, _data.roles, _data.runnerProfiles]);

  // Final confirmation - create project
  const handleCreateProject = useCallback(async () => {
    if (!draft) return;
    if (!projectName.trim() || !projectPath.trim()) {
      setShowProjectInfoModal(true);
      return;
    }
    setCreating(true);
    setApiError(null);

    try {
      // Step 1: Persist workflow template (also creates missing roles)
      const templateId = await persistFlowTemplate();
      const workflowId = templateId ?? createdTemplateId ?? _data.workflowTemplates[0]?.id ?? "";

      // Step 2: Create project via API with full settings
      const result = await projectApi.create({
        name: projectName.trim(),
        repoPath: projectPath.trim(),
        defaultBranch: projectBranch.trim() || "main",
        worktreeRoot: projectWorktree.trim() || `${projectPath.trim()}/.worktrees`,
        workflowTemplateId: workflowId,
        sourceType: "ai-briefing",
        phase: "需求分析",
        healthScore: 100,
        riskLevel: "low",
        settings: {
          installCommand: "npm install",
          testCommand: "npm test",
          buildCommand: "npm run build",
          previewCommand: "npm run preview",
          detectedStack: projectTechStack.trim(),
          riskSummary: "",
          projectDescription: draft.productBrief,
        },
      });

      if (!result.ok || !result.data) {
        throw new Error(result.error?.message || "Failed to create project");
      }

      setCreatedProjectId(result.data.id);
      clearDraftStorage();

      // Step 4: Create tasks directly from flowBindings (one task per step, multi-role merged)
      if (workflowId && flowBindings.length > 0) {
        const taskCreations = flowBindings.map((binding, idx) => {
          // Build roleAssignment: each role gets a separate entry with unique key
          const roleMap: Record<string, string> = {};
          const roleIds: string[] = [];
          binding.roles.forEach((roleName) => {
            const role = _data.roles.find(r => r.name === roleName);
            if (role) {
              roleIds.push(role.id);
            }
          });
          // Store all role IDs comma-separated under step key for backward compat
          if (roleIds.length > 0) {
            roleMap[`ai-briefing-step-${idx + 1}`] = roleIds.join(",");
          }
          return taskApi.create({
            projectId: result.data!.id,
            goal: binding.step,
            workflowTemplateId: workflowId,
            acceptanceCriteria: [],
            roleAssignment: roleMap,
            status: idx === 0 ? "running" : "queued",
          });
        });
        await Promise.all(taskCreations);
      }

      setCreating(false);

      // Trigger a page reload to refresh all data from API
      window.dispatchEvent(new CustomEvent("refresh-workbench"));
      window.dispatchEvent(new CustomEvent("navigate", { detail: { view: "project-management" } }));
    } catch (error) {
      console.error("Failed to create project:", error);
      setApiError(error instanceof Error ? error.message : "创建项目失败，请重试");
      setCreating(false);
    }
  }, [draft, persistFlowTemplate, createdTemplateId, _data.workflowTemplates, projectName, projectPath, projectBranch, projectWorktree, projectTechStack]);

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

  const CHAT_SYSTEM_PROMPT = `你是 AI 建项助手。你的唯一目标是帮用户建立适合该项目的工程流程，而不是讨论项目功能细节。

你的职责：
- 根据用户描述，判断项目类型（Web应用、移动端、数据平台、CLI工具等）
- 识别项目所需的工程流程角色和步骤
- 回答关于流程设计的问题

注意：
- 不要讨论项目功能、技术选型或架构设计，那些是项目工作台的事
- 不要建议用户点击"开始分析"或其他操作按钮，用户会自己决定
- 回复简洁，不超过3句话，中文回答`;

  // Build context about existing workflow templates for the AI
  const existingTemplatesContext = useMemo(() => {
    const templates = _data.workflowTemplates ?? [];
    if (templates.length === 0) return "当前流程库为空，没有任何已有流程模板。";
    return "当前流程库已有以下流程模板：\n" + templates.map(t =>
      `- ${t.name}（${t.steps?.length ?? 0} 个步骤，类别：${t.category || "未分类"}，状态：${t.status || "草稿"}）`
    ).join("\n");
  }, [_data.workflowTemplates]);

  // Send chat message — calls AI for a conversation reply
  const handleSendMessage = useCallback(async () => {
    const text = composerInput.trim();
    if (!text) return;
    setChatMessages(prev => [...prev, { role: "user", content: text }]);
    setComposerInput("");

    // Call AI for a reply
    const modelInfo = getAiAssistantModelInfo(_data);
    if (!modelInfo) {
      setChatMessages(prev => [...prev, { role: "ai", content: '暂无可用 AI 模型，请先在设置中配置模型。你也可以直接点击"开始分析"。' }]);
      return;
    }

    try {
      // Build conversation history for context
      const history: ApiChatMessage[] = [
        { role: "system", content: CHAT_SYSTEM_PROMPT },
        ...chatMessages.filter(m => m.role === "user").slice(-6).map(m => ({ role: "user" as const, content: m.content })),
        { role: "user", content: text },
      ];

      const result = await aiApi.chat(history, {
        context: "AI 建项助手 - 讨论",
        providerId: modelInfo.providerId,
        modelName: modelInfo.modelName,
      });

      const reply = result.ok && result.data?.content
        ? result.data.content
        : '抱歉，我暂时无法回复。你可以直接点击"开始分析"生成草案。';
      setChatMessages(prev => [...prev, { role: "ai", content: reply }]);
    } catch {
      setChatMessages(prev => [...prev, { role: "ai", content: '网络异常，请稍后重试。你也可以直接点击"开始分析"。' }]);
    }
  }, [composerInput, chatMessages, _data]);

  // Start AI analysis (uses all chat context)
  const handleV2StartAnalysis = useCallback(async () => {
    // Collect all discussion context
    const contextParts = chatMessages.map(m => `${m.role === "user" ? "用户" : "AI"}：${m.content}`);
    const currentInput = composerInput.trim();
    if (currentInput) {
      contextParts.push(`用户：${currentInput}`);
      setChatMessages(prev => [...prev, { role: "user", content: currentInput }]);
      setComposerInput("");
    }

    const source = contextParts.length > 0
      ? contextParts.join("\n")
      : "企业知识平台，包含文档管理、全文检索、权限控制和知识共享。";

    setAnalyzing(true);
    setParsingError(null);

    try {
      const result = await generateDraftFromAI(source, _data, existingTemplatesContext);
      setDraft(result.draft);
      setQuestions(result.questions);
      // Build flow bindings from parsed workflow steps with roles
      const provider = _data.modelProviders.find(p => p.enabled) ?? _data.modelProviders[0];
      const runner = _data.runnerProfiles.find(r => r.enabled) ?? _data.runnerProfiles[0];
      const model = provider?.models?.[0]?.name ?? "";
      if (result.workflowSteps.length > 0) {
        setFlowBindings(result.workflowSteps.map((ws, idx) => ({
          step: ws.step,
          stepId: `ai-briefing-step-${idx + 1}`,
          roles: ws.roles.length > 0 ? ws.roles : [result.draft.roles[0]?.name ?? "未分配"],
          runner: runner?.displayName ?? runner?.command ?? "",
          model,
        })));
      } else {
        // Fallback: derive from draft.workflow strings
        setFlowBindings(result.draft.workflow.map((stepStr, i) => ({
          step: stepStr.replace(/^第[一二三四五六七八九十\d]+步[：:]\s*/, "").split(/\s*[-–—]\s*/)[0].replace(/[（(].+?[)）]/, "").trim(),
          roles: [result.draft.roles[i % result.draft.roles.length]?.name ?? "未分配"],
          runner: runner?.displayName ?? runner?.command ?? "",
          model,
        })));
      }
      setAnalysisStarted(true);
      setFlowInserted(false);
      setStep("draft");
      // Keep projectName empty — user fills in manually
      if (!projectTechStack) {
        // Auto-detect tech stack from AI response and project description
        const brief = result.draft.productBrief;
        const roles = result.draft.roles.map(r => r.name).join(" ");
        const stackHints: string[] = [];
        if (/react|vue|angular|前端|web/i.test(brief + roles)) stackHints.push("React/Vue");
        if (/spring|java|后端|api/i.test(brief + roles)) stackHints.push("Spring Boot");
        if (/flink|spark|hadoop|数据|etl|批|流/i.test(brief + roles)) stackHints.push("Flink/Spark");
        if (/python|django|flask|模型|ai|机器学习/i.test(brief + roles)) stackHints.push("Python/FastAPI");
        if (/node|express|nestjs|typescript/i.test(brief + roles)) stackHints.push("Node.js/Express");
        if (/postgresql|mysql|mongo|redis|数据库/i.test(brief + roles)) stackHints.push("PostgreSQL/Redis");
        if (/docker|k8s|kubernetes|部署|运维/i.test(brief + roles)) stackHints.push("Docker/K8s");
        setProjectTechStack(stackHints.length > 0 ? stackHints.join(" + ") : "待填写");
      }
      const matched = (result.draft as unknown as Record<string, unknown>).matchedTemplate;
      const matchInfo = matched ? `，匹配到已有流程「${matched}」` : "";
      setChatMessages(prev => [...prev, { role: "ai", content: `已完成分析${matchInfo}。生成了 ${result.draft.roles.length} 个角色、${result.draft.workflow.length} 个流程步骤的草案。你可以在右侧查看编辑，或继续讨论后重新分析。` }]);
    } catch (error) {
      console.error('[AiProjectBriefing] V2 analysis failed:', error);
      setParsingError(error instanceof Error ? error.message : "AI 分析失败，请重试");
      setAnalysisStarted(false);
    } finally {
      setAnalyzing(false);
    }
  }, [composerInput, _data]);

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
          <span className="briefing-v2-chip primary">已收集 {attachments.length + 1} 条上下文 · {analyzing ? "分析中..." : analysisStarted ? "草案已生成" : "未开始分析"}</span>
          <button className="briefing-v2-btn" type="button" disabled={!draft || analyzing} onClick={handleSaveDraft}>
            {draftSaved ? <><Check size={14} />已保存</> : <><Save size={14} />保存草案</>}
          </button>
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
              {chatMessages.length === 0 && !analyzing ? (
                <div className="briefing-v2-bubble ai" style={{ opacity: 0.5 }}>
                  在下方输入你的项目想法，我会帮你整理成可执行的项目计划。
                </div>
              ) : (
                <>
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`briefing-v2-bubble ${msg.role}`}>
                      {msg.content.length > 300 ? msg.content.slice(0, 300) + "..." : msg.content}
                    </div>
                  ))}
                  {analyzing && (
                    <div className="briefing-v2-bubble ai">
                      <Loader2 size={14} className="spin" style={{ marginRight: 6 }} />正在分析你的描述...
                    </div>
                  )}
                </>
              )}
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
              <button className="briefing-v2-btn primary" type="button" onClick={handleSendMessage} disabled={!composerInput.trim() || analyzing}>
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
              {analyzing ? (
                <button className="briefing-v2-btn primary" type="button" disabled>
                  <Loader2 size={14} className="spin" />分析中...
                </button>
              ) : analysisStarted ? (
                <button className="briefing-v2-btn primary" type="button" onClick={handleV2StartAnalysis}>
                  <RefreshCw size={14} />重新分析
                </button>
              ) : parsingError ? (
                <button className="briefing-v2-btn primary" type="button" onClick={handleV2StartAnalysis}>
                  <RefreshCw size={14} />重试分析
                </button>
              ) : (
                <button className="briefing-v2-btn primary" type="button" onClick={handleV2StartAnalysis}>
                  <Play size={14} />开始分析
                </button>
              )}
              <span>只生成草案，不创建项目</span>
            </div>
            <div className="briefing-v2-steps">
              {["收集上下文", "提取目标", "识别角色", "拆解流程", "生成草案"].map((item, index) => (
                <div key={item} className={`briefing-v2-step ${(analysisStarted && !analyzing) || index === 0 ? "active" : ""}`}>
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
                <div key={title} className={`briefing-v2-card ${analysisStarted && !analyzing ? "ready" : ""}`}>
                  <div><h3>{title}</h3><span>{analyzing ? "分析中..." : analysisStarted ? "已分析" : "待分析"}</span></div>
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
              <span className="briefing-v2-chip">{analyzing ? "正在分析..." : analysisStarted ? "草案已生成，等待确认" : "等待分析结果"}</span>
              <div className="briefing-v2-progress"><span style={{ width: analyzing ? "60%" : analysisStarted ? "100%" : "0%" }} /></div>
            </div>
            <div className={`briefing-v2-draft-card ${analysisStarted && !analyzing ? "ready" : ""}`}>
              <h3>项目草案</h3>
              <p>{analyzing ? "正在重新分析..." : analysisStarted && draft ? (draft.productBrief.length > 120 ? draft.productBrief.slice(0, 120) + "..." : draft.productBrief) : "项目名称、目标摘要将在分析后生成。"}</p>
            </div>
            <div className={`briefing-v2-draft-card ${analysisStarted && !analyzing ? "ready" : ""}`}>
              <h3>建议角色</h3>
              <div className="briefing-v2-chip-list">
                {analyzing
                  ? <span style={{ opacity: 0.5 }}>分析中...</span>
                  : analysisStarted && draft
                    ? draft.roles.map((role) => <span key={role.name}>{role.name}</span>)
                    : <span style={{ opacity: 0.5 }}>分析后生成</span>}
              </div>
            </div>
            <div className={`briefing-v2-draft-card ${analysisStarted && !analyzing ? "ready" : ""}`}>
              <div className="briefing-v2-draft-head">
                <h3>流程绑定角色</h3>
                <span>{analyzing ? "分析中..." : flowInserted ? "已入库" : analysisStarted ? "可编辑，确认后入库" : "待分析"}</span>
              </div>
              <div className="briefing-v2-flow-binding-list">
                {analyzing ? (
                  <span style={{ opacity: 0.5, fontSize: 12 }}>正在重新分析流程绑定...</span>
                ) : flowBindings.map((binding, index) => (
                  <div className="briefing-v2-flow-binding-row" key={binding.step}>
                    <strong>{String(index + 1).padStart(2, "0")}</strong>
                    <span>{binding.step}</span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
                      {binding.roles.map((role, ri) => (
                        <span key={ri} style={{
                          padding: "2px 8px", borderRadius: 4, fontSize: 11,
                          background: "var(--bg-tertiary)", border: "1px solid var(--border-primary)",
                          color: "var(--text-primary)", display: "inline-flex", alignItems: "center", gap: 4,
                        }}>
                          {role}
                          <X size={10} style={{ cursor: "pointer", opacity: 0.6 }} onClick={() => {
                            const newRoles = binding.roles.filter((_, i) => i !== ri);
                            handleUpdateFlowBinding(index, { roles: newRoles });
                          }} />
                        </span>
                      ))}
                      {draft && draft.roles.filter(r => !binding.roles.includes(r.name)).length > 0 && (
                        <select
                          value=""
                          onChange={(event) => {
                            if (event.target.value) {
                              handleUpdateFlowBinding(index, { roles: [...binding.roles, event.target.value] });
                            }
                          }}
                          style={{ fontSize: 11, padding: "2px 4px", background: "#0d1b2a", color: "var(--text-primary)", border: "1px solid var(--border-primary)", borderRadius: 4 }}
                        >
                          <option value="">+角色</option>
                          {draft.roles.filter(r => !binding.roles.includes(r.name)).map(role => (
                            <option key={role.name} value={role.name}>{role.name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className={`briefing-v2-draft-card ${analysisStarted && !analyzing ? "ready" : ""}`}>
              <h3>任务计划</h3>
              <div className="briefing-v2-mini-table">
                {analyzing
                  ? <span style={{ opacity: 0.5, fontSize: 12 }}>分析中...</span>
                  : analysisStarted && draft
                  ? (["P0", "P1", "P2", "P3"] as const).filter(p => draft.tasks.some(t => t.priority === p)).map(p => (
                    <div key={p}><strong>{p}</strong><span>{draft.tasks.filter(t => t.priority === p).map(t => t.title).join("、")}</span></div>
                  ))
                  : <div><span style={{ opacity: 0.5 }}>分析后生成</span></div>}
              </div>
            </div>
            <div className={`briefing-v2-draft-card ${analysisStarted && !analyzing ? "ready" : ""}`}>
              <h3>项目计划</h3>
              <div className="briefing-v2-mini-table">
                {analyzing
                  ? <span style={{ opacity: 0.5, fontSize: 12 }}>分析中...</span>
                  : analysisStarted && draft
                  ? draft.projectPlan.map((phase, i) => (
                    <div key={i}><strong>阶段{i + 1}</strong><span>{phase}</span></div>
                  ))
                  : <div><span style={{ opacity: 0.5 }}>分析后生成</span></div>}
              </div>
            </div>

            {apiError && (
              <div style={{ padding: "8px 12px", background: "rgba(248,81,73,0.1)", border: "1px solid rgba(248,81,73,0.3)", borderRadius: 4, color: "var(--danger)", fontSize: 13, margin: "8px 0" }}>
                {apiError}
              </div>
            )}
          </div>
          <div className="briefing-v2-action-bar">
            <button className="briefing-v2-btn" type="button" onClick={() => setShowProjectInfoModal(true)}>
              <Edit3 size={14} />填写项目信息
            </button>
            <button className="briefing-v2-btn primary" type="button" disabled={!analysisStarted || creating || analyzing} onClick={handleCreateProject}>
              {creating ? <><Loader2 size={14} className="spin" />创建中...</> : <><Check size={14} />确认创建项目</>}
            </button>
          </div>
        </section>
      </div>

      {/* Project Info Modal */}
      {showProjectInfoModal && (
        <div className="pm-overlay" onClick={() => setShowProjectInfoModal(false)}>
          <div className="pm-overlay-panel" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="pm-overlay-header">
              <h2>项目创建信息</h2>
              <button className="pm-overlay-close" onClick={() => setShowProjectInfoModal(false)}>×</button>
            </div>
            <div className="pm-overlay-content">
              <div className="form-grid" style={{ gap: 12 }}>
                <div className="form-field">
                  <label>项目名称 <span style={{ color: "var(--danger)" }}>*</span></label>
                  <input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="例如：my-awesome-project"
                  />
                </div>
                <div className="form-field">
                  <label>仓库路径 <span style={{ color: "var(--danger)" }}>*</span></label>
                  <input
                    value={projectPath}
                    onChange={(e) => setProjectPath(e.target.value)}
                    placeholder="例如：D:/work/my-project"
                  />
                </div>
                <div className="form-field">
                  <label>默认分支</label>
                  <input
                    value={projectBranch}
                    onChange={(e) => setProjectBranch(e.target.value)}
                    placeholder="main"
                  />
                </div>
                <div className="form-field">
                  <label>技术栈（AI 自动识别，可修改）</label>
                  <input
                    value={projectTechStack}
                    onChange={(e) => setProjectTechStack(e.target.value)}
                    placeholder="例如：React + Spring Boot"
                  />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
                <button className="btn" onClick={() => setShowProjectInfoModal(false)} type="button">取消</button>
                <button
                  className="btn accent-btn"
                  onClick={() => {
                    setShowProjectInfoModal(false);
                    handleCreateProject();
                  }}
                  disabled={!projectName.trim() || !projectPath.trim()}
                  type="button"
                >
                  确认并创建
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
    const canCreate = projectName.trim() && projectPath.trim() && !creating;
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

            <div className="confirm-summary">
              {/* 项目信息 */}
              <div className="summary-section">
                <h3>项目信息</h3>
                <div className="form-grid" style={{ gap: 12 }}>
                  <div className="form-field">
                    <label>项目名称</label>
                    <input
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="例如：my-awesome-project"
                    />
                  </div>
                  <div className="form-field">
                    <label>仓库路径</label>
                    <input
                      value={projectPath}
                      onChange={(e) => setProjectPath(e.target.value)}
                      placeholder="例如：D:/work/my-project"
                    />
                  </div>
                  <div className="form-field">
                    <label>默认分支</label>
                    <input
                      value={projectBranch}
                      onChange={(e) => setProjectBranch(e.target.value)}
                      placeholder="main"
                    />
                  </div>
                  <div className="form-field">
                    <label>Worktree 根目录</label>
                    <input
                      value={projectWorktree}
                      onChange={(e) => setProjectWorktree(e.target.value)}
                      placeholder=".claude/worktrees"
                    />
                  </div>
                  <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                    <label>技术栈</label>
                    <input
                      value={projectTechStack}
                      onChange={(e) => setProjectTechStack(e.target.value)}
                      placeholder="例如：React + Spring Boot + Flink"
                    />
                  </div>
                </div>
              </div>

              {/* 项目描述 */}
              <div className="summary-section">
                <h3>项目描述</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.6 }}>{draft!.productBrief}</p>
              </div>

              {/* 角色绑定 */}
              <div className="summary-section">
                <h3>流程角色绑定</h3>
                <div className="role-summary-grid">
                  {draft!.roles.map((role) => (
                    <div key={role.name} className="role-summary-item">
                      <Users size={14} />
                      <span>{role.name}</span>
                      <span className="badge">流程绑定</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 工作流步骤 */}
              <div className="summary-section">
                <h3>工作流步骤</h3>
                <div className="workflow-step-summary">
                  {flowBindings.map((binding, idx) => (
                    <div key={binding.step} className="step-summary-item">
                      <span className="step-no">{idx + 1}</span>
                      <span className="step-name">{binding.step}</span>
                      <span className="step-role">{binding.roles.join("、")}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 来源标识 */}
              <div className="summary-section">
                <h3>来源</h3>
                <div className="summary-item">
                  <strong>来源类型</strong>
                  <span className="badge badge-accent">AI 建项</span>
                </div>
                <div className="summary-item">
                  <strong>初始任务</strong>
                  <span>{draft!.tasks.length} 个任务（P0-P3）</span>
                </div>
                <div className="summary-item">
                  <strong>项目计划</strong>
                  <span>{draft!.projectPlan.length} 个阶段</span>
                </div>
              </div>
            </div>

            {apiError && (
              <div style={{ padding: "8px 12px", background: "rgba(248,81,73,0.1)", border: "1px solid rgba(248,81,73,0.3)", borderRadius: 4, color: "var(--danger)", fontSize: 13, marginBottom: 12 }}>
                {apiError}
              </div>
            )}

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
                disabled={!canCreate}
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
