# Agent 工程管理系统 - 页面规格

## 最新页面规格补充：流程管理总览 v1 - 2026-05-22

Source of truth:

- `docs/design/mockups/flow-management-overview-v1.html`
- `public/mockups/flow-management-overview-v1.html`

### 页面定位

- Page name: `流程管理`
- Route proposal: `/workflow-management`
- Navigation: 一级导航 `流程管理`
- Purpose: 作为流程资产管理首页，统一管理流程模板、项目流程实例、分类、角色绑定、Runner/模型/能力授权、版本与风险。

### 页面结构

```text
WorkflowManagementOverviewPage
├─ AppShell
├─ WorkflowManagementHeader
│  ├─ PageTitle
│  └─ WorkflowOverviewActions
├─ WorkflowPortfolioKpis
├─ WorkflowManagementMain
│  ├─ WorkflowListPanel
│  │  ├─ WorkflowCategoryTabs
│  │  └─ WorkflowAssetCardGrid
│  └─ WorkflowHealthPanel
│     ├─ WorkflowCategoryManager
│     ├─ CapabilityGapCard
│     ├─ RoleBindingGapCard
│     ├─ RecentWorkflowChanges
│     └─ AiWorkflowSuggestionCard
```

### 功能

- 展示流程总数、启用中、绑定项目、待校验、高风险。
- 提供操作：`检查全部流程`、`维护分类`、`新建常规流程`、`AI 生成流程`、`导入流程`。
- 按分类查看流程：`全部 / 开发类 / 设计类 / 评审类 / 发布类`。
- 分类维护支持新增、编辑、排序、禁用；Phase 1 可 mock。
- 流程卡片展示：
  - 名称、状态、版本、步骤数、分类。
  - 流程说明。
  - 步骤链路摘要。
  - 角色覆盖。
  - Runner 覆盖。
  - MCP / Skills / Git / Local Shell 授权情况。
  - 风险/缺口。
  - 最近应用成熟度。
  - 操作：`查看详情`、`进入设计`。
- 右侧健康面板展示分类维护、能力授权缺口、角色绑定缺口、最近变更、AI 建议。
- 不在总览页展示底部 `流程关系视图`。

### 页面状态

- loading：流程列表、分类、健康诊断加载中，展示骨架屏。
- empty：没有流程，展示 `新建常规流程 / AI 生成流程 / 导入流程`。
- error：流程或分类读取失败，展示重试和查看本地缓存。
- success：展示 KPI、分类、流程卡片、健康面板。
- filtered-empty：当前分类没有流程，提示新建或导入该分类流程。
- validating：点击检查全部流程后展示检查中状态。

### 交互规则

- 点击一级导航 `流程管理`：进入流程管理总览，不直接进入流程设计器。
- 点击分类 tab：过滤流程列表，不改变页面路由。
- 点击 `维护分类`：打开分类维护面板/弹窗。
- 点击 `新建常规流程`：进入常规流程设计器的空白/模板模式。
- 点击 `AI 生成流程`：进入 AI 流程设计页面。
- 点击 `导入流程`：进入流程导入或打开导入弹窗。
- 点击 `查看详情`：进入流程详情页。
- 点击 `进入设计`：进入该流程的常规设计器。

### 视觉和缩放验收

- 100% 浏览器缩放下，1920x1080 视口不出现页面级横向或纵向溢出。
- 不允许用 `transform: scale(.8)`、浏览器缩放假设或全页视觉缩放来适配。
- 使用全局 AppShell：Sidebar、Topbar、breadcrumb、内容起点与工作台/项目管理保持稳定。
- 页面风格保持深色、紧凑、专业工程管理系统，不使用营销 hero、装饰大图或大面积空白。

## 最新页面规格补充：AI 建项助手与新版工作台导航

### 流程管理 AI 辅助生成来源与 AI 助手联动

`AI 辅助生成` 是流程页的上下文生成面板，不是独立聊天页。

页面结构补充：

```text
WorkflowAiAssistPanel
├─ AiSourceImportSection
│  ├─ PlanFileImport(.md)
│  ├─ CollaborationFileImport(.md)
│  ├─ CurrentProjectPlanReference
│  ├─ AiProjectDraftReference
│  └─ ExistingWorkflowReference
├─ ImportedSourceList
├─ SourceParseSummary
├─ WorkflowDraftPreview
├─ WorkflowDiffReview
├─ OpenGlobalAiAssistantButton
└─ ApplyFlowConfirmation
```

来源规则：

- `项目计划`：可以导入 `.md` 文件，也可以引用当前项目详情里的计划与任务。
- `协同文件`：可以导入 `.md` 文件，常见文件为 `HANDOFF_NEXT_TASKS.md`、`CODE_REVIEW_AND_FIX_REQUESTS.md`。
- `AI 建项结果`：引用已经确认的项目草案，而不是重新上传。
- `已有流程优化`：引用已有流程模板或当前流程版本。
- `大白话补充`：通过全局 AI 助手完成，流程页按钮文案为 `打开 AI 助手补充说明`。

状态：

- empty：尚未选择来源，显示来源导入区。
- loading：文件解析或流程引用读取中。
- source-ready：已读取来源，等待 AI 解析。
- ai-draft：AI 已生成流程草案。
- needs-confirmation：差异待用户确认。
- error：文件格式不支持、读取失败或 AI 解析失败。

验收：

- AI 辅助生成面板必须有可见的导入/引用来源操作。
- 文件导入控件至少限制 `.md`。
- 页面不出现与右下角全局 AI 助手割裂的第二套聊天框。
- 点击 `打开 AI 助手补充说明` 后，全局 AI 助手以 `流程设计模式` 打开。
- AI 助手输入的补充说明能回填为本次流程草案生成的 `manualInstruction`。
- AI 生成内容进入差异对比和确认流程，不直接覆盖正式流程。

### AI 建项助手页面

页面定位：把用户和 AI 讨论出的项目想法、粘贴内容、上传文档、当前会话和协同文件，统一解析成可执行项目计划。

设计状态补充：

- AI 建项页面 v2 暂时定稿图：`docs/design/assets/ai-project-initiation-v2-final.png`。
- 页面必须保留三栏职责：左侧讨论区，中间 AI 分析区，右侧输出结果区。
- 讨论区输入框必须有明确 `发送` 按钮。
- 讨论区只保留两个上下文动作：`添加资料`、`粘贴内容`。
- 不再显示 `引用当前会话`、`读取协同文件` 两个独立按钮；当前讨论默认进入上下文，项目文档入口归入 `添加资料`。
- `已添加资料` 默认收缩，只显示资料数量和摘要；点击后展开资料列表。
- 结构化草案预览、目标/角色/流程/风险拆解、AI 追问澄清、确认后创建项目必须保留。

不要再提供四个割裂入口：

- `直接讨论`
- `粘贴对话`
- `导入文档`
- `当前会话`

统一页面结构：

```text
AiProjectInitiationPage
├─ AiProjectHeader
├─ AiContextComposer
│  ├─ ChatInput
│  ├─ PasteArea
│  ├─ UploadAttachmentButton
│  ├─ CurrentSessionContextToggle
│  └─ CollaborationFilePicker
├─ AiBriefingChat
├─ ProjectDraftPreview
├─ PlanExtractionPanel
├─ RiskAndAssumptionPanel
└─ CreateProjectConfirmation
```

页面状态：

- loading：AI 正在解析上下文。
- empty：尚未输入上下文，显示统一输入区和上传入口。
- error：解析失败，展示失败原因和重试。
- success：展示项目草案、计划拆解、风险和创建确认。
- needs-confirmation：AI 草案待用户确认后创建项目。

验收：

- 用户只看到一个 AI 建项工作区。
- 上传、粘贴、聊天、引用当前会话都在同一输入体验里完成。
- AI 生成草案后必须进入确认，不自动创建项目。

### 项目详情进入新版工作台

项目详情页和项目卡片中的 `进入工作台` 必须导航到新版工作台。

目标路由建议：

```text
/projects/:projectId/workbench
```

过渡路由：

```text
/#workbench?projectId=:projectId
```

跳转后的页面必须满足新版工作台规格：

- 顶部项目/分支/worktree/阶段状态栏。
- 角色流程运行带。
- Terminal Workspace 主区域。
- Terminal 工具栏包含步骤上下文、提示词、角色记忆、MCP、Skills、Git、Local Shell、快照。
- 右侧面板支持固定、浮动、自动隐藏。

禁止：

- 跳转到旧版工作台。
- 在项目管理页内嵌开发执行区。
- 让聊天框占据 Terminal 主区域。

更新时间：2026-05-17  
范围：Phase 1 Web MVP 前端页面、组件、状态和交互

## 1. 页面列表

| 页面 | 路径/视图建议 | 状态 | 说明 |
| --- | --- | --- | --- |
| 工作台 | `workbench` | 冻结设计，待对齐实现 | 当前项目执行现场 |
| 项目管理总览 | `project-management` | 冻结设计，待对齐实现 | 多项目管理首页 |
| 项目详情 | `project-detail` | 新设计冻结，待实现 | 单项目驾驶舱与台账 |
| AI 建项助手 | `ai-project-initiation` | 新设计冻结，待实现 | 统一聊天、粘贴、上传、当前会话和协同文件上下文生成项目 |
| 导入已有项目 | `existing-project-import` | 已有功能需改造 | 识别 Claude Code / Codex / 通用项目 |
| 新建空白项目 | `new-project-wizard` | 已有功能需改造 | 清晰流程的新项目创建 |
| 流程管理总览 | `workflow-management` | v1 定稿，待实现 | 流程资产、分类、健康、风险和入口管理 |
| 常规流程设计 | `workflow-builder` | 双模式设计冻结，待对齐实现 | 常规手动编排 |
| AI 流程设计 | `workflow-ai-design` | 定稿，待实现 | AI 生成流程草案和差异应用 |
| 人工决策 | `manual-gate` | 已有页面 | Gate 审批和证据查看 |
| 记忆管理 | `memory-management` | 知识资产中心设计冻结，待对齐实现 | 项目记忆、角色记忆、知识库、AI 提炼和审计 |
| 设置中心 | `settings` | 已有页面需保持一致 | 模型、Runner、能力、IM、Git 配置 |

## 2. 工作台

设计图：

![工作台冻结版](assets/workbench-v1.png)

### 功能

- 展示当前项目的执行现场。
- 通过角色流程运行带查看每个步骤的角色、Runner、模型和状态。
- 中央 Terminal Workspace 承载多 CLI 窗口。
- 点击流程步骤自动切换对应 Terminal Tab。
- Terminal 工具栏展示当前步骤上下文、角色记忆、角色提示词、MCP、Skills、Git、Local Shell、快照。
- 右侧状态面板显示 TODO、Gate、项目记忆、角色记忆摘要、最近文件、会话状态。
- 支持启动项目、恢复会话、保存进度、关闭项目。

### 组件拆分

- `WorkbenchPage`
- `WorkbenchTopbar`
- `RoleFlowLane`
- `RoleStepCard`
- `TerminalWorkspace`
- `TerminalTabBar`
- `TerminalToolbar`
- `StepContextPopover`
- `RoleMemoryPopover`
- `RolePromptPopover`
- `StepCapabilityPopover`
- `GitStatusPopover`
- `SessionRestoreDialog`
- `WorkbenchSidePanel`
- `TodoListPanel`
- `GateStatusCard`
- `ProjectMemorySummary`
- `RecentFilesList`
- `SessionStatusCard`
- `FloatingPanelControls`

### 页面状态

- loading：项目、工作流、终端会话状态加载中，显示骨架屏和禁用按钮。
- empty：没有打开项目，显示项目选择/导入/进入项目管理入口。
- error：项目状态读取失败，显示重试、打开项目管理、查看日志。
- success：显示完整工作台。
- disabled：没有权限的 MCP / Skills / Git / Shell 按钮置灰并显示原因。

### 关键交互

- 点击流程卡片：切换 active step、Terminal Tab、工具栏授权上下文。
- 点击 MCP/Skills：弹出当前步骤授权列表。
- 点击右侧面板模式：固定 / 浮动 / 自动隐藏。
- 自动隐藏后：Terminal Workspace 横向扩展。
- 点击角色提示词：编辑当前角色提示词草案，保存需二次确认。

## 3. 项目管理总览

设计图：

![项目管理总览和 AI 方案立项](assets/project-management-overview-ai-briefing-v1.png)

### 功能

- 展示所有项目运行情况。
- 提供新建空白项目、导入已有项目、AI 方案立项入口。
- 支持检查全部项目进度。
- 支持单项目 Check、进入详情、进入工作台。
- 展示跨项目风险、待处理、里程碑。

### 组件拆分

- `ProjectManagementPage`
- `ProjectEntryActions`
- `ProjectPortfolioKpis`
- `ProjectCardGrid`
- `ProjectSummaryCard`
- `ProjectHealthBadge`
- `ProjectProgressCheckButton`
- `PortfolioAttentionPanel`
- `PortfolioRiskPanel`
- `WeeklyMilestonesPanel`
- `ProjectImportLauncher`
- `NewProjectLauncher`
- `AiBriefingLauncher`

### 页面状态

- loading：项目列表和统计加载中。
- empty：暂无项目，突出三个入口：新建空白项目、导入已有项目、AI 方案立项。
- error：项目列表读取失败，提供重试和查看本地缓存。
- success：展示项目卡片、KPI、右侧摘要。

### 卡片字段

- 项目名称
- 来源类型：Claude Code / Codex / 通用开发项目 / 混合项目 / AI 方案立项
- 当前 Phase
- 进度百分比
- 健康分
- 风险等级
- 当前里程碑
- 下一验收点
- Gate / TODO / 待确认数量
- 最近同步时间
- Check 发现变更数量

## 4. 项目详情

设计图：

![项目详情甘特视图](assets/project-detail-gantt-v1.png)

![项目详情追溯抽屉](assets/project-detail-trace-drawer-v1.png)

### 功能

- 展示单个项目的整体信息和管理台账。
- 支持检查最新进度、确认同步、查看差异。
- 支持计划队列排序、任务状态查看和人工干预。
- 支持项目风险、Gate、角色、流程、协同文件和变更记录追溯。
- 支持进入工作台执行具体任务。

### 组件拆分

- `ProjectDetailPage`
- `ProjectDetailHeader`
- `ProjectStatusChips`
- `ProjectKpiStrip`
- `ProjectCockpit`
- `AiProgressCheckCard`
- `NextAcceptanceCard`
- `ProjectDetailTabs`
- `ProjectOverviewTab`
- `ProjectPlanTab`
- `ProjectProgressTab`
- `ProjectRiskTab`
- `ProjectRolesWorkflowTab`
- `ProjectCollaborationFilesTab`
- `ProjectChangeLogTab`
- `ExecutionQueueTable`
- `MilestoneTimeline`
- `GanttPreview`
- `RiskMatrix`
- `GateBlockerList`
- `AiRiskSummary`
- `ProjectDetailDrawer`
- `TaskDetailDrawer`
- `RiskDetailDrawer`
- `RoleDetailDrawer`
- `GateDetailDrawer`
- `CollaborationFileTraceDrawer`

### 页面状态

- loading：项目详情、计划、风险和协同文件解析加载中。
- empty：项目详情缺少计划，提示导入协同文件或 AI 生成计划。
- error：详情加载失败，显示重试、回到总览、查看本地快照。
- success：显示项目驾驶舱、Tabs、右侧抽屉。
- partial：协同文件缺失或解析不完整时，显示“需要补充信息”提示。

### Tabs

#### 项目概况

- 项目说明
- 当前 Phase
- 项目范围
- 交付物
- 验收口径
- 协同来源
- 阶段时间线

#### 计划与任务

- P0/P1/P2/P3 队列
- 任务优先级
- 负责人角色
- 状态
- 验收标准
- Gate
- 拖拽排序或显式上移/下移

#### 进度视图

- 甘特图
- 看板
- 阶段时间线
- 进度 Check 历史

#### 风险与决策

- 风险矩阵
- 鱼骨图
- Gate 阻塞
- 人工决策记录
- 变更影响分析

#### 角色与流程

- 项目角色池
- 角色提示词
- 角色记忆摘要
- 工作流模板
- 步骤与角色绑定
- Step -> Role -> Runner -> Model -> Capability 矩阵

#### 协同文件

- HANDOFF_NEXT_TASKS.md
- CODE_REVIEW_AND_FIX_REQUESTS.md
- 设计方案
- 计划文档
- AI Check 读取来源
- 最近同步摘要

#### 变更记录

- 计划变更
- 进度变更
- 人工确认
- AI 建议采纳/拒绝记录

## 5. AI 方案立项

设计图：

![项目管理总览和 AI 方案立项](assets/project-management-overview-ai-briefing-v1.png)

### 功能

- 在同一个 AI 建项工作区中，通过聊天、粘贴资料、上传文档、引用当前会话或读取协同文件生成项目草案。
- AI 追问澄清后生成产品方案、页面结构、角色、流程、任务和项目计划。
- 用户确认后创建正式项目。

### 组件拆分

- `AiProjectBriefingPage`
- `BriefingSourceTabs`
- `BriefingChatPanel`
- `BriefingInputComposer`
- `ParsedProjectOutline`
- `GeneratedRoleList`
- `GeneratedWorkflowPreview`
- `GeneratedPlanDraft`
- `PlanDiffPreview`
- `CreateProjectConfirmation`

### 页面状态

- loading：AI 解析中。
- empty：等待输入想法、对话、文档或截图。
- error：解析失败，允许重试或保存原始材料。
- success：展示结构化草案和确认入口。
- needs-confirmation：创建正式项目前必须显示差异和确认。

## 6. 导入已有项目

### 功能

- 扫描本地仓库，支持选择路径或手动输入路径。
- 识别 Claude Code / Codex / 通用开发项目 / 混合项目。
- 对传统项目要求补充项目目标、进度、命令、模块、角色和 AI 介入方式。
- 可生成标准协同文件草案。

### 组件拆分

- `ExistingProjectImport`
- `RepositoryPathPicker`
- `ProjectTypeDetector`
- `DetectedFilesList`
- `CommandDetectionPanel`
- `CollaborationFileScanner`
- `TraditionalProjectSupplementForm`
- `ImportConfirmStep`

### 页面状态

- loading：扫描路径和文件。
- empty：等待输入或选择路径。
- error：路径不可访问、不是 Git 仓库、缺少必要信息。
- success：展示检测结果和导入确认。

## 7. 新建空白项目

### 功能

- 按结构化流程创建项目。
- 角色先定义，再让工作流步骤绑定角色。
- 左侧角色池，右侧工作流步骤配置。
- 步骤选择角色、Runner、模型和能力授权。

### 组件拆分

- `NewProjectWizard`
- `ProjectBasicInfoStep`
- `ProjectRolePoolStep`
- `WorkflowRoleBindingStep`
- `RunnerModelCapabilityStep`
- `InitialPlanStep`
- `ProjectCreateReview`

### 页面状态

- loading：模板和配置加载中。
- empty：无模板时提示从空白流程开始。
- error：表单校验失败或模板读取失败。
- success：创建预览。
- validation：必填字段、路径、命令、角色绑定校验。

## 8. 流程管理与流程设计

### 8.1 流程管理总览

设计原型：

```text
docs/design/mockups/flow-management-overview-v1.html
```

流程管理首页是流程资产管理页面，不是设计器。它必须先展示流程分类、流程资产卡片、流程健康和分类维护入口，再通过按钮进入常规流程设计或 AI 流程设计。

核心组件：

- `WorkflowManagementOverviewPage`
- `WorkflowPortfolioKpis`
- `WorkflowCategoryTabs`
- `WorkflowCategoryManager`
- `WorkflowAssetCard`
- `WorkflowHealthPanel`
- `WorkflowGapList`
- `WorkflowRecentChanges`
- `WorkflowAiSuggestionCard`

### 8.2 流程设计器

设计图：

![流程编排双模式](assets/workflow-builder-dual-mode-v1.png)

常规流程设计 v2 定稿图：

![常规流程设计 v2 定稿](assets/workflow-conventional-design-v2-final.png)

### 功能

- 支持常规配置模式：模板、角色池、画布节点、步骤属性、流程版本、校验和应用。
- 支持 AI 辅助生成模式：从项目计划、协同文件、AI 方案立项结果或已有流程生成流程草案。
- 两种模式共享同一套流程版本、节点和步骤配置模型。
- AI 生成内容必须先进入草案/差异对比，用户确认后才能应用到项目。
- 应用到项目后同步到工作台的角色流程运行带。
- 支持从项目详情的“计划与任务”进入流程编排，并带入当前项目角色和任务。
- 常规流程设计画布不展示 Gate、Manual Gate 或人工决策节点；Gate 属于流程应用或执行阶段。
- 流程资源左栏不再在流程模板旁设置 `项目角色` Tab；项目角色统一放在下半区 `项目角色池`。

### 页面结构

```text
WorkflowBuilderPage
├─ WorkflowHeader
│  ├─ 常规配置 / AI 辅助生成 segmented control
│  ├─ 流程版本
│  ├─ 校验流程
│  └─ 应用到项目
├─ WorkflowCooperationStrip
│  └─ 常规模板/手动编排 + AI解析/优化建议 -> 草案 -> 用户确认 -> 应用项目 -> 同步工作台
├─ WorkflowLeftRail
│  ├─ TemplateLibrary
│  └─ ProjectRolePool
├─ WorkflowCanvas
│  ├─ GridCanvasBackground
│  ├─ WorkflowNode
│  └─ WorkflowEdge
└─ WorkflowStepInspector
   ├─ StepBasicFields
   ├─ RoleBindingControl
   ├─ RunnerModelControl
   ├─ CapabilityAuthorizationMatrix
   ├─ GateAndAcceptanceEditor
   └─ AiFlowSuggestionBox
```

### 常规配置模式

用户路径：

```text
选择流程模板 -> 拖拽/编辑节点 -> 绑定项目角色 -> 配置 Runner/模型/能力
-> 设置 Gate 和验收标准 -> 校验流程 -> 保存版本 -> 应用到项目
```

常规模式必须具备：

- 模板库：软件开发完整流程、设计评审流程、Bug 修复流程、自定义模板。
- 项目角色池：从当前项目读取角色，不在流程页临时发明角色。
- 画布节点：新增、选择、复制、删除、连线、状态展示。
- 步骤属性：步骤名、角色、Runner、模型、能力授权、Gate、验收标准。
- 流程版本：草稿、已应用、有变更、需重新同步。
- 校验：缺角色、缺 Runner、缺模型、缺验收标准、缺 Gate 时给出明确提示。

### AI 辅助生成模式

用户路径：

```text
选择输入来源 -> AI 解析 -> 生成流程草案 -> 查看差异 -> 手动调整 -> 用户确认 -> 应用到项目
```

输入来源：

- 当前项目计划与任务。
- 协同文件。
- AI 方案立项结果。
- 当前流程版本。
- 现有流程模板。

AI 辅助模式必须具备：

- 输入来源选择。
- 解析进度和解析结果。
- 角色建议、步骤建议、Gate 建议、验收标准建议。
- 差异对比：新增节点、修改节点、删除风险、影响的项目任务。
- 采纳/拒绝/部分采纳。
- 应用前二次确认。

### 步骤数据字段

每个步骤至少包含：

- `id`
- `name`
- `roleId`
- `runnerProviderId`
- `modelProviderId`
- `modelName`
- `capabilityIds`
- `gateType`
- `inputArtifacts`
- `outputArtifacts`
- `acceptanceCriteria`
- `status`
- `linkedProjectTaskIds`

### 页面状态

- loading：流程模板、项目角色、当前流程版本加载中。
- empty：没有流程时显示“从模板创建 / 从项目计划生成 / 空白画布”。
- error：流程读取失败、AI 解析失败、应用失败。
- success：显示画布和步骤配置。
- ai-draft：AI 已生成草案但未确认。
- needs-confirmation：流程变更待确认。
- invalid：流程校验未通过。

### 关键交互

- 点击节点：右侧展示步骤配置。
- 从角色池拖拽到节点：绑定角色。
- 切换常规配置 / AI 辅助生成：不丢失当前草稿。
- 点击 AI 检查流程：只生成建议，不自动修改。
- 点击应用到项目：必须展示影响范围和确认弹窗。
- 应用成功后：项目详情“角色与流程”和工作台“角色流程运行带”同步更新。

## 9. 全局 AI 助手

### 功能

- 全局存在，但按页面切换上下文能力。
- 不作为固定大聊天框占用工作台 Terminal 空间。
- 在流程编排页面表现为“AI 助手 · 流程设计模式”。
- 在项目管理页面表现为“AI 助手 · 项目治理/项目经理模式”。

### 组件拆分

- `GlobalAiAssistantEntry`
- `AiAssistantPanel`
- `AiContextModeBadge`
- `AiSuggestedActions`
- `AiDraftPreview`
- `AiDiffReview`
- `AiApplyConfirmation`

### 页面状态

- idle：等待用户触发。
- loading：解析或生成中。
- empty：当前页面暂无可用上下文。
- error：AI 解析失败。
- success：生成建议、草案或摘要。
- needs-confirmation：需要用户确认才能应用。

### 页面上下文动作

| 页面 | 动作 |
| --- | --- |
| 工作台 | 总结当前步骤、解释 Terminal 输出、生成 TODO、恢复会话建议 |
| 项目管理总览 | 检查全部项目进度、发现风险、生成周报 |
| 项目详情 | 解析协同文件、同步进度、调整计划、生成风险 |
| 流程编排 | 从计划生成流程、检查流程缺口、推荐角色和能力授权 |
| 记忆管理 | 整理项目/角色记忆、沉淀规范 |
| 设置中心 | 检查模型、Runner、MCP、Skills、Git、IM 配置 |

## 10. 记忆管理

设计图：

![记忆管理知识资产中心](assets/memory-management-knowledge-center-v1.png)

### 功能

- 按项目查看项目记忆。
- 在项目内查看角色记忆：产品经理、UI/UX 设计师、前端工程师、代码审查、测试工程师。
- 从项目记忆和角色记忆中提炼可复用知识。
- 跨项目分析反复出现的问题、有效经验、风险模式和推荐实践。
- 把已确认知识沉淀为知识库，用于新项目、新角色、新流程和工作台步骤。
- 支持记忆来源追溯、引用关系、过期标记、人工确认。
- 与全局 AI 助手联动，当前页面显示为“AI 助手 · 记忆整理模式”。

### 页面结构

```text
MemoryManagementPage
├─ MemoryTopbar
│  ├─ AI 助手 · 记忆整理模式
│  ├─ 提炼记忆
│  ├─ 导入记忆
│  └─ 导出知识库
├─ MemorySpaceTree
│  ├─ 项目 / 角色 / 知识库 segment
│  ├─ ProjectMemoryTree
│  └─ MemoryFilters
├─ MemoryWorkspace
│  ├─ MemoryKpiCards
│  ├─ MemoryCategoryTabs
│  ├─ MemoryRecordList
│  └─ MemoryRecordCard
└─ MemoryIntelligencePanel
   ├─ CrossProjectInsights
   ├─ KnowledgeExtractionQueue
   ├─ ReuseSuggestions
   └─ MemoryAuditPanel
```

### 组件拆分

- `MemoryManagementPage`
- `MemoryTopbar`
- `MemorySpaceTree`
- `ProjectMemoryTree`
- `RoleMemoryNode`
- `MemoryFilters`
- `MemoryKpiCards`
- `MemoryCategoryTabs`
- `MemoryRecordList`
- `MemoryRecordCard`
- `MemorySourceBadge`
- `MemoryConfidenceBadge`
- `MemoryReuseButton`
- `MemoryExtractButton`
- `MemoryExpiryControl`
- `MemoryIntelligencePanel`
- `CrossProjectInsights`
- `KnowledgeExtractionQueue`
- `ReuseSuggestions`
- `MemoryAuditPanel`
- `MemorySourceTraceDrawer`
- `ExtractMemoryConfirmationDialog`

### 记忆分类

Tabs：

- 全部记忆
- 决策记录
- 角色经验
- 风险与坑
- Prompt 模板
- 工作流经验

每条记忆至少展示：

- 标题
- 类型
- 所属项目
- 所属角色
- 来源
- 置信度
- 引用项目数
- 更新时间
- 状态：待确认、已确认、已复用、即将过期、已过期
- 操作：复用、提炼、查看来源、标记过期

### 页面状态

- loading：项目、角色、知识库和 AI 建议加载中。
- empty：暂无记忆时显示“从项目同步 / 从协同文件提炼 / 手动新增记忆”。
- error：读取记忆、提炼、应用复用建议失败。
- success：显示三栏知识资产视图。
- needs-confirmation：AI 提炼结果或复用建议等待用户确认。
- stale：存在过期或疑似失效记忆，显示审计提醒。

### 关键交互

- 点击项目：中间显示该项目项目记忆。
- 点击角色：中间显示该角色在当前项目内的角色记忆。
- 切换到知识库：显示已确认可复用知识。
- 点击提炼：AI 从当前范围提取候选知识，进入待确认队列。
- 点击复用：展示来源、影响范围和应用目标，确认后写入目标项目、角色或流程。
- 点击查看来源：打开来源追溯抽屉，展示文件、协同记录或工作台摘要。
- 标记过期：不删除记忆，改变状态并保留审计记录。

### 与其他页面的关系

- 工作台：按当前步骤展示项目记忆和角色记忆摘要。
- 项目管理：项目详情可引用记忆管理的风险清单、决策和复用建议。
- 流程编排：可引用知识库中的工作流经验、Gate 模板和角色能力授权。
- 新建项目：可从知识库推荐角色提示词、流程模板和验收标准。
- AI 助手：在记忆管理中负责整理、提炼、去重、过期检查和复用建议。

## 11. 设置中心相关页面

### 功能

- 模型配置：供应商、模型、API Key、默认模型。
- Runner Provider：Claude Code CLI、Codex CLI、Gemini CLI、Custom Runner。
- 能力中心：MCP / Skills / Plugins / Agents。
- IM 适配器：飞书、钉钉、企业微信、Telegram。
- Git 认证：GitHub、GitLab、Gitee。

### 组件拆分

- `Settings`
- `SettingsTabs`
- `ModelConfigPanel`
- `CliRunnerPanel`
- `CapabilityCenter`
- `ImAdapterSettings`
- `GitAuthConfig`

### 页面状态

- loading：配置读取中。
- empty：暂无配置，显示新增入口。
- error：配置读取或保存失败。
- success：显示配置列表和详情。
- validation：API Key、Webhook、Token、Runner 路径校验。

## 12. 通用状态和交互

- 所有按钮需要 hover / active / disabled / loading 状态。
- 所有表单字段需要 label、helper text 和 error message。
- 所有弹窗/抽屉需要 Esc 关闭和明确关闭按钮。
- 所有危险操作需要二次确认。
- 所有 AI 自动生成内容进入正式项目计划前需要确认。

## 14. P0 覆盖规则：AI 建项 v2 与常规流程设计 v2

以下规则覆盖本文档中较早版本的冲突描述：

- AI 建项助手以 `docs/design/assets/ai-project-initiation-v2-final.png` 为当前定稿参考。
- 常规流程设计以 `docs/design/assets/workflow-conventional-design-v2-final.png` 为当前定稿参考。
- AI 建项讨论区必须有 `发送` 按钮。
- AI 建项讨论区只保留 `添加资料` 和 `粘贴内容` 两个上下文动作。
- `引用当前会话` 不再作为按钮出现；当前讨论默认纳入上下文。
- `读取协同文件` 不再作为按钮出现；项目文档选择归入 `添加资料`。
- `已添加资料` 默认收缩，点击后展开列表。
- 常规流程设计左侧不使用 `流程模板 / 项目角色` 双 Tab。
- `项目角色池` 固定放在左侧资源区下半部分。
- 常规流程设计画布不展示 Gate、Manual Gate、人工决策或审批节点。
- 常规流程设计右侧步骤配置不使用 `Gate 与验收`，只使用 `验收标准`。
- Gate 只在流程应用、执行状态、人工决策或项目管理风险/Gate 页面中体现。

## 13. 全局 Shell 与页面标题规范

所有一级页面必须使用同一套全局 Shell，不允许页面自行创造不同的顶部标题栏、侧栏尺寸或页面起始间距。

适用页面：

- 工作台
- 流程管理
- 项目管理
- 记忆管理
- 设置中心

固定结构：

```text
Sidebar + AppTopbar + Content
```

Sidebar 规范：

- 宽度：`256px`
- 折叠宽度：`72px`
- 导航项高度：`44px`
- 图标容器：`26px`
- 图标尺寸：`15px`
- 图标来源：`lucide-react`
- 一级导航顺序：`工作台 / 流程管理 / 项目管理 / 记忆管理 / 设置中心`

AppTopbar 规范：

- 高度：`64px`
- 面包屑格式：`AgentDevelop / 当前页面`
- 当前页面文字保持统一字号、字重和行高。
- 右侧状态和操作按钮使用同一套高度、圆角、边框和图标尺寸。

Content 规范：

- 普通管理页面：统一 `24px` 内容 padding。
- 工作台：唯一允许 `0` padding 的全屏执行型页面。
- 页面标题必须放在内容区内部的 `PageHeader`，不能替代全局 `AppTopbar`。

验收：

- 页面切换时侧栏、顶部栏、面包屑和标题基线不跳动。
- 流程管理的画布、项目管理的看板、记忆管理的三栏、设置中心的配置面板都在统一 Shell 内容区内呈现。
- 不出现重复顶部栏、巨大黑色空白、页面标题风格突变或图标风格混用。
## Latest Page Spec - 2026-05-18 - AI 流程设计

Final visual:

![AI 流程设计 v1 定稿](assets/ai-workflow-design-v1-final.png)

### Page Identity

- Page name: `AI 流程设计`
- Route proposal: `/workflows/ai-design`
- Navigation: `流程管理`
- Purpose: use AI to analyze discussion/context files/current workflow and generate a workflow draft with a reviewable diff.

### Functional Layout

Top context header:

- Project selector: `AgentDevelop`
- Context selector: `上下文：项目计划 + 协同文件 + 当前流程`
- Target workflow selector: `目标流程：软件开发完整流程`
- Status: `已收集 5 个来源 · 草案未生成`
- Actions:
  - primary `生成流程草案`
  - `保存草稿`
  - `应用到流程`
  - more menu
- Must not include:
  - `导入来源`
  - `打开 AI 助手`

Left column: `讨论区`

- Same interaction model as AI 建项助手.
- Contains chat messages, user/AI bubbles, and context collection.
- `已添加资料 5 项` is collapsed by default.
- Material chips:
  - `当前项目计划`
  - `HANDOFF`
  - `AI建项结果`
  - `当前流程v1.3`
- Composer:
  - textarea placeholder: `继续描述流程约束、粘贴资料或提出优化目标...`
  - `添加资料`
  - `粘贴内容`
  - primary `发送`

Middle column: `AI 解析与流程草案`

- Top action block:
  - primary `生成流程草案`
  - helper text: `只生成草案，不覆盖当前流程`
- Progress steps:
  - `收集来源`
  - `识别目标`
  - `抽取角色`
  - `生成步骤`
  - `校验约束`
- Insight cards:
  - `目标摘要`
  - `角色建议`
  - `能力授权建议`
  - `风险与假设`
- Draft canvas nodes:
  - `需求分析`
  - `UI/UX 设计`
  - `前端开发`
  - `代码审查`
  - `测试验证`

Right column: `差异对比与应用`

- Summary cards:
  - `新增 1 个步骤`
  - `修改 3 个绑定`
  - `未变更 2 项`
- Proposed changes list:
  - additions, modifications, unchanged rows.
- Confirmation checklist:
  - `用户确认`
  - `不覆盖当前版本`
  - `保存为 v1.4 草案`
- Actions:
  - `查看完整差异`
  - primary `确认应用到流程`

### States

- loading: AI 正在解析来源，显示 progress skeleton and disabled apply actions.
- empty: no source/context, left discussion asks user to add materials or describe goals.
- error: source parse failed, show failed source row and retry.
- success: draft generated, diff visible, apply checklist available.
- applied: workflow version created, show `v1.4 草案已创建`.

### Interaction Rules

- Clicking `生成流程草案` reads discussion + attached materials + current workflow snapshot.
- AI result never mutates the current workflow directly.
- `应用到流程` is disabled until a draft exists and confirmation checklist is complete.
- `添加资料` and `粘贴内容` live in the left discussion composer, not in the header.
- No Gate / Manual Gate / 人工决策 node appears on this design canvas.

## 最新页面规格补充：AI 流程设计定稿 - 2026-05-19

Source of truth:

- `docs/design/mockups/ai-workflow-design-v1-final.html`
- `public/mockups/ai-workflow-design-v1-final.html`

### 页面：AI 流程设计

建议路由：

```text
/workflow-management/ai-design
#workflow-ai-design
```

### 功能

- 从项目计划、协同文件、当前流程版本、用户讨论内容中收集上下文。
- 触发 AI 生成流程草案。
- 展示 AI 分析步骤：收集来源、识别目标、抽取角色、生成步骤、校验约束。
- 展示结构化分析结果：目标摘要、角色建议、能力授权建议、风险与假设。
- 展示流程草案画布：5 个流程节点，每个节点展示角色、Runner、模型和状态。
- 展示差异对比：新增、修改、未变更。
- 展示应用确认清单，用户确认后才能应用到流程。

### 组件拆分

- `AiWorkflowDesignPage`
- `AiWorkflowHeaderToolbar`
- `AiWorkflowDiscussionPanel`
- `AiWorkflowMaterialList`
- `AiWorkflowComposer`
- `AiWorkflowAnalysisPanel`
- `AiWorkflowAnalysisStepper`
- `AiWorkflowInsightGrid`
- `AiWorkflowDraftCanvas`
- `AiWorkflowDraftNode`
- `AiWorkflowDiffPanel`
- `AiWorkflowDiffStats`
- `AiWorkflowDiffList`
- `AiWorkflowApplyChecklist`
- `AiWorkflowApplyActions`

### 页面状态

- `empty`：尚未收集来源，左侧讨论区显示输入提示，中间显示等待分析状态，右侧显示空差异提示。
- `source-ready`：已添加资料，等待点击 `生成流程草案`。
- `loading`：AI 正在分析来源和生成草案，中间 stepper 显示进行中。
- `draft-ready`：流程草案生成完成，展示草案画布和差异面板。
- `needs-confirmation`：用户需要勾选确认清单，应用按钮保持 disabled。
- `success`：已应用到流程，显示版本号和成功状态。
- `error`：来源读取失败、AI 分析失败或草案生成失败，显示错误原因和重试按钮。

### 交互规则

- `添加资料`：打开资料添加入口，Phase 1 可使用 mock 文件列表。
- `粘贴内容`：打开粘贴文本入口，内容进入同一上下文集合。
- `发送`：把用户补充说明追加到讨论区，并进入 AI 上下文。
- `生成流程草案`：只生成草案，不覆盖当前流程。
- `查看完整差异`：展开或跳转到完整 diff 详情。
- `确认应用到流程`：只有确认清单全部完成后可用。

### 视觉验收

- 左侧资料列表行高约 25px，图标、文件名、文件类型三列对齐。
- 左侧输入按钮高度约 30px，发送按钮约 34px，必须有图标。
- 中间流程草案画布高度约 248px，节点约 118px x 194px。
- 节点内部字段不得溢出，长文本使用省略或压缩字号。
- 右侧统计卡、差异列表和确认清单字号比中间主区域小一档。
- 右侧底部按钮高度约 48px，不允许大块底部空白。
## Page Spec: Project Detail Final - 2026-05-21

Source mockup:

- `docs/design/mockups/project-detail-trace-drawer-v1.html`
- `public/mockups/project-detail-trace-drawer-v1.html`

### Page Purpose

项目详情页用于管理单个项目的计划、进度、风险、角色流程、协同文件和变更记录。它不是工作台执行现场，而是项目管理视角的单项目治理页。

### Layout

- Shell: left sidebar + main content + persistent right detail panel.
- Left sidebar: `228px`.
- Main content: flexible width.
- Right detail panel: about `420px`, starts below global topbar.
- Global topbar height: `56px`.
- Global status `个人本地版`: absolute top-right of the whole page.

### Main Regions

1. Global breadcrumb
   - Shows `AgentDevelop / 项目管理 / AgentDevelop 详情`.
   - Must not contain page-level action buttons.

2. Project hero
   - Left: project name, project description, minimal status.
   - Center: `metric-zone` wrapping KPI cards.
   - Right: local action toolbar.

3. KPI metric zone
   - Cards:
     - 总进度
     - 待确认
     - 高风险
   - Must be wrapped in a visible container.
   - Do not include `Gate` or `测试通过` in the top KPI metric zone. Gate belongs to 风险与决策, 协同来源, or the right detail panel context. Test pass count belongs to 质量/验收 or detail context.

4. Local action toolbar
   - Buttons:
     - 返回总览
     - 进入工作台
     - 检查最新进度
     - 保存变更
   - `返回总览` is icon-only and returns to the project management overview.
   - Other buttons use icon + text.
   - Toolbar has its own border/background container.

5. Project cockpit
   - 项目目标
   - AI 进度 Check
   - 下一验收点

6. Project tabs
   - 项目概况
   - 计划与任务
   - 进度视图
   - 风险与决策
   - 角色与流程
   - 协同文件
   - 变更记录

7. Phase timeline
   - Stays at bottom of main content.
   - Timeline line and nodes must sit lower inside the card, not touching the top edge.

8. Persistent detail panel
   - Header: `详情面板` + selected object type badge.
   - Default badge: `当前任务`.
   - Default content: P3 流程编排画布 V2 task details.
   - Must not visually enter the global navigation area.

### Tab Content Requirements

#### 项目概况

- Three columns:
  - 项目基本信息
  - 计划摘要
  - 协同来源
- `最后同步` and `协同文件已连接` belong in 协同来源, not under the project title.

#### 计划与任务

- Show priority, task, phase, owner, progress, status.
- Rows should be selectable and update the right detail panel.

#### 进度视图

- Include Gantt chart.
- Gantt bar selection updates right detail panel.

#### 风险与决策

- Include SWOT analysis.
- Include risk matrix.
- Include Gate decision info.

#### 角色与流程

- Two-area layout:
  - Left: 项目角色池
  - Right: 流程绑定关系
- Workflow steps reference roles from the project role pool.
- Must not expand beyond the tab content area.

#### 协同文件

- List collaboration files with stable CSS/SVG file icons.
- File selection updates right detail panel with AI parsing summary.

#### 变更记录

- Show project changes and dates.
- Change selection updates right detail panel.

### States

- Loading: skeleton for hero, KPI cards, tab content, detail panel.
- Empty: no project data, show create/import guidance.
- Error: show project load failure with retry.
- Success: default project detail view.
- Selection empty: right panel shows next actions, pending confirmations, recent changes.
