import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronDown, GitBranch, History, List, Paperclip, Plus, Send, Sparkles, Trash2 } from "lucide-react";
import type { FailureStrategy, WorkbenchData, WorkflowStep, WorkflowTemplate } from "../domain/workbench";
import { useWorkbenchState } from "../state";
import { StepEditModal } from "./StepEditModal";

interface WorkflowBuilderProps {
  data: WorkbenchData;
  onBack?: () => void;
  selectedTemplateId?: string;
}

// Inline AI workflow design panels (no duplicate header)
function AiWorkflowDesignInline({
  data,
  chatMessages,
  setChatMessages,
  materials,
  setMaterials,
  draftSteps,
  setDraftSteps,
  onApply,
  onDiscard,
}: {
  data: WorkbenchData;
  chatMessages: { id: number; author: string; text: string; isUser: boolean; time: string }[];
  setChatMessages: React.Dispatch<React.SetStateAction<{ id: number; author: string; text: string; isUser: boolean; time: string }[]>>;
  materials: { name: string; ext: string }[];
  setMaterials: React.Dispatch<React.SetStateAction<{ name: string; ext: string }[]>>;
  draftSteps: WorkflowStep[];
  setDraftSteps: React.Dispatch<React.SetStateAction<WorkflowStep[]>>;
  onApply: (name: string, steps: WorkflowStep[], roles: { id: string; name: string; description: string; responsibilities?: string[]; deliverables?: string[]; roleMarkdown?: string }[]) => void;
  onDiscard: () => void;
}) {
  const [materialsExpanded, setMaterialsExpanded] = useState(true);
  const [composerText, setComposerText] = useState("");
  const [draftGenerated, setDraftGenerated] = useState(false);
  const [selectedDraftIndex, setSelectedDraftIndex] = useState(0);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [draftTitle, setDraftTitle] = useState("");

  // 版本管理
  const [draftVersions, setDraftVersions] = useState<{
    version: number;
    label: "draft" | "changed";
    savedAt: string;
    steps: WorkflowStep[];
    roles: typeof draftRoles;
  }[]>([]);
  const [showVersionPanel, setShowVersionPanel] = useState(false);

  const saveVersion = () => {
    setDraftVersions(prev => [...prev, {
      version: prev.length + 1,
      label: prev.length === 0 ? "draft" as const : "changed" as const,
      savedAt: new Date().toISOString(),
      steps: JSON.parse(JSON.stringify(draftSteps)),
      roles: JSON.parse(JSON.stringify(draftRoles)),
    }]);
  };

  const rollbackVersion = (v: typeof draftVersions[number]) => {
    setDraftSteps(JSON.parse(JSON.stringify(v.steps)));
    setDraftRoles(JSON.parse(JSON.stringify(v.roles)));
    setShowVersionPanel(false);
  };
  const [editingDraftStepId, setEditingDraftStepId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const materialInputRef = useRef<HTMLInputElement | null>(null);

  // 流程专属角色（由 AI 生成，不属于全局角色池）
  const [draftRoles, setDraftRoles] = useState<{ id: string; name: string; description: string; responsibilities?: string[]; deliverables?: string[]; roleMarkdown?: string }[]>([]);
  const [viewingRole, setViewingRole] = useState<{ id: string; name: string; description: string; responsibilities?: string[]; deliverables?: string[]; roleMarkdown?: string } | null>(null);

  // 画布缩放
  const [canvasScale, setCanvasScale] = useState(1);
  const ZOOM_STEP = 0.1;
  const ZOOM_MIN = 0.3;
  const ZOOM_MAX = 2;
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement | null>(null);

  // 画布拖拽平移（通过 transform translate 实现）
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.awd-node-v2, .awd-node-v2-delete')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - canvasOffset.x, y: e.clientY - canvasOffset.y });
  };
  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setCanvasOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handleCanvasMouseUp = () => setIsDragging(false);
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setCanvasScale(s => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, +(s + delta).toFixed(1))));
    }
  };
  const resetCanvasView = () => { setCanvasScale(1); setCanvasOffset({ x: 0, y: 0 }); };

  // 材料通知
  const [materialNotice, setMaterialNotice] = useState("");

  // 差异对比
  const [diffItems, setDiffItems] = useState<{ type: "add" | "mod" | "same"; title: string; desc: string }[]>([]);

  // 自动化校验（基于 draftSteps/draftRoles 计算）
  const validationResults = useMemo(() => {
    if (!draftGenerated || draftSteps.length === 0) return null;
    const results: { label: string; done: boolean; issues: string[] }[] = [];

    // 1. 步骤完整性检查
    const stepIssues: string[] = [];
    if (draftSteps.length < 2) stepIssues.push("至少需要 2 个步骤");
    draftSteps.forEach((s, i) => { if (!s.name?.trim()) stepIssues.push(`步骤 ${i + 1} 缺少名称`); });
    results.push({ label: "步骤完整性检查", done: stepIssues.length === 0, issues: stepIssues });

    // 2. 角色绑定检查
    const roleIssues: string[] = [];
    const roleIds = new Set(draftRoles.map(r => r.id));
    draftSteps.forEach((s, i) => {
      if (!s.roleId) { roleIssues.push(`步骤 ${i + 1}「${s.name}」未绑定角色`); }
      else if (!roleIds.has(s.roleId)) { roleIssues.push(`步骤 ${i + 1}「${s.name}」的角色不存在`); }
    });
    results.push({ label: "角色绑定检查", done: roleIssues.length === 0, issues: roleIssues });

    // 3. 模型配置检查
    const modelIssues: string[] = [];
    draftSteps.forEach((s, i) => {
      if (!s.modelProviderId || !s.modelName) modelIssues.push(`步骤 ${i + 1}「${s.name}」未配置模型`);
    });
    results.push({ label: "模型配置检查", done: modelIssues.length === 0, issues: modelIssues });

    // 4. Gate 配置检查
    const gateIssues: string[] = [];
    draftSteps.forEach((s, i) => {
      if (!['auto', 'manual'].includes(s.gateMode)) gateIssues.push(`步骤 ${i + 1}「${s.name}」的 Gate 配置无效`);
    });
    results.push({ label: "Gate 配置检查", done: gateIssues.length === 0, issues: gateIssues });

    // 5. Runner 配置检查
    const runnerIssues: string[] = [];
    draftSteps.forEach((s, i) => {
      if (!s.runnerId) runnerIssues.push(`步骤 ${i + 1}「${s.name}」未配置 Runner`);
    });
    results.push({ label: "Runner 配置检查", done: runnerIssues.length === 0, issues: runnerIssues });

    return results;
  }, [draftSteps, draftRoles, draftGenerated]);

  const allChecksDone = validationResults ? validationResults.every(r => r.done) : false;
  const [draftWorkflowMarkdown, setDraftWorkflowMarkdown] = useState("# AI 生成流程草案");
  const draftTemplate = useMemo<WorkflowTemplate>(() => ({
    id: "ai-draft-template",
    name: "AI 生成流程草案",
    version: 1,
    status: "draft",
    steps: draftSteps,
    workflowMarkdown: draftWorkflowMarkdown,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }), [draftSteps, draftWorkflowMarkdown]);

  const editingDraftStep = editingDraftStepId ? draftSteps.find((step) => step.id === editingDraftStepId) : null;

  // 从 roleId 提取角色名（优先查找流程专属角色，再查找全局角色池）
  const getRoleName = (roleId: string) => {
    if (!roleId) return "未绑定角色";
    const draftRole = draftRoles.find(r => r.id === roleId);
    if (draftRole) return draftRole.name;
    const globalRole = data.roles.find(r => r.id === roleId);
    return globalRole?.name ?? "未绑定角色";
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
      const projectNames = data.projects.length > 0 ? data.projects.map(p => p.name).join(", ") : "暂无项目";
      const materialsContext = materials.length > 0
        ? `上下文文件: ${materials.map(m => `${m.name}.${m.ext}`).join(", ")}`
        : "";
      const rolesHint = data.roles.length > 0
        ? `系统中已定义的全局角色（仅供参考，你可以建议任意角色）: ${data.roles.map(r => r.name).join(", ")}`
        : "";
      const workflowContext = [
        `当前项目: ${projectNames}`,
        materialsContext,
        rolesHint,
        `当前已有 ${draftSteps.length} 个草案步骤`,
      ].filter(Boolean).join("\n");

      // 构建聊天历史（AI 有上下文记忆）
      const historyMessages = chatMessages.map(msg => ({
        role: (msg.isUser ? "user" : "assistant") as "user" | "assistant",
        content: msg.text,
      }));

      // 调用 AI，使用专用的流程设计助手提示词
      const workflowDesignPrompt = `你是 AI 流程设计助手，帮助用户设计软件开发工作流程。

你的核心职责：
1. 引导用户讨论项目目标、技术选型、角色分工
2. 根据讨论内容建议合适的工作流步骤和角色
3. 回答用户关于流程设计的问题

回答要求：
- 重点关注：流程步骤拆分、角色定义（按实际需要细分，如前端开发/后端开发分开）、模型选择建议
- 如果用户提到角色细分（如前端后端分开、功能测试集成测试分开），明确认可并在建议中体现
- 给出具体的步骤建议时，说明每个步骤的角色、输入和输出
- 中文回答，简洁直接`;

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: workflowDesignPrompt },
            ...historyMessages,
            { role: "user", content: text },
          ],
          context: workflowContext,
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

      const rolesContext = ""; // 角色由 AI 根据讨论内容自行定义，不再使用预定义角色池

      // 构建聊天历史
      const historyMessages = chatMessages.map(msg => ({
        role: (msg.isUser ? "user" : "assistant") as "user" | "assistant",
        content: msg.text,
      }));

      // 构建可用模型列表
      const enabledProviders = data.modelProviders.filter(p => p.enabled);
      const modelsContext = enabledProviders.length > 0
        ? `可用模型 Provider（modelProvider 和 model 字段从中选取）：
${enabledProviders.map(p => `- ${p.name} (${p.id}): ${p.models.map(m => m.name).join(", ")} (默认: ${p.defaultModel})`).join("\n")}`
        : "";

      // 构建可用 Runner 列表
      const enabledRunners = (data.runnerProfiles ?? []).filter((r: { enabled: boolean }) => r.enabled);
      const runnersContext = enabledRunners.length > 0
        ? `可用 Runner（runner 字段从中选取）：
${enabledRunners.map((r: { displayName: string; id: string }) => `- ${r.displayName} (${r.id})`).join("\n")}`
        : "";

      // 生成指令：要求 JSON 格式输出
      const generateInstruction = `基于以上讨论内容，提炼并生成工作流程草案。

${projectContext}
${materialsContext}

${modelsContext}

${runnersContext}

你的回复必须且只能是一个合法的 JSON 对象（不要包含注释、尾部逗号、未转义的换行符），用 \`\`\`json 和 \`\`\` 包裹。结构如下：
\`\`\`json
{
  "title": "流程草案标题",
  "summary": "一句话概括该流程的目标",
  "roles": [
    {
      "id": "role-1",
      "name": "角色名称",
      "description": "角色职责描述",
      "responsibilities": ["职责1", "职责2"],
      "deliverables": ["输出物1"],
      "roleMarkdown": "# 角色名称\\n\\n## 职责\\n- 职责1\\n\\n## 输出物\\n- 输出物1"
    }
  ],
  "steps": [
    {
      "name": "步骤名称",
      "roleId": "role-1",
      "modelProvider": "provider-id",
      "model": "model-name",
      "runner": "runner-id",
      "gate": "auto",
      "inputs": ["输入项1"],
      "outputs": ["输出项1"],
      "failureStrategy": "stop"
    }
  ]
}
\`\`\`

字段约束：
- **roles**: 根据讨论内容提炼该流程专属的角色，角色完全由讨论内容决定，不依赖任何预定义角色
  - 每个角色有唯一 id（"role-1"、"role-2"...）、name、description、responsibilities（职责列表）、deliverables（输出物列表）、roleMarkdown（角色行为提示词，Markdown 格式，用 \\n 表示换行）
  - roleMarkdown 必须填写，内容应包含角色定位、核心职责、输入输出边界、验收标准等，作为该角色的系统提示词使用
  - 例如讨论了"前端开发"和"后端开发"，就应分别定义"前端开发专家"和"后端开发专家"两个角色，不要合并为"开发工程师"
  - 同一人可承担多个角色
- **steps**: 步骤数组，按执行顺序排列
  - **roleId**: 引用 roles 中的 id
  - **modelProvider/model/runner**: 从上面列出的可用资源中选取
  - **gate**: "auto" 或 "manual"
  - **failureStrategy**: "stop"、"retry"、"skip" 或 "fallback"
- 所有字符串值必须在一行内，用 \\n 表示换行，不要包含真实的换行符
- 数组和对象最后一个元素后面不要加逗号（禁止尾部逗号）
- 不要编造未讨论的内容`;

      // 调用 AI 生成
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...historyMessages, { role: "user", content: generateInstruction }],
          providerId: aiAssistantModel?.providerId,
          modelName: aiAssistantModel?.modelName,
        }),
      });

      const result = await response.json();

      if (result.ok && result.data?.content) {
        const content = result.data.content;

        // 尝试 JSON 解析
        interface DraftRole {
          id: string;
          name: string;
          description: string;
          responsibilities?: string[];
          deliverables?: string[];
          roleMarkdown?: string;
        }
        interface DraftStep {
          name: string;
          roleId?: string;
          role?: string; // fallback 旧格式
          model?: string;
          modelProvider?: string;
          runner?: string;
          gate?: string;
          inputs?: string[];
          outputs?: string[];
          failureStrategy?: string;
          stepMarkdown?: string;
        }
        interface DraftResult {
          title?: string;
          summary?: string;
          workflowMarkdown?: string;
          roles?: DraftRole[];
          steps: DraftStep[];
        }
        let draftResult: DraftResult | null = null;
        let steps: DraftStep[] = [];
        let parsedRoles: DraftRole[] = [];

        // 修复 JSON 中字符串值内的非法字符（裸换行、未转义引号、缺失逗号等）
        const repairJson = (raw: string): string => {
          // 第一步：逐字符处理，修复字符串内的非法字符
          let step1 = '';
          let inStr = false;
          let esc = false;
          for (let i = 0; i < raw.length; i++) {
            const ch = raw[i];
            if (esc) { step1 += ch; esc = false; continue; }
            if (ch === '\\' && inStr) { step1 += ch; esc = true; continue; }
            if (ch === '"') { inStr = !inStr; step1 += ch; continue; }
            if (inStr) {
              if (ch === '\n') { step1 += '\\n'; continue; }
              if (ch === '\r') { continue; }
              if (ch === '\t') { step1 += '\\t'; continue; }
            }
            step1 += ch;
          }

          // 第二步：逐字符扫描，构建修复后的 JSON
          let result = '';
          let inString = false;
          let escape = false;
          // 用栈跟踪上下文：当前是否在 object key 位置（{ 或 , 之后期望 key）
          let expectKey = false;
          for (let i = 0; i < step1.length; i++) {
            const ch = step1[i];

            if (escape) { result += ch; escape = false; continue; }
            if (ch === '\\' && inString) { result += ch; escape = true; continue; }
            if (ch === '"') {
              inString = !inString;
              result += ch;
              continue;
            }
            if (inString) { result += ch; continue; }

            // ---- 非字符串区域 ----
            // 跳过空白
            if (ch === ' ' || ch === '\n' || ch === '\r' || ch === '\t') { result += ch; continue; }

            // 遇到 { 或 [ 重置上下文
            if (ch === '{') { expectKey = true; result += ch; continue; }
            if (ch === '[') { expectKey = false; result += ch; continue; }

            // 遇到 , 根据上下文判断期望什么
            if (ch === ',') {
              // 看前一个非空白字符是否已经是 , 或 { 或 [ （多余逗号）
              let prevCh = '';
              for (let j = result.length - 1; j >= 0; j--) {
                if (result[j] !== ' ' && result[j] !== '\n' && result[j] !== '\r' && result[j] !== '\t') {
                  prevCh = result[j]; break;
                }
              }
              if (prevCh === ',' || prevCh === '{' || prevCh === '[') {
                // 多余逗号，跳过
                continue;
              }
              expectKey = false; // comma 后面可能是 key 也可能是 value，先不判断
              result += ch;
              continue;
            }

            // 遇到 } 或 ] — 移除前面的尾部逗号
            if (ch === '}' || ch === ']') {
              let j = result.length - 1;
              while (j >= 0 && (result[j] === ' ' || result[j] === '\n' || result[j] === '\r' || result[j] === '\t')) j--;
              if (j >= 0 && result[j] === ',') {
                // 移除逗号和空白
                while (j >= 0 && (result[j] === ' ' || result[j] === '\n' || result[j] === '\r' || result[j] === '\t' || result[j] === ',')) j--;
                result = result.substring(0, j + 1);
              }
              result += ch;
              continue;
            }

            // 遇到 : 标记接下来是 value
            if (ch === ':') { expectKey = false; result += ch; continue; }

            // 遇到值字符（" { [ 数字 true/false/null）— 检查是否需要补逗号
            if (ch === '"' || ch === '{' || ch === '[' || ch === '-' || (ch >= '0' && ch <= '9') || ch === 't' || ch === 'f' || ch === 'n') {
              // 找前一个非空白字符
              let prevCh = '';
              for (let j = result.length - 1; j >= 0; j--) {
                if (result[j] !== ' ' && result[j] !== '\n' && result[j] !== '\r' && result[j] !== '\t') {
                  prevCh = result[j]; break;
                }
              }
              // 值结束符后面直接跟值，需要补逗号
              const valueEndChars = ['"', ']', '}', 'e', 'l', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
              if (valueEndChars.includes(prevCh)) {
                result += ',';
              }
              result += ch;
              continue;
            }

            result += ch;
          }
          return result;
        };

        // 尝试提取并解析 JSON
        const extractJson = (text: string): object | null => {
          const candidates: string[] = [];
          // 1. code block
          const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (codeBlockMatch) candidates.push(codeBlockMatch[1]);
          // 2. raw { ... }
          const start = text.indexOf('{');
          const end = text.lastIndexOf('}');
          if (start !== -1 && end > start) {
            candidates.push(text.substring(start, end + 1));
          }

          // 3. 截断修复：如果 JSON 不完整（AI 输出被截断），尝试找到最后一个完整的 step 并闭合
          const truncationRepair = (raw: string): string | null => {
            // 找到 steps 数组的起始位置
            const stepsMatch = raw.match(/"steps"\s*:\s*\[/);
            if (!stepsMatch) return null;
            const stepsStart = raw.indexOf(stepsMatch[0]) + stepsMatch[0].length;

            // 从 steps 数组内开始，逐个找完整的 step 对象
            // 一个完整的 step 以 { 开始，以 } 结束，且内部没有未闭合的括号
            const steps: string[] = [];
            let pos = stepsStart;
            let depth = 0;
            let stepStart = -1;

            while (pos < raw.length) {
              const ch = raw[pos];
              if (ch === '"') {
                // 跳过字符串
                pos++;
                while (pos < raw.length) {
                  if (raw[pos] === '\\') { pos += 2; continue; }
                  if (raw[pos] === '"') break;
                  pos++;
                }
                pos++;
                continue;
              }
              if (ch === '{') {
                if (depth === 0) stepStart = pos;
                depth++;
              } else if (ch === '}') {
                depth--;
                if (depth === 0 && stepStart >= 0) {
                  steps.push(raw.substring(stepStart, pos + 1));
                  stepStart = -1;
                }
              }
              pos++;
            }

            if (steps.length === 0) return null;

            // 重新构建 JSON：用找到的完整 steps 闭合
            const prefix = raw.substring(0, stepsStart);
            const stepsJson = steps.join(',');
            // 闭合 steps 数组和外层对象（可能还有 roles 数组等）
            let closing = ']';

            // 检查 roles 是否完整
            const rolesMatch = raw.match(/"roles"\s*:\s*\[/);
            if (rolesMatch) {
              const rolesStart = raw.indexOf(rolesMatch[0]) + rolesMatch[0].length;
              // 在 steps 之前找到 roles 的内容
              if (rolesStart < stepsStart) {
                // roles 在 steps 前面，检查 roles 是否有完整的闭合
                const rolesSection = raw.substring(rolesStart, stepsStart);
                if (!rolesSection.includes(']')) {
                  // roles 未闭合，需要补上
                  // 找完整的 role 对象
                  const roleSteps: string[] = [];
                  let rpos = rolesStart;
                  let rdepth = 0;
                  let rstepStart = -1;
                  while (rpos < stepsStart) {
                    const rch = raw[rpos];
                    if (rch === '"') {
                      rpos++;
                      while (rpos < stepsStart) {
                        if (raw[rpos] === '\\') { rpos += 2; continue; }
                        if (raw[rpos] === '"') break;
                        rpos++;
                      }
                      rpos++;
                      continue;
                    }
                    if (rch === '{') {
                      if (rdepth === 0) rstepStart = rpos;
                      rdepth++;
                    } else if (rch === '}') {
                      rdepth--;
                      if (rdepth === 0 && rstepStart >= 0) {
                        roleSteps.push(raw.substring(rstepStart, rpos + 1));
                        rstepStart = -1;
                      }
                    }
                    rpos++;
                  }
                  if (roleSteps.length > 0) {
                    // 重建到 roles 部分之前
                    const rolesPrefixEnd = raw.indexOf(rolesMatch[0]);
                    const newPrefix = raw.substring(0, rolesPrefixEnd) + rolesMatch[0] + roleSteps.join(',') + '],\n  "steps": [';
                    return newPrefix + stepsJson + closing + '\n}';
                  }
                }
              }
            }

            return prefix + stepsJson + closing + '\n}';
          };

          for (const raw of candidates) {
            // 尝试多种修复策略，任一成功即返回
            const tryParse = (json: string): object | null => {
              try {
                const parsed = JSON.parse(json);
                if (parsed && typeof parsed === 'object' && Array.isArray(parsed.steps)) return parsed;
              } catch (_) {}
              return null;
            };

            // 1. 直接解析
            let result = tryParse(raw);
            if (result) return result;

            // 2. repairJson 修复
            result = tryParse(repairJson(raw));
            if (result) { console.log('[GenerateDraft] JSON repaired (step 2)'); return result; }

            // 3. 暴力正则修复
            try {
              let fixed = raw;
              fixed = fixed.replace(/"(?:[^"\\]|\\.)*"/g, (m) => m.replace(/\n/g, '\\n').replace(/\r/g, '').replace(/\t/g, '\\t'));
              fixed = fixed.replace(/,\s*([\]}])/g, '$1');
              fixed = fixed.replace(/(["\d\]])\s*\n\s*(["{\[])/g, '$1,\n$2');
              fixed = fixed.replace(/([{,])\s*,/g, '$1');
              result = tryParse(fixed);
              if (result) { console.log('[GenerateDraft] JSON repaired (step 3)'); return result; }
            } catch (_) {}

            // 4. 截断修复 — AI 输出被截断时，找到最后一个完整 step 并闭合 JSON
            const truncated = truncationRepair(raw);
            if (truncated) {
              result = tryParse(truncated);
              if (result) { console.log('[GenerateDraft] JSON repaired (truncation repair)'); return result; }
              // 截断修复后再走 repairJson
              result = tryParse(repairJson(truncated));
              if (result) { console.log('[GenerateDraft] JSON repaired (truncation + repair)'); return result; }
            }

            console.warn('[GenerateDraft] All repair strategies failed');
          }
          return null;
        };

        const parsed = extractJson(content);
        if (parsed) {
          draftResult = parsed as DraftResult;
          steps = (parsed as DraftResult).steps || [];
          if (Array.isArray((parsed as DraftResult).roles)) {
            parsedRoles = (parsed as DraftResult).roles!;
          }
        }

        // 如果没有解析到 roles，从 steps 中的 role/roleId 字段自动构建
        if (parsedRoles.length === 0) {
          const roleMap = new Map<string, DraftRole>();
          let roleCounter = 0;
          steps.forEach(step => {
            const roleName = step.role || step.roleId || "待分配";
            if (!roleMap.has(roleName)) {
              roleCounter++;
              roleMap.set(roleName, {
                id: `role-${roleCounter}`,
                name: roleName,
                description: `${roleName}相关职责`,
              });
            }
          });
          parsedRoles = Array.from(roleMap.values());
        }

        // 构建 roleMap 用于查找，并为每个角色生成 roleMarkdown
        const roleLookup = new Map(parsedRoles.map(r => {
          // 确保 roleMarkdown 始终有内容
          if (!r.roleMarkdown) {
            const parts = [
              `# ${r.name}`,
              "",
              `**描述：** ${r.description}`,
            ];
            if (r.responsibilities && r.responsibilities.length > 0) {
              parts.push("", "## 核心职责", ...r.responsibilities.map(item => `- ${item}`));
            }
            if (r.deliverables && r.deliverables.length > 0) {
              parts.push("", "## 输出物", ...r.deliverables.map(item => `- ${item}`));
            }
            r.roleMarkdown = parts.join("\n");
          }
          return [r.id, r] as const;
        }));

        // 构建 draftSteps
        const newSteps: WorkflowStep[] = [];
        const newDiffs: { type: "add" | "mod" | "same"; title: string; desc: string }[] = [];
        const defaultProvider = data.modelProviders.find(p => p.enabled) ?? data.modelProviders[0];
        const defaultRunnerId = (data.runnerProfiles ?? []).find((r: { enabled: boolean }) => r.enabled)?.id ?? "";
        const validFailureStrategies = ["stop", "retry", "skip", "fallback"] as const;

        steps.forEach((step, index) => {
          // 过滤掉无效步骤（JSON 片段、空名称、过长名称等）
          if (!step.name || typeof step.name !== 'string') return;
          const trimmedName = step.name.trim();
          if (trimmedName.length < 2 || trimmedName.length > 50) return;
          // 过滤掉看起来像 JSON 片段的名称
          if (trimmedName.startsWith('"') || trimmedName.startsWith('{') || trimmedName.startsWith('[') ||
              trimmedName.includes('```') || trimmedName.includes('undefined')) return;
          if (!step.name) return;
          // 解析 provider
          const provider = step.modelProvider
            ? data.modelProviders.find(p => p.id === step.modelProvider) ?? defaultProvider
            : defaultProvider;
          const modelLabel = step.model || provider?.defaultModel || "默认模型";

          // 解析 roleId：优先用 AI 返回的 roleId，否则用 role 名匹配
          let roleId = step.roleId || "";
          if (!roleId && step.role) {
            const matched = parsedRoles.find(r => r.name === step.role);
            roleId = matched ? matched.id : `role-${index + 1}`;
          }
          if (!roleId) roleId = `role-${index + 1}`;

          // 解析角色名
          const roleName = roleLookup.get(roleId)?.name || step.role || "待分配";

          // 解析 failureStrategy
          const strategy = validFailureStrategies.includes(step.failureStrategy as any)
            ? (step.failureStrategy as FailureStrategy) : "stop";

          // 生成 stepMarkdown
          const defaultMarkdown = step.stepMarkdown || [
            `# ${step.name}`,
            "",
            `**执行角色：** ${roleName}`,
            `**模型：** ${provider?.name ?? "默认"} / ${modelLabel}`,
            "",
            "## 输入",
            ...(step.inputs || (index === 0 ? ["项目目标", "协同资料"] : [`步骤 ${index} 输出`])).map(i => `- ${i}`),
            "",
            "## 输出",
            ...(step.outputs || [`${step.name}结果`]).map(o => `- ${o}`),
            "",
            "## 失败策略",
            strategy === "stop" ? "停止流程" : strategy === "retry" ? "重试当前步骤" : strategy === "skip" ? "跳过步骤" : "回退到前一步",
          ].join("\n");

          newSteps.push({
            id: `ai-draft-step-${index + 1}`,
            order: index + 1,
            name: step.name,
            roleId,
            modelProviderId: provider?.id ?? "",
            modelName: modelLabel,
            inputs: step.inputs || (index === 0 ? ["项目目标", "协同资料"] : [`步骤 ${index} 输出`]),
            outputs: step.outputs || [`${step.name}结果`],
            gateMode: step.gate === "manual" ? "manual" : "auto",
            failureStrategy: strategy,
            stepMarkdown: defaultMarkdown,
            projectOverride: false,
            runnerId: step.runner || defaultRunnerId,
          });

          newDiffs.push({
            type: "add",
            title: step.name,
            desc: `角色: ${roleName}, 模型: ${modelLabel}, Gate: ${step.gate || "auto"}`,
          });
        });

        if (newSteps.length > 0) {
          setDraftSteps(newSteps);
          setDraftRoles(parsedRoles);
          setDiffItems(newDiffs);
          setDraftGenerated(true);
          setDraftTitle(draftResult?.title || "");

          // 生成 workflowMarkdown
          const title = draftResult?.title || "AI 生成流程草案";
          const summary = draftResult?.summary || "";
          const rolesSection = parsedRoles.length > 0
            ? "\n\n## 角色分工\n" + parsedRoles.map(r => `- **${r.name}**: ${r.description}`).join("\n")
            : "";
          setDraftWorkflowMarkdown(`# ${title}\n\n${summary}${rolesSection}`);
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
              <div className="awd-insight-title">♙ 角色建议 <span className="awd-insight-badge">{draftGenerated && draftRoles.length > 0 ? `${draftRoles.length} 个角色` : "待分析"}</span></div>
              <div className="awd-insight-roles">
                {draftGenerated && draftRoles.length > 0 ? (
                  draftRoles.map((role, i) => (
                    <div
                      key={role.id}
                      className="awd-role-row"
                      style={{ cursor: "pointer", padding: "4px 6px", borderRadius: 4, transition: "background 0.15s" }}
                      onClick={() => setViewingRole(role)}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span className="awd-role-dot" style={{background: ["#4268d9","#7257cc","#2f9b68","#d17e34","#4d78e5","#9b4dca","#d94f4f"][i % 7]}}>
                          {role.name[0] || "未"}
                        </span>
                        <strong style={{ color: "#dce7f4", fontSize: 12 }}>{role.name}</strong>
                      </div>
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
            {/* 固定顶部工具栏 */}
            <div className="awd-canvas-toolbar-fixed">
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                <div className="awd-canvas-toolbar-group">
                  <button className="awd-zoom-btn" title="缩小" onClick={() => setCanvasScale(s => Math.max(ZOOM_MIN, s - ZOOM_STEP))}>−</button>
                  <span className="awd-zoom-pct">{Math.round(canvasScale * 100)}%</span>
                  <button className="awd-zoom-btn" title="放大" onClick={() => setCanvasScale(s => Math.min(ZOOM_MAX, s + ZOOM_STEP))}>+</button>
                  <button className="awd-zoom-btn" title="重置视图" onClick={resetCanvasView}>⊞</button>
                </div>
                <div className="awd-toolbar-sep" />
                <button className="awd-toolbar-action-btn" title="新增步骤" onClick={() => {
                  const newStep: WorkflowStep = { id: `step-new-${Date.now()}`, order: draftSteps.length + 1, name: '新步骤', roleId: '', modelProviderId: '', modelName: '', inputs: [], outputs: [], gateMode: 'auto', failureStrategy: 'retry', stepMarkdown: '', projectOverride: false };
                  setDraftSteps(prev => [...prev, newStep]);
                }}>
                  <Plus size={13} /> 新增步骤
                </button>
                <button className="awd-toolbar-action-btn" title="对齐">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h7"/></svg> 对齐
                </button>
                <button className="awd-toolbar-action-btn" title="版本管理" onClick={() => { saveVersion(); setShowVersionPanel(!showVersionPanel); }}>
                  <History size={13} /> 版本管理
                </button>
              </div>
            </div>
            {/* 画布区域 */}
            <div
              className={`awd-canvas${isDragging ? " dragging" : ""}`}
              ref={canvasRef}
              style={{ position: 'relative', cursor: isDragging ? 'grabbing' : 'grab' }}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              onWheel={handleWheel}
            >
              {/* 节点内容区 */}
              <div className="awd-canvas-transform" style={{ transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${canvasScale})`, transformOrigin: 'center center', transition: isDragging ? 'none' : 'transform 0.1s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, padding: '24px', minWidth: 'fit-content', minHeight: '100%' }}>
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
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 0, flexShrink: 0 }}>
                        <div
                          id={`awd-node-${i}`}
                          className={`awd-node-v2 ${stateClass}${i === selectedDraftIndex ? ' selected' : ''}`}
                          onClick={() => setSelectedDraftIndex(i)}
                          onDoubleClick={() => setEditingDraftStepId(step.id)}
                          title="双击编辑步骤"
                        >
                          <button className="awd-node-v2-delete" title="删除此步骤" onClick={(e) => {
                            e.stopPropagation();
                            setDraftSteps(prev => prev.filter((_, idx) => idx !== i));
                            setSelectedDraftIndex(prev => Math.max(0, Math.min(prev, draftSteps.length - 2)));
                          }}>
                            <Trash2 size={11} />
                          </button>
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
                        {i < draftSteps.length - 1 && <span className="awd-node-arrow" style={{ flexShrink: 0 }}><ArrowRight size={16} /></span>}
                      </div>
                    );
                  })
                )}
              </div>
              {/* 右下角缩略图 */}
              <div className="awd-minimap">
                <div style={{ display: 'flex', gap: 3, alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  {draftSteps.map((_, i) => (
                    <div key={i} style={{ width: 16, height: 12, background: i === 0 ? '#4268d9' : '#21262d', borderRadius: 2, border: i === selectedDraftIndex ? '1px solid #58a6ff' : '1px solid #30363d' }} />
                  ))}
                </div>
              </div>
              {/* 底部状态栏 */}
              <div className="awd-canvas-statusbar">
                <div className="awd-legend">
                  <span><span className="awd-legend-dot done" />已完成</span>
                  <span><span className="awd-legend-dot active" />运行中</span>
                  <span><span className="awd-legend-dot wait" />等待 Gate</span>
                  <span><span className="awd-legend-dot idle" />待开始</span>
                </div>
                <span>{draftSteps.length} 个步骤</span>
              </div>
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
            <h3>流程校验</h3>
            {validationResults ? (
              validationResults.map((item, i) => (
                <div key={i}>
                  <div className="awd-check-row" style={{ cursor: "default" }}>
                    <div className={`awd-check-box${item.done ? " done" : ""}`} style={item.done ? {} : { borderColor: "#f3ad3f", background: "rgba(243,173,63,0.12)" }}>
                      {item.done ? <Check size={10} /> : <span style={{ fontSize: 10, color: "#f3ad3f" }}>✗</span>}
                    </div>
                    <span style={{ color: item.done ? "#c1cddd" : "#f3ad3f" }}>{item.label}</span>
                  </div>
                  {item.issues.length > 0 && (
                    <div style={{ paddingLeft: 22, paddingBottom: 4 }}>
                      {item.issues.map((issue, j) => (
                        <div key={j} style={{ fontSize: 10, color: "#8d9bb0", lineHeight: 1.4 }}>· {issue}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="awd-empty-hint">生成草案后自动校验</p>
            )}
          </div>
          {showVersionPanel && (
            <div className="awd-checklist" style={{ borderTop: "1px solid #1e3a5f" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <h3 style={{ margin: 0 }}>版本历史</h3>
                <button
                  className="awd-btn awd-btn-apply"
                  style={{ fontSize: 10, padding: "2px 8px", height: 22 }}
                  onClick={() => saveVersion()}
                >
                  <Plus size={10} /> 保存快照
                </button>
              </div>
              {draftVersions.length === 0 ? (
                <p className="awd-empty-hint">暂无保存的版本</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 180, overflowY: "auto" }}>
                  {[...draftVersions].reverse().map((v, i) => {
                    const isCurrent = i === 0;
                    return (
                      <div
                        key={v.version}
                        style={{
                          display: "flex", alignItems: "center", gap: 8, padding: "6px 8px",
                          borderRadius: 6, border: isCurrent ? "1px solid #2d6a4f" : "1px solid #1e3a5f",
                          background: isCurrent ? "rgba(45,106,79,0.12)" : "transparent",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 11, color: "#c1cddd", fontWeight: 600 }}>v{v.version}</span>
                            <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: v.label === "draft" ? "#1e3a5f" : "#2d5a3f", color: "#8fc" }}>
                              {v.label}
                            </span>
                            {isCurrent && <span style={{ fontSize: 9, color: "#4caf50" }}>当前</span>}
                          </div>
                          <div style={{ fontSize: 9, color: "#6b7d95", marginTop: 2 }}>
                            {v.steps.length} 步骤 · {v.roles.length} 角色 · {new Date(v.savedAt).toLocaleString("zh-CN")}
                          </div>
                        </div>
                        {!isCurrent && (
                          <button
                            style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, border: "1px solid #f3ad3f", background: "transparent", color: "#f3ad3f", cursor: "pointer", whiteSpace: "nowrap" }}
                            onClick={() => { if (confirm(`恢复到 v${v.version}？当前未保存的更改将丢失。`)) rollbackVersion(v); }}
                          >
                            恢复
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          <div className="awd-diff-actions">
            {showSaveDialog ? (
              <div style={{ display: "flex", gap: 6, width: "100%", alignItems: "center" }}>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="输入流程名称..."
                  style={{ flex: 1, height: 36, padding: "0 10px", border: "1px solid #315992", borderRadius: 6, background: "#0b141f", color: "#dce7f4", fontSize: 12, outline: "none", fontFamily: "inherit" }}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && saveName.trim()) {
                      onApply(saveName.trim(), draftSteps, draftRoles);
                    }
                  }}
                />
                <button
                  className="awd-btn awd-btn-apply"
                  disabled={!saveName.trim()}
                  onClick={() => onApply(saveName.trim(), draftSteps, draftRoles)}
                >
                  <Check size={14} /> 保存
                </button>
                <button
                  className="awd-btn awd-btn-cancel"
                  onClick={() => setShowSaveDialog(false)}
                >
                  取消
                </button>
              </div>
            ) : (
              <>
                <button
                  className="awd-btn awd-btn-apply"
                  disabled={!draftGenerated || diffItems.length === 0 || !allChecksDone}
                  onClick={() => {
                    setSaveName(draftTitle || `流程草案 ${new Date().toLocaleDateString("zh-CN")}`);
                    setShowSaveDialog(true);
                  }}
                >
                  <Check size={14} /> 确认并应用
                </button>
                <button
                  className="awd-btn awd-btn-cancel"
                  disabled={!draftGenerated}
                  onClick={onDiscard}
                >
                  放弃草案
                </button>
              </>
            )}
          </div>
        </section>
      </div>
      {editingDraftStep && (
        <StepEditModal
          step={editingDraftStep}
          template={draftTemplate}
          data={data}
          flowRoles={draftRoles}
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

      {/* 角色详情弹窗 */}
      {viewingRole && (
        <div
          className="wf-role-modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setViewingRole(null)}
        >
          <div
            className="wf-role-modal"
            style={{ maxWidth: 480 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="wf-role-modal-header">
              <div>
                <h2 id="wf-role-modal-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="awd-role-dot" style={{
                    background: ["#4268d9","#7257cc","#2f9b68","#d17e34","#4d78e5","#9b4dca","#d94f4f"][draftRoles.findIndex(r => r.id === viewingRole.id) % 7],
                    width: 24,
                    height: 24,
                    fontSize: 12
                  }}>
                    {viewingRole.name[0] || "未"}
                  </span>
                  {viewingRole.name}
                </h2>
                <p style={{ color: "#8d9bb0", marginTop: 4 }}>{viewingRole.description}</p>
              </div>
              <button
                className="wf-modal-close"
                onClick={() => setViewingRole(null)}
                style={{ background: "none", border: "none", color: "#8d9bb0", cursor: "pointer", fontSize: 18 }}
              >
                ✕
              </button>
            </div>
            <div className="wf-role-modal-body" style={{ padding: 16 }}>
              {viewingRole.responsibilities && viewingRole.responsibilities.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <h3 style={{ fontSize: 12, color: "#c1cddd", marginBottom: 6 }}>职责范围</h3>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {viewingRole.responsibilities.map((r, i) => (
                      <span key={i} style={{
                        fontSize: 11,
                        padding: "3px 8px",
                        border: "1px solid #2d6a4f",
                        borderRadius: 4,
                        color: "#8fc",
                        background: "rgba(45,106,79,0.12)"
                      }}>{r}</span>
                    ))}
                  </div>
                </div>
              )}
              {viewingRole.deliverables && viewingRole.deliverables.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <h3 style={{ fontSize: 12, color: "#c1cddd", marginBottom: 6 }}>交付物</h3>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {viewingRole.deliverables.map((d, i) => (
                      <span key={i} style={{
                        fontSize: 11,
                        padding: "3px 8px",
                        border: "1px solid #315992",
                        borderRadius: 4,
                        color: "#dce7f4",
                        background: "rgba(49,89,146,0.12)"
                      }}>{d}</span>
                    ))}
                  </div>
                </div>
              )}
              {viewingRole.roleMarkdown && (
                <div style={{ marginTop: 12 }}>
                  <h3 style={{ fontSize: 12, color: "#c1cddd", marginBottom: 6 }}>详细定义</h3>
                  <div style={{
                    fontSize: 11,
                    lineHeight: 1.6,
                    color: "#8d9bb0",
                    whiteSpace: "pre-wrap",
                    background: "rgba(17,26,37,0.62)",
                    padding: 10,
                    borderRadius: 6,
                    border: "1px solid #1e3a5f"
                  }}>
                    {viewingRole.roleMarkdown}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
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
    addRolesBatch,
  } = useWorkbenchState();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(initialTemplateId ?? data.workflowTemplates[0]?.id ?? "");
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleDraft, setRoleDraft] = useState({ name: "", description: "", roleMarkdown: "" });
  const [pendingTemplateName, setPendingTemplateName] = useState<string | null>(null);
  const [pendingRoleName, setPendingRoleName] = useState<string | null>(null);
  const [renamingTemplateId, setRenamingTemplateId] = useState<string | null>(null);
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

  // AI 流程设计状态（提升到父组件，切换页面时不丢失）
  const [aiChatMessages, setAiChatMessages] = useState<{ id: number; author: string; text: string; isUser: boolean; time: string }[]>([]);
  const [aiMaterials, setAiMaterials] = useState<{ name: string; ext: string }[]>([]);
  const [aiDraftSteps, setAiDraftSteps] = useState<WorkflowStep[]>([]);

  // 版本管理（常规模式）
  const [templateVersions, setTemplateVersions] = useState<{
    version: number;
    label: string;
    savedAt: string;
    templateId: string;
    steps: WorkflowStep[];
    templateName: string;
  }[]>([]);
  const [showTemplateVersionPanel, setShowTemplateVersionPanel] = useState(false);

  const saveTemplateVersion = () => {
    if (!selectedTemplate) return;
    setTemplateVersions(prev => [...prev, {
      version: prev.filter(v => v.templateId === selectedTemplate.id).length + 1,
      label: `v${(prev.filter(v => v.templateId === selectedTemplate.id).length + 1)}`,
      savedAt: new Date().toISOString(),
      templateId: selectedTemplate.id,
      steps: JSON.parse(JSON.stringify(sortedSteps)),
      templateName: selectedTemplate.name,
    }]);
  };

  const rollbackTemplateVersion = (v: typeof templateVersions[number]) => {
    if (!selectedTemplate) return;
    // 恢复步骤到快照状态
    v.steps.forEach((step, i) => {
      updateWorkflowStep(selectedTemplate.id, step.id, { ...step, order: i + 1 });
    });
    setShowTemplateVersionPanel(false);
  };

  // 画布缩放和平移
  const [canvasScale, setCanvasScale] = useState(1);
  const ZOOM_STEP = 0.1;
  const ZOOM_MIN = 0.3;
  const ZOOM_MAX = 2;
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.wf-v2-node, .wf-v2-insert-step, .wf-v2-node-delete')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - canvasOffset.x, y: e.clientY - canvasOffset.y });
  };
  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setCanvasOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handleCanvasMouseUp = () => setIsDragging(false);
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setCanvasScale(s => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, +(s + delta).toFixed(1))));
    }
  };
  const resetCanvasView = () => { setCanvasScale(1); setCanvasOffset({ x: 0, y: 0 }); };

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
    if (!template) return;
    const current = template.status ?? (data.workflowTemplates[0]?.id === templateId ? "enabled" : "draft");
    if (current === "enabled" && !confirm(`「${template.name}」是正式流程，确认删除？`)) return;
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
            <span className="wf-v2-version-dot" /> {selectedTemplate ? `v${selectedTemplate.version} · ${templateStatusText}` : "v1.0"}
            {templateVersions.filter(v => v.templateId === selectedTemplateId).length > 0 && ` · ${templateVersions.filter(v => v.templateId === selectedTemplateId).length} 个快照`}
          </span>
        </div>
        <div className="wf-v2-topbar-right">
          {selectedTemplate && templateStatus === "draft" && (
            <button
              className="wf-v2-btn wf-v2-btn-start"
              type="button"
              onClick={() => {
                if (confirm(`确认将「${selectedTemplate.name}」发布为正式流程？`)) {
                  updateWorkflowTemplate?.(selectedTemplate.id, { status: "enabled" });
                }
              }}
              title="将草稿流程发布为正式流程"
            >
              <Check size={14} /> 发布为正式
            </button>
          )}
          {selectedTemplate && templateStatus !== "draft" && (
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
          <button className="wf-v2-btn" onClick={() => {
            if (!selectedTemplate || mode === "ai") return;
            const issues: string[] = [];
            if (sortedSteps.length === 0) issues.push("流程没有任何步骤");
            sortedSteps.forEach((s, i) => {
              if (!s.name?.trim()) issues.push(`步骤 ${i + 1} 缺少名称`);
              if (!s.roleId) issues.push(`步骤 ${i + 1}「${s.name}」未绑定角色`);
              if (!s.modelProviderId || !s.modelName) issues.push(`步骤 ${i + 1}「${s.name}」未配置模型`);
              if (!s.runnerId) issues.push(`步骤 ${i + 1}「${s.name}」未配置 Runner`);
            });
            if (issues.length === 0) alert(`✓ 校验通过\n「${selectedTemplate.name}」共 ${sortedSteps.length} 个步骤，全部校验通过。`);
            else alert(`⚠ 校验发现 ${issues.length} 个问题：\n\n${issues.join('\n')}`);
          }}>✓ 校验流程</button>
          <button className="wf-v2-btn wf-v2-btn-primary" disabled={mode === "manual" && templateEnabled} onClick={() => {
            if (!selectedTemplate) return;
            updateWorkflowTemplate?.(selectedTemplate.id, {
              steps: sortedSteps,
              updatedAt: new Date().toISOString(),
            });
            alert(`已保存「${selectedTemplate.name}」`);
          }}>保存流程</button>
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
          <span>当前版本 {selectedTemplate ? `v${selectedTemplate.version}` : "—"}</span>
          {selectedTemplate && mode === "manual" && <span className={`wf-v2-status-badge ${templateStatusColor}`}>{templateStatusText}</span>}
          {templateVersions.filter(v => v.templateId === selectedTemplateId).length > 0 && (
            <span><span className="wf-v2-status-dot" style={{ background: "#4caf50" }} /> {templateVersions.filter(v => v.templateId === selectedTemplateId).length} 个版本快照</span>
          )}
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
                    {renamingTemplateId === t.id ? (
                      <input
                        type="text"
                        defaultValue={t.name}
                        autoFocus
                        style={{ flex: 1, height: 22, padding: "0 4px", border: "1px solid #5b82ff", borderRadius: 4, background: "#0b141f", color: "#dce7f4", fontSize: 12, outline: "none", fontFamily: "inherit" }}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const newName = (e.target as HTMLInputElement).value.trim();
                            if (newName && t.id !== "blank-template") {
                              updateWorkflowTemplate?.(t.id, { name: newName });
                            }
                            setRenamingTemplateId(null);
                          }
                          if (e.key === "Escape") setRenamingTemplateId(null);
                        }}
                        onBlur={(e) => {
                          const newName = e.target.value.trim();
                          if (newName && t.id !== "blank-template" && newName !== t.name) {
                            updateWorkflowTemplate?.(t.id, { name: newName });
                          }
                          setRenamingTemplateId(null);
                        }}
                      />
                    ) : (
                      <span
                        onDoubleClick={(e) => {
                          if (t.dashed) return;
                          e.stopPropagation();
                          setRenamingTemplateId(t.id);
                        }}
                        title="双击修改名称"
                        style={{ cursor: t.dashed ? "default" : "text" }}
                      >
                        {t.name}
                      </span>
                    )}
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
                            disabled={false}
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
                <div className="awd-canvas-zoom-ctrl" style={{ position: "relative", top: "auto", right: "auto" }}>
                  <button className="awd-zoom-btn" title="缩小" onClick={() => setCanvasScale(s => Math.max(ZOOM_MIN, s - ZOOM_STEP))}>−</button><span className="awd-zoom-pct">{Math.round(canvasScale * 100)}%</span><button className="awd-zoom-btn" title="放大" onClick={() => setCanvasScale(s => Math.min(ZOOM_MAX, s + ZOOM_STEP))}>+</button><button className="awd-zoom-btn" title="重置视图" onClick={resetCanvasView}>⊞</button>
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
                  <button className="awd-zoom-btn" style={{width:"auto",padding:"0 8px",gap:4}} onClick={() => setShowTemplateVersionPanel(!showTemplateVersionPanel)} title="版本管理"><History size={13} /> 版本管理</button>
                </div>
              </div>
            </div>
            <div
              className={`wf-v2-canvas-area${isDragging ? " dragging" : ""}`}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              onWheel={handleWheel}
            >
                {selectedTemplate ? (
                  <>
                    <div className="wf-v2-node-track" style={{ transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${canvasScale})`, transformOrigin: 'top left', transition: isDragging ? 'none' : 'transform 0.1s ease' }}>
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

      {/* ===== VERSION PANEL (Manual Mode) ===== */}
      {mode === "manual" && showTemplateVersionPanel && selectedTemplate && (
        <div style={{
          position: "fixed", right: 16, bottom: 60, width: 320,
          background: "#0d1b2a", border: "1px solid #1e3a5f", borderRadius: 10,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)", zIndex: 100, overflow: "hidden",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: "1px solid #1e3a5f" }}>
            <h3 style={{ margin: 0, fontSize: 13, color: "#c1cddd" }}>版本历史 · {selectedTemplate.name}</h3>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, border: "1px solid #2d6a4f", background: "transparent", color: "#8fc", cursor: "pointer" }}
                onClick={saveTemplateVersion}
              >
                <Plus size={10} /> 保存快照
              </button>
              <button style={{ background: "none", border: "none", color: "#8d9bb0", cursor: "pointer", fontSize: 14 }} onClick={() => setShowTemplateVersionPanel(false)}>✕</button>
            </div>
          </div>
          <div style={{ maxHeight: 280, overflowY: "auto", padding: 8 }}>
            {templateVersions.filter(v => v.templateId === selectedTemplate.id).length === 0 ? (
              <p style={{ fontSize: 11, color: "#6b7d95", textAlign: "center", padding: 20 }}>暂无保存的版本，点击「保存快照」创建</p>
            ) : (
              [...templateVersions.filter(v => v.templateId === selectedTemplate.id)].reverse().map((v, i) => {
                const isCurrent = i === 0;
                return (
                  <div key={v.version} style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", marginBottom: 4,
                    borderRadius: 6, border: isCurrent ? "1px solid #2d6a4f" : "1px solid #1e3a5f",
                    background: isCurrent ? "rgba(45,106,79,0.12)" : "transparent",
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 12, color: "#c1cddd", fontWeight: 600 }}>{v.label}</span>
                        {isCurrent && <span style={{ fontSize: 9, color: "#4caf50" }}>当前</span>}
                      </div>
                      <div style={{ fontSize: 10, color: "#6b7d95", marginTop: 2 }}>
                        {v.steps.length} 步骤 · {new Date(v.savedAt).toLocaleString("zh-CN")}
                      </div>
                    </div>
                    {!isCurrent && (
                      <button
                        style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, border: "1px solid #f3ad3f", background: "transparent", color: "#f3ad3f", cursor: "pointer", whiteSpace: "nowrap" }}
                        onClick={() => { if (confirm(`恢复到 ${v.label}？当前未保存的更改将丢失。`)) rollbackTemplateVersion(v); }}
                      >
                        恢复
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
      {mode === "ai" && (
        <AiWorkflowDesignInline
          data={data}
          chatMessages={aiChatMessages}
          setChatMessages={setAiChatMessages}
          materials={aiMaterials}
          setMaterials={setAiMaterials}
          draftSteps={aiDraftSteps}
          setDraftSteps={setAiDraftSteps}
          onApply={async (name, steps, roles) => {
            // 先保存角色到全局角色池
            if (roles.length > 0 && addRolesBatch) {
              const savedRoles = await addRolesBatch(roles.map(r => ({
                id: r.id,
                projectId: null,
                name: r.name,
                description: r.description,
                roleMarkdown: r.roleMarkdown || '',
                isBuiltIn: false,
                defaultCapabilities: [],
              })));
              console.log('[WorkflowBuilder] Roles saved to global pool:', savedRoles?.length || 0);
            }
            // 再保存模板
            const saved = await addWorkflowTemplate({
              name,
              version: 1,
              status: "draft",
              steps: steps.map((s, i) => ({ ...s, order: i + 1 })),
              workflowMarkdown: `# ${name}\n\n由 AI 流程设计生成。`,
              roles: roles.map(r => ({
                id: r.id,
                name: r.name,
                description: r.description,
                responsibilities: r.responsibilities,
                deliverables: r.deliverables,
                roleMarkdown: r.roleMarkdown,
              })),
            });
            if (saved) {
              console.log('[WorkflowBuilder] Template saved:', saved.id, 'with', saved.roles?.length || 0, 'roles');
            }
            setMode("manual");
          }}
          onDiscard={() => {
            setAiDraftSteps([]);
            setAiChatMessages([]);
          }}
        />
      )}

      {editingStep && selectedTemplate && (
        <StepEditModal
          step={editingStep}
          template={selectedTemplate}
          data={data}
          flowRoles={boundRoles.map(({ role }) => role)}
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
