# Phase 2 工程层蓝图

更新：2026-05-29

> 本文档汇总所有 Phase 2 待实现范围。Phase 1 只做前端 MVP+fixtures，Phase 2 接真实后端/本地工程层。

---

## 2026-05-29 启动结论

Phase 1 页面定稿基线已经提交并推送到 GitHub，当前可以进入 Phase 2 工程层开发。

启动依据：

- `main` 分支为当前稳定基线。
- 当前远程仓库：`https://github.com/liuzx778899-hue/AgentManagement.git`
- Phase 1 页面范围已按 `docs/handoff/handoff-next-tasks.md` 顶部“页面定稿基线 / Git 初始快照”归档。
- 构建验证通过：`npm --cache .npm-cache run build`
- 测试验证通过：`npm --cache .npm-cache test`，14 个测试文件、109 个测试通过。
- 后续任务必须按 Issue / branch / worktree 拆分，避免多个 AI 工具互相覆盖。

Phase 2 启动原则：

- 不再把页面视觉微调作为主线任务，除非它阻塞工程层能力落地。
- 所有真实工程能力先做只读、可观测、可回滚，再做写入和自动执行。
- 每个功能必须保留 mock/fixture fallback，避免真实本地能力不可用时页面崩溃。
- 本地命令执行必须有白名单、超时、日志截断和错误态展示。
- GitHub 插件/CLI 不稳定时，Issue 可先在 GitHub 网页手动创建，开发仍按 Issue 编号建分支和 worktree。

---

## Phase 2 技术选型定稿

### 语言与运行时

- 前端继续使用 `TypeScript + React + Vite`，不切换框架。
- 本地工程层优先使用 `Node.js + TypeScript`，与现有前端工程共享类型、校验和构建链路。
- 本地命令、Git、worktree、文件系统和 CLI Runner 进程管理使用 Node.js `child_process` / `fs` / `path` 等标准能力封装。
- 暂不引入 Python、Go、Rust、Java 或独立后端语言，除非后续某个 Runner 生态明确需要。
- 暂不做数据库；Phase 2 数据先以 `.agentmanagement/` 下的 JSON / JSONL / MD 文件持久化。

### 应用架构

采用“前端 UI + 本地工程服务层 + 文件系统状态”的本地优先架构：

```text
React UI
  ↓
UseCase / Service API
  ↓
Adapters
  ├─ GitAdapter
  ├─ WorktreeAdapter
  ├─ ProcessRunnerAdapter
  ├─ FileStoreAdapter
  ├─ GitHubAdapter
  └─ LlmAdapter
  ↓
Local workspace / CLI / GitHub / LLM
```

核心原则：

- UI 组件只调用 UseCase，不直接执行 shell、读写文件或访问 GitHub。
- UseCase 负责业务编排，例如创建 Issue worktree、启动 Runner、保存流程、写入记忆。
- Adapter 负责外部能力边界，例如 Git 命令、文件读写、CLI 子进程、GitHub API、LLM API。
- 所有 Adapter 都必须提供 mock fallback，方便纯前端预览和失败降级。
- 本地优先，远程同步只是增强能力，不把 GitHub 或云服务作为页面可用性的前置条件。

### 设计模式

- `Adapter Pattern`：隔离 Git、文件系统、进程、GitHub、LLM 等外部能力。
- `UseCase / Application Service`：把业务流程从 React 组件中拿出来，保持页面只负责展示和交互。
- `Repository Pattern`：封装项目配置、流程、角色、记忆、运行记录等本地文件读写。
- `Command Pattern`：把危险操作建模成可审计命令，例如删除 worktree、push、启动 Runner。
- `Event Log`：运行事件追加写入 JSONL，支持恢复、审计和 UI 日志流。
- `State Machine`：AgentRun、WorkflowRun、Gate 状态按明确状态迁移处理，避免按钮状态散落在组件里。
- `Strategy Pattern`：不同 Runner、模型供应商、GitHub/手动 Issue 来源走可替换策略。

### 目录建议

Phase 2 不直接把工程层逻辑塞进页面组件，建议逐步新增：

```text
src/
  services/
    local/
      adapters/
      useCases/
      repositories/
      schemas/
      events/
  types/
    localEngineering.ts
```

后续如果需要独立本地服务或桌面壳，再把 `src/services/local` 平滑迁移到独立 package；Phase 2 MVP 先保持单仓库、低迁移成本。

### 不采用的方案

- 暂不做 Electron / Tauri 桌面客户端，先把 Web 本地工程能力跑通。
- 暂不做 SaaS 后端和多用户权限。
- 暂不引入数据库，避免 Phase 2 过早增加部署和迁移成本。
- 暂不把所有能力做成插件系统，先用清晰 Adapter 边界，等真实能力稳定后再抽插件化。

---

## Phase 2 开发规范与代码约束

本节为 Phase 2 后续所有任务的硬约束。任何 Issue、worktree、AI 工具或人工修改都必须遵守。

### 1. Git / Issue / Worktree 规范

- 每个开发任务必须先有 GitHub Issue 编号。
- 分支命名：`issue-<number>-<short-slug>`，例如 `issue-12-local-git-status`。
- worktree 命名：`.worktrees/issue-<number>-<short-slug>`。
- 一个 Issue 对应一个分支和一个 worktree，不同 AI 工具不得共用同一个 worktree。
- `main` 只保存稳定基线，不直接开发，不堆积半成品。
- commit 必须引用 Issue：`Refs #<number>` 或 `Closes #<number>`。
- 一个 commit 只解决一个清晰主题，避免把页面调整、工程层能力、重构和文档混在一起。

### 2. 目录与模块边界

- 页面组件只放 UI 和交互编排，不直接执行 Git、文件系统、进程、网络或 LLM 调用。
- 本地工程能力统一放在 `src/services/local/` 下。
- 外部能力只能通过 Adapter 暴露，例如 `GitAdapter`、`WorktreeAdapter`、`ProcessRunnerAdapter`、`FileStoreAdapter`、`GitHubAdapter`、`LlmAdapter`。
- 业务流程放在 UseCase，例如 `createIssueWorktree`、`readGitStatus`、`startWorkflowRun`。
- 文件读写放在 Repository，例如 `ProjectRepository`、`WorkflowRepository`、`MemoryRepository`。
- 共享类型放在 `src/types/`，禁止在多个页面重复定义同一套结构。
- fixtures/mock 数据必须集中管理，不允许散落在组件内部。

### 3. 命名规范

- 文件名：
  - React 组件：`PascalCase.tsx`，例如 `ProjectDetailPage.tsx`。
  - hooks：`useXxx.ts`，例如 `useGitStatus.ts`。
  - service / adapter / repository：`camelCase.ts` 或明确类名文件，例如 `gitAdapter.ts`、`projectRepository.ts`。
  - 测试文件：`*.spec.ts` / `*.spec.tsx`。
- 类型命名：
  - interface/type 使用 `PascalCase`，例如 `LocalGitStatus`、`WorkflowRunState`。
  - union 字面量使用小写短横线或小写枚举值，例如 `'running' | 'waiting-gate' | 'failed' | 'completed'`。
- 函数命名：
  - 读操作用 `get/read/list`。
  - 写操作用 `create/update/delete/save`。
  - 命令型操作用 `run/start/stop/close/archive`。
- CSS class 继续沿用现有语义化命名，不新增无意义缩写。
- 用户可见文案使用中文；代码标识、文件名、类型名使用英文。

### 4. TypeScript 与代码质量

- 新增代码必须通过 TypeScript 编译，不允许使用 `any` 绕过类型，确需使用时必须局部说明原因。
- 外部输入必须校验，包括命令输出、文件 JSON、GitHub API、LLM 返回值和用户输入。
- 异步操作必须显式处理 loading / success / error / empty 四类状态。
- 禁止在组件 render 中写复杂业务判断；复杂逻辑抽到 selector、helper 或 UseCase。
- 禁止复制大段相似逻辑；第二次重复可以接受，第三次必须抽公共函数或组件。
- 注释只解释非显而易见的业务规则、安全边界或兼容原因，不写“代码做了什么”的空注释。
- 不做无关重构；需要重构时必须服务于当前 Issue 的可验证目标。

### 5. UI 与交互规范

- Phase 2 默认不改 Phase 1 已定稿页面视觉，除非工程层能力接入需要新增状态或错误提示。
- 所有页面继续遵守 Workbench 视觉基线：共享 Sidebar、AppTopbar、内容边距、按钮密度、图标体系。
- 使用 `lucide-react` 图标，禁止混用 emoji、纯文字伪图标或随机 SVG。
- 新增交互必须有明确 disabled、loading、error、empty 状态。
- 高风险操作必须二次确认，例如删除 worktree、执行 shell、push、覆盖文件。
- 列表、面板和日志区超过可视高度时使用局部滚动，不让整页失控溢出。
- 不允许用浏览器缩放、`transform: scale(...)` 或页面级缩放解决布局问题。

### 6. 本地命令与安全规范

- 命令执行必须经过 Command/Adapter 层，不允许组件直接拼接 shell。
- 命令参数必须数组化传入，避免字符串拼接注入。
- 所有命令必须有 timeout、cwd、退出码、stderr/stdout 截断和错误结构。
- 默认只允许当前项目根目录及授权 worktree 内的读写操作。
- 删除、移动、覆盖文件前必须校验目标路径在允许目录内。
- 高风险命令默认禁止，必须通过白名单和用户确认。
- 日志必须脱敏，不写入 token、API key、cookie、凭据和完整密钥。

### 7. 数据持久化规范

- Phase 2 数据写入 `.agentmanagement/`，不写入散乱的项目根目录文件。
- 写文件前先生成临时文件或备份，成功后再替换目标，避免半写入损坏。
- JSON 文件必须格式化输出，便于 diff。
- 运行日志使用 JSONL 追加写入，避免频繁改写大 JSON。
- 所有持久化结构必须有 `version` 字段，方便后续迁移。
- 文件读取失败必须能降级到空状态或 mock fallback，页面不得白屏。

### 8. 测试与验收规范

- 每个任务提交前至少运行：`npm --cache .npm-cache run build`。
- 涉及状态、reducer、adapter、useCase 或数据转换的任务必须运行：`npm --cache .npm-cache test`。
- 新增 UseCase / Adapter 必须覆盖成功、失败、超时或非法输入中的关键路径。
- 涉及 UI 交互的任务必须进行浏览器走查或截图验证。
- 修 bug 必须先描述复现条件，再说明验证结果。
- 不能运行测试时，必须在提交说明或交付说明中写明原因和残余风险。

### 9. 文档与协助文件规范

- 改变架构、流程、目录、命名、协作规则时，必须同步更新 `docs/product/phase-2-blueprint.md` 或 `docs/handoff/handoff-next-tasks.md`。
- 页面视觉定稿只写入 design/frontend 相关文档；工程层规则写入 Phase 2 蓝图。
- 文档必须使用 UTF-8，避免中文乱码。
- 新增文档要写清楚“做什么 / 不做什么 / 验收方式”，避免只写口号。

---

## Phase 2 多 Agent 协同规范

本节用于约束多个 AI 工具、多个 Agent 或人工与 AI 同时参与开发时的协作方式。核心目标是避免互相覆盖、重复实现、误回滚和上下文漂移。

### 1. 任务归属

- 一个 Agent 只能认领一个明确 Issue，不允许“顺手”处理其他 Issue。
- 一个 Issue 同一时间只允许一个主执行 Agent。
- 如果任务必须拆给多个 Agent，必须先拆成多个子 Issue，并声明依赖关系。
- 每个 Agent 开始前必须在 Issue 或交付说明中写清楚：
  - 要改哪些文件或目录。
  - 不改哪些文件或目录。
  - 可能影响哪些页面、状态、服务或样式。
  - 需要等待哪些前置任务。

### 2. Worktree 隔离

- 每个 Agent 必须使用独立 worktree：`.worktrees/issue-<number>-<short-slug>`。
- 不允许两个 Agent 在同一个 worktree 内并行修改。
- 不允许 Agent 在别人的 worktree 内修复问题，除非对应 Issue 明确转交。
- 创建 worktree 前必须基于最新 `main`。
- 合并或关闭 Issue 后，清理 worktree 必须经过路径校验和人工确认。

### 3. 文件占用与并行边界

- 修改同一文件的任务默认不能并行，必须串行。
- 下面这些文件或目录属于高冲突区，多个 Agent 同时修改前必须先协调：
  - `src/components/AppShell.tsx`
  - `src/components/ProjectDetailPage.tsx`
  - `src/components/Workflow*.tsx`
  - `src/components/ProjectManagement*.tsx`
  - `src/styles/*.css`
  - `src/data/*`
  - `docs/handoff/handoff-next-tasks.md`
  - `docs/product/phase-2-blueprint.md`
- 如果必须并行修改同一领域，优先拆成：
  - 类型/数据层 Issue
  - service/useCase Issue
  - UI 接入 Issue
  - 样式微调 Issue
- 样式任务不得顺手改业务逻辑，工程层任务不得顺手改页面视觉。

### 4. 上下文同步

- Agent 开始前必须读取：
  - 当前 Git 状态。
  - 当前 Issue 描述。
  - `docs/handoff/handoff-next-tasks.md`
  - `docs/product/phase-2-blueprint.md`
- UI 任务还必须读取最新设计约束文档：
  - `docs/design/design-overview.md`
  - `docs/design/page-spec.md`
  - `docs/frontend/FRONTEND_IMPLEMENTATION_PLAN.md`
- 不允许根据旧截图、旧对话记忆或旧 mockup 回滚当前实现。
- 如果代码与文档冲突，先在 Issue 中记录冲突，再按最新 `main`、最新协助文件和用户最新指令判断。

### 5. 提交与交付

- 每个 Agent 必须小步提交，一个 commit 对应一个可验证改动。
- 提交前必须同步最新 `main`，解决冲突后重新验证。
- commit message 必须引用 Issue：`Refs #<number>` 或 `Closes #<number>`。
- 交付说明必须包含：
  - 本次改了什么。
  - 改了哪些文件。
  - 跑了哪些验证命令。
  - 是否存在未完成项或残余风险。
  - 是否影响其他 Agent 的工作范围。
- 不允许把“未验证”“可能坏了”“后面再修”的内容合入 `main`。

### 6. 冲突处理

- 遇到冲突时，Agent 必须先停下来检查对方提交，不允许直接覆盖。
- 只解决自己 Issue 相关的冲突，不删除无关改动。
- 如果冲突涉及产品决策、设计基线、数据模型或公共接口，必须先更新 Issue 说明或协助文件。
- 冲突解决后必须重新运行 build；涉及逻辑必须重新运行 test。
- 如果无法判断谁的改动优先，以最新用户指令、最新文档和最新 `main` 为准。

### 7. 看板状态

Phase 2 Issue 建议统一使用这些状态：

- `Ready`：需求清楚，未开始。
- `In Progress`：已有 Agent 认领并开始。
- `Blocked`：等待用户、权限、外部工具或上游 Issue。
- `Review`：代码完成，等待验证、检查或合并。
- `Done`：已合并、验证通过、Issue 可关闭。

一个 Issue 进入 `In Progress` 后，其他 Agent 不得重复认领。

### 8. 禁止事项

- 禁止多个 Agent 共用同一个 worktree。
- 禁止直接在 `main` 写功能代码。
- 禁止按旧上下文回滚当前页面。
- 禁止无 Issue 修改代码。
- 禁止一个提交混入多个无关任务。
- 禁止为了解决冲突删除别人已完成的功能。
- 禁止在没有验证的情况下宣布完成。
- 禁止把口头约定只留在聊天里；协作规则变化必须写入文档。

---

## Phase 2 开发里程碑

| 里程碑 | 名称 | 目标 | 验收结果 |
|--------|------|------|----------|
| P2-01 | 本地工程服务骨架 | 建立前端调用本地工程能力的统一接口层 | UI 可通过 adapter 调用本地能力，失败可降级 |
| P2-02 | Git 与 worktree 只读接入 | 读取真实仓库、分支、状态、worktree 列表 | 项目管理/工作台显示真实 Git 状态 |
| P2-03 | Issue 驱动 worktree 创建 | 根据 Issue 编号创建 branch + worktree | `.worktrees/issue-xxx-*` 可创建、打开、清理 |
| P2-04 | CLI Runner 进程管理 | 启动、停止、监控 CLI agent 子进程 | 工作台可看到真实 stdout/stderr 日志流 |
| P2-05 | Workflow 执行引擎 MVP | 按流程步骤调度角色、Runner、模型和 Gate | 单个流程可从步骤 1 跑到 Gate 或结束 |
| P2-06 | 文件系统持久化 | 项目配置、记忆、Role MD、Project MD、Workflow MD 落盘 | 刷新页面后关键数据不丢失 |
| P2-07 | GitHub 同步恢复 | Issue/PR/CI 从真实 GitHub 拉取 | 项目管理中 GitHub 状态替换 fixtures |
| P2-08 | LLM/API 接入 | 模型配置真实验证，AI 助手调用真实模型 | AI 助手可基于配置模型完成一次真实回答 |
| P2-09 | 安全与审计 | 命令审计、执行确认、敏感配置保护 | 高风险命令必须人工确认，日志可追溯 |
| P2-10 | Phase 2 演示闭环 | 从 Issue 到 worktree、Runner、日志、记忆、PR 的端到端演示 | 可录制完整本地工程执行流程 |

---

## Phase 2 功能列表

### 1. 本地工程服务骨架

- 新增本地工程能力 adapter，统一封装 Git、文件系统、进程、配置读取。
- 前端组件不直接调用 shell 命令，只调用受控 adapter。
- 定义统一返回结构：`ok / data / error / diagnostics`。
- 提供 mock fallback，便于浏览器纯前端模式继续运行。
- 建立错误态 UI：权限不足、命令不存在、目录不存在、超时、退出码非 0。

### 2. Git 与 Worktree 管理

- 读取真实 `git status --short`、当前分支、remote、最近提交。
- 读取 `git worktree list --porcelain`。
- 根据 Issue 编号创建分支：`issue-<number>-<slug>`。
- 创建 worktree：`.worktrees/issue-<number>-<slug>`。
- 清理已合并 worktree，防止误删非本项目目录。
- 在项目管理和工作台显示当前 worktree、分支、dirty 状态和最近提交。

### 3. GitHub / Issue / PR 同步

- 支持 GitHub CLI 或 GitHub API token 两种路径。
- 拉取当前仓库 Issue、PR、CI 状态。
- 建立 Issue 与本地 worktree 的绑定关系。
- 提交信息和 PR 描述自动引用 Issue。
- GitHub 插件不可用时，允许用户手动输入 Issue 编号继续本地流程。

### 4. CLI Runner 进程管理

- 支持 Runner 配置：Codex CLI、Claude Code CLI、Cursor CLI、Gemini CLI、Local Shell。
- 启动进程时注入 worktree、环境变量、角色上下文和步骤上下文。
- 实时采集 stdout/stderr，写入 UI 日志流。
- 支持停止进程、失败重试、超时终止。
- 每个 AgentRun 记录开始时间、结束时间、退出码、日志位置、关联步骤。

### 5. Workflow 执行引擎

- 将流程模板中的步骤、角色、Runner、模型、能力授权转成可执行计划。
- 支持 `gateMode=auto` 自动继续。
- 支持 `gateMode=manual` 进入人工 Gate 决策。
- 上一步产物路径传递给下一步。
- 运行状态回写工作台：运行中、等待 Gate、失败、完成。
- 支持暂停、恢复、重跑单步。

### 6. 文件系统持久化

- 项目配置落盘：`.agentmanagement/project.json`。
- 角色 MD：`.agentmanagement/roles/*.md`。
- 流程 MD/JSON：`.agentmanagement/workflows/*.json` 与 `.md`。
- 记忆：`.agentmanagement/memory/*.json` 或 `.md`。
- AI 对话历史：`.agentmanagement/conversations/*.jsonl`。
- 所有写入都先备份，再覆盖，避免损坏用户文件。

### 7. 真实 AI / LLM 接入

- 设置中心支持 API Key 检测和模型列表拉取。
- AI 助手从关键词模拟升级为真实模型调用。
- AI 建项、AI 流程设计、AI 记忆提炼都走统一模型调用接口。
- 对每次 AI 调用记录模型、输入摘要、输出摘要、耗时和错误。
- 敏感信息不写入普通日志。

### 8. 记忆与知识资产落地

- 工作台、项目详情、AI 助手产生的记忆写入本地文件。
- 记忆支持来源追溯：项目、角色、任务、对话、文件、commit。
- 记忆管理页面从文件读取，而不是只读 fixtures。
- 支持提炼、确认、废弃、过期标记。
- 支持跨项目复用建议。

### 9. 安全、权限和审计

- 命令白名单：Git、npm、测试、构建、指定 Runner。
- 高风险命令必须二次确认，例如删除 worktree、push、执行任意 shell。
- 日志分级：用户可见日志、调试日志、敏感字段脱敏。
- 所有自动写文件操作都记录审计事件。
- 默认禁止跨出当前项目根目录写文件，除非用户明确授权。

### 10. 验证与质量门槛

- 每个 Phase 2 任务必须至少跑 `npm --cache .npm-cache run build`。
- 涉及 reducer/state 的任务跑 `npm --cache .npm-cache test`。
- 涉及页面交互的任务做浏览器截图或手动走查记录。
- 涉及本地命令的任务必须覆盖成功、失败、超时、命令不存在四类情况。

---

## 推荐开发顺序

1. P2-01 本地工程服务骨架
2. P2-02 Git 与 worktree 只读接入
3. P2-03 Issue 驱动 worktree 创建
4. P2-04 CLI Runner 进程管理
5. P2-06 文件系统持久化
6. P2-05 Workflow 执行引擎 MVP
7. P2-07 GitHub 同步恢复
8. P2-08 LLM/API 接入
9. P2-09 安全与审计
10. P2-10 Phase 2 演示闭环

第一批建议只开 3 个 Issue：

- `P2-01 本地工程服务骨架`
- `P2-02 真实 Git 状态读取`
- `P2-03 Issue worktree 创建流程`

---

## Phase 2 总体目标

从"前端模拟"升级为"真实工程执行"：
- 本地 CLI agent 真正启动/管理进程
- worktree 管理
- Git 真实操作
- 步骤间自动流转触发

---

## 按任务汇总

### P4-WS → Phase 2

| Phase 1（当前） | Phase 2 |
|-----------------|---------|
| 进度看板用 fixtures 数据 | 真实 Agent 运行状态驱动进度 |
| TODO 列表静态 | Agent 完成步骤后自动更新 |
| 记忆面板模拟保存 | 记忆写入 `.claude/memory/` 目录持久化 |
| 项目指令 MD 手动写 | Agent 根据项目上下文自动生成/更新 Project MD |

### P5 (MD体系) → Phase 2

| Phase 1 | Phase 2 |
|---------|---------|
| AgentRole.roleMarkdown 手动编辑 | Agent 根据角色定义自动生成 Role MD |
| WorkflowStep.stepMarkdown 手动编辑 | Agent 根据步骤输入输出自动生成 Step MD |
| 项目 MD 手动编辑 | Agent 根据 git log/代码变更自动更新项目摘要 |

### P6 (AI助手) → Phase 2

| Phase 1 | Phase 2 |
|---------|---------|
| 意图识别用关键词匹配 | 接真实 LLM API 理解意图 |
| 动作执行用本地模板模拟 | 真实生成 MD / 检查配置 / 修改工作流 |
| 对话用 mock messages | 接 `data.aiAssistantModel` 配置的模型 |
| 浮动面板无持久化 | 对话历史持久化到本地 |

### P6-7 (AI助手模型配置) → Phase 2

| Phase 1 | Phase 2 |
|---------|---------|
| 供应商下拉本地 state | API Key 真实验证 + 测试连接 |
| 模型列表 fixtures | 调用供应商 API 拉取可用模型列表 |

### P7 (Git同步协作) → Phase 2

| Phase 1 | Phase 2 |
|---------|---------|
| Issues/PR/CI fixtures 模拟 | 通过 credential token 调用 GitHub/GitLab/Gitee API 真实拉取 |
| 同步按钮本地模拟 | 真实 git fetch + API 轮询 + Webhook 接收 |
| Git 状态卡片 fixtures | 真实 `git status` / `git branch` / `git log` 命令 |
| 分支列表 + commit 历史 fixtures | 真实 git 命令输出 |

### P8 (CLI Runner选择) → Phase 2

| Phase 1 | Phase 2 |
|---------|---------|
| Runner 下拉选择 + 数据模型 | 真实 CLI 启动：根据 RunnerKind 调用对应可执行文件 |
| AgentRun 状态本地模拟 | 进程管理：启动/监控/终止 Agent 子进程 |
| 日志用 mock 数组 | 日志流：stdout/stderr 实时管道传输 |
| 环境变量配置字段 | 环境隔离：每个 Runner 独立的 env/worktree |

---

## 跨越所有任务的 Phase 2 系统级能力

### 真实 Runner 集成

| 能力 | 说明 | 涉及任务 |
|------|------|----------|
| **CLI 进程管理** | 启动/监控/终止 Claude Code、Codex CLI、Cursor CLI 子进程 | P8 |
| **日志流** | stdout/stderr 实时捕获+流式传输到 UI | P8, P4-WS |
| **worktree 管理** | `git worktree add/remove` 为每个 Agent 创建隔离工作区 | P7 |
| **命令执行** | 真实运行 install/test/build/preview 命令 | P4-WS |

### Agent 流转引擎

| 能力 | 说明 | 涉及任务 |
|------|------|----------|
| **步骤完成检测** | 监听 Agent 进程退出码/产物文件判断步骤是否完成 | P8 |
| **自动流转** | 步骤完成 → 读取 workflow 配置 → 自动启动下一个角色的 Agent | P8, P4-WS |
| **Gate 自动判断** | `gateMode=auto` 自动继续 / `gateMode=manual` 弹出决策面板 | P4-WS |
| **上下文传递** | 上一步产物路径/worktree 上下文传递给下一步 Agent | P8 |

### Git 真实集成

| 能力 | 说明 | 涉及任务 |
|------|------|----------|
| **API 同步** | GitHub/GitLab/Gitee API 拉取 Issues/PR/CI | P7 |
| **Webhook 接收** | 接收 push/PR/issue 事件自动刷新 | P7 |
| **Agent commit→push** | Agent 完成代码 → 自动 commit + push + 创建 PR | P7 |
| **分支管理** | Agent 在 worktree 中创建分支 | P7 |
| **git status/log/branch** | 真实命令输出替代 fixtures | P7 |

### 数据持久化

| 能力 | 说明 | 涉及任务 |
|------|------|----------|
| **项目记忆落盘** | Memory 写入 `.claude/memory/` 目录（JSON/MD） | P4-WS |
| **MD 文件持久化** | Role MD / Project MD / Workflow MD 写入项目目录 | P5 |
| **对话历史** | AI 助手对话历史本地持久化 | P6 |
| **配置持久化** | Settings 写入配置文件（JSON/YAML） | P6-7 |

---

## 不做（留给 Phase 3+）

| 能力 | 说明 |
|------|------|
| 多用户/团队权限 | 登录、成员、角色权限 |
| 分布式 Agent 调度 | 多机器、多 Agent 协调 |
| Electron/Tauri 桌面壳 | 复用 Web UI 封装桌面客户端 |
| 数据库 | 所有数据先文件系统持久化，不做 DB |
| 云端 API | 不写后端 server，不做 SaaS |

---

## Phase 1 → Phase 2 判定条件

| # | 条件 | 状态 |
|---|------|------|
| 1 | BUILD FIX 全通过 | ✅ |
| 2 | P4-WS 项目工作区 V2 完成 | ✅ |
| 3 | P5 MD 体系完整 | ✅ |
| 4 | P6 AI 助手功能完整 | ✅ |
| 5 | P7 Git 同步协作完成 | ✅ |
| 6 | P8 CLI Runner 选择完成 | ✅ |
| 7 | 产品流程可走通演示 | ✅ |

结论：Phase 2 可以启动。后续缺口不再作为 Phase 1 页面任务处理，而是作为 Phase 2 真实工程能力任务拆分。
