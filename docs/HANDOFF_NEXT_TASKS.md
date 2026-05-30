# Handoff: Next Tasks

## 2026-05-30 Phase 2 工程层完成 / Phase 3 UI 集成启动

本节是后续协作的最新入口，优先级高于后面的历史任务和旧页面差距段落。

### Phase 2 完成状态 ✅

Phase 2 工程层后端基础设施已全部完成：

- 当前稳定分支：`main`
- 远程仓库：`https://github.com/liuzx778899-hue/AgentManagement.git`
- 验证基线：`npm --cache .npm-cache run build` 通过，`npm --cache .npm-cache test` 通过（192 个测试）

**已完成的后端模块：**

| 模块 | 状态 | 文件 |
|------|------|------|
| GitAdapter | ✅ | `src/services/local/adapters/gitAdapter.ts` |
| FileStoreAdapter | ✅ | `src/services/local/adapters/fileStoreAdapter.ts` |
| ProcessRunnerAdapter | ✅ | `src/services/local/adapters/processRunnerAdapter.ts` |
| GitHubAdapter | ✅ | `src/services/local/adapters/githubAdapter.ts` |
| LlmAdapter | ✅ | `src/services/local/adapters/llmAdapter.ts` |
| gitStatusUseCase | ✅ | `src/services/local/useCases/gitStatusUseCase.ts` |
| worktreeUseCase | ✅ | `src/services/local/useCases/worktreeUseCase.ts` |
| runnerUseCase | ✅ | `src/services/local/useCases/runnerUseCase.ts` |
| workflowExecutionUseCase | ✅ | `src/services/local/useCases/workflowExecutionUseCase.ts` |
| ProjectRepository | ✅ | `src/services/local/repositories/projectRepository.ts` |
| MemoryRepository | ✅ | `src/services/local/repositories/memoryRepository.ts` |
| WorkflowRepository | ✅ | `src/services/local/repositories/workflowRepository.ts` |
| Security/Audit | ✅ | `src/services/local/security/index.ts` |

### Phase 3 UI 集成计划 🚀

**目标：** 将前端 UI 与 Phase 2 后端完整对接，实现真实数据读写。

**详细计划：** `docs/superpowers/plans/2026-05-30-phase3-ui-integration.md`

**任务优先级：**

| 优先级 | 任务 | 功能点 | 状态 |
|--------|------|--------|------|
| P0-01 | CLI Runner 控制面板 | 启动/停止/日志流 | 待开发 |
| P0-02 | 项目创建与导入 | 新建/导入持久化 | 待开发 |
| P0-03 | 工作流执行控制 | 启动/暂停/恢复/取消 | 待开发 |
| P1-01 | 设置持久化 | 保存到本地文件 | 待开发 |
| P1-02 | 记忆管理 CRUD | 创建/更新/删除/搜索 | 待开发 |
| P1-03 | Git 状态显示 | 实时分支/状态 | 待开发 |
| P2-01 | AI 助手真实对话 | LLM API 对接 | 待开发 |

**关键发现：**

Phase 2 完成的后端只提供了底层基础设施（Adapter/Repository），但**缺少面向用户操作的 UseCase**：

1. 项目管理核心功能 - 新建、导入、删除、更新项目（只有 Repository，无 UseCase）
2. 数据加载聚合 - 加载项目完整数据需要封装
3. 前端 UI 完全未对接 - 所有页面仍使用 fixtures mock 数据
4. CLI Runner 无 UI 入口 - runnerUseCase 已实现但前端没有启动按钮
5. 工作流执行无触发入口 - workflowExecutionUseCase 已实现但 UI 未集成

### Issue 工作流规范 ⚠️

**重要变更：** Issue 关闭必须经过 Owner review。

详见：`docs/superpowers/specs/2026-05-30-issue-workflow.md`

核心规则：
- 禁止开发者自行关闭 Issue
- Issue 必须通过 PR merge 自动关闭
- 所有 PR 需要 Owner (@liuzx8888) review 批准
- 已创建 `.github/CODEOWNERS` 确保所有变更需 review

### Phase 2 开发硬约束（继续适用）

- 每个任务必须先有 GitHub Issue；分支使用 `issue-<number>-<short-slug>`
- `main` 只保存稳定基线，不直接开发；commit 必须引用 Issue
- UI 组件不得直接执行 shell、读写文件、访问 GitHub 或调用 LLM；必须通过 UseCase 和 Adapter
- 本地工程能力放到 `src/services/local/`，共享类型放到 `src/types/`
- 每个任务提交前至少跑 `npm --cache .npm-cache run build`
- 涉及状态/逻辑/adapter/useCase 必须跑 `npm --cache .npm-cache test`

### Phase 2 多 Agent 协同硬约束（继续适用）

- 一个 Issue 同一时间只允许一个主执行 Agent；需要并行时必须先拆子 Issue
- 每个 Agent 必须使用独立 worktree，禁止共用目录
- 开始前必须读取当前 Issue、Git 状态、`docs/HANDOFF_NEXT_TASKS.md`
- 交付必须说明改动文件、验证命令、残余风险和对其他 Agent 的影响
- 冲突处理只解决自己 Issue 相关部分，不删除无关改动

## 2026-05-29 页面定稿基线 / Git 初始快照

本节作为后续所有 AI 工具继续工作的最新入口，优先级高于本文档后面的历史任务段落。

当前决策：

- 当前工作区内已经调整过的页面状态先整体定稿，作为新的实现基线。
- 页面相关进度统一按“已完成并归档”处理，不再继续沿用旧任务列表里的未完成百分比、历史阻塞项或旧版页面差距描述。
- 后续所有任务从这个 Git 快照重新开始。任何 AI 工具继续修改前，必须先基于最新 Git 状态开新任务，不得把已经完成的页面样式回滚到旧 mockup、旧截图或旧实现。
- 如果后续发现设计稿与当前实现有差异，应先创建新的明确任务，再在该任务内修改；不要混入本次定稿基线提交。

当前定稿范围：

- 工作台
- 流程管理
- 常规流程设计
- AI 流程设计
- 项目管理
- 新建项目
- 导入已有项目
- AI 建项
- 项目详情
- 记忆管理
- 设置中心

后续执行规则：

- 先确认 Git 工作区状态，再开始改动。
- 每一轮页面修改都必须形成独立提交，避免其他工具覆盖已完成内容时无法回退。
- 不再使用历史段落中的旧进度作为任务依据；新任务必须从本节之后重新登记。
- 页面验收以当前代码和 `docs/design` 中的最新定稿资产为准。

## Latest Workflow Management Overview Finalization - 2026-05-22

本节是最新流程管理信息架构定稿，优先级高于旧版“流程管理直接进入流程设计器”的描述。后续实现 Agent 必须先实现 `流程管理总览`，再从总览进入常规流程设计或 AI 流程设计。

Final source of truth:

- 流程管理总览定稿 HTML: `docs/design/mockups/flow-management-overview-v1.html`
- Web 预览副本: `public/mockups/flow-management-overview-v1.html`
- 预览地址: `http://127.0.0.1:5173/mockups/flow-management-overview-v1.html`

Confirmed product decision:

- `流程管理` 是一级管理页面，不再直接等于 `流程设计器`。
- `常规流程设计` 和 `AI 流程设计` 是流程管理总览中的创建/编辑功能入口。
- 流程管理首页必须先展示流程资产、分类、运行健康、绑定项目、角色覆盖、Runner/能力授权和风险缺口。
- 流程设计器用于编辑单个流程；流程详情用于查看单个流程版本、应用项目、步骤、角色和授权关系。
- 底部解释性的 `流程关系视图` 不再放在流程管理总览页，相关关系进入流程详情或设计器中展示。

Required IA:

```text
流程管理
├─ 流程管理总览
│  ├─ 流程 KPI
│  ├─ 流程分类筛选
│  ├─ 流程资产卡片
│  ├─ 分类维护入口
│  └─ 流程健康面板
├─ 流程详情
│  ├─ 流程版本
│  ├─ 应用项目
│  ├─ 步骤与角色绑定
│  ├─ Runner / Model / Capability
│  └─ 变更记录与风险
├─ 常规流程设计
└─ AI 流程设计
```

Flow categories:

- `开发类`
- `设计类`
- `评审类`
- `发布类`
- 支持后续新增、编辑、排序、禁用分类。

Implementation requirements:

- 侧栏点击 `流程管理` 先进入 `WorkflowManagementOverviewPage`。
- 总览页必须提供 `检查全部流程`、`维护分类`、`新建常规流程`、`AI 生成流程`、`导入流程`。
- 流程卡片必须展示流程名称、状态、版本、步骤数、分类、绑定项目、角色覆盖、Runner 覆盖、能力授权、风险/缺口、最近成熟度和操作按钮。
- 流程卡片操作：
  - `查看详情` -> 流程详情页
  - `进入设计` -> 常规流程设计器或对应流程编辑页
- 分类维护可以 Phase 1 用 mock data，但必须集中放置并标记 TODO。
- 不允许使用 `transform: scale(.8)` 或要求用户浏览器缩放到 80%。100% 浏览器缩放下必须完整显示主要内容。
- 历史段落里出现的 `--page-scale: .8`、`transform: scale(...)`、手动 80% 缩放方案均已废弃；后续实现必须以真实紧凑 token、网格约束和局部滚动完成 100% 缩放适配。

Acceptance checklist:

- 浏览器 100% 缩放下，1920x1080 视口无页面级横向/纵向溢出。
- `流程管理` 首页不是画布设计器，而是流程资产总览。
- 页面可按 `全部 / 开发类 / 设计类 / 评审类 / 发布类` 查看流程。
- 右侧存在分类维护与健康诊断区域。
- 总览页不显示底部 `流程关系视图`。
- 点击流程卡片的 `查看详情` / `进入设计` 有清晰跳转目标。

## Latest AI Workflow Design Finalization - 2026-05-19

本节是最新协同入口，优先级高于旧版 AI 流程设计说明。后续实现 Agent 必须以本节和对应 HTML 为准。

Final source of truth:

- AI 流程设计定稿 HTML: `docs/design/mockups/ai-workflow-design-v1-final.html`
- Web 预览副本: `public/mockups/ai-workflow-design-v1-final.html`
- 预览地址: `http://127.0.0.1:5173/mockups/ai-workflow-design-v1-final.html`

Confirmed product decision:

- `流程管理 / AI 流程设计` 是一个三栏 AI 辅助流程草案工作区。
- 左侧是讨论区，用于原始输入、补充说明、添加资料和粘贴内容。
- 中间是 AI 解析与流程草案区，用于展示 AI 分析步骤、结构化建议和流程草案画布。
- 右侧是差异对比与应用区，用于展示与当前流程版本的差异、应用确认清单和最终应用动作。
- AI 只能生成流程草案和差异建议，不得直接覆盖正式流程。

Latest visual corrections already applied to the final HTML:

- 左侧 `已添加资料` 列表必须正常展开显示文件名和文件类型，不允许文字挤压、重叠或竖向错乱。
- 左侧输入区底部只保留 `添加资料`、`粘贴内容`、字数计数和 `发送`，按钮必须有图标，尺寸与工作台按钮密度一致。
- 中间 `AI 解析与流程草案` 区域必须保持紧凑：生成按钮、五步分析条、四个分析卡片和流程草案画布之间不应出现大面积空白。
- 中间 `流程草案（v1.4 · 草案）` 画布中的节点比例已调整：节点内容必须完整显示，不得被容器裁切；节点尺寸要比右侧信息卡更有主视觉权重。
- 右侧 `差异对比与应用` 已降密度：统计卡、差异列表、确认清单和底部按钮必须使用较小字号和更紧凑高度，作为辅助信息面板，不得压过中间主画布。
- 右侧底部 `应用确认清单` 与操作按钮必须贴合面板底部节奏，不允许出现过大的底部空白。

Implementation requirements:

- Implement the real React page against the final HTML density, spacing, panel hierarchy, typography and button sizing.
- Do not use older screenshots as the source of truth if they conflict with `ai-workflow-design-v1-final.html`.
- Preserve global shell consistency with Workbench: sidebar, topbar, breadcrumb, icon style and control density must not jump between Workbench and Workflow Management.
- Use `docs/design/design-tokens.md` and existing CSS tokens first. If new tokens are required, update design tokens before hardcoding values in components.
- Phase 1 may use mock data for collected sources, AI analysis, workflow draft, diff list and confirmation checklist.

Acceptance checklist:

- At browser 100% zoom, the AI Workflow Design page should fit the intended desktop canvas without internal card overflow.
- The left collected-materials list displays 5 rows cleanly.
- The middle workflow draft canvas shows all 5 nodes fully inside the canvas card.
- The first node content has no vertical overflow.
- The right diff panel shows compact stats, six diff rows, confirmation checklist and two action buttons without clipping.
- The disabled apply button text remains readable and aligned.

## Latest Design Import Sync - 2026-05-18

This section records the two latest finalized design imports. Future implementation or Figma restoration agents must use these two `final` HTML files as the current source of truth, not older screenshots or older mockups.

Confirmed finalized designs:

- `AI 建项助手 V1`
  - Final HTML prototype: `docs/design/mockups/ai-project-initiation-final.html`
  - Design decision: use the latest unified AI workspace discussed on 2026-05-18 as the finalized version.
  - Do not use separate entry cards for `直接讨论 / 粘贴对话 / 导入文档 / 当前会话`.
  - Chat, pasted text, uploaded documents, current session context, and collaboration files all enter the same AI analysis composer.
  - AI output must become a project draft first. It must not create a formal project until the user confirms.
- `流程编排 - 常规配置`
  - Final HTML prototype: `docs/design/mockups/workflow-builder-regular-final.html`
  - Reference image: `docs/design/assets/workflow-builder-dual-mode-v1.png`
  - Design decision: use the `常规配置` active state from `workflow-builder-dual-mode-v1.png` as the finalized regular/manual workflow configuration screen.
  - Required structure: left template and project role pool, center grid workflow canvas, right step configuration inspector.
  - Required step configuration relationship: `Step -> Role -> Runner Provider -> Model Provider / Model -> Capability authorization`.

Figma status:

- The user requested Figma restoration through `@figma`.
- The current session did not complete Figma connector authorization, so no Figma file/frame was created from this agent session.
- Once Figma connector access is available, restore these two finalized HTML prototypes into Figma as editable frames:
  - frame 1: `AI 建项助手 V1`
  - frame 2: `流程编排 - 常规配置`

Implementation and restoration guidance:

- Treat the two final HTML files as 1:1 layout references for spacing, panel hierarchy, density, typography, colors, and component placement.
- Keep both designs inside the global `Agent 工程管理系统` shell.
- Do not regress to older AI project initiation wording such as `AI 方案立项` with multiple parallel source-entry cards.
- Do not regress Workflow Builder into a modal-only editor. The right-side step inspector is part of the finalized regular workflow configuration.
- If source code implementation differs from these final HTML files, update implementation to match these files or explicitly document the accepted deviation in this handoff file.

## Latest Conversation Sync - 2026-05-18

This section records the latest confirmed design discussion so future implementation agents do not follow an older window or outdated prototype.

Confirmed:

- Product name remains `Agent 工程管理系统`.
- Phase 1 remains frontend-only Web MVP.
- The latest global UI standard must follow the Workbench visual baseline.
- First-level pages must share the same `Sidebar + AppTopbar + Content` shell.
- Page switching must not cause visible jumps in sidebar width, topbar height, breadcrumb position, title typography, icon style, or content start position.
- The finalized Workflow Management / Workflow Builder design is:
  - image: `docs/design/assets/workflow-builder-dual-mode-v1.png`
  - HTML prototype: `docs/design/mockups/workflow-builder-dual-mode-v1.html`
- AI Project Initiation / AI 建项 visual is now frozen as v2, after comparing and merging the strengths of:
  - current AI initiation prototype: `docs/design/mockups/ai-project-initiation-v1.html`
  - current visual reference image: `docs/design/assets/project-management-overview-ai-briefing-v1.png`
  - Project Management overview context: `docs/design/mockups/project-management-overview-ai-briefing-v1.html`
- User feedback: the older/current AI 建项 direction may feel better than the newer simplified direction. Do not discard the richer older structure without review.
- AI 建项 final direction should preserve:
  - one unified AI 建项 workspace instead of four split entrances
  - chat / paste / upload / current conversation / collaboration files as context abilities inside one composer
  - AI clarification and structured project draft preview
  - project goal, role suggestion, workflow suggestion, task plan, risk and acceptance panels
  - explicit user confirmation before creating a formal project
- The product wording should prefer `流程编排` for the design page, while `流程管理` may still appear as the top-level navigation label if the product navigation keeps that wording.
- `流程编排` is defined as a dual-mode page:
  - `常规配置`: manual/template-based workflow creation and editing.
  - `AI 辅助生成`: AI generates drafts, suggestions, and diffs from project plans, collaboration files, AI project initiation results, or existing workflows.
- AI output must never directly overwrite formal workflows. It must go through draft preview, diff review, and user confirmation.
- The Workflow page must stay inside the global AppShell standard; canvas/tools are page content, not a separate shell.

Finalized on 2026-05-18:

- AI 建项助手 v2 final visual reference:
  - `docs/design/assets/ai-project-initiation-v2-final.png`
- 常规流程设计 v2 final visual reference:
  - `docs/design/assets/workflow-conventional-design-v2-final.png`
- These two pages must share the same visual system: Sidebar, AppTopbar, typography, icon style, panel surfaces, borders, spacing, and button treatments.
- AI 建项 final interaction corrections:
  - The discussion input must include a visible `发送` button.
  - The discussion area only keeps two context actions: `添加资料` and `粘贴内容`.
  - Do not show separate `引用当前会话` or `读取协同文件` buttons.
  - Current discussion is always part of context by default.
  - Added materials are collapsed by default as `已添加资料 N 项`; clicking expands the list.
- 常规流程设计 final interaction corrections:
  - The `流程资源` panel must not show a `项目角色` tab next to `流程模板`; project roles live in the lower `项目角色池`.
  - The design canvas must not show Gate / Manual Gate / 人工决策 nodes.
  - Gate belongs to workflow application or execution approval, not the normal flow design canvas.
  - The step inspector uses `验收标准`, not `Gate 与验收`.
- This section overrides any older Workflow Builder notes that say conventional flow design must display Gate on the canvas or in the normal step inspector.

Implementation agents must read these files before changing frontend UI:

- `docs/design/design-tokens.md`
- `docs/design/DESIGN_OVERVIEW.md`
- `docs/design/PAGE_SPEC.md`
- `docs/frontend/FRONTEND_IMPLEMENTATION_PLAN.md`
- `docs/design/assets/workbench-v1.png`
- `docs/design/assets/workflow-builder-dual-mode-v1.png`

## Latest UI Shell Standard - 2026-05-18

### P0: Global UI Shell Must Follow Workbench Standard

Current problem:

- The Workbench page already has the latest visual direction, but switching from Workbench to Workflow Management still creates visible jumps in title style, top navigation position, spacing, icon style, and page density.
- This makes the product feel like separate prototypes instead of one engineering management system.

Required:

- Treat `docs/design/mockups/workbench-v1.html` and `docs/design/assets/workbench-v1.png` as the visual baseline for the whole frontend.
- All first-level pages must share the same shell structure: `Sidebar + AppTopbar + Content`.
- Sidebar must remain stable across pages:
  - width: `256px`
  - collapsed width: `72px`
  - brand area: same logo size, typography, and vertical rhythm as Workbench
  - nav item height: `44px`
  - nav icon container: `26px`
  - nav icon: `15px`
  - active state: same primary tint, border, and left indicator
- AppTopbar must remain stable across pages:
  - height: `64px`
  - breadcrumb position and typography must not change
  - format: `AgentManagement / 当前页面`
  - right-side status/actions must use the same button density and icon sizing
- Content layout must use the same page spacing rules:
  - normal management pages: `24px` content padding
  - Workbench is the only full-bleed execution exception
  - no page should create its own duplicate top navigation bar above the shared `AppTopbar`
- Workflow Management, Project Management, Memory Management, and Settings must not redefine header typography, breadcrumb spacing, nav item sizing, or icon style independently.
- Use `lucide-react` for all navigation and action icons. Do not use emoji, single-letter abbreviation icons, or mixed icon sets.
- Navigation order must stay: `工作台 / 流程管理 / 项目管理 / 记忆管理 / 设置中心`.

Implementation guidance:

- First compare `src/components/AppShell.tsx`, `src/styles/layout.css`, `src/styles/base.css`, and each page root container.
- Extract or standardize shared classes: `.app-shell`, `.app-sidebar`, `.app-topbar`, `.app-breadcrumb`, `.app-content`, `.page`, `.page-header`, `.page-title-row`, `.page-actions`.
- Remove page-level CSS that changes the global topbar height, breadcrumb font, sidebar width, nav item height, or first-level page padding.
- Keep Workbench-specific classes scoped under `.wb-*`; do not let Workbench full-bleed rules leak into normal management pages.

Acceptance:

- Switching `工作台 -> 流程管理 -> 项目管理 -> 记忆管理 -> 设置中心` keeps the Sidebar x-position, width, logo position, nav item height, and icon size unchanged.
- AppTopbar height and breadcrumb baseline do not jump between pages.
- The current page title uses the same font size, weight, line-height, color, and icon treatment across all first-level pages.
- Workflow Management uses the same shell and page header standard, while its canvas/tools live inside page content.
- Browser visual check shows no sudden black gaps, duplicate headers, or mismatched top spacing when navigating between first-level pages.

## Latest Design Handoff - 2026-05-17

本节是当前最新冻结设计，后续实现 Agent 必须优先按本节校准，不要再回到旧版工作台或旧版 AI 方案立项交互。

### P0: 必须调用 design-tokens.md 对齐视觉规范

后续所有前端实现、页面改版、组件调整和视觉修复，必须先读取并遵守：

```text
docs/design/design-tokens.md
```

执行要求：

- 不允许在组件里随意新增魔法色值、魔法间距、魔法圆角或临时阴影。
- 页面颜色、字体、字号、行高、间距、圆角、边框、阴影、层级和响应式规则，必须优先来自 `docs/design/design-tokens.md`。
- 如果项目已有 `src/styles/tokens.css` 或等价 token 文件，实现时必须让代码 token 与 `docs/design/design-tokens.md` 保持一致。
- 如果设计图和当前实现冲突，以 `docs/design/design-tokens.md` + 最新冻结设计文档为准。
- 如果确实需要新增 token，必须先写入设计文档或在修改说明中列出原因，不能只在组件里硬编码。

验收：

- 新增或改动页面不出现未解释的裸 hex 色值。
- 核心页面间距、字号、圆角、边框和阴影与 `docs/design/design-tokens.md` 一致。
- 浏览器验收时检查工作台、项目管理、项目详情、流程编排、记忆管理和设置中心的视觉密度一致。

### P0: 流程管理 AI 辅助生成必须接入全局 AI 助手

当前产品决策：

- `流程管理 / AI 辅助生成` 不应做成一个孤立聊天框。
- 页面里的 `项目计划`、`协同文件`、`已有流程优化` 都是 AI 可识别的上下文来源，不是凭空生成按钮。
- 文件类来源必须提供明确导入动作，可以先限制格式为 `.md`，后续再扩展 `.txt`、`.json`、`.docx`。
- `已有流程优化` 必须能直接引用当前系统里的流程模板或当前流程版本。
- 如果用户想用大白话描述流程，本质仍然是和右下角全局 AI 助手交互；流程页只是把全局 AI 助手切换到 `流程设计模式`。

实现要求：

- `AI 辅助生成` 面板必须包含 `来源导入区`：
  - `导入项目计划文件`，Phase 1 限制 `.md`。
  - `导入协同文件`，Phase 1 限制 `.md`，默认推荐 `HANDOFF_NEXT_TASKS.md`、`CODE_REVIEW_AND_FIX_REQUESTS.md`。
  - `引用当前项目计划`，从项目详情/项目管理 mock 数据读取。
  - `引用已有流程`，可选择流程模板或当前流程版本。
  - `引用 AI 建项结果`，读取已确认的项目草案。
- `AI 辅助生成` 面板不放独立聊天框；只放来源、解析结果、草案预览、差异和确认。
- 如需要自然语言补充，提供 `打开 AI 助手` / `补充说明` 入口，打开右下角全局 AI 助手的流程设计模式。
- 全局 AI 助手在流程页打开时，标题显示 `AI 助手 · 流程设计模式`，并自动带入当前流程、当前项目、已导入文件和选中步骤上下文。
- 用户在 AI 助手中补充的大白话说明，应作为 `manualInstruction` 附加到当前 AI 辅助生成任务，不应另开一套数据模型。

验收：

- `AI 辅助生成` 页面能看到导入/引用来源操作。
- 文件导入控件至少限制 `.md`。
- 用户可以选择当前项目计划、协同文件、AI 建项结果或已有流程作为来源。
- 页面不出现与全局 AI 助手割裂的第二套聊天系统。
- 点击 `打开 AI 助手` 后，右下角全局 AI 助手以流程设计模式打开，并能回填补充说明到 AI 辅助生成草案。
- AI 只生成流程草案和差异，不自动覆盖正式流程。

### P0: AI 方案立项统一为 AI 建项助手

当前产品决策：

- 不再把 `直接讨论`、`粘贴对话`、`导入文档`、`当前会话` 做成四个并列入口。
- 这些本质都是提供上下文给 AI 分析，应合并为一个入口：`AI 建项助手`。
- 用户可以在同一个 AI 建项工作区里聊天、粘贴内容、上传文档、引用当前会话或协同文件。
- AI 输出只能是项目草案、计划草案、风险建议和待确认变更，必须由用户确认后才能创建项目或写入正式计划。

实现要求：

- 项目管理总览入口文案改为 `AI 建项` 或 `AI 建项助手`。
- AI 建项页面主文案使用：`和 AI 讨论项目，或上传/粘贴已有资料，自动整理为可执行项目计划。`
- 页面结构包含：
  - `AiProjectInitiationPage`
  - `AiContextComposer`
  - `AiAttachmentStrip`
  - `AiBriefingChat`
  - `ProjectDraftPreview`
  - `PlanExtractionPanel`
  - `RiskAndAssumptionPanel`
  - `CreateProjectConfirmation`
- 不再展示四个割裂的流程入口按钮。
- 支持的上下文来源在输入区内体现为能力，而不是独立流程：聊天输入、粘贴内容、上传文档、引用当前会话、读取协同文件。

验收：

- 页面上不能再出现让用户误解为四个不同建项流程的 `直接讨论 / 粘贴对话 / 导入文档 / 当前会话` 并列入口。
- 用户在一个输入区内完成讨论、粘贴和上传。
- AI 生成项目草案后必须进入确认面板。

### P0: 项目详情进入工作台必须导航到新版工作台

当前问题：

- 现有程序中，项目详情的 `进入工作台` 仍可能导航到旧版工作台设计或旧的工作台入口。
- 最新产品决策是：项目详情只负责项目治理和管理，真正执行必须进入新版 `Terminal Workspace` 工作台。

实现要求：

- 项目详情页的 `进入工作台` 按钮必须导航到新版工作台路由。
- 新版工作台必须包含：
  - 顶部项目/分支/worktree/阶段状态栏
  - 角色流程运行带
  - Terminal Workspace 主区域
  - Terminal 工具栏中的 `步骤上下文 / 提示词 / 角色记忆 / MCP / Skills / Git / Local Shell / 快照`
  - 右侧 TODO / Gate / 项目记忆 / 最近文件 / 会话状态面板
- 不能跳转到旧版项目开发页、旧版项目管理内嵌执行区或旧版工作台 mock。

建议路由约定：

```text
/projects/:projectId/workbench
```

如当前路由系统暂未支持项目参数，可以先使用：

```text
/#workbench?projectId=:projectId
```

但页面呈现必须是新版工作台。

验收：

- 从项目管理总览项目卡片点击 `进入工作台`，进入新版工作台。
- 从项目详情点击 `进入工作台`，进入同一个新版工作台。
- 工作台顶部能显示当前项目名、分支、worktree 和阶段。
- 工作台不再承载旧版聊天框占主区域的布局。

### P0: 设计文档与执行计划已落盘，后续按文档实现

已生成或更新的设计与执行文档：

- `docs/design/DESIGN_OVERVIEW.md`
- `docs/design/PAGE_SPEC.md`
- `docs/design/design-tokens.md`
- `docs/frontend/FRONTEND_IMPLEMENTATION_PLAN.md`
- `docs/design/mockups/index.html`
- `docs/design/mockups/ai-project-initiation-v1.html`
- `docs/design/mockups/workbench-v1.html`
- `docs/design/mockups/project-management-overview-ai-briefing-v1.html`
- `docs/design/mockups/project-detail-gantt-v1.html`
- `docs/design/mockups/project-detail-trace-drawer-v1.html`
- `docs/design/mockups/workflow-builder-dual-mode-v1.html`
- `docs/design/mockups/memory-management-knowledge-center-v1.html`

后续实现顺序：

1. 修复项目管理可见中文转义/乱码。
2. 将 AI 方案立项改为统一 `AI 建项助手`。
3. 修正项目详情和项目卡片的 `进入工作台` 导航，统一进入新版 Terminal Workspace 工作台。
4. 补齐项目管理总览、项目详情、流程编排、记忆管理与设计文档差距。
5. 更新测试，覆盖 AI 建项入口、项目详情到新版工作台导航、工作台工具栏和右侧面板规则。

更新：2026-05-17 Asia/Shanghai

项目：Agent Management - Phase 1 Web MVP

---

> 本文档是编码工具的**唯一任务入口**。执行前必须读完「前置阅读文档」。

## Latest Frontend Review - 2026-05-17

本节是当前最新前端审查结论。后续实现 Agent 必须优先处理本节，再继续扩展功能。

### Verification

当前本地验证结果：

```text
npm --cache .npm-cache run lint       -> passed
npm --cache .npm-cache run typecheck  -> passed
npm --cache .npm-cache test           -> 99 passed
npm --cache .npm-cache run build      -> passed, but main JS chunk is 597.53 kB and still has Vite chunk-size warning
```

浏览器抽查地址：

```text
http://127.0.0.1:5173/
```

抽查页面：

- `项目管理`
- `流程管理`
- `记忆管理`

### Current Design Alignment

| 页面 | 当前状态 | 设计对齐度 | 结论 |
| --- | --- | --- | --- |
| 工作台 | 基本对齐 Terminal Workspace 版 | 高 | 保持，后续只补真实会话/禁用态 |
| 项目管理 | 有严重中文转义显示问题 | 低 | P0 阻塞产品验收 |
| 流程编排 | 已有 `常规配置 / AI 辅助生成` 骨架 | 中 | 仍缺右侧步骤配置和完整 AI 草案确认流 |
| 记忆管理 | 已改名为知识资产中心并补充部分批量/AI 提炼 | 中低 | 仍不是设计图要求的三栏知识资产中心 |
| 项目详情 | 功能较多但仍有 mock/进度图不足 | 中 | 需要后续拆分和专业视图补齐 |

### P0: Fix Project Management Unicode Escapes

Current problem:

- 浏览器实际页面仍显示 `\u9879\u76ee...` 这类 Unicode 转义文本。
- 影响范围包括项目管理标题、顶部按钮、KPI、项目卡片、右侧摘要。
- 这是产品验收阻塞项，即使测试通过也不能视为完成。

Evidence:

- `src/components/ProjectManagement.tsx`
- Browser text sample contains visible `\u9879\u76ee\u7ba1\u7406`

Required:

- 恢复所有项目管理可见 UI 文案为真实 UTF-8 中文。
- 检查 `ProjectCard`、项目 mock data、测试 fixture 中是否也存在转义字符串。
- 增加测试：项目管理页面 body 不包含 `\\u[0-9a-fA-F]{4}`。
- 浏览器验收：项目管理页无任何 `\uXXXX` 可见文本。

Acceptance:

- 页面显示 `项目管理`、`导入已有项目`、`新建空白项目`、`AI 方案立项`、`项目总数`、`运行中`、`等待确认`、`高风险`、`今日同步`。
- `rg "\\\\u[0-9a-fA-F]{4}" src/components src/data src/__tests__` 对可见文本无命中。

### P0: Complete Workflow Builder Dual-Mode Design

Current progress:

- 已出现 `常规配置 / AI 辅助生成` segmented control。
- AI 模式已有来源选择、生成草案和差异对比雏形。

Remaining gaps:

- 缺少设计图中的顶部协作说明条：
  `常规模板/手动编排 + AI解析/优化建议 -> 流程草案 -> 用户确认 -> 应用项目 -> 同步工作台`
- 常规配置仍然主要是左侧模板 + 中央画布，没有右侧 `WorkflowStepInspector`。
- 步骤配置没有常驻右侧面板展示 Role + Runner + Model + Capability + Gate + 验收标准。
- 缺少 `CapabilityAuthorizationMatrix`。
- 缺少 `GateAndAcceptanceEditor`。
- AI 草案应用当前是新增模板，未展示完整影响范围和二次确认对话。
- 仍存在 `data.roles.splice(...)`，组件直接修改 props/state。

Required:

- 补 `WorkflowCooperationStrip`。
- 补右侧 `WorkflowStepInspector`，点击节点后常驻显示步骤配置。
- 补能力授权矩阵、Gate/验收标准编辑器。
- AI 应用必须进入 `FlowDiffReviewDialog -> ApplyFlowConfirmationDialog`。
- 移除 `data.roles.splice(...)`，改走 reducer/action。

Acceptance:

- 默认进入 `常规配置`。
- 不进入 AI 模式也能完整配置流程。
- AI 模式只生成草案和差异，不直接覆盖正式流程。
- 应用前能看到新增/修改步骤、受影响任务、受影响 Gate。
- 步骤配置能看到并编辑 Role、Runner、Model、Capability、Gate、验收标准。

### P0: Complete Memory Management Knowledge Asset Center

Current progress:

- 页面标题已改为 `知识资产中心`。
- 已有全局/项目/角色/任务/知识库 tabs。
- 已有搜索、批量选择、AI 提炼弹窗。
- 相关测试已增加，当前 memory-manager tests 为 12 条。

Remaining gaps:

- 仍不是冻结设计图要求的三栏布局。
- 缺少左侧 `记忆空间` 树，无法按项目展开项目内角色。
- 缺少项目 -> 角色 -> 记忆的导航结构。
- 缺少中间 KPI 卡片：记忆总数、已提炼、可复用、待确认。
- 缺少分类 tabs：全部记忆、决策记录、角色经验、风险与坑、Prompt 模板、工作流经验。
- 缺少右侧 `AI 提炼与复用建议` 面板。
- 缺少 `跨项目洞察`。
- 缺少 `可沉淀为知识库` 待确认队列。
- 缺少 `推荐给当前项目` 复用建议。
- 缺少 `记忆审计` 和来源追溯抽屉。
- 当前 AI 提炼弹窗只有摘要，没有形成候选知识、来源、影响范围、确认入库流程。

Required:

- 重构为三栏：
  - 左：`MemorySpaceTree`
  - 中：`MemoryWorkspace`
  - 右：`MemoryIntelligencePanel`
- 新增组件：
  - `ProjectMemoryTree`
  - `RoleMemoryNode`
  - `MemoryKpiCards`
  - `MemoryCategoryTabs`
  - `CrossProjectInsights`
  - `KnowledgeExtractionQueue`
  - `ReuseSuggestions`
  - `MemoryAuditPanel`
  - `MemorySourceTraceDrawer`
  - `ExtractMemoryConfirmationDialog`
- AI 提炼结果必须进入待确认队列，不自动入库。
- 复用建议应用前必须展示来源和影响范围。

Acceptance:

- 记忆管理页面能看到项目列表。
- 展开项目后能看到项目内角色。
- 点击角色后中间只展示该角色记忆。
- 右侧展示跨项目洞察、候选知识、复用建议、审计信息。
- 知识库只展示已确认可复用知识。

### P1: Remove Remaining Alert-Based Product Interactions

Current problem:

以下关键产品动作仍使用 `alert()` 占位：

- 项目管理全项目 Check。
- 项目卡片单项目 Check。
- 工作流保存/版本管理。
- 工作台启动项目、恢复会话、保存进度、创建快照、启动 Shell。
- 设置中心保存配置、模型保存、测试连接。
- 记忆导出。

Required:

- 产品关键动作必须改为页面内状态、toast、dialog 或 result panel。
- Phase 1 可以继续使用 mock，但不能用 alert 作为主要交互。
- AI/Check/保存类动作必须有 loading / success / error / needs-confirmation。

### P1: Remove Direct Data Mutation

Current problem:

- `src/components/WorkflowBuilder.tsx` still contains `data.roles.splice(...)`.
- `src/components/ProjectManagement.tsx` still contains `data.projects.splice(...)`.

Required:

- 所有新增、删除、更新必须走 `WorkbenchProvider` action / reducer。
- 补 reducer tests。
- 验收命令：`rg "data\\.[a-zA-Z0-9_]+\\.splice" src` 无结果。

### P2: Bundle Size And Page Splitting

Current problem:

- Build passes, but main JS chunk is now `597.53 kB`, larger than previous `552.98 kB`.
- CSS is now `203.02 kB`.
- Vite still reports chunk-size warning.

Required:

- 使用 `React.lazy` / route-level split 拆分重页面：
  - `ProjectDetailPage`
  - `ProjectWorkspace`
  - `WorkflowBuilder`
  - `MemoryManager`
  - `Settings`
- mockups/docs import 需要延迟加载。
- 保留统一 skeleton。

Acceptance:

- `npm --cache .npm-cache run build` 不再出现 chunk-size warning，或主 chunk 明显下降。

## Latest Design Sync - 2026-05-17

本次已冻结并同步以下设计范围，后续实现 Agent 必须以这些文档为准：

- 工作台：Terminal Workspace 为核心，角色流程运行带、步骤上下文、角色记忆、角色提示词、MCP / Skills / Git / Local Shell 均围绕当前执行步骤联动。
- 项目管理：从项目开发执行区中拆出，定位为多项目治理、项目总览、项目详情、AI 方案立项、进度 Check、风险、甘特图、看板、决策和变更管理。
- 流程编排：采用 `常规配置 + AI 辅助生成` 双模式。常规配置是基础能力，AI 辅助只生成草案、建议和差异，应用前必须人工确认。
- 记忆管理：定位为项目知识资产中心，覆盖 `项目记忆 -> 角色记忆 -> 可复用知识库 -> 跨项目洞察`，支持 AI 提炼、复用建议、来源追溯和记忆审计。
- 全局 AI 助手：同一个入口按页面切换模式，不是固定大聊天框。工作台为执行协作助手，项目管理为项目治理/项目经理助手，流程编排为流程设计助手，记忆管理为记忆整理助手。

实现 Agent 必须先阅读：

- `docs/design/DESIGN_OVERVIEW.md`
- `docs/design/PAGE_SPEC.md`
- `docs/design/design-tokens.md`
- `docs/frontend/FRONTEND_IMPLEMENTATION_PLAN.md`

设计图资产：

- `docs/design/assets/workbench-v1.png`
- `docs/design/assets/project-management-overview-ai-briefing-v1.png`
- `docs/design/assets/project-detail-gantt-v1.png`
- `docs/design/assets/project-detail-trace-drawer-v1.png`
- `docs/design/assets/workflow-builder-dual-mode-v1.png`
- `docs/design/assets/memory-management-knowledge-center-v1.png`

本轮实现要求：

1. 不要修改后端业务逻辑。
2. 不要把项目开发执行区放回项目管理。
3. 不要把 AI 输出直接写入正式项目、流程或知识库，必须经过用户确认。
4. 不要把 mock data 散落在组件中，按计划集中到 `src/data/mock*.ts` 或现有集中 fixture。
5. 页面必须覆盖 loading / empty / error / success，涉及 AI 草案或复用建议的页面还要覆盖 needs-confirmation。

## 当前验证基线

```
npm test       → 92 passed (11 files), 0 failed
npm run build  → 145KB CSS, 478KB JS
npm run typecheck → 0 errors
npm run lint   → 0 errors, 0 warnings
```

## Phase 1 Web MVP 状态：✅ 已完成（产品可用 88%）

所有 P0-P8 阶段均已实现。Phase 1 可演示，剩余差距主要是真实后端接入和浏览器验收。

| 阶段 | 名称 | 状态 |
|------|------|------|
| P0 | 导航合并 + 角色解耦 | ✅ |
| P1a | IM 适配器 | ✅ |
| P1b | Git/DevOps 集成 | ✅ |
| P2 | 前端工程标准 | ✅ |
| P3 | 工作流画布 V2 | ✅ |
| P4 | 项目管理 V3 + 项目工作区 | ✅ |
| P5 | MD 指令体系 | ✅ |
| P6 | AI 工程助手 | ✅ |
| P7 | Git 同步协作 | ✅ |
| P8 | CLI Runner 选择 | ✅ |

## 功能完成度

| 模块 | 评分 | 备注 |
|------|------|------|
| 项目管理 / 工作区 | 85% | 全功能可用，Git 同步走 reducer |
| 流程编排 | 85% | 添加/编辑/删除/复制/删除模板全闭环 |
| 模型配置 | 88% | CRUD 全走 reducer，AI 助手默认模型已接入 |
| 能力中心 | 85% | MCP/Skills/Plugins/Agents 四面板完成 |
| Manual Gate | 82% | 四种决策动作闭环，真实 reducer 状态 |
| 记忆管理 | 95% | CRUD 全闭环 |
| IM 适配器 | 95% | 增删改启停全走 reducer，router 开关真实 |
| Git/DevOps | 78% | 凭证 CRUD 走 reducer，同步走 reducer 更新状态 |
| AI 助手 | 80% | 三态切换+7种意图识别+动作执行走 reducer+11 tests |
| 工程质量 | 88% | 92 tests, 0 lint, 0 type errors |

**整体 Phase 1 Web MVP：约 85%**

## Phase 1 已知局限（Phase 2 解决）

| 局限 | 位置 | 说明 |
|------|------|------|
| AI 助手规则匹配 | AiChatPanel.tsx | 关键词匹配而非真实模型调用 |
| Git 同步模拟 | ProjectWorkspace.tsx | setTimeout 模拟，需接真实 Git API |
| 测试连接 mock | GitAuthConfig/ImAdapterSettings | alert 占位 |
| IM 发送 mock | ImAdapterSettings.tsx | 模板配置完成，真实发送未接 |
| 项目保存全量 mock | Settings.tsx | "保存配置"按钮 alert 占位 |

## 下一步

1. **设计图对齐审查**：已完成 `docs/design/DESIGN_VS_IMPLEMENTATION_GAP.md`，详见下文"设计差距摘要"。
2. **浏览器验收**：全流程走查（项目管理 → 工作区 → 流程编排 → 设置 → AI 助手）
3. **Phase A 快速对齐**：6 项轻量修复，约 1-2 小时
4. **Phase B 中等改造**：7 项新功能组件，约 3-4 小时
5. **Phase C 重大改造**：重构记忆管理和流程编排 AI 模式，约 6-8 小时
6. **Phase 2**：本地 Runner、CLI agent、真实文件系统、命令执行
7. **产品验收**：Phase 1 功能闭环演示

## 设计差距摘要

2026-05-17 对 6 张设计图与当前实现进行逐图对比审查，结果已写入 `docs/design/DESIGN_VS_IMPLEMENTATION_GAP.md`。

### 各页面对齐度

| 页面 | 对齐度 | 评级 |
|------|--------|------|
| 工作台 | ~90% | ⚡ 轻微差距 |
| 项目管理总览 | ~80% | ⚡ 中等差距 |
| 项目详情 - 甘特 | ~78% | ⚡ 中等差距 |
| 项目详情 - 抽屉 | ~88% | ⚡ 轻微差距 |
| 流程编排 - 双模式 | ~55% | 🔴 较大差距 |
| 记忆管理 - 资产中心 | ~45% | 🔴 较大差距 |

### 优先任务推荐

1. **Phase A（快速赢）**：A-01~A-07，工作台+项目管理快速修复
2. **Phase B（基础改造）**：B-01~B-07，流程编排右侧面板+甘特图
3. **Phase C（架构级改动）**：C-01~C-10，记忆管理重构+AI 流程编排
4. **Phase D（数据模型）**：D-01~D-04，domain 扩展（需在 B/C 前完成）

---

## 设计规格索引

| 优先级 | 规格文件 |
|--------|----------|
| P0 | `docs/superpowers/specs/2026-05-15-project-management-merge-design.md` |
| P0 | `docs/superpowers/specs/2026-05-15-workflow-consolidation-design.md` |
| P1a | `docs/superpowers/specs/2026-05-15-im-adapter-design.md` |
| P1b | `docs/superpowers/specs/2026-05-15-git-devops-integration-design.md` |
| P2 | `docs/superpowers/specs/2026-05-15-frontend-engineering-standards-design.md` |
| P3 | `docs/superpowers/specs/2026-05-16-workflow-canvas-design.md` |
| P4 | `docs/superpowers/specs/2026-05-16-project-management-v3-design.md` |
| P4-WS | `docs/superpowers/specs/2026-05-16-project-workspace-v2-design.md` |
| P5 | `docs/superpowers/specs/2026-05-16-role-markdown-design.md` |
| P6 | `docs/superpowers/specs/2026-05-16-ai-assistant-design.md` |
| P7 | `docs/superpowers/specs/2026-05-15-git-devops-integration-design.md` |

---

## Latest Frozen Design Handoff - 2026-05-17

本节是当前最新设计冻结入口。实现 Agent 必须优先阅读以下文件，再进行前端改造：

- `docs/design/DESIGN_OVERVIEW.md`
- `docs/design/PAGE_SPEC.md`
- `docs/design/design-tokens.md`
- `docs/frontend/FRONTEND_IMPLEMENTATION_PLAN.md`
- `docs/design/assets/workflow-builder-dual-mode-v1.png`

### 当前冻结结论

- 产品名：Agent 工程管理系统。
- Phase 1：前端 Web MVP，真实后端、真实 CLI、真实多 Agent 调度进入 Phase 2。
- 工作台：定位为当前项目执行现场，核心是 Terminal Workspace、角色流程运行带、步骤上下文、角色记忆、角色提示词、MCP / Skills / Git / Local Shell 快捷入口。
- 项目管理：定位为多项目治理，不再承载项目开发执行现场。包含项目总览、项目详情、AI 方案立项、导入已有项目、新建空白项目、进度 Check、风险、甘特图、看板、鱼骨图、里程碑和变更记录。
- 项目详情：采用“项目驾驶舱 + 管理台账 Tabs + 右侧追溯详情抽屉”。
- 进度 Check：由 AI 根据协同文件、工作台 TODO、测试/build/lint/typecheck 结果和 Gate 状态生成进度差异；重要变更必须人工确认后应用。
- 流程编排：定位为流程设计与版本管理。常规配置是基础能力，AI 辅助生成是便利能力，二者共享同一套流程版本和步骤配置。
- 记忆管理：定位为项目知识资产中心，包含项目记忆、角色记忆、跨项目知识库、AI 提炼中心和记忆审计。
- 全局 AI 助手：不是单页聊天框，而是全局入口 + 页面上下文能力；在流程编排中是流程设计助手，在项目管理中是项目治理/项目经理助手，在工作台中是执行协作助手。

### 下一步实现重点

1. 按 `docs/design/design-tokens.md` 对齐颜色、字体、间距、圆角、阴影。
2. 按 `docs/design/PAGE_SPEC.md` 补齐页面、组件、状态和交互。
3. 按 `docs/frontend/FRONTEND_IMPLEMENTATION_PLAN.md` 拆解前端实现任务。
4. mock data 必须集中放置，不要散落在组件中。
5. 如果 `docs/contracts/API_CONTRACT.md` 或 `packages/types/**` 不存在，不要发明后端字段；把接口问题写入 `docs/contracts/questions.md`。

## Latest Flow Builder Handoff - 2026-05-17

本节用于指导下一轮实现 Agent 改造 `流程编排` 和 `AI 助手`。

### Product Decision

- `常规配置` 是流程编排默认模式，适合成熟流程和用户手动配置。
- `AI 辅助生成` 是增强模式，适合从项目计划、协同文件、AI 方案立项或已有流程生成草案。
- 两种模式不是两个独立页面，而是同一页面的两个工作模式。
- 两种模式必须共享同一套 Workflow / Step / Version 数据。
- AI 只能生成草案、建议和差异；应用到项目必须人工确认。

### Required Workflow Builder UI

实现或调整 `流程编排` 页面：

- 顶部 segmented control：`常规配置` / `AI 辅助生成`。
- 顶部协作说明条：`常规模板/手动编排 + AI解析/优化建议 -> 流程草案 -> 用户确认 -> 应用到项目 -> 同步工作台`。
- 左侧：`流程模板` + `项目角色池`。
- 中间：高反差网格流程画布。
- 右侧：当前步骤配置面板。
- 全局 AI 助手入口显示为：`AI 助手 · 流程设计模式`。

### Required Conventional Flow

常规配置路径：

```text
选择流程模板 -> 配置流程步骤 -> 给每个步骤绑定角色
-> 选择 Runner / 模型 / 能力授权 -> 设置 Gate / 验收标准
-> 校验流程 -> 保存流程版本 -> 应用到项目 -> 同步到工作台
```

必须支持：

- 模板库：软件开发完整流程、设计评审流程、Bug 修复流程、自定义模板。
- 项目角色池：产品经理、UI/UX 设计师、前端工程师、代码审查、测试工程师等。
- 节点编辑：新增、选择、复制、删除、连接、状态展示。
- 步骤配置：Role、Runner、Model、Capability、Gate、验收标准。
- 流程版本：草稿、已应用、有变更、需重新同步。
- 流程校验：缺角色、缺 Runner、缺模型、缺能力授权、缺验收标准时明确提示。

### Required AI Assisted Flow

AI 辅助路径：

```text
选择输入来源 -> AI 解析 -> 生成流程草案 -> 查看差异
-> 用户手动调整 -> 用户确认 -> 应用到项目
```

输入来源：

- 当前项目计划与任务。
- HANDOFF_NEXT_TASKS.md。
- CODE_REVIEW_AND_FIX_REQUESTS.md。
- AI 方案立项结果。
- 当前流程版本。
- 已有流程模板。

必须支持：

- 角色建议。
- 步骤建议。
- Gate 建议。
- 验收标准建议。
- 差异对比：新增节点、修改节点、影响任务、风险提示。
- 采纳 / 拒绝 / 部分采纳。
- 应用前二次确认。

### Required Data Shape

Workflow Step 至少包含：

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

### Required Global AI Assistant Behavior

同一个 AI 助手入口按页面切换模式：

- 工作台：执行协作助手。
- 项目管理总览：项目治理助手。
- 项目详情：项目经理助手。
- 流程编排：流程设计助手。
- 记忆管理：记忆整理助手。
- 设置中心：配置诊断助手。

AI 助手输出统一进入：

```text
建议 / 草案 -> 差异预览 -> 用户确认 -> 应用
```

### Acceptance Checks

- 流程编排页面同时体现 `常规配置` 和 `AI 辅助生成`。
- 默认进入 `常规配置`。
- 普通用户不使用 AI 也能完整创建流程。
- AI 生成内容不会直接覆盖正式流程。
- 步骤配置能看到 Role + Runner + Model + Capability + Gate + 验收标准。
- 应用流程后，项目详情的 `角色与流程` 和工作台 `角色流程运行带` 可看到同步结果。
- `workflow-builder-dual-mode-v1.png` 中的信息层级、网格画布、左右结构和右侧步骤配置必须作为视觉参考。

## Latest Memory Management Handoff - 2026-05-17

本节用于指导下一轮实现 Agent 改造 `记忆管理`。

### Product Decision

- 记忆管理不是聊天记录列表，而是项目知识资产中心。
- 必须能看到项目、项目内角色、角色记忆、项目记忆和跨项目知识库。
- AI 可以提炼候选知识和复用建议，但入库或应用前必须人工确认。
- 记忆必须可追溯、可复用、可审计、可过期。

### Required UI

实现或调整 `记忆管理` 页面：

- 顶部：`AI 助手 · 记忆整理模式`、`提炼记忆`、`导入记忆`、`导出知识库`。
- 左侧：`记忆空间`，包含 `项目 / 角色 / 知识库` 视图。
- 左侧项目树：项目下展开 `项目记忆` 和角色节点，例如产品经理、UI/UX 设计师、前端工程师、代码审查、测试工程师。
- 中间：当前项目或角色记忆工作区，包含 KPI、分类 Tabs 和记忆卡片列表。
- 右侧：`AI 提炼与复用建议`，包含跨项目洞察、可沉淀知识、推荐给当前项目、记忆审计。
- 视觉参考：`docs/design/assets/memory-management-knowledge-center-v1.png`。

### Required Memory Layers

```text
项目记忆 -> 角色记忆 -> 可复用知识库 -> 跨项目洞察
```

必须支持：

- 项目记忆：目标、边界、冻结方案、技术决策、风险、进度摘要、协同文件结论。
- 角色记忆：角色提示词、角色偏好、职责、执行经验、常见问题。
- 知识库：确认后的规范、模板、风险清单、Prompt、工作流经验。
- 跨项目洞察：多个项目反复出现的问题、有效流程、Runner/模型组合建议、默认 Gate 建议。

### Required Memory Flow

```text
项目记忆 / 角色记忆 / 协同文件 / 工作台摘要
-> AI 提炼
-> 来源追溯
-> 用户确认
-> 知识库沉淀
-> 新项目 / 新角色 / 新流程复用
```

### Required Record Fields

每条记忆至少包含：

- `id`
- `title`
- `type`
- `projectId`
- `roleId`
- `sourceType`
- `sourceRef`
- `confidence`
- `status`
- `tags`
- `usedByProjectIds`
- `createdAt`
- `updatedAt`
- `expiresAt`
- `content`

状态至少包含：

- `pending_confirmation`
- `confirmed`
- `reused`
- `stale`
- `expired`

### Acceptance Checks

- 记忆管理页面能看到项目列表和项目内角色。
- 点击项目展示项目记忆。
- 点击角色展示该角色记忆。
- 知识库只展示已确认可复用知识。
- AI 提炼结果进入待确认队列，不自动入库。
- 复用建议应用前必须展示来源追溯和影响范围。
- 过期记忆不会被删除，只改变状态并保留审计记录。
- 新建项目、项目详情、流程编排和工作台能引用记忆管理的复用知识。
## Latest Design Sync - 2026-05-18 - AI Workflow Design Final

Current final visual reference:

- `docs/design/assets/ai-workflow-design-v1-final.png`

This section overrides older notes that described AI workflow design as only a source-import panel or required a separate `打开 AI 助手` button in the page header.

### AI 流程设计 Final Direction

Required layout:

- Use the same AppShell and spacing baseline as Workbench.
- Sidebar active item: `流程管理`.
- Page: `流程管理 / AI 流程设计`.
- Secondary context header:
  - left: `AgentManagement`
  - context selector: `上下文：项目计划 + 协同文件 + 当前流程`
  - target selector: `目标流程：软件开发完整流程`
  - status: `已收集 5 个来源 · 草案未生成`
  - right actions only:
    - `生成流程草案`
    - `保存草稿`
    - `应用到流程`
    - more menu
- Do not show `导入来源` or `打开 AI 助手` in the top-right header.

Main content:

- Left column is `讨论区`, matching the AI 建项助手 discussion pattern:
  - chat bubbles for user and AI.
  - collapsed materials strip: `已添加资料 5 项`.
  - context chips: `当前项目计划`, `HANDOFF`, `AI建项结果`, `当前流程v1.3`.
  - composer textarea.
  - composer actions: `添加资料`, `粘贴内容`, `发送`.
- Middle column is `AI 解析与流程草案`:
  - big action: `生成流程草案`.
  - copy: `只生成草案，不覆盖当前流程`.
  - analysis progress: `收集来源 -> 识别目标 -> 抽取角色 -> 生成步骤 -> 校验约束`.
  - analysis cards: `目标摘要`, `角色建议`, `能力授权建议`, `风险与假设`.
  - workflow draft canvas with nodes: `需求分析`, `UI/UX 设计`, `前端开发`, `代码审查`, `测试验证`.
- Right column is `差异对比与应用`:
  - diff summary: `新增 1 个步骤`, `修改 3 个绑定`, `未变更 2 项`.
  - proposed change rows.
  - confirmation checklist: `用户确认`, `不覆盖当前版本`, `保存为 v1.4 草案`.
  - bottom actions: `查看完整差异`, `确认应用到流程`.

Rules:

- AI 流程设计 is not the same as 常规流程设计.
- AI 流程设计 has an integrated left discussion/context collection area, similar to AI 建项助手.
- The page must not add a standalone extra chat window outside the left discussion column.
- AI must not directly overwrite an existing workflow. It only generates drafts and diffs until the user confirms.
- No Gate, Manual Gate, or 人工决策 node appears on the AI workflow design canvas.

## Latest Project Management Overview Density Fix - 2026-05-20

Current source of truth:

- `docs/design/mockups/project-management-overview-v2-full.html`
- `public/mockups/project-management-overview-v2-full.html`
- Preview: `http://127.0.0.1:5173/mockups/project-management-overview-v2-full.html`

User feedback:

- The Project Management Overview v2 page only looked correct when the browser zoom was manually set to 80%.
- The design must look correct at browser 100% zoom. Users should not need to change browser zoom.

Historical mockup fix, now superseded:

- The HTML mockup once used an internal density scale token:
  - `--page-scale: .8`
  - `.app` width/height use `calc(100vw / var(--page-scale))` and `calc(100vh / var(--page-scale))`
  - `.app` uses `transform: scale(var(--page-scale))` with `transform-origin: top left`
- This was only a temporary prototype technique. It is no longer an accepted implementation or final mockup strategy.

Implementation guidance:

- For the real React implementation, do not rely on browser zoom.
- Prefer implementing the same density through compact design tokens: smaller shell/sidebar/page spacing, button heights, card row heights, typography scale and panel gaps.
- Final mockups and product code should both use real layout tokens and constrained grid/flex sizing instead of the internal scale technique.

Acceptance:

- At browser 100% zoom, the project management overview should show the same effective density the user previously saw at 80% zoom.
- The page must not require manual browser zoom to become usable.
- The full multi-project management dashboard should remain visible without oversized cards, inflated fonts, or excessive spacing.

## Latest Project Management Overview Final HTML - 2026-05-20

Source of truth for the Project Management Overview page is now:

- `docs/design/mockups/project-management-overview-v2-final.html`
- `public/mockups/project-management-overview-v2-final.html`
- Preview: `http://127.0.0.1:5173/mockups/project-management-overview-v2-final.html`

This replaces the earlier split image `project-management-overview-v1.png` as the implementation reference.

Key design decisions:

- Browser must stay at 100% zoom; compact density must come from layout tokens, reduced gutters, smaller cards, and constrained panel heights.
- The page is a project commander / PMO overview, not only a project card list.
- It must include:
  - global project portfolio filters and actions
  - new blank project / existing project import / AI project initiation entrances
  - portfolio health KPI strip
  - commander attention strip: today's decisions, role load, schedule deviation, AI next action
  - multi-project card board with progress, health, risk, Gate, TODO, detail and workbench actions
  - right-side AI project steward suggestions
  - risk and phase distribution
  - recent changes from progress Check, collaboration files and workbench snapshots

Implementation guidance:

- Do not re-use the old `project-management-overview-ai-briefing-v1.png` combined image as the primary source.
- Do not copy any older `--page-scale: .8` implementation from the mockups into React.
- The page must remain within the global Workbench-style shell and share the same sidebar/topbar density.

## Project Card Management Signal Update - 2026-05-20

The Project Management Overview final HTML now includes the missing project-card management signal block requested by the user.

Updated source of truth:

- `docs/design/mockups/project-management-overview-v2-final.html`
- `public/mockups/project-management-overview-v2-final.html`

Each project card must now show:

- health score, for example `健康分 76`
- risk badge, for example `中风险 / 高风险 / 低风险`
- current milestone, for example `Phase 1 Web MVP 收尾`
- next acceptance point, for example `浏览器全流程验收`
- compact operational chips:
  - 运行
  - Gate
  - TODO
  - 待确认
  - 同步时间
  - 变更数量

Implementation note:

- These fields are not decorative. They are the core project-governance information for the portfolio overview.
- Do not simplify project cards back to only progress, health, risk, Gate and TODO.
- The real implementation should expose these fields from centralized mock data first, then map to real project/check/workbench state later.

## Latest Project Detail HTML Prototypes - 2026-05-20

Project Detail finalized images have now been implemented as standalone high-fidelity HTML prototypes.

Source of truth:

- Gantt / health cockpit HTML: `docs/design/mockups/project-detail-gantt-v1.html`
- Trace drawer HTML: `docs/design/mockups/project-detail-trace-drawer-v1.html`
- Public preview: `http://127.0.0.1:5173/mockups/project-detail-gantt-v1.html`
- Public preview: `http://127.0.0.1:5173/mockups/project-detail-trace-drawer-v1.html`

These replace the older placeholder HTML files that depended on `styles.css` and had corrupted Chinese text.

Implementation requirements:

- The project detail page must show the project cockpit, AI progress Check, next acceptance point, tabs, project overview, plan summary, collaboration sources, and phase timeline.
- The trace drawer state must show a right-side task detail drawer with task goal, phase, owner role, related workflow steps, acceptance criteria, AI judgement, workbench feedback, collaboration file snippet, history, and bottom actions.
- Both pages must use the same dark Workbench shell and Project Management navigation style.

## Project Detail Density Fix - 2026-05-20

User feedback:

- Project detail prototypes only look correct at browser 80% zoom.
- At browser 100% zoom, layout appears oversized/misaligned.

Applied to:

- `docs/design/mockups/project-detail-gantt-v1.html`
- `docs/design/mockups/project-detail-trace-drawer-v1.html`
- `public/mockups/project-detail-gantt-v1.html`
- `public/mockups/project-detail-trace-drawer-v1.html`

Historical mockup fix, now superseded:

- Added `--page-scale: .8`.
- `.app` now uses `width: calc(100vw / var(--page-scale))` and `height: calc(100vh / var(--page-scale))`.
- `.app` uses `transform: scale(var(--page-scale))` and `transform-origin: top left`.
- This was a temporary visual correction only. Current finalization requires real 100% layout without page-level scale.

Product decision:

- `project-detail-trace-drawer-v1.html` is the better/more complete project detail layout and should be treated as the primary source of truth.
- `project-detail-gantt-v1.html` is a reference/default state, but the final React page should be one `ProjectDetailPage` with an optional `ProjectTraceDrawer` open/closed state.

Implementation guidance:

- Real implementation must not require users to set browser zoom to 80%.
- Convert this density into compact layout tokens when implementing React components.
- Do not keep `--page-scale: .8` or page-level `transform: scale(...)` in final HTML or product code.

## Project Detail Tabs Content Prototype - 2026-05-20

A dedicated interactive HTML prototype now defines the content for every Project Detail tab.

Source of truth:

- `docs/design/mockups/project-detail-tabs-v1.html`
- Public preview: `http://127.0.0.1:5173/mockups/project-detail-tabs-v1.html`

Tabs included:

- 项目概况: project goal, basic info, AI progress check, next acceptance point, AI PM summary
- 计划与任务: priority task table with phase, owner, progress and status
- 进度视图: Gantt chart timeline
- 风险与决策: SWOT analysis, risk matrix and Gate decision card
- 角色与流程: project role pool and workflow step binding
- 协同文件: collaboration file list and AI parsing summary
- 变更记录: project change log

Important:

- The user explicitly requested Gantt and SWOT content. Do not omit these in the React implementation.
- The project detail page should no longer be only a project overview tab.

## Project Detail Trace Drawer Final Merge - 2026-05-20

最新设计决策：

- `docs/design/mockups/project-detail-trace-drawer-v1.html` 已合并项目详情 7 个分页，作为项目详情页当前定稿入口。
- Public preview: `http://127.0.0.1:5173/mockups/project-detail-trace-drawer-v1.html`
- `docs/design/mockups/project-detail-tabs-v1.html` 仅保留为分页内容参考，不再作为主入口。

已合并分页：

- 项目概况
- 计划与任务
- 进度视图
- 风险与决策
- 角色与流程
- 协同文件
- 变更记录

项目概况调整要求：

- 保留 `project-detail-trace-drawer-v1.html` 原有项目概况风格。
- `协同来源` 控件需要更紧凑，避免占用主内容空间。
- `计划摘要` 需要放大，作为项目详情首屏的核心信息区。
- 右侧 `任务详情 / Trace Drawer` 作为任务追踪抽屉保留，用于展示当前任务、依赖、阻塞和审查线索。

实现要求：

- React 实现时以 `project-detail-trace-drawer-v1.html` 为准。
- 7 个分页必须在同一个项目详情页面内切换，不要拆成多个互相跳转的页面。
- `进度视图` 必须包含甘特图。
- `风险与决策` 必须包含 SWOT 分析、风险矩阵和 Gate 决策信息。
- 页面必须按 100% 浏览器缩放可用；不要依赖用户手动设置 80% 缩放。

## Project Detail Mockup Refinement - 2026-05-20

Latest refinement for `project-detail-trace-drawer-v1.html`:

- Project overview keeps the trace-drawer style, but `协同来源` must remain readable instead of being over-compressed.
- `协同来源` should use a compact but scannable right column, with stable file icons and two-line metadata.
- `任务详情 · P3 流程编排画布 V2` should be a closable drawer. When closed, the main project detail page should reclaim the full content width.
- `协同文件` tab should use stable file icons, not text placeholder glyphs such as `▣`.
- `角色与流程` workflow map should avoid raw arrow characters. Use a dedicated flow card row with subtle connector lines aligned to the cards.

Preview source:

- `docs/design/mockups/project-detail-trace-drawer-v1.html`
- `public/mockups/project-detail-trace-drawer-v1.html`

## Project Detail Context Panel Decision - 2026-05-20

Decision update:

- The right panel in project detail should be a persistent context detail panel, not a closed-by-default drawer.
- Rename it from `任务详情` to `详情面板`.
- Default content is `当前任务`, but the panel must change based on the selected object.
- Selection mapping:
  - Task row / plan summary item -> task detail
  - Gantt bar -> progress / timeline detail
  - Risk / Gate item -> risk or decision detail
  - Role card / workflow step -> role and workflow binding detail
  - Collaboration file -> file summary and AI parsing detail
  - Empty selection -> next actions, pending confirmations, and recent changes
- Recommended width: about 340-360px. Keep it compact and always visible in desktop layout.

## Project Detail Visual Baseline Correction - 2026-05-20

The project detail mockup has been realigned to the approved screenshot baseline.

Source of truth:

- `docs/design/mockups/project-detail-trace-drawer-v1.html`
- `public/mockups/project-detail-trace-drawer-v1.html`

Design correction:

- Keep the dense cockpit-style layout from the approved screenshot.
- Right side should remain a persistent `任务详情 / 详情面板` area, not a closed-by-default drawer.
- Desktop layout baseline: left nav about 228px, center content flexible, right detail panel about 420px.
- Project overview should use: project basic info + enlarged plan summary + readable collaboration sources.
- Bottom project phase timeline should remain visible and aligned with the compact cockpit layout.
- The previous looser merged-tabs layout should not be used as the visual baseline.

## Project Detail Local Actions And Role Layout Fix - 2026-05-20

Latest UI corrections:

- Page-specific actions such as `进入工作台`, `检查最新进度`, and `保存变更` must not live in the global top navigation bar.
- These actions should be local to the project detail content area, aligned with the page hero / cockpit area.
- The right panel header should not look like a global navigation title. Use `详情面板` as the persistent panel title and show the selected object type, such as `当前任务`, as a small status badge.
- The selected task name and task status belong inside the detail content summary card, not in the global/right panel chrome.
- `角色与流程` should use a two-area layout: left `项目角色池`, right `流程绑定关系`. Avoid two independent horizontal card rows.

## Project Detail Layout Fine Tune - 2026-05-21

Latest visual corrections:

- Phase timeline should sit lower inside its container; avoid the line/dots touching the card top edge.
- The right persistent detail panel must start below the global top navigation bar. It should not visually enter the global navigation area.
- In the project hero, KPI cards should stay on the left/middle side and page-level action buttons should be on the far right. Do not place action buttons before KPI cards.

## Project Detail Header Action Zone Fix - 2026-05-21

Confirmed UI requirements implemented in the mockup:

- KPI cards are moved to the marked center area and wrapped in a visible `metric-zone` container.
- Page action buttons are moved to the right side of the project hero area, not the global top navigation.
- Action buttons use icon + text styling consistent with the project management action bar pattern.
- `个人本地版` stays in the global top navigation far right as a status badge.

Source:

- `docs/design/mockups/project-detail-trace-drawer-v1.html`
- `public/mockups/project-detail-trace-drawer-v1.html`
## Project Detail Finalized - 2026-05-21

当前项目详情页暂时定稿。

Source of truth:

- `docs/design/mockups/project-detail-trace-drawer-v1.html`
- `public/mockups/project-detail-trace-drawer-v1.html`
- Preview: `http://127.0.0.1:5173/mockups/project-detail-trace-drawer-v1.html`

Related docs updated:

- `docs/design/DESIGN_OVERVIEW.md`
- `docs/design/PAGE_SPEC.md`
- `docs/frontend/FRONTEND_IMPLEMENTATION_PLAN.md`

Final design decisions:

- Use the compact cockpit-style layout, not the looser merged-tabs layout.
- Shell layout: left sidebar about `228px`, flexible main area, persistent right detail panel about `420px`.
- Global topbar must not contain page-level project actions.
- `个人本地版` sits at the far top-right of the whole page.
- Project-level actions sit inside the project hero area:
  - icon-only `返回总览`
  - `进入工作台`
  - `检查最新进度`
  - `保存变更`
- KPI cards sit in a visible `metric-zone` container:
  - 总进度
  - 待确认
  - 高风险
- `Gate` and `测试通过` must not be rendered as top KPI cards. Gate belongs in `风险与决策`, `协同来源`, or the persistent right `详情面板`; test pass count belongs in 质量/验收 or detail context.
- Project title area only keeps essential identity and status. Remove noisy title chips such as `风险中`, `最后同步`, and `协同文件已连接`.
- `最后同步` and `协同文件已连接` belong in the `协同来源` panel.
- Right side uses a persistent `详情面板`, not a closed-by-default drawer.
- Right panel header shows `详情面板` and current object type, such as `当前任务`; concrete task names belong inside the detail content card.
- `角色与流程` uses a two-area layout:
  - left: `项目角色池`
  - right: `流程绑定关系`
- Tab content must be height-constrained. Clicking `角色与流程` must not expand the page or push the bottom timeline out of view.
- Bottom phase timeline remains visible and positioned lower inside its card.

Implementation warning:

- Do not copy older versions of `project-detail-tabs-v1.html` as the implementation baseline.
- Use `project-detail-trace-drawer-v1.html` as the current final baseline.

## AI Project Initiation Density Fix - 2026-05-21

AI 建项助手 v2 定稿 HTML 已调整为浏览器 100% 缩放下呈现原先 80% 缩放的视觉密度。

Updated files:

- `docs/design/mockups/ai-project-initiation-v2-final.html`
- `public/mockups/ai-project-initiation-v2-final.html`

Implementation note:

- Historical note: the first mockup briefly used `--page-scale: .8` to simulate the desired density. That approach is now deprecated.
- React implementation and final HTML mockups must use real compact layout tokens, smaller gutters, and viewport-fitting grid/flex constraints instead of full-page scaling.
- Browser zoom must remain 100% during acceptance.

## AI Project Initiation Spacing Alignment - 2026-05-21

AI 建项助手 v2 页面已对齐当前程序工作台的内容区边距规范：

- `.page { padding: 12px 14px 10px; gap: 10px; }`
- Do not use large page padding such as `18px 24px 20px` on this page.
- Keep browser zoom at 100%; density is handled by compact spacing tokens and constrained layout, not by page-level scale.

## Project Detail Back Navigation - 2026-05-21

Project detail is entered from project overview, so it must provide an explicit way back.

Updated requirement:

- Add `返回总览` to the project detail local action toolbar.
- `返回总览` should navigate back to the project management overview page.
- Keep it as a page-level local action, not a global topbar action.
- Toolbar order: `返回总览`, `进入工作台`, `检查最新进度`, `保存变更`.
- `返回总览` is icon-only. It must stay in the local project action toolbar and must not be placed in the breadcrumb/global topbar.

Updated mockups:

- `docs/design/mockups/project-detail-trace-drawer-v1.html`
- `public/mockups/project-detail-trace-drawer-v1.html`
