# 项目管理 V3 + 项目工作区 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**目标：** 将 ProjectManagement 重写为看板首页 + 覆盖层弹窗（导入/新建/决策）+ 新增 ProjectWorkspace 全页工作区。

**架构：** 看板首页 → 点击卡片 → 全页面切换到 ProjectWorkspace → 返回按钮回到看板。导入/新建/决策通过覆盖层触发。

**技术栈：** React + TypeScript + CSS（项目 tokens），lucide-react 图标

**效果参考：** `mockups/project-management-full.html` / `mockups/project-workspace-v1.html`

---

## 文件清单

| 操作 | 文件 |
|------|------|
| NEW | `src/components/ProjectCard.tsx` |
| NEW | `src/components/GateDecisionPanel.tsx` |
| NEW | `src/components/ProjectWorkspace.tsx` |
| MODIFY | `src/components/ProjectManagement.tsx` |
| MODIFY | `src/domain/workbench.ts` |
| MODIFY | `src/App.tsx` |
| MODIFY | `src/styles/pages.css` |

---

### Task 1: Domain + App 路由

**文件：** `src/domain/workbench.ts` / `src/App.tsx`

添加 `"project-workspace"` 到 `WorkbenchView`：
```typescript
| "project-workspace"
```

`App.tsx` 加 workspace 状态和路由：
```typescript
const [workspaceProjectId, setWorkspaceProjectId] = useState<string | null>(null);

{view === "project-management" && (
  <ProjectManagement data={data} onEnterProject={(pid) => { setWorkspaceProjectId(pid); setView("project-workspace"); }} />
)}
{view === "project-workspace" && workspaceProjectId && (
  <ProjectWorkspace data={data} projectId={workspaceProjectId} onBack={() => setView("project-management")} />
)}
```

---

### Task 2: ProjectCard 组件

**文件：** NEW `src/components/ProjectCard.tsx`

项目看板卡片组件，props：`{ project, data, onClick, onGateClick }`。
- 顶部：头像 + 名称 + 分支 + 技术栈 badge + 进度条
- 底部：运行中/等待决策/已完成 统计
- hover 显示"进入项目"遮罩按钮
- 有 gate 时右上角显示橙色"待决策"徽章

---

### Task 3: GateDecisionPanel 组件

**文件：** NEW `src/components/GateDecisionPanel.tsx`

覆盖层决策面板，props：`{ data, onClose }`。
- 左侧：Diff/测试/预览/日志 四个 tab 切换 + 证据内容
- 右侧：决策摘要 + 记忆保存 + 4 操作按钮（同意/重跑/改派表单/终止）
- 空态处理：无 waitingGate 时显示提示
- 复用 `useWorkbenchState` 的 updateGateStatus/addMemory/reassignAgentRun

---

### Task 4: 重写 ProjectManagement 为看板容器

**文件：** MODIFY `src/components/ProjectManagement.tsx`

props 变化：增加 `onEnterProject: (projectId: string) => void`。

组件结构：
1. Header：标题 + "导入项目"/"新建项目"按钮
2. 统计行：4 个指标卡片（项目总数/运行中Agent/等待决策/已完成任务）
3. 项目卡片网格：遍历 projects，渲染 ProjectCard
4. 近期任务列表
5. 三个覆盖层弹窗：导入面板 / 新建面板 / 决策面板（按需渲染）

删除旧代码：导入/新建原有的 hero + tab 结构、side-panel（Issues/PR/CI 卡片）

---

### Task 5: ProjectWorkspace 组件

**文件：** NEW `src/components/ProjectWorkspace.tsx`

props：`{ data, projectId, onBack }`。

布局（双栏）：
- **顶部栏**：← 返回项目管理 + 项目名 + 快捷按钮（人工决策/Issues/CI/CD/设置）
- **左侧**：
  - 统计行（4 指标）
  - 当前任务卡片 + 工作流执行进度 stepper
  - 协同文件文档索引
  - Agent 运行日志
- **右侧**：
  - Agent 列表（5 个角色切换）
  - 对话面板
  - 输入框
- **覆盖层**：GateDecisionPanel（人工决策按钮触发）

---

### Task 6: CSS 样式

**文件：** MODIFY `src/styles/pages.css`

在文件末尾追加完整 CSS（覆盖旧 `.project-management-page` 样式）：
- `.pm-v3-*` — 看板样式（header/stats/section/project-grid/task-list/modal）
- `.project-card` / `.card-enter-hint` / `.gate-badge-card` — 卡片样式
- `.overlay` / `.gate-panel` / `.gate-*` — 决策面板样式
- `.project-workspace` / `.ws-*` — 工作区样式（topbar/body/left/right/stats/stepper/chat/agent-list/doc-panel/log）

---

## 验证

- [x] `npm run build` 通过
- [x] `npm test` 全部通过
- [x] 看板首页显示项目卡片
- [x] 点击卡片进入工作区
- [x] 工作区"返回项目管理"回到看板
- [x] 导入/新建弹窗正常弹出
- [x] 人工决策面板正常显示 4 操作按钮
