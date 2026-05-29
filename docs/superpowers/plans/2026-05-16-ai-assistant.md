# 全局 AI 助手实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 创建全局浮动 AI 工程助手，在所有页面可用，感知当前页面上下文，能读/写系统数据，生成内容可直接应用到系统。

**架构：** 3 个新组件（AiAssistant / AiChatPanel / AiActions），在 AppContent 中全局渲染，不依赖路由。Phase 1 用内置规则 + 模板模拟，不接真实 API。

**技术栈：** React + TypeScript + CSS（项目 tokens），lucide-react 图标，项目现有 state 层（WorkbenchContext）

**效果参考：** `docs/superpowers/specs/2026-05-16-ai-assistant-design.md`

---

## 文件清单

| 操作 | 文件 | 说明 |
|------|------|------|
| NEW | `src/components/AiAssistant.tsx` | 全局容器：浮动气泡 + 浮动面板 + dock 状态 + 页面感知 |
| NEW | `src/components/AiChatPanel.tsx` | 聊天面板：消息列表 + 输入框 + 动作按钮渲染 |
| NEW | `src/components/AiActions.tsx` | 可执行动作定义和触发逻辑 |
| MODIFY | `src/App.tsx` | 渲染 `<AiAssistant>`，传 view 和 data |
| MODIFY | `src/styles/pages.css` | 浮动气泡/面板/dock 样式 |
| MODIFY | `src/components/Settings.tsx` | 模型配置 tab 加「AI 助手默认模型」选择区域 |
| MODIFY | `src/domain/workbench.ts` | WorkbenchData 加 aiAssistantModel 字段 |

---

### Task 1: AiActions — 可执行动作定义和触发

**文件：** NEW `src/components/AiActions.tsx`

- [ ] **Step 1: 创建 AiActions 组件**

```typescript
import type { WorkbenchView, WorkbenchData, WorkflowStep } from "../domain/workbench";

// 动作定义
export interface AiAction {
  id: string;
  label: string;
  description: string;
  applicablePages: WorkbenchView[];
  // 返回需要用户确认的动作卡片
  getCard: (context: ActionContext) => ActionCard | null;
}

export interface ActionContext {
  view: WorkbenchView;
  data: WorkbenchData;
}

export interface ActionCard {
  title: string;
  message: string;
  suggestions: string[];
  actionLabel: string;
  action: () => void;
}

// 检查缺失的配置
export function checkMissingConfigs(ctx: ActionContext): string[] {
  const missing: string[] = [];
  if (ctx.view === "workflows") {
    const template = ctx.data.workflowTemplates[0];
    if (template) {
      const stepsWithoutMd = template.steps.filter((s) => !s.stepMarkdown?.trim());
      if (stepsWithoutMd.length > 0) {
        missing.push(`${stepsWithoutMd.length} 个步骤缺少规则 MD`);
      }
    }
    const rolesWithoutMd = ctx.data.roles.filter((r) => !r.roleMarkdown?.trim());
    if (rolesWithoutMd.length > 0) {
      missing.push(`${rolesWithoutMd.length} 个角色缺少 Prompt`);
    }
  }
  if (ctx.view === "project-workspace") {
    const project = ctx.data.projects[0];
    if (project && !project.projectMarkdown?.trim()) {
      missing.push("项目缺少上下文 MD");
    }
  }
  return missing;
}

export function AiActions(props: { context: ActionContext; dispatch: (card: ActionCard) => void }) {
  // Phase 1: 简化，直接返回 null，由 AiChatPanel 的逻辑处理
  return null;
}
```

- [ ] **Step 2: 构建验证**

```powershell
npm --cache .npm-cache run build
```

预期：PASS（暂无引用，无 TS 错误）。


### Task 2: AiChatPanel — 聊天面板组件

**文件：** NEW `src/components/AiChatPanel.tsx`

- [ ] **Step 1: 创建 AiChatPanel 组件**

```typescript
import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, X } from "lucide-react";
import type { WorkbenchView, WorkbenchData } from "../domain/workbench";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  hasActions?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}

interface AiChatPanelProps {
  view: WorkbenchView;
  data: WorkbenchData;
}

const WELCOME_MESSAGES: Record<string, string> = {
  workbench: "你好！我在工作台。你可以问我项目进展、任务状态，或者让我帮你检查系统配置。",
  "project-management": "你好！我在项目管理。我可以帮你分析项目健康度、创建任务、或者检查配置完整性。",
  workflows: "你好！我在工作流画布。我可以帮你设计流程、生成角色 MD、优化步骤。试试说"帮我检查配置"？",
  "project-workspace": "你好！我在项目工作区。我可以帮你生成项目 MD、查看运行状态、优化角色 Prompt。",
  memory: "你好！我在记忆管理。我可以帮你整理记忆、生成摘要、或者清理过期记忆。",
  settings: "你好！我在设置中心。我可以帮你检查配置完整性、建议最优配置。",
};

export function AiChatPanel({ view, data }: AiChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: WELCOME_MESSAGES[view] ?? "你好！我是你的工程助手，有什么需要帮忙的？",
    },
  ]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    // 添加用户消息
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // Phase 1: 模拟 AI 响应（规则匹配）
    setTimeout(() => {
      const reply = generateResponse(input, view, data);
      setMessages((prev) => [...prev, reply]);
    }, 500);
  };

  const handleAction = (msg: ChatMessage) => {
    if (msg.onAction) {
      msg.onAction();
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id
            ? { ...m, content: m.content + "\n\n✅ 已应用！", hasActions: false }
            : m
        )
      );
    }
  };

  return (
    <div className="ai-chat-panel">
      <div className="ai-chat-header">
        <Sparkles size={14} />
        <span>工程助手</span>
      </div>
      <div className="ai-chat-body">
        {messages.map((msg) => (
          <div key={msg.id} className={`ai-chat-msg ${msg.role}`}>
            <div className="ai-chat-bubble">{msg.content}</div>
            {msg.hasActions && msg.actionLabel && (
              <button className="btn primary btn-sm ai-chat-action-btn" onClick={() => handleAction(msg)}>
                {msg.actionLabel}
              </button>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="ai-chat-input">
        <input
          placeholder="输入你的问题，或试试说「检查配置」..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
        />
        <button className="ai-chat-send" onClick={handleSend} type="button">
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}

// Phase 1: 基于关键词的模拟响应
function generateResponse(input: string, view: WorkbenchView, data: WorkbenchData): ChatMessage {
  const msg = input.toLowerCase();

  // 检查配置
  if (msg.includes("检查") && msg.includes("配置")) {
    const missing: string[] = [];
    const rolesWithoutMd = data.roles.filter((r) => !r.roleMarkdown?.trim());
    if (rolesWithoutMd.length > 0) {
      missing.push(`- ${rolesWithoutMd.length} 个角色缺少 Prompt（角色 MD）`);
    }
    const template = data.workflowTemplates[0];
    if (template) {
      const stepsWithoutMd = template.steps.filter((s) => !s.stepMarkdown?.trim());
      if (stepsWithoutMd.length > 0) {
        missing.push(`- ${stepsWithoutMd.length} 个步骤缺少规则 MD`);
      }
    }
    const project = data.projects[0];
    if (project && !project.projectMarkdown?.trim()) {
      missing.push("- 项目缺少上下文 MD");
    }
    if (missing.length === 0) {
      return {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: "✅ 所有配置都完整！角色 MD、流程 MD、项目 MD 都已就绪。",
      };
    }
    return {
      id: `ai-${Date.now()}`,
      role: "assistant",
      content: `发现 ${missing.length} 个缺失配置：\n${missing.join("\n")}\n\n需要我帮你生成吗？`,
      hasActions: true,
      actionLabel: "一键检查和补充",
      onAction: () => {
        // Generate sample MD for missing items
        console.log("Would generate MD for:", missing);
      },
    };
  }

  // 生成角色 MD
  if (msg.includes("生成") && msg.includes("角色")) {
    const role = data.roles.find((r) => {
      const name = r.name.toLowerCase();
      return msg.includes(name) || msg.includes("所有");
    });
    if (role) {
      return {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: `我生成了"${role.name}"的角色 Prompt：\n\n\`\`\`markdown\n# ${role.name}\n\n**描述：** ${role.description}\n\n## 核心职责\n- 根据描述自动生成\n\n## 行为规则\n- 产出提交人工决策\n- 自动写入项目记忆\n- 使用中文回复\n\`\`\`\n\n要保存这个 Prompt 吗？`,
        hasActions: true,
        actionLabel: "保存到角色",
        onAction: () => {
          role.roleMarkdown = `# ${role.name}\n\n**描述：** ${role.description}\n\n## 核心职责\n- 根据描述自动生成\n\n## 行为规则\n- 产出提交人工决策\n- 自动写入项目记忆\n- 使用中文回复`;
        },
      };
    }
    return {
      id: `ai-${Date.now()}`,
      role: "assistant",
      content: `我可以帮你生成角色 Prompt！请告诉我具体是哪个角色，比如"生成产品经理的角色"。当前角色列表：${data.roles.map((r) => r.name).join("、")}`,
    };
  }

  // 设计工作流
  if (msg.includes("设计") && msg.includes("流程")) {
    return {
      id: `ai-${Date.now()}`,
      role: "assistant",
      content: `我设计了一个通用的开发流程：\n\n1. **需求分析** — 产品经理\n2. **UI/UX 设计** — 设计师\n3. **前端开发** — 前端工程师\n4. **代码审查** — 审查员\n5. **测试验证** — 测试工程师\n\n要创建这个流程模板吗？`,
      hasActions: true,
      actionLabel: "创建流程模板",
    };
  }

  // 默认回复
  return {
    id: `ai-${Date.now()}`,
    role: "assistant",
    content: "好的，收到。你可以试试说「检查配置」「生成角色 MD」「设计流程」等指令。我会帮你完成工程配置。",
  };
}
```

- [ ] **Step 2: 构建验证**

```powershell
npm --cache .npm-cache run build
```

预期：PASS。


### Task 3: AiAssistant — 全局浮动容器

**文件：** NEW `src/components/AiAssistant.tsx`

- [ ] **Step 1: 创建 AiAssistant 组件**

```typescript
import { useState } from "react";
import { MessageCircle, Sparkles, X } from "lucide-react";
import type { WorkbenchView, WorkbenchData } from "../domain/workbench";
import { AiChatPanel } from "./AiChatPanel";

interface AiAssistantProps {
  view: WorkbenchView;
  data: WorkbenchData;
}

export function AiAssistant({ view, data }: AiAssistantProps) {
  const [open, setOpen] = useState(false);
  const [docked, setDocked] = useState(false);

  if (docked) {
    return (
      <div className="ai-assistant ai-assistant-docked">
        <div className="ai-assistant-resize-bar">
          <Sparkles size={12} />
          <span>工程助手</span>
          <div style={{ flex: 1 }} />
          <button className="ai-assistant-float-btn" onClick={() => setDocked(false)} title="取消固定" type="button">
            <X size={12} />
          </button>
        </div>
        <AiChatPanel view={view} data={data} />
      </div>
    );
  }

  return (
    <div className="ai-assistant ai-assistant-float">
      {/* 浮动气泡 */}
      {!open && (
        <button className="ai-assistant-bubble" onClick={() => setOpen(true)} type="button" title="打开工程助手">
          <MessageCircle size={20} />
        </button>
      )}

      {/* 浮动面板 */}
      {open && (
        <div className="ai-assistant-panel">
          <div className="ai-assistant-panel-header">
            <Sparkles size={14} />
            <span>工程助手</span>
            <div style={{ flex: 1 }} />
            <button className="ai-assistant-panel-btn" onClick={() => setDocked(true)} title="固定在右侧" type="button">
              Dock
            </button>
            <button className="ai-assistant-panel-btn" onClick={() => setOpen(false)} title="关闭" type="button">
              <X size={14} />
            </button>
          </div>
          <AiChatPanel view={view} data={data} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 构建验证**

```powershell
npm --cache .npm-cache run build
```

预期：PASS。


### Task 4: App.tsx 集成

**文件：** MODIFY `src/App.tsx`

- [ ] **Step 1: 在 AppContent 中全局渲染 AiAssistant**

在 import 区加：
```typescript
import { AiAssistant } from "./components/AiAssistant";
```

在 `return` 中 `<AppShell>` 闭合后（路由渲染的外层）加：
```typescript
<AiAssistant view={view} data={data} />
```

完整 return 变为：
```typescript
return (
  <>
    <AppShell activeView={view} onNavigate={setView}>
      {view === "workbench" && <WorkbenchHome data={data} onNavigate={setView} />}
      {view === "project-management" && (
        <ProjectManagement data={data} onEnterProject={(pid) => { setWorkspaceProjectId(pid); setView("project-workspace"); }} />
      )}
      {view === "project-workspace" && workspaceProjectId && (
        <ProjectWorkspace data={data} projectId={workspaceProjectId} onBack={() => setView("project-management")} />
      )}
      {view === "workflows" && <WorkflowBuilder data={data} />}
      {view === "memory" && <MemoryManager data={data} />}
      {view === "settings" && <Settings data={data} />}
    </AppShell>
    <AiAssistant view={view} data={data} />
  </>
);
```

- [ ] **Step 2: 构建验证**

```powershell
npm --cache .npm-cache run build
```

预期：PASS。


### Task 5: CSS 样式

**文件：** MODIFY `src/styles/pages.css`

- [ ] **Step 1: 追加 AI 助手 CSS**

```css
/* ===== AI Assistant ===== */
.ai-assistant-float {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 900;
}

.ai-assistant-bubble {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--primary);
  color: #fff;
  border: none;
  cursor: pointer;
  display: grid;
  place-items: center;
  box-shadow: 0 4px 20px rgba(79, 140, 255, 0.3);
  transition: transform 120ms;
  padding: 0;
  min-height: unset;
}
.ai-assistant-bubble:hover { transform: scale(1.08); }

.ai-assistant-panel {
  position: absolute;
  bottom: 60px;
  right: 0;
  width: 380px;
  height: 500px;
  max-height: 70vh;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 12px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ai-assistant-panel-header {
  padding: 10px 14px;
  border-bottom: 1px solid var(--line-soft);
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: var(--primary);
  flex-shrink: 0;
}
.ai-assistant-panel-btn {
  padding: 2px 6px;
  border: none;
  background: none;
  color: var(--muted);
  cursor: pointer;
  font-size: 11px;
  border-radius: 4px;
}
.ai-assistant-panel-btn:hover { color: var(--text); background: var(--surface-2); }

/* Dock mode */
.ai-assistant-docked {
  width: 360px;
  flex-shrink: 0;
  border-left: 1px solid var(--line-soft);
  background: var(--surface);
  display: flex;
  flex-direction: column;
  height: 100%;
}
.ai-assistant-resize-bar {
  padding: 6px 10px;
  border-bottom: 1px solid var(--line-soft);
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--faint);
  flex-shrink: 0;
}
.ai-assistant-float-btn {
  padding: 2px 4px;
  border: none;
  background: none;
  color: var(--muted);
  cursor: pointer;
}

/* Chat panel */
.ai-chat-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.ai-chat-header {
  padding: 8px 14px;
  border-bottom: 1px solid var(--line-soft);
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  color: var(--primary);
  flex-shrink: 0;
}
.ai-chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ai-chat-msg {
  max-width: 90%;
}
.ai-chat-msg.assistant { align-self: flex-start; }
.ai-chat-msg.user { align-self: flex-end; }
.ai-chat-bubble {
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
}
.ai-chat-msg.assistant .ai-chat-bubble {
  background: var(--surface-2);
  border: 1px solid var(--line-soft);
  border-top-left-radius: 3px;
}
.ai-chat-msg.user .ai-chat-bubble {
  background: rgba(79, 140, 255, 0.08);
  border: 1px solid rgba(79, 140, 255, 0.2);
  border-top-right-radius: 3px;
}
.ai-chat-action-btn {
  margin-top: 6px;
  margin-left: 0;
}
.ai-chat-input {
  padding: 10px 12px;
  border-top: 1px solid var(--line-soft);
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.ai-chat-input input {
  flex: 1;
  min-height: 34px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: #111419;
  color: var(--text);
  padding: 0 10px;
  font-size: 12.5px;
}
.ai-chat-input input:focus { border-color: var(--primary); outline: none; }
.ai-chat-send {
  width: 34px;
  height: 34px;
  border-radius: 7px;
  border: 1px solid var(--line);
  background: var(--surface-2);
  color: var(--muted);
  cursor: pointer;
  display: grid;
  place-items: center;
}
.ai-chat-send:hover { border-color: var(--primary); color: var(--primary); }
```

- [ ] **Step 2: 构建和测试验证**

```powershell
npm --cache .npm-cache run build
npm --cache .npm-cache test
```

预期：build + test 都通过。


### Task 6: 测试

**文件：** NEW `src/__tests__/ai-assistant.test.tsx`

- [ ] **Step 1: 编写测试**

```typescript
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { AiChatPanel } from "../components/AiChatPanel";
import { AiAssistant } from "../components/AiAssistant";
import { workbenchData } from "../data/fixtures";

describe("AI Assistant", () => {
  it("shows floating bubble when closed", () => {
    render(<AiAssistant view="workbench" data={workbenchData} />);
    expect(screen.getByTitle("打开工程助手")).toBeInTheDocument();
  });

  it("opens panel when bubble clicked", () => {
    render(<AiAssistant view="workbench" data={workbenchData} />);
    fireEvent.click(screen.getByTitle("打开工程助手"));
    expect(screen.getByPlaceholderText(/输入你的问题/)).toBeInTheDocument();
  });

  it("displays welcome message based on current view", () => {
    render(<AiChatPanel view="workflows" data={workbenchData} />);
    expect(screen.getByText(/工作流画布/)).toBeInTheDocument();
  });

  it("responds to 检查配置 query", async () => {
    render(<AiChatPanel view="workflows" data={workbenchData} />);
    const input = screen.getByPlaceholderText(/输入你的问题/);
    fireEvent.change(input, { target: { value: "检查配置" } });
    fireEvent.keyDown(input, { key: "Enter" });
    // Wait for simulated response
    await new Promise((r) => setTimeout(r, 600));
    expect(screen.getByText(/个缺失配置/)).toBeInTheDocument();
  });

  it("responds to 生成角色 query", async () => {
    render(<AiChatPanel view="workflows" data={workbenchData} />);
    const input = screen.getByPlaceholderText(/输入你的问题/);
    fireEvent.change(input, { target: { value: "生成产品经理的角色" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await new Promise((r) => setTimeout(r, 600));
    expect(screen.getByText(/产品经理/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行测试**

```powershell
npm --cache .npm-cache test -- ai-assistant
```

预期：5 tests pass。

- [ ] **Step 3: 全量验证**

```powershell
npm --cache .npm-cache test
npm --cache .npm-cache run build
```

预期：全部通过。


### Task 7: Settings 加 AI 助手模型配置

**文件：** MODIFY `src/components/Settings.tsx` + `src/domain/workbench.ts`

- [ ] **Step 1: Domain 加字段**

`src/domain/workbench.ts` — 在 `WorkbenchData` 接口加：

```typescript
aiAssistantModel?: {
  providerId: string;
  modelName: string;
};
```

- [ ] **Step 2: Settings 加配置区域**

在 `Settings.tsx` 的 models tab 中，provider 卡片列表渲染完之后（`model-provider-list` 闭合后），追加：

```tsx
<div className="settings-section">
  <div className="settings-section-title">AI 助手默认模型</div>
  <div className="form-grid">
    <div className="form-field">
      <label>模型供应商</label>
      <select
        value={data.aiAssistantModel?.providerId ?? ""}
        onChange={(e) => { /* set via context or local state */ }}
      >
        {data.modelProviders.filter(p => p.enabled).map(p => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
    </div>
    <div className="form-field">
      <label>模型名称</label>
      <select
        value={data.aiAssistantModel?.modelName ?? ""}
        onChange={(e) => { /* set model */ }}
      >
        {(data.modelProviders.find(p => p.id === data.aiAssistantModel?.providerId)?.models ?? []).map(m => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
    </div>
  </div>
  <span style={{ fontSize: 11, color: "var(--faint)", marginTop: 8, display: "block" }}>
    AI 工程助手将使用此模型进行对话和内容生成
  </span>
</div>
```

- [ ] **Step 3: 构建验证**

```powershell
npm --cache .npm-cache run build
```

预期：PASS。
