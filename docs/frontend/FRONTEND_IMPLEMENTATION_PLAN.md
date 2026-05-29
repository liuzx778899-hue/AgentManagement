# Agent 工程管理系统 - 前端实现计划

## 最新 P0 执行补充：流程管理总览 v1 - 2026-05-22

Source of truth:

- `docs/design/mockups/flow-management-overview-v1.html`
- `public/mockups/flow-management-overview-v1.html`
- `docs/design/design-tokens.md`

目标：

- `流程管理` 一级导航先进入流程资产总览页。
- `常规流程设计` 和 `AI 流程设计` 是总览页中的创建/编辑入口，不再作为流程管理首页。
- 移除总览页底部解释性的 `流程关系视图`，关系细节放到流程详情或设计器。
- 100% 浏览器缩放下完成布局，不允许依赖 `transform: scale(.8)` 或用户浏览器 80% 缩放。

建议路由：

```text
/workflow-management
/workflow-management/:workflowId
/workflow-management/:workflowId/design
/workflow-management/ai-design
```

Phase 1 如路由暂未拆分，可使用 hash：

```text
#workflow-management
#workflow-detail/:workflowId
#workflow-builder/:workflowId
#workflow-ai-design
```

建议组件：

- `WorkflowManagementOverviewPage`
- `WorkflowOverviewHeader`
- `WorkflowOverviewActions`
- `WorkflowPortfolioKpis`
- `WorkflowCategoryTabs`
- `WorkflowCategoryManager`
- `WorkflowAssetCardGrid`
- `WorkflowAssetCard`
- `WorkflowHealthPanel`
- `WorkflowCapabilityGapCard`
- `WorkflowRoleGapCard`
- `WorkflowRecentChanges`
- `WorkflowAiSuggestionCard`

Mock data：

集中放置，例如：

```text
src/data/workflowManagementFixtures.ts
```

至少包含：

- `workflowCategories`：开发类、设计类、评审类、发布类。
- `workflowAssets`：流程名称、分类、版本、状态、步骤、绑定项目、角色覆盖、Runner 覆盖、能力授权、风险缺口、成熟度。
- `workflowHealthSummary`：能力授权缺口、角色绑定缺口、最近变更、AI 建议。

P0 实现要求：

- 侧栏点击 `流程管理` 渲染 `WorkflowManagementOverviewPage`。
- 页面顶部提供：`检查全部流程`、`维护分类`、`新建常规流程`、`AI 生成流程`、`导入流程`。
- 分类 tab 可过滤流程列表。
- `维护分类` Phase 1 可以打开 mock 弹窗或右侧面板，但数据必须集中。
- `查看详情` 跳转到流程详情。
- `进入设计` 跳转到常规流程设计器。
- `AI 生成流程` 跳转到 AI 流程设计定稿页。
- `新建常规流程` 跳转到常规流程设计器新建模式。

页面状态：

- loading：流程、分类、健康诊断加载中。
- empty：没有流程，突出新建/AI 生成/导入流程。
- filtered-empty：当前分类无流程。
- error：读取失败。
- success：显示 KPI、分类、流程资产卡和健康面板。
- validating：检查全部流程时展示检查中状态。

测试：

- 断言 `流程管理` 首页不是流程画布设计器。
- 断言页面存在 `流程管理`、`流程列表`、`分类与健康面板`。
- 断言存在分类：`全部`、`开发类`、`设计类`、`评审类`、`发布类`。
- 断言存在操作：`维护分类`、`新建常规流程`、`AI 生成流程`、`导入流程`。
- 断言总览页不存在 `流程关系视图`。
- 断言流程卡片存在 `查看详情` 和 `进入设计`。
- Playwright 视觉验收：1920x1080、浏览器 100% 下 `documentElement.scrollWidth <= innerWidth` 且 `documentElement.scrollHeight <= innerHeight`。

## 最新 P0 执行补充：AI 建项统一入口与新版工作台导航

### P0-0：流程管理 AI 辅助生成接入全局 AI 助手

目标：

- `AI 辅助生成` 不做孤立聊天框。
- 文件和系统数据通过 `来源导入/引用` 进入 AI 解析。
- 自然语言补充通过右下角全局 AI 助手完成，流程页只把它切换为 `流程设计模式`。

建议组件：

- `WorkflowAiAssistPanel`
- `AiSourceImportSection`
- `PlanFileImport`
- `CollaborationFileImport`
- `CurrentProjectPlanReference`
- `AiProjectDraftReference`
- `ExistingWorkflowReference`
- `ImportedSourceList`
- `SourceParseSummary`
- `WorkflowDraftPreview`
- `WorkflowDiffReview`
- `OpenGlobalAiAssistantButton`
- `ApplyFlowConfirmation`

实现要求：

- `PlanFileImport` 和 `CollaborationFileImport` Phase 1 先限制 `accept=".md"`。
- `ExistingWorkflowReference` 从 mock 流程模板或当前流程版本读取，不走文件上传。
- `OpenGlobalAiAssistantButton` 打开同一个全局 AI 助手，并传入上下文：
  - currentPage: `workflow-builder`
  - mode: `flow-design`
  - selectedWorkflowId
  - selectedStepId
  - importedSourceIds
  - currentProjectId
- AI 助手中输入的大白话补充写回当前 AI 辅助生成任务的 `manualInstruction`。
- AI 生成结果必须进入 `WorkflowDiffReview -> ApplyFlowConfirmation`，不直接覆盖当前流程。

测试：

- 断言 `AI 辅助生成` 面板存在 `.md` 文件导入入口。
- 断言能选择当前项目计划、AI 建项结果、已有流程模板或当前流程版本。
- 断言页面不渲染独立聊天框。
- 断言点击 `打开 AI 助手补充说明` 后，全局 AI 助手显示 `流程设计模式`。
- 断言补充说明能进入 AI 草案生成上下文。
- 断言应用前必须显示差异和确认。

### P0-1：AI 方案立项改为 AI 建项助手

目标：

- 移除 `直接讨论 / 粘贴对话 / 导入文档 / 当前会话` 四个并列入口。
- 实现一个统一的 `AI 建项助手` 页面。
- 聊天、粘贴、上传、引用当前会话、读取协同文件都作为同一个输入区的上下文能力。

建议组件：

- `AiProjectInitiationPage`
- `AiContextComposer`
- `AiAttachmentStrip`
- `AiBriefingChat`
- `ProjectDraftPreview`
- `PlanExtractionPanel`
- `RiskAndAssumptionPanel`
- `CreateProjectConfirmation`

mock data：

- 统一放入项目 mock 数据目录。
- 标记 TODO：Phase 2 接入真实文件解析、会话读取和 AI 服务。

测试：

- 断言页面存在 `AI 建项助手`。
- 断言不存在四个并列入口：`直接讨论`、`粘贴对话`、`导入文档`、`当前会话`。
- 断言上传、粘贴、聊天入口在同一输入区。
- 断言 AI 草案必须确认后才创建项目。

### P0-2：项目详情进入新版工作台

目标：

- 项目管理总览项目卡片的 `进入工作台` 和项目详情页的 `进入工作台` 指向同一个新版工作台。
- 不得进入旧版工作台、旧版项目开发页或项目管理内嵌执行区。

建议路由：

```text
/projects/:projectId/workbench
```

如现有路由暂不支持，可以先落到：

```text
/#workbench?projectId=:projectId
```

但渲染必须是新版 `Terminal Workspace` 工作台。

验收：

- 点击项目卡片 `进入工作台` 后，页面显示 Terminal Workspace 为主区域。
- 点击项目详情 `进入工作台` 后，进入同一新版工作台。
- 工作台顶部显示当前项目名、分支、worktree 和阶段。
- Terminal 工具栏显示 `步骤上下文 / 提示词 / 角色记忆 / MCP / Skills / Git / Local Shell / 快照`。
- 右侧面板只显示 TODO、Gate、项目记忆、最近文件、会话状态。

测试：

- 增加项目卡片到工作台导航测试。
- 增加项目详情到工作台导航测试。
- 增加断言：目标页面不是旧版工作台布局。

更新时间：2026-05-17  
执行方：实现 Agent / 前端编码工具  
约束：不要修改后端业务逻辑；Phase 1 仍为前端 Web MVP；真实 API 缺失时使用集中 mock data。

## 1. 实现前先阅读

必须先读：

- `docs/design/DESIGN_OVERVIEW.md`
- `docs/design/PAGE_SPEC.md`
- `docs/design/design-tokens.md`
- `docs/design/assets/workbench-v1.png`
- `docs/design/assets/ai-project-initiation-v2-final.png`
- `docs/design/mockups/flow-management-overview-v1.html`
- `docs/design/assets/workflow-conventional-design-v2-final.png`
- `docs/design/assets/project-management-overview-ai-briefing-v1.png`
- `docs/design/assets/project-detail-gantt-v1.png`
- `docs/design/assets/project-detail-trace-drawer-v1.png`
- `docs/design/assets/workflow-builder-dual-mode-v1.png`
- `docs/design/assets/memory-management-knowledge-center-v1.png`
- `docs/HANDOFF_NEXT_TASKS.md`
- `docs/CODE_REVIEW_AND_FIX_REQUESTS.md`
- `docs/contracts/API_CONTRACT.md`（如果不存在，不要发明接口，先使用 mock 并补 `docs/contracts/questions.md`）
- `packages/types/**`（如果不存在，使用 `src/domain/**` 作为临时类型来源）

需要从以下目录梳理功能：

- `docs/product`
- `docs/process`
- `docs/contracts`
- `docs/design`
- `docs/superpowers/specs`
- `docs/superpowers/plans`

如果目录不存在，记录为“当前项目未提供该类文档”，不要阻塞实现。

## 2. 技术边界

当前技术栈：

- React 19
- TypeScript
- Vite
- lucide-react
- CSS tokens / 普通 CSS
- Vitest + Testing Library

实现规则：

- 优先复用现有组件、状态结构、CSS token 和 lucide-react 图标。
- 不引入不必要的新依赖。
- 不要把工作台执行功能混入项目管理页面。
- 不要把项目管理计划治理功能塞进 Terminal Workspace。
- 不要发明后端字段；接口不存在时集中 mock。
- mock data 必须集中放置，并明确标记 TODO。

## 3. 本次需要实现/对齐的页面

| 优先级 | 页面 | 目标 |
| --- | --- | --- |
| P0 | 工作台 | 对齐最新冻结版 Terminal Workspace 布局和右侧面板规则 |
| P0 | 项目管理总览 | 改为多项目治理入口，不承担项目开发执行现场 |
| P0 | 项目详情 | 新增或完善单项目驾驶舱、Tabs、详情抽屉 |
| P1 | 进度 Check | 总览、卡片、详情均可触发，先走 mock/本地状态 |
| P1 | AI 建项助手 | 统一聊天、粘贴、上传、当前会话和协同文件上下文生成项目草案 |
| P1 | 导入已有项目 | 增加 Claude Code / Codex / 通用项目分类 |
| P1 | 新建空白项目 | 角色先定义，工作流再绑定角色 |
| P0 | 流程管理总览 | 一级流程资产管理页，分类、健康、风险和流程入口 |
| P1 | 流程设计双模式 | 常规配置为基础，AI 辅助生成草案和优化建议 |
| P1 | 全局 AI 助手上下文 | 同一个 AI 入口按页面提供不同能力 |
| P1 | 记忆管理知识资产中心 | 项目记忆、角色记忆、知识库、AI 提炼和审计 |
| P2 | 设置中心 | Runner Provider、能力中心、IM/Git 风格统一 |

## 4. 页面实现明细

### 4.1 工作台

功能：

- 顶部项目/分支/worktree/Phase/保存状态/actions。
- 角色流程运行带。
- Terminal Workspace 占据主视觉区域。
- Terminal Toolbar 包含步骤上下文、角色记忆、角色提示词、MCP、Skills、Git、Local Shell、快照、更多。
- 右侧面板仅展示 TODO、Gate、项目记忆、当前角色记忆摘要、最近文件、会话状态。
- 右侧面板支持固定、浮动、自动隐藏。

组件：

- `WorkbenchPage`
- `WorkbenchTopbar`
- `RoleFlowLane`
- `RoleStepCard`
- `TerminalWorkspace`
- `TerminalToolbar`
- `WorkbenchSidePanel`
- `TodoListPanel`
- `GateStatusCard`
- `SessionRestoreDialog`

状态：

- loading：加载项目和会话。
- empty：无打开项目。
- error：项目状态读取失败。
- success：完整工作台。
- disabled：未授权工具置灰。

交互：

- 点击流程卡片切换 Terminal Tab。
- 点击 MCP/Skills/Git/Shell 显示当前步骤授权弹窗。
- 右侧面板隐藏后 Terminal 自动扩宽。

### 4.2 项目管理总览

功能：

- 三个项目入口：新建空白项目、导入已有项目、AI 方案立项。
- 检查全部项目进度。
- 多项目 KPI、项目卡片、右侧待处理/风险/里程碑。
- 项目卡片支持进入详情、进入工作台、Check。

组件：

- `ProjectManagementPage`
- `ProjectEntryActions`
- `ProjectPortfolioKpis`
- `ProjectSummaryCard`
- `ProjectCardGrid`
- `PortfolioAttentionPanel`
- `PortfolioRiskPanel`
- `WeeklyMilestonesPanel`

状态：

- loading：项目列表加载。
- empty：无项目，显示三入口。
- error：加载失败。
- success：显示项目组合视图。

### 4.3 项目详情

功能：

- 单项目驾驶舱：项目目标、AI Check、下一验收点。
- KPI：总进度、待确认、高风险。Gate 和测试通过不作为顶部 KPI，进入风险与决策、质量/验收或详情面板。
- Tabs：项目概况、计划与任务、进度视图、风险与决策、角色与流程、协同文件、变更记录。
- 右侧抽屉展示任务/风险/角色/Gate/协同文件详情。
- 计划队列可人工干预和排序。

组件：

- `ProjectDetailPage`
- `ProjectDetailHeader`
- `ProjectCockpit`
- `AiProgressCheckCard`
- `ProjectDetailTabs`
- `ExecutionQueueTable`
- `MilestoneTimeline`
- `RiskMatrix`
- `ProjectDetailDrawer`

状态：

- loading：详情加载。
- empty：项目无计划。
- error：详情读取失败。
- success：正常展示。
- partial：协同文件不完整。

### 4.4 进度 Check

功能：

- 从协同文件、工作台 TODO、测试/build/lint/typecheck 结果、Gate 状态生成进度差异。
- 展示进度变化、风险变化、新增阻塞、待人工确认。
- 用户确认后应用到项目计划和卡片摘要。

组件：

- `ProgressCheckButton`
- `ProgressCheckResultPanel`
- `ProgressDiffList`
- `ApplyProgressChangeDialog`

状态：

- idle：检查最新进度。
- checking：检查中。
- found-changes：发现 N 项变更。
- synced：已同步。
- needs-confirmation：需要确认。
- failed：检查失败。

### 4.5 AI 方案立项

功能：

- 在同一个 AI 建项工作区中完成聊天、粘贴资料、上传文档、引用当前会话和读取协同文件。
- AI 追问澄清。
- 生成项目方案、角色、流程、任务、计划草案。
- 用户确认后创建正式项目。

组件：

- `AiProjectBriefingPage`
- `BriefingSourceTabs`
- `BriefingChatPanel`
- `ParsedProjectOutline`
- `GeneratedPlanDraft`
- `PlanDiffPreview`

状态：

- empty：等待输入。
- loading：AI 解析中。
- error：解析失败。
- success：生成草案。
- needs-confirmation：等待创建确认。

### 4.6 导入已有项目

功能：

- 输入路径或选择路径。
- 扫描仓库并识别项目类型。
- Claude Code / Codex / 通用项目 / 混合项目差异化解析。
- 通用项目要求用户补充必要信息。

组件：

- `ExistingProjectImport`
- `RepositoryPathPicker`
- `ProjectTypeDetector`
- `CollaborationFileScanner`
- `TraditionalProjectSupplementForm`
- `ImportConfirmStep`

状态：

- empty：等待路径。
- loading：扫描中。
- error：路径/仓库/权限错误。
- success：显示检测结果。
- partial：缺少协同信息，需要补充。

### 4.7 新建空白项目

功能：

- 基础信息。
- 左侧角色池。
- 右侧工作流步骤绑定角色。
- 每个步骤配置 Runner、模型、能力授权。
- 生成初始项目计划。

组件：

- `NewProjectWizard`
- `ProjectBasicInfoStep`
- `ProjectRolePoolStep`
- `WorkflowRoleBindingStep`
- `RunnerModelCapabilityStep`
- `InitialPlanStep`

状态：

- loading：模板加载。
- empty：无模板。
- error：校验失败。
- success：创建预览。
- validation：字段级错误。

### 4.6 流程管理总览

功能：

- 展示流程资产组合和分类。
- 展示流程总数、启用中、绑定项目、待校验、高风险。
- 支持 `检查全部流程`、`维护分类`、`新建常规流程`、`AI 生成流程`、`导入流程`。
- 支持按分类过滤：全部、开发类、设计类、评审类、发布类。
- 展示流程卡片：步骤链路、角色覆盖、Runner 覆盖、能力授权、风险缺口、成熟度。
- 展示右侧分类维护和健康诊断。

组件：

- `WorkflowManagementOverviewPage`
- `WorkflowOverviewHeader`
- `WorkflowPortfolioKpis`
- `WorkflowCategoryTabs`
- `WorkflowCategoryManager`
- `WorkflowAssetCardGrid`
- `WorkflowAssetCard`
- `WorkflowHealthPanel`

状态：

- loading：流程和分类加载中。
- empty：暂无流程。
- filtered-empty：当前分类无流程。
- error：加载失败。
- success：正常总览。
- validating：检查中。

交互：

- 点击分类过滤流程。
- 点击维护分类打开维护面板。
- 点击查看详情进入流程详情。
- 点击进入设计进入常规流程设计器。
- 点击 AI 生成流程进入 AI 流程设计。

### 4.7 流程设计双模式

功能：

- 顶部提供 `常规配置 / AI 辅助生成` segmented control。
- 常规配置为默认模式，支持模板、角色池、画布节点、步骤属性、流程版本。
- AI 辅助生成支持从项目计划、协同文件、AI 方案立项结果或已有流程生成草案。
- 两种模式共享同一套流程版本和步骤数据。
- AI 输出必须进入草案/差异对比，用户确认后才能应用到项目。
- 应用后同步到项目详情和工作台角色流程运行带。

组件：

- `WorkflowBuilderPage`
- `WorkflowHeader`
- `WorkflowModeSwitch`
- `WorkflowCooperationStrip`
- `WorkflowLeftRail`
- `WorkflowTemplateLibrary`
- `ProjectRolePool`
- `WorkflowCanvas`
- `WorkflowNode`
- `WorkflowEdge`
- `WorkflowStepInspector`
- `RunnerModelControl`
- `CapabilityAuthorizationMatrix`
- `GateAndAcceptanceEditor`
- `AiFlowSuggestionBox`
- `FlowDiffReviewDialog`
- `ApplyFlowConfirmationDialog`

状态：

- loading：模板、角色、流程版本加载中。
- empty：无流程时显示从模板创建、从项目计划生成、空白画布。
- error：读取、AI 解析或应用失败。
- success：正常画布编辑。
- ai-draft：AI 草案待确认。
- invalid：流程校验未通过。
- needs-confirmation：流程变更待用户确认。

交互：

- 点击流程节点后右侧展示步骤配置。
- 从角色池拖拽或选择角色绑定到步骤。
- 步骤配置必须包含 Role、Runner、Model、Capability、Gate、验收标准。
- 点击 AI 检查流程只生成建议，不自动改正式版本。
- 点击应用到项目必须展示影响范围：新增步骤、修改步骤、受影响任务、受影响 Gate。

### 4.7 全局 AI 助手上下文

功能：

- 同一个全局 AI 入口，按当前页面切换能力。
- 工作台中不占用 Terminal Workspace 主区域。
- 流程编排中作为“流程设计模式”，负责生成草案、检查缺口、推荐绑定。
- 项目管理中作为“项目治理/项目经理模式”，负责进度 Check、风险、计划变更。

组件：

- `GlobalAiAssistantEntry`
- `AiAssistantPanel`
- `AiContextModeBadge`
- `AiSuggestedActions`
- `AiDraftPreview`
- `AiDiffReview`
- `AiApplyConfirmation`

状态：

- idle：未展开。
- loading：生成中。
- empty：当前页面上下文不足。
- error：解析失败。
- success：展示建议或草案。
- needs-confirmation：等待用户确认应用。

### 4.8 记忆管理知识资产中心

功能：

- 左侧按项目、角色、知识库组织记忆空间。
- 中间展示当前项目或角色的记忆列表、分类、KPI 和操作。
- 右侧展示 AI 提炼、跨项目洞察、复用建议和记忆审计。
- 支持从项目记忆和角色记忆提炼可复用知识。
- 支持跨项目分析，给当前项目开发提供建议。
- 支持来源追溯、引用项目、置信度、过期标记和人工确认。

组件：

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
- `MemoryIntelligencePanel`
- `CrossProjectInsights`
- `KnowledgeExtractionQueue`
- `ReuseSuggestions`
- `MemoryAuditPanel`
- `MemorySourceTraceDrawer`
- `ExtractMemoryConfirmationDialog`

状态：

- loading：项目、角色、知识库、AI 建议加载中。
- empty：暂无记忆，显示从项目同步、从协同文件提炼、手动新增入口。
- error：读取、提炼、复用或审计失败。
- success：完整三栏知识资产视图。
- needs-confirmation：AI 提炼结果或复用建议待确认。
- stale：存在过期或疑似失效记忆。

交互：

- 点击项目后展示项目记忆。
- 点击项目下角色后展示该角色记忆。
- 切换知识库后展示已确认可复用知识。
- 点击提炼记忆后生成候选知识，不自动入库。
- 点击复用后展示来源和影响范围，确认后应用到目标项目、角色或流程。
- 点击查看来源打开追溯抽屉。
- 点击标记过期保留原记录并更新状态。

## 5. API 对接方式

Phase 1 优先使用前端 mock 和本地 reducer/state。

建议接口边界：

```text
GET    /projects
GET    /projects/:id
POST   /projects
PATCH  /projects/:id
POST   /projects/:id/progress-check
POST   /projects/:id/apply-progress-diff
GET    /projects/:id/workflows
PATCH  /projects/:id/workflows/:workflowId
GET    /projects/:id/roles
PATCH  /projects/:id/roles/:roleId
POST   /projects/:id/workflows/generate-draft
POST   /projects/:id/workflows/:workflowId/validate
POST   /projects/:id/workflows/:workflowId/apply
POST   /ai/context-actions
GET    /memories
GET    /projects/:id/memories
GET    /projects/:id/roles/:roleId/memories
POST   /memories/extract
POST   /memories/:memoryId/reuse
PATCH  /memories/:memoryId
GET    /knowledge-base
POST   /knowledge-base
GET    /settings/runners
GET    /settings/model-providers
GET    /settings/capabilities
```

实现要求：

- 先阅读 `docs/contracts/API_CONTRACT.md` 和 `packages/types/**`。
- 如果不存在，不要发明后端已经存在的字段。
- 前端可以定义临时 mock 类型，但需要标注 TODO。
- 契约缺失写入 `docs/contracts/questions.md`。

## 6. Mock Data 方案

集中位置建议：

- `src/data/fixtures.ts`：现有全局演示数据。
- `src/data/mockProjects.ts`：项目总览和详情 mock。
- `src/data/mockWorkbench.ts`：工作台、Terminal、TODO、Gate mock。
- `src/data/mockProgressCheck.ts`：进度 Check mock。
- `src/data/mockMemory.ts`：项目记忆、角色记忆、知识库、AI 提炼和审计 mock。

如果不新增文件，也必须在现有 `fixtures.ts` 内集中管理，不要散落在组件中。

Mock 数据至少包含：

- 3 个项目：
  - AgentDevelop：运行中，Phase 1 Web MVP，76%，中风险。
  - Internal CLI Tools：推进中，Phase 0，42%，高风险。
  - Docs Automation：规划中，18%，低风险。
- 5 个工作流步骤。
- 5 个角色。
- 2 个流程模式：常规配置、AI 辅助生成。
- 3 个流程版本：草稿、已应用、有变更。
- 1 个 AI 流程草案和 1 个流程差异结果。
- 4 个 Runner Provider。
- 3 个模型供应商。
- MCP / Skills / Plugins / Agents 授权矩阵。
- 进度 Check 结果：发现 5 项变更。
- 3 个项目记忆空间。
- 每个项目至少 5 个角色记忆节点。
- 20 条记忆记录，覆盖决策记录、角色经验、风险与坑、Prompt 模板、工作流经验。
- 5 条知识库条目。
- 4 条跨项目洞察。
- 3 条待确认 AI 提炼结果。
- 3 条复用建议和对应来源追溯。

## 7. 颜色、字体、间距、圆角、阴影

必须严格使用：

- `docs/design/design-tokens.md`
- `src/styles/tokens.css`
- `docs/design/assets/*.png` 中的布局、信息层级和视觉密度

实现要求：

- 不随意写新的 raw hex。
- 新状态色先映射到已有 semantic token。
- 新组件优先使用 `--space-*`、`--radius-*`、`--shadow-*`。
- 新页面保持深色工程管理风格。
- Tabs、按钮、卡片、抽屉、表格样式保持一致。
- 记忆管理三栏布局必须保持信息密度：左侧树、中间列表、右侧智能建议。
- 记忆状态使用 chip + 图标，不只依赖颜色。
- AI 提炼和复用建议使用 `--accent`，待确认使用 `--warn`，过期/失效使用 `--danger`。

## 8. 响应式规则

Desktop >= 1440px：

- 左侧导航 + 主内容 + 可选右侧面板。
- 工作台显示 Terminal + 右侧面板。
- 项目详情显示右侧抽屉。

Laptop 1024px - 1439px：

- 右侧面板默认可折叠。
- 项目卡片两列或三列。
- 项目详情抽屉可覆盖。

Tablet 768px - 1023px：

- 左侧导航收窄。
- 项目卡片两列。
- Terminal Toolbar 折叠部分按钮到更多。

Mobile < 768px：

- 不要求完整移动体验，但必须无横向溢出。
- 项目卡片单列。
- Tabs 横向滚动。
- 右侧面板改为底部抽屉。

## 9. 测试计划

命令：

```bash
npm --cache .npm-cache test
npm --cache .npm-cache run build
npm --cache .npm-cache run typecheck
npm --cache .npm-cache run lint
```

自动化测试建议：

- 侧栏存在：工作台、项目管理、流程编排、记忆管理、设置中心。
- 项目管理总览存在三个入口：新建空白项目、导入已有项目、AI 方案立项。
- 项目卡片存在进入详情、进入工作台、Check。
- 项目详情存在 Tabs：项目概况、计划与任务、进度视图、风险与决策、角色与流程、协同文件、变更记录。
- 点击 Check 后展示发现变更和确认同步。
- 工作台 Terminal Toolbar 存在 MCP、Skills、Git、Local Shell，右侧面板不出现这些工具入口。
- 点击流程步骤后 active Terminal Tab 变化。
- 流程编排存在常规配置 / AI 辅助生成两个模式。
- 常规配置模式能显示模板、角色池、画布和步骤属性。
- AI 辅助生成模式能生成草案，应用前显示差异和确认。
- 流程步骤配置能展示 Role、Runner、Model、Capability、Gate、验收标准。
- 所有核心页面具备 loading / empty / error / success 状态。
- 记忆管理能看到项目、项目内角色、知识库和 AI 提炼建议。
- 点击角色节点后展示该角色记忆。
- 点击提炼记忆后展示待确认候选知识。
- 点击复用建议前必须展示来源追溯和确认。
- 过期记忆不会被删除，只改变状态并保留审计记录。

浏览器验收：

- 中文无乱码。
- 页面间距、字号、圆角、边框和阴影与设计图一致。
- 工作台 Terminal Workspace 是最大视觉区域。
- 项目管理页面不出现 Terminal 执行区。
- 项目详情右侧抽屉能展示任务追溯详情。
- 记忆管理页面能清晰区分项目记忆、角色记忆、知识库和跨项目洞察。

## 10. 实施顺序

1. 修复或确认中文无乱码。
2. 补齐 mock 数据结构。
3. 对齐设计 tokens。
4. 实现项目管理总览。
5. 实现项目详情。
6. 实现进度 Check mock 闭环。
7. 对齐工作台冻结版布局。
8. 对齐流程编排双模式：常规配置 + AI 辅助生成。
9. 补齐全局 AI 助手上下文动作。
10. 对齐记忆管理知识资产中心。
11. 补齐 AI 方案立项、导入已有项目、新建空白项目改造。
12. 更新测试。
13. 浏览器验收和视觉审查。

## 11. 不做事项

- 不接真实后端。
- 不执行真实 CLI/Shell/Git/MCP。
- 不实现真实多 Agent 调度。
- 不引入新的 UI 组件库。
- 不把项目开发执行区放回项目管理。

## P0-00: Global UI Shell And Visual Consistency

Goal:

- Use the latest Workbench as the frontend visual baseline.
- Remove the visible jump when navigating from `工作台` to `流程管理`, `项目管理`, `记忆管理`, or `设置中心`.
- Keep layout, typography, icon style, color, spacing, border, and page density consistent across all first-level pages.

Required source of truth:

- `docs/design/design-tokens.md`
- `docs/design/mockups/workbench-v1.html`
- `docs/design/assets/workbench-v1.png`
- `docs/HANDOFF_NEXT_TASKS.md` section `Latest UI Shell Standard - 2026-05-18`

Components to standardize:

- `AppShell`
- `Sidebar`
- `AppTopbar`
- `Breadcrumb`
- `PageContent`
- `PageHeader`
- `PageTitleRow`
- `PageActions`

Implementation tasks:

1. Audit `src/components/AppShell.tsx`, `src/styles/layout.css`, `src/styles/base.css`, and every first-level page root.
2. Make `Sidebar + AppTopbar + Content` the only first-level page shell.
3. Lock shared dimensions:
   - Sidebar width: `256px`
   - Collapsed sidebar width: `72px`
   - AppTopbar height: `64px`
   - Normal page content padding: `24px`
   - Workbench full-bleed content padding: `0`
4. Make page headers consistent:
   - same title icon size
   - same title font size and weight
   - same subtitle font size and color
   - same action button height and icon size
5. Make navigation consistent:
   - fixed order: `工作台 / 流程管理 / 项目管理 / 记忆管理 / 设置中心`
   - nav item height: `44px`
   - nav icon container: `26px`
   - nav icon: `15px`
   - use `lucide-react` only
6. Remove or refactor page-level CSS that changes shared shell dimensions or creates duplicate topbars.
7. Keep `.wb-*` rules scoped to the Workbench execution page; do not let workbench full-bleed styles affect normal management pages.

Acceptance tests:

- Navigate `工作台 -> 流程管理 -> 项目管理 -> 记忆管理 -> 设置中心`.
- Sidebar x-position, width, logo position, nav item height, and icon size do not change.
- AppTopbar height, breadcrumb baseline, and right action placement do not change.
- Page title rows share the same typography and icon treatment.
- Workflow Management content can be a canvas layout, but it must still sit under the same shell.
- No duplicate page topbar, sudden black gap, or large vertical spacing jump appears during navigation.

## P0-01: AI 建项助手 v2 And 常规流程设计 v2 Final Visuals

Final visual references:

- `docs/design/assets/ai-project-initiation-v2-final.png`
- `docs/design/assets/workflow-conventional-design-v2-final.png`

Shared implementation rule:

- The two pages must use the same Shell, typography, icon style, dark surfaces, borders, button density, spacing rhythm, and radius scale.

AI 建项助手 v2 requirements:

- Use a three-column layout: `讨论区 / AI 分析区 / 输出结果区`.
- The discussion composer must include a visible `发送` button.
- Only show two context actions in the composer: `添加资料` and `粘贴内容`.
- Do not show standalone `引用当前会话` or `读取协同文件` buttons.
- Current discussion is included as context by default.
- Project files and local uploads are both handled inside `添加资料`.
- `已添加资料` is collapsed by default and expands on click.

常规流程设计 v2 requirements:

- The left `流程资源` panel shows `流程模板` in the upper area and `项目角色池` in the lower area.
- Do not show a `项目角色` tab beside `流程模板`.
- The canvas shows only workflow steps and ordinary edges.
- Do not show Gate, Manual Gate, 人工决策, approval, or yellow Gate markers on the design canvas.
- The step inspector includes `验收标准`; it must not use `Gate 与验收`.
- Gate configuration belongs to workflow application, execution, or Manual Gate pages.
## Latest P0 Implementation - 2026-05-18 - AI Workflow Design

Use this visual as the current source of truth:

- `docs/design/assets/ai-workflow-design-v1-final.png`

This supersedes older implementation notes that treated AI workflow design as only a source-import panel or required `导入来源` / `打开 AI 助手` buttons in the page header.

### Scope

Implement `AI 流程设计` as a sibling mode/page under Workflow Management.

Recommended components:

- `AIWorkflowDesignPage`
- `WorkflowAiContextHeader`
- `AiWorkflowDiscussionColumn`
- `AiWorkflowChatMessage`
- `AiWorkflowMaterialsStrip`
- `AiWorkflowComposer`
- `AiWorkflowAnalysisDraftColumn`
- `AiWorkflowProgressStepper`
- `AiWorkflowInsightCard`
- `AiWorkflowDraftCanvas`
- `WorkflowDiffApplyColumn`
- `WorkflowDiffSummaryCard`
- `WorkflowProposedChangeList`
- `WorkflowApplyChecklist`

### Required UI

Header:

- Use the Workbench/AppShell spacing baseline from `docs/design/design-tokens.md`.
- Right actions must be exactly:
  - `生成流程草案`
  - `保存草稿`
  - `应用到流程`
  - more menu
- Do not render `导入来源`.
- Do not render `打开 AI 助手`.

Left discussion column:

- Must match AI 建项助手 interaction style.
- Render chat bubbles.
- Render collapsed `已添加资料 5 项`.
- Render material chips for current plan, HANDOFF, AI 建项结果, and current flow version.
- Composer must include:
  - textarea
  - `添加资料`
  - `粘贴内容`
  - `发送`

Middle analysis/draft column:

- Render `生成流程草案` action block.
- Render five analysis steps.
- Render insight cards.
- Render a draft workflow canvas with connected nodes.

Right diff/apply column:

- Render diff summary.
- Render proposed change rows.
- Render confirmation checklist.
- Apply action remains disabled until requirements are met.

### Mock Data

Add or extend centralized mock data for:

- `aiWorkflowSources`
- `aiWorkflowMessages`
- `aiWorkflowAnalysisSteps`
- `aiWorkflowDraftNodes`
- `aiWorkflowDiffSummary`
- `aiWorkflowProposedChanges`
- `aiWorkflowApplyChecklist`

Mock records must be marked TODO for backend/API integration.

### Tests

Add tests that assert:

- AI Workflow Design page renders `讨论区`, `AI 解析与流程草案`, and `差异对比与应用`.
- Header does not contain `导入来源`.
- Header does not contain `打开 AI 助手`.
- Left composer contains `添加资料`, `粘贴内容`, and `发送`.
- Draft canvas does not contain `Gate`, `Manual Gate`, or `人工决策`.
- Apply button is disabled until the diff/checklist state allows it.
## Compact Density Implementation - 2026-05-19

Reason:

- The preferred visual density came from viewing the app at browser zoom `80%`.
- Product decision: keep browser zoom at `100%` and implement that density through CSS tokens and page layout standards.

Implementation requirements:

- Use `src/styles/tokens.css` as the source of truth for compact density.
- Do not use page-level `transform: scale(.8)`, browser zoom assumptions, or per-page magic scaling.
- Workbench and Workflow Management must share:
  - `--secondary-toolbar-height: 46px`
  - `--page-inset: 8px`
  - `--control-height: 30px`
  - toolbar buttons around `28px` high
  - compact card padding around `8px-12px`
- New canvas-heavy pages must set the outer `.content` padding to `0` and use internal compact insets.
- Existing and future pages must align their secondary topbar, title row, and first panel origin to the Workbench baseline.

Validation:

- Browser zoom `100%` should visually match the previous accepted `80%` density.
- Switching between `工作台` and `流程管理` should not create top/left layout jumps.
- Run `npm --cache .npm-cache test` and `npm --cache .npm-cache run build` after changes.

## 最新执行计划补充：AI 流程设计页面对齐 - 2026-05-19

本节是实现 Agent 对齐 `AI 流程设计` 定稿 HTML 的执行要求。

Source of truth:

- `docs/design/mockups/ai-workflow-design-v1-final.html`
- `public/mockups/ai-workflow-design-v1-final.html`
- `docs/design/design-tokens.md` 中 `AI 流程设计密度规则`

### P0：实现 AI 流程设计定稿布局

目标：

- 在 React 前端中实现与定稿 HTML 一致的三栏页面。
- 保持 Workbench 全局 Shell 标准：Sidebar、Topbar、breadcrumb、按钮和图标风格不得跳动。
- 页面主视觉应是中间 `AI 解析与流程草案`，右侧只是辅助差异与应用面板。

建议实现组件：

- `AiWorkflowDesignPage`
- `AiWorkflowDiscussionPanel`
- `AiWorkflowMaterialList`
- `AiWorkflowComposer`
- `AiWorkflowAnalysisPanel`
- `AiWorkflowAnalysisStepper`
- `AiWorkflowInsightGrid`
- `AiWorkflowDraftCanvas`
- `AiWorkflowDraftNode`
- `AiWorkflowDiffPanel`
- `AiWorkflowApplyChecklist`

### P0：Mock data 集中管理

Phase 1 使用 mock data，但必须集中放置，例如：

```text
src/data/aiWorkflowDesignFixtures.ts
```

Mock 数据至少包含：

- collectedSources：5 个资料项，包含 name/type/path/status。
- chatMessages：用户与 AI 的讨论记录。
- analysisSteps：5 个 AI 分析步骤。
- insights：目标摘要、角色建议、能力授权建议、风险与假设。
- draftWorkflow：5 个流程节点，包含 role、runner、model、status。
- diffSummary：新增/修改/未变更统计。
- diffItems：差异列表。
- applyChecklist：应用确认清单。

### P0：状态与交互

必须实现以下页面状态：

- empty
- source-ready
- loading
- draft-ready
- needs-confirmation
- success
- error

必须实现以下交互：

- 添加资料：Phase 1 可 mock 弹窗或 mock 添加。
- 粘贴内容：Phase 1 可 mock 弹窗或 inline textarea。
- 发送：把说明加入讨论区。
- 生成流程草案：进入 loading 后生成 draft-ready mock 状态。
- 勾选确认清单：全部完成后启用 `确认应用到流程`。
- 查看完整差异：Phase 1 可打开 mock drawer/panel。

### P0：视觉验收

实现完成后必须在 100% 浏览器缩放下验收：

- 左侧资料列表正常显示 5 行，没有文字重叠。
- 输入区按钮有图标，尺寸与定稿 HTML 一致。
- 中间四个分析卡片不撑开页面，信息密度紧凑。
- 流程草案画布中 5 个节点完整显示，节点内部没有 overflow。
- 右侧差异面板字号小于中间主区域，不喧宾夺主。
- 右侧确认清单和按钮贴合底部节奏，不出现大块空白。
- 100% 缩放下不依赖浏览器 80% 缩放才能达成设计效果。

### 建议测试

- 断言页面渲染 `AI 流程设计`、`讨论区`、`AI 解析与流程草案`、`差异对比与应用`。
- 断言资料列表显示 5 个来源。
- 断言草案画布显示 5 个节点。
- 断言确认清单未勾选时应用按钮 disabled。
- 断言确认清单全部勾选后应用按钮 enabled。
- 断言点击 `生成流程草案` 后进入草案状态。
- 视觉回归建议用 Playwright 截图对比 `public/mockups/ai-workflow-design-v1-final.html`。
## Implementation Update: Project Detail Final - 2026-05-21

Final mockup source:

- `docs/design/mockups/project-detail-trace-drawer-v1.html`
- `public/mockups/project-detail-trace-drawer-v1.html`

### Required Components

- `ProjectDetailPage`
- `ProjectDetailHero`
- `ProjectMetricZone`
- `ProjectLocalActions`
- `ProjectCockpit`
- `ProjectDetailTabs`
- `ProjectOverviewTab`
- `ProjectPlanTab`
- `ProjectProgressTab`
- `ProjectRiskDecisionTab`
- `ProjectRoleWorkflowTab`
- `ProjectCollaborationFilesTab`
- `ProjectChangeLogTab`
- `ProjectPhaseTimeline`
- `ProjectContextDetailPanel`

### Layout Requirements

- Use a fixed shell structure:
  - sidebar: about `228px`
  - main: `minmax(0, 1fr)`
  - right detail panel: about `420px`
- Global topbar height: `56px`.
- Right detail panel starts below topbar:
  - `margin-top: 56px`
  - `height: calc(100% - 56px)`
- Project status `个人本地版` is global page-level status at the far top-right.
- Page actions must not be placed in the global topbar.

### Hero Layout

- Hero uses three columns:
  - title/project identity
  - `metric-zone`
  - local action toolbar
- `metric-zone` wraps three KPI cards inside a visible bordered container: 总进度, 待确认, 高风险.
- Do not render `Gate` or `测试通过` as top KPI cards. Gate data belongs to 风险与决策, 协同来源, or the right detail panel. Test pass count belongs to 质量/验收 or detail context.
- Local action toolbar has a bordered container. `返回总览` is icon-only; `进入工作台`, `检查最新进度`, and `保存变更` use icon + text buttons.

### Interaction Rules

- Right panel is persistent by default.
- Right panel title remains `详情面板`.
- The selected object type appears as a small badge, e.g. `当前任务`.
- Selecting different objects changes the detail panel:
  - task row -> task detail
  - Gantt bar -> progress detail
  - risk/Gate -> risk or decision detail
  - role/workflow step -> role binding detail
  - collaboration file -> file parse summary
  - change log row -> change detail
- Do not implement the right panel as closed-by-default.

### Height Stability

- `ProjectDetailTabs` content area must be constrained.
- Tab panels must not push the phase timeline below the viewport.
- `角色与流程` tab must use internal fixed-height layout and `overflow: hidden`.
- Role cards should be compact:
  - min height around `50px`
  - compact padding around `7px 9px`
  - role badge around `32px`

### Data / Mock Plan

Keep mock data centralized until API contracts are ready:

- project metadata
- KPI metrics
- cockpit cards
- project plans/tasks
- Gantt items
- SWOT and risk matrix
- role pool
- workflow role bindings
- collaboration file summaries
- change log
- selected detail panel object

### Acceptance Checklist

- Browser at 100% zoom shows the full project detail page without manual zoom.
- Global topbar does not contain project action buttons.
- `个人本地版` appears at the far top-right.
- KPI cards are inside a bordered metric zone and include only 总进度, 待确认, 高风险.
- `Gate` and `测试通过` are not rendered in the top KPI metric zone.
- Local action toolbar appears to the right of KPI zone and uses icon + text buttons.
- `返回总览` appears as an icon-only local action and does not overlap KPI cards.
- Right detail panel starts below topbar and remains persistent.
- Clicking `角色与流程` does not push the phase timeline out of view.
- `最后同步` and `协同文件已连接` are shown in `协同来源`, not in the title area.
