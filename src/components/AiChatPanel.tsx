import { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, Send, Zap, Loader2 } from "lucide-react";
import type { WorkbenchView, WorkbenchData } from "../domain/workbench";
import { useWorkbenchState } from "../state";
import { aiApi, checkServerAvailable, type ChatMessage as ApiChatMessage } from "../services/api";

interface AiChatPanelProps {
  view: WorkbenchView;
  data: WorkbenchData;
  onNavigate?: (view: WorkbenchView) => void;
  contextMode?: string;
}

/**
 * 获取配置的 AI 助手模型信息
 */
function getAiAssistantModelInfo(data: WorkbenchData): { providerId: string; modelName: string } | null {
  if (!data.aiAssistantModel) {
    return null;
  }

  // 验证 provider 存在且有 API Key
  const provider = data.modelProviders.find(p => p.id === data.aiAssistantModel?.providerId);
  if (!provider || provider.apiKeyStatus !== 'configured') {
    return null;
  }

  return {
    providerId: data.aiAssistantModel.providerId,
    modelName: data.aiAssistantModel.modelName,
  };
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  /** Optional action metadata attached to an assistant response */
  action?: {
    type: "check-config" | "save-role-md" | "create-workflow" | "save-project-md" | "save-memory" | "navigate";
    label: string;
    payload?: unknown;
  };
}

function viewLabel(view: WorkbenchView): string {
  switch (view) {
    case "workbench":
      return "工作台总览";
    case "project-management":
      return "项目管理";
    case "ai-briefing":
      return "AI 建项";
    case "project-detail":
      return "项目详情";
    case "project-workspace":
      return "项目工作区";
    case "workflows":
      return "工作流管理";
    case "memory":
      return "记忆管理";
    case "ai-workflow-design":
      return "AI 流程设计";
    case "settings":
      return "设置中心";
    default:
      return "";
  }
}

/** Quick suggestion chips per page context */
function contextSuggestions(view: WorkbenchView, contextMode?: string): string[] {
  // Workflow design mode takes priority
  if (contextMode === "流程设计模式") {
    return ["从项目计划生成流程", "优化当前流程步骤", "检查流程配置完整性"];
  }
  switch (view) {
    case "workbench":
      return ["查看项目进度", "检查等待决策", "生成周报"];
    case "project-management":
      return ["新建项目", "导入已有项目", "查看项目概览"];
    case "ai-briefing":
      return ["解释项目目标", "补充角色定义", "优化工作流"];
    case "project-detail":
      return ["检查项目进度", "查看风险", "查看角色流程"];
    case "project-workspace":
      return ["生成项目MD", "检查配置", "查看Git状态"];
    case "workflows":
      return ["检查工作流配置", "生成角色MD", "优化流程"];
    case "memory":
      return ["总结记忆", "清理旧记忆"];
    case "settings":
      return ["检查模型配置", "推荐优化"];
    default:
      return [];
  }
}

function welcomeMessage(view: WorkbenchView, contextMode?: string): string {
  if (contextMode === "流程设计模式") {
    return "你好！这是流程设计模式。你可以：\n- 基于项目计划或文档生成流程步骤\n- 优化当前流程结构和角色分配\n- 检查步骤配置的完整性和一致性";
  }
  switch (view) {
    case "workbench":
      return "你好！这是工作台总览页面。我可以帮你：\n- 检查项目配置是否完整\n- 为新任务生成角色定义\n- 为新类型项目设计工作流";
    case "project-management":
      return "你好！你在项目管理页面。我可以帮你：\n- 分析现有项目的任务分布\n- 建议下一步任务优先级\n- 检查项目配置完整性";
    case "ai-briefing":
      return "你好！这是 AI 建项页。我可以帮你：\n- 从讨论或文档生成项目草案\n- 追问澄清项目需求\n- 生成角色、工作流和项目计划";
    case "project-detail":
      return "你好！这是项目详情页。我可以帮你：\n- 查看当前项目进度\n- 分析项目风险和决策\n- 查看角色和流程配置";
    case "project-workspace":
      return "你好！你已进入项目工作区。我可以帮你：\n- 生成或编辑项目文档\n- 查看当前项目的角色分工\n- 分析任务执行状态";
    case "workflows":
      return "你好！这是工作流画布。我可以帮你：\n- 设计新的工作流模板\n- 优化现有流程步骤\n- 检查流程配置完整性";
    case "memory":
      return "你好！这是记忆管理页面。我可以帮你：\n- 分析记忆覆盖情况\n- 建议需要沉淀的记忆\n- 整理项目长期记忆";
    case "ai-workflow-design":
      return "你好！这是 AI 流程设计页。我可以帮你：\n- 从项目计划生成流程草案\n- 解析协同文件和设计文档\n- 对比流程差异并确认应用";
    case "settings":
      return "你好！这是设置中心。我可以帮你：\n- 检查模型供应商配置\n- 查看能力中心授权状态\n- 配置 IM 适配器和 Git 认证";
    default:
      return "";
  }
}

let msgCounter = 0;
function nextMsgId(): string {
  msgCounter += 1;
  return `chat-msg-${msgCounter}`;
}

export function AiChatPanel({ view, data, onNavigate, contextMode }: AiChatPanelProps) {
  const { addMemory, addWorkflowStep } = useWorkbenchState();
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: nextMsgId(),
      role: "assistant",
      text: welcomeMessage(view, contextMode),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [serverAvailable, setServerAvailable] = useState<boolean | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Check server availability on mount
  useEffect(() => {
    checkServerAvailable().then(setServerAvailable);
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages]);

  // Detect view changes and prepend welcome for the new view
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length > 0 && prev[0].role === "assistant" && prev[0].text === welcomeMessage(view, contextMode)) {
        return prev;
      }
      return [
        {
          id: nextMsgId(),
          role: "assistant",
          text: welcomeMessage(view, contextMode),
        },
        ...prev.slice(-20),
      ];
    });
  }, [view, contextMode]);

  const generateResponse = useCallback(
    (userText: string): ChatMessage => {
      const lower = userText.toLowerCase();

      // Intent: 检查配置 / 检查模型 / 检查设置
      if (lower.includes("检查配置") || lower.includes("检查模型") || lower.includes("检查设置")) {
        const missingProviders = data.modelProviders.filter((p) => p.apiKeyStatus === "missing");
        const missingMqcs = data.mcpServers.filter((s) => s.status === "missing-config");
        const parts: string[] = [];

        if (missingProviders.length > 0) {
          parts.push(`**模型供应商配置缺失**\n${missingProviders.map((p) => p.name).join("、")} 的 API Key 未配置。`);
        }
        if (missingMqcs.length > 0) {
          parts.push(`**MCP 服务配置缺失**\n${missingMqcs.map((s) => s.name).join("、")} 缺少必要的环境变量。`);
        }

        // Check roles without MD
        const rolesWithoutMd = data.roles.filter((r) => !r.roleMarkdown?.trim());
        if (rolesWithoutMd.length > 0) {
          parts.push(`**角色 Prompt 缺失**\n${rolesWithoutMd.map((r) => r.name).join("、")} 没有设定行为 Prompt。`);
        }

        if (parts.length === 0) {
          return {
            id: nextMsgId(),
            role: "assistant",
            text: "检查完成！当前所有模型供应商 API Key 已配置，MCP 服务环境变量正常，角色 Prompt 已就绪。",
          };
        }

        return {
          id: nextMsgId(),
          role: "assistant",
          text: `配置检查发现以下问题：\n\n${parts.join("\n\n")}`,
          action: {
            type: "check-config",
            label: "前往设置",
          },
        };
      }

      // Intent: 生成角色 MD / 写角色 / 创建角色 prompt
      if ((lower.includes("生成") || lower.includes("写") || lower.includes("创建")) && lower.includes("角色")) {
        const roleName = userText.replace(/生成|写|创建|帮我|一个|新|的|能不能|可以|prompt|MD/g, "").trim() || "新角色";
        const existingRole = data.roles.find((r) => r.name.includes(roleName));
        const targetName = existingRole ? existingRole.name : roleName;
        const md = `# ${targetName}\\n\n**角色描述：** 由 AI 工程助手生成。\n\n## 核心职责\n- 职责一\n- 职责二\n- 职责三\n\n## 工作流程\n1. 接收任务 → 2. 分析需求 → 3. 执行操作 → 4. 输出结果\n\n## 输出物\n- 主要交付物`;
        return {
          id: nextMsgId(),
          role: "assistant",
          text: `已为你生成角色定义：\n\n\`\`\`markdown\n${md}\n\`\`\``,
          action: {
            type: "save-role-md",
            label: "保存角色定义",
            payload: { roleId: existingRole?.id, name: targetName, markdown: md },
          },
        };
      }

      // Intent: 生成项目 MD / 项目概况 / 项目总结
      if ((lower.includes("生成") || lower.includes("写")) && (lower.includes("项目") && (lower.includes("md") || lower.includes("概况") || lower.includes("总结")))) {
        const project = data.projects[0];
        if (project) {
          const md = `# ${project.name} 项目上下文\n\n## 基本信息\n- 仓库路径：${project.repoPath || "未配置"}\n- 技术栈：${project.settings?.detectedStack || "未检测"}\n\n## 构建命令\n- 安装：${project.settings?.installCommand || "npm install"}\n- 测试：${project.settings?.testCommand || "npm test"}\n- 构建：${project.settings?.buildCommand || "npm run build"}\n\n## 角色分工\n${data.roles.map((r) => `- ${r.name}：${r.description || "暂无描述"}`).join("\n")}\n\n## 注意事项\n- 此文档由 AI 工程助手自动生成`;
          return {
            id: nextMsgId(),
            role: "assistant",
            text: `已为你生成项目文档：\n\n\`\`\`markdown\n${md}\n\`\`\``,
            action: {
              type: "save-project-md",
              label: "保存项目 MD",
              payload: { projectId: project.id, markdown: md },
            },
          };
        }
        return {
          id: nextMsgId(),
          role: "assistant",
          text: "当前没有活跃项目，无法生成项目 MD。请先选择或创建一个项目。",
        };
      }

      // Intent: 设计流程 / 工作流
      if ((lower.includes("设计") || lower.includes("画")) && (lower.includes("流程") || lower.includes("工作流"))) {
        const flowName = userText.replace(/设计|画|帮我|一个|新|的|能不能|可以|流程|工作流/g, "").trim() || "新流程";
        return {
          id: nextMsgId(),
          role: "assistant",
          text: `已为你设计工作流模板「${flowName}」：\n\n1. **需求分析** (产品经理) — 人工决策\n2. **方案设计** (设计师) — 人工决策\n3. **开发实现** (前端工程师) — 自动继续\n4. **代码审查** (审查员) — 人工决策\n5. **测试验证** (测试工程师) — 人工决策`,
          action: {
            type: "create-workflow",
            label: "创建工作流",
            payload: { name: flowName },
          },
        };
      }

      // Intent: 保存记忆 / 记住
      if ((lower.includes("保存") || lower.includes("记住")) && lower.includes("记忆")) {
        const text = userText.replace(/保存|记住|帮我|记忆|到|中/g, "").trim();
        return {
          id: nextMsgId(),
          role: "assistant",
          text: `好的，我将保存以下记忆：\n\n> ${text || "（已提取的内容）"}\n\n点击下方按钮确认保存。`,
          action: {
            type: "save-memory",
            label: "确认保存",
            payload: { body: text || "由 AI 助手保存的记忆" },
          },
        };
      }

      // Intent: 跳转页面 / 打开页面
      if (lower.includes("跳转") || lower.includes("打开")) {
        const viewMap: Record<string, WorkbenchView> = {
          "工作台": "workbench",
          "项目管理": "project-management",
          "项目工作区": "project-workspace",
          "工作流": "workflows",
          "画布": "workflows",
          "记忆": "memory",
          "设置": "settings",
        };
        const matchedView = Object.entries(viewMap).find(([label]) => lower.includes(label.toLowerCase()));
        if (matchedView) {
          return {
            id: nextMsgId(),
            role: "assistant",
            text: `正在为你跳转到「${matchedView[0]}」页面。`,
            action: {
              type: "navigate",
              label: `前往${matchedView[0]}`,
              payload: { view: matchedView[1] },
            },
          };
        }
        return {
          id: nextMsgId(),
          role: "assistant",
          text: "可以跳转到以下页面：工作台、项目管理、项目工作区、工作流、记忆、设置。请告诉我你想去哪个页面？",
        };
      }

      // Intent: 查看项目 / 项目进度
      if (lower.includes("查看项目") || lower.includes("项目进度") || lower.includes("查看进度")) {
        const project = data.projects[0];
        if (project) {
          const template = data.workflowTemplates[0];
          const totalSteps = template?.steps.length ?? 0;
          return {
            id: nextMsgId(),
            role: "assistant",
            text: `当前项目「${project.name}」：\n\n- 工作流步骤：${totalSteps} 个\n- 角色：${data.roles.length} 个\n- 任务：${data.tasks.length} 个\n\n需要查看更多详情吗？`,
          };
        }
        return {
          id: nextMsgId(),
          role: "assistant",
          text: "当前没有活跃项目。",
        };
      }

      // Default response
      return {
        id: nextMsgId(),
        role: "assistant",
        text: `收到你的问题。当前我可以帮你：\n- **检查配置**：输入"检查配置"查看缺失项\n- **生成角色**：输入"生成一个角色"创建角色定义\n- **生成项目MD**：输入"生成项目MD"创建项目文档\n- **设计流程**：输入"设计一个流程"生成工作流模板\n- **保存记忆**：输入"保存记忆"存储信息\n- **跳转页面**：输入"打开设置"等跳转\n\n也可以点击下方快捷按钮。`,
      };
    },
    [data]
  );

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = { id: nextMsgId(), role: "user", text: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // Build context for API
    const contextInfo = `当前页面: ${viewLabel(view)}
项目数量: ${data.projects.length}
角色数量: ${data.roles.length}
任务数量: ${data.tasks.length}`;

    // 根据页面场景生成专用 system prompt
    const systemPrompts: Record<string, string> = {
      "workbench": "你是工程管理助手。帮助用户查看项目进度、检查配置完整性、管理任务和工作流。简洁直接，中文回答。",
      "project-management": "你是项目管理助手。帮助用户创建项目、分析项目状态、管理项目生命周期。简洁直接，中文回答。",
      "ai-briefing": "你是 AI 建项助手。帮助用户从零开始创建项目：讨论项目目标、定义角色分工、设计工作流程。重点引导用户明确项目范围和技术选型。简洁直接，中文回答。",
      "project-detail": "你是项目详情助手。帮助用户查看项目进度、分析风险、了解角色和流程配置。简洁直接，中文回答。",
      "project-workspace": "你是项目工作区助手。帮助用户生成项目文档、查看角色分工、分析任务状态。简洁直接，中文回答。",
      "workflows": "你是工作流管理助手。帮助用户设计工作流模板、优化流程步骤、检查配置完整性。简洁直接，中文回答。",
      "ai-workflow-design": "你是 AI 流程设计助手。帮助用户设计软件开发工作流程：引导讨论项目目标、角色分工、技术选型。根据讨论内容建议步骤和角色，角色应按实际需要细分（如前端/后端分开、功能测试/集成测试分开）。给出具体建议，中文回答。",
      "memory": "你是记忆管理助手。帮助用户分析记忆覆盖、建议需要沉淀的记忆、整理项目长期记忆。简洁直接，中文回答。",
      "settings": "你是设置中心助手。帮助用户检查模型供应商配置、查看能力中心授权状态、配置适配器。简洁直接，中文回答。",
    };
    const systemPrompt = systemPrompts[view] || "你是工程管理助手。简洁直接，中文回答。";

    // 获取配置的 AI 助手模型
    const modelInfo = getAiAssistantModelInfo(data);

    try {
      // Try real API call first
      if (serverAvailable) {
        const apiMessages: ApiChatMessage[] = [
          { role: "system", content: systemPrompt },
          ...messages
            .slice(-10) // Keep last 10 messages for context
            .map((m) => ({ role: m.role, content: m.text })),
          { role: "user", content: trimmed },
        ];

        const result = await aiApi.chat(apiMessages, {
          context: contextInfo,
          providerId: modelInfo?.providerId,
          modelName: modelInfo?.modelName,
        });

        if (result.ok && result.data) {
          const assistantMsg: ChatMessage = {
            id: nextMsgId(),
            role: "assistant",
            text: result.data.content,
          };
          setMessages((prev) => [...prev, assistantMsg]);
          setLoading(false);
          return;
        }
      }

      // Fallback to local mock response
      const assistantMsg = generateResponse(trimmed);
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      console.error("AI chat error:", error);
      // Fallback to local mock response on error
      const assistantMsg = generateResponse(trimmed);
      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, serverAvailable, messages, view, data, generateResponse]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleAction = useCallback(
    (msg: ChatMessage) => {
      if (!msg.action) return;
      const { type, payload } = msg.action;
      const projectId = data.activeProjectId || data.projects[0]?.id || "";

      switch (type) {
        case "save-role-md": {
          const p = payload as { roleId?: string; name: string; markdown: string };
          addMemory({
            title: `角色定义：${p.name}`,
            body: p.markdown,
            kind: "project",
            scope: "project",
            projectId,
            roleId: p.roleId || null,
            taskId: null,
            citation: [],
          });
          setMessages((prev) => [
            ...prev,
            { id: nextMsgId(), role: "assistant", text: `角色定义「${p.name}」已保存到项目记忆中。` },
          ]);
          break;
        }
        case "save-project-md": {
          const p = payload as { projectId: string; markdown: string };
          addMemory({
            title: "项目上下文 MD",
            body: p.markdown,
            kind: "project",
            scope: "project",
            projectId: p.projectId,
            roleId: null,
            taskId: null,
            citation: [],
          });
          setMessages((prev) => [
            ...prev,
            { id: nextMsgId(), role: "assistant", text: "项目 MD 已保存到项目记忆中。" },
          ]);
          break;
        }
        case "create-workflow": {
          const p = payload as { name: string };
          // Create a basic workflow with default steps
          const template = data.workflowTemplates[0];
          if (template) {
            const newStep = {
              id: `step-${Date.now()}`,
              order: template.steps.length + 1,
              name: "新步骤",
              assignments: [{
                id: `assignment-${Date.now()}`,
                order: 1,
                roleId: data.roles[0]?.id ?? "",
                modelProviderId: data.modelProviders[0]?.id ?? "",
                modelName: data.modelProviders[0]?.models[0]?.name ?? "",
                goal: "新步骤",
                acceptanceCriteria: [],
                inputs: [],
                outputs: [],
              }],
              inputs: [],
              outputs: [],
              gateMode: "auto" as const,
              failureStrategy: "stop" as const,
              projectOverride: false,
            };
            addWorkflowStep(template.id, newStep);
            setMessages((prev) => [
              ...prev,
              { id: nextMsgId(), role: "assistant", text: `工作流模板「${p.name}」已添加一个步骤。你可以在工作流画布中继续编辑。` },
            ]);
          } else {
            setMessages((prev) => [
              ...prev,
              { id: nextMsgId(), role: "assistant", text: "当前没有工作流模板，请先在画布中创建一个。" },
            ]);
          }
          break;
        }
        case "save-memory": {
          const p = payload as { body: string };
          addMemory({
            title: "AI 助手保存的记忆",
            body: p.body,
            kind: "project",
            scope: "project",
            projectId,
            roleId: null,
            taskId: null,
            citation: [],
          });
          setMessages((prev) => [
            ...prev,
            { id: nextMsgId(), role: "assistant", text: "记忆已保存。" },
          ]);
          break;
        }
        case "check-config": {
          onNavigate?.("settings");
          setMessages((prev) => [
            ...prev,
            { id: nextMsgId(), role: "assistant", text: "已跳转到设置中心，你可以在这里配置模型供应商和 MCP 服务。" },
          ]);
          break;
        }
        case "navigate": {
          const p = payload as { view: WorkbenchView };
          onNavigate?.(p.view);
          setMessages((prev) => [
            ...prev,
            { id: nextMsgId(), role: "assistant", text: "已为你跳转页面。" },
          ]);
          break;
        }
      }
    },
    [addMemory, addWorkflowStep, data, onNavigate]
  );

  const suggestions = contextSuggestions(view, contextMode);

  return (
    <div className="ai-chat-panel">
      <header className="ai-chat-header">
        <Sparkles size={18} />
        <span>{"工程助手"}{contextMode ? ` \u00b7 ${contextMode}` : ""}</span>
        <small style={{ color: "var(--faint)", marginLeft: "auto" }}>{viewLabel(view)}</small>
      </header>

      <div className="ai-chat-body" ref={bodyRef}>
        {messages.map((msg) => (
          <div key={msg.id} className={`ai-chat-msg ${msg.role}`}>
            <div className="ai-chat-bubble">{msg.text}</div>
            {msg.action && (
              <button
                className="ai-chat-action-btn"
                onClick={() => handleAction(msg)}
              >
                {msg.action.label}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Context-aware quick suggestion chips */}
      {suggestions.length > 0 && !loading && (
        <div className="ai-chat-suggestions">
          {suggestions.map((s) => (
            <button
              key={s}
              className="ai-chat-suggestion-chip"
              onClick={() => {
                setInput(s);
              }}
              type="button"
            >
              <Zap size={10} />
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="ai-chat-input">
        <input
          placeholder={loading ? "等待回复..." : "输入问题..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button
          className="ai-chat-send"
          onClick={handleSend}
          aria-label="发送"
          disabled={!input.trim() || loading}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}
