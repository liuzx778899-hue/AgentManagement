# Product Roadmap And Architecture

更新时间：2026-05-15

## 当前结论

整体设计架构还在，并且已经迁移到当前项目目录。当前产品不是单纯聊天工具，也不是普通 Kanban，而是一个“AI 软件项目经理工作台”：一个人可以在本地同时管理多个项目、多个 Agent、多个 workflow、多个 worktree、多个任务 run，并能通过 manual gate 做工程决策。

当前阶段是：方向明确、核心模块明确、已有高保真参考和 V1 闭环页面，但第一版还未正式锁版。下一步要把 V1 产品闭环写成正式 spec，再进入代码实现。

## 产品分层

### 1. Personal Local MVP

第一阶段先做个人本地模式。这是 MVP。

目标：

- 一个人管理多个本地项目。
- 每个项目可以配置仓库路径、默认分支、worktree 根目录、测试/构建/预览命令。
- 用户可以创建任务，选择 workflow，分配角色，启动 Agent run。
- 系统用本地 fixtures 或本地状态先模拟 runner，不急着接真实云端调度。
- 所有高风险操作经过 manual gate。
- 每次 run 留下日志、产物、diff、测试结果、记忆建议。

第一阶段不做：

- 完整团队权限。
- 多人实时协作。
- 云端 Agent 统一调度。
- 自动 RAG 排序。
- 完整桌面客户端。

### 2. Team Model

第二阶段做团队模型。个人版的数据结构要提前预留团队字段，但不在 MVP 做复杂权限。

后续团队能力：

- Workspace / Organization。
- Team Project。
- 成员、角色、权限。
- 任务负责人、审查人、批准人。
- 共享 Role Library、Workflow Library、Capability Packs。
- 团队级 Memory。
- Audit Log 和审批流。

团队版原则：

- 不推翻个人版。
- 个人版的 Project、Task、Workflow、Role、Memory 都能升维到团队空间。
- MVP 中先预留 owner、scope、visibility、permission level 等字段。

### 3. Desktop Client

桌面版放在后续阶段，不作为第一版 MVP。

桌面版价值：

- 更自然地管理本地仓库、终端、文件系统、worktree。
- 更好地接入本地 Codex / Claude Code / 其他 CLI agent。
- 支持后台任务、通知、托盘、文件变更监听。
- 支持更稳定的本地凭据和权限管理。

桌面版时机：

- Web MVP 的核心工作流跑通后再做。
- 数据模型、任务状态机、workflow/gate 机制稳定后再封装桌面壳。
- 桌面版可以复用 Web UI，不另起一套产品逻辑。

## 总体架构

### 核心对象

- Project：本地或团队项目，包含仓库、命令、worktree、记忆和默认 workflow。
- Task：用户发起的一次工作目标，绑定 project 和 workflow。
- Workflow Template：可复用流程模板，定义步骤顺序、输入输出、gate、能力包和失败策略。
- Workflow Run：某个 task 对 workflow 的一次实际执行。
- Step Run：workflow 中单个步骤的执行实例。
- Role：产品经理、架构师、前端、后端、Review、测试、UI 等可自定义角色。
- Launcher/Profile：角色如何被启动，包括 provider、model、命令、环境变量、权限、超时。
- Agent Run：一次具体 agent 执行，产生日志、产物、状态、权限记录。
- Manual Gate：人工决策点，决定继续、重跑、改派、终止、保存记忆、进入手动终端。
- Engineering Feedback：diff、测试、预览、截图、构建、运行产物。
- Memory：项目记忆、角色记忆、任务记忆。
- Capability Pack：MCP、Skills、Plugins、浏览器、GitHub、邮件、文件等能力的授权集合。

### 页面结构

已设计或正在设计的页面：

- 主工作台：三栏结构，回答项目/任务/Agent/gate/工程反馈状态。
- 设置中心：User Settings、Project Settings、Role Library、Workflow Library、Project Workflow、Memory、Capability Packs。
- 项目接入页：导入仓库、识别技术栈、配置命令、建立项目记忆。
- 新建任务流程页：目标、验收标准、workflow、角色、能力包、worktree、启动策略。
- Workflow Builder 细页：步骤编辑、角色绑定、gate、失败策略、版本和项目覆盖。
- Manual Gate 决策页：证据面板和决策按钮。
- 记忆管理页：记忆保存、编辑、作用域、引用策略。
- 进度 Review 页：同步当前设计/实现状态。

## 路线图

### Phase 0: 设计迁移和归档

状态：已完成。

- 迁移旧线程设计和进度到当前目录。
- 归档原始会话 jsonl。
- 安装并同步 `ui-ux-pro-max` skill。
- 建立 `README.md`、`PROJECT_STATUS.md`、`MIGRATION_LOG.md`。

### Phase 1: V1 产品闭环设计

状态：进行中。

- 已有 `docs/design/mockups/archive/legacy-root-mockups/v1-product-flow.html`。
- 需要写正式 spec：`docs/generated/superpowers/specs/2026-05-15-v1-product-flow.md`。
- 需要明确 V1 主路径：接入项目 -> 新建任务 -> 选择 workflow -> 启动 Agent -> Manual Gate -> 合并/保存记忆。
- 需要确认哪些功能放入 MVP，哪些延后。

### Phase 2: Web MVP

状态：未开始。

目标是创建 Vite + React + TypeScript 本地 Web 应用。

优先实现：

- 项目 shell。
- 本地 fixtures。
- 数据模型。
- 主工作台。
- V1 产品闭环中的五个页面。
- Manual Gate 的本地交互。
- Runner Logs。
- 设置中心基础版。

暂不接真实 runner。真实 runner 通过接口和 fixtures 预留。

执行约束详见：`docs/PHASE_1_WEB_MVP_EXECUTION_CONSTRAINTS.md`。当前 Web MVP 只做前端、本地 fixtures 和本地 UI state，不做后端 API、数据库、真实 runner、多 Agent 调度、团队权限或桌面客户端。

### Phase 3: Local Runner Integration

状态：规划中。

目标：

- 连接本地 CLI agent。
- 管理 worktree。
- 流式日志。
- 运行测试/构建/预览命令。
- 产物追踪。
- 权限和风险 gate。

### Phase 4: Team Model

状态：后续。

目标：

- Workspace / Organization。
- Team Project。
- 成员和权限。
- 团队共享 workflows、roles、capabilities、memory。
- 审计和审批。

### Phase 5: Desktop Client

状态：后续。

目标：

- 将 Web UI 封装为桌面客户端。
- 深度接入本地文件系统、终端、通知和凭据。
- 更稳定地管理本地 agent 进程。

## 已讨论变更清单

### 产品定位变更

- 从普通聊天工具调整为 AI 软件项目经理工作台。
- 从简单任务看板调整为多项目、多 Agent、多 workflow 调度台。
- 明确第一版聚焦个人本地模式，团队模式后续做。
- 明确桌面客户端不作为 MVP 第一阶段。

### 信息架构变更

- Workflow 从 Project Settings 里的字段提升为独立一级资源。
- Role Library 和 Launcher/Profile 拆开。
- Project Workflow 采用模板引用 + 项目覆盖，而不是复制模板。
- Memory 拆成 Project Memory、Role Memory、Task Memory。
- Capability Pack 统一管理 MCP、Skills、Plugins 和工具授权。

### 页面范围变更

- 已有主工作台和设置中心高保真参考。
- 新增 V1 产品闭环页面，用于补齐实现前缺口。
- 明确还需要项目接入、新建任务、Workflow Builder、Manual Gate、记忆管理。
- 进度 Review 页面作为项目状态同步页保留。

### Manual Gate 变更

- Gate 不只是确认按钮，而是工程决策页。
- Gate 要展示 diff、测试、截图、日志、权限使用、风险提示、记忆建议。
- Gate 动作包括继续、重跑、改派、终止、保存记忆、进入手动终端。

### 实现策略变更

- 不立即写完整 React MVP。
- 先写 V1 产品闭环 spec，再更新实施计划。
- Web MVP 先用 typed fixtures 和本地 UI 状态。
- 真实 runner、云端调度、团队权限、桌面客户端延后。

### Codex 集成边界

- 不假设 ChatGPT 订阅额度可以被第三方 API 直接消耗。
- 第一版可把 Codex 作为本地可启动 Agent 入口或弱集成入口。
- 工作台负责项目、任务、worktree、日志、gate、记忆，不冒充模型计费层。

## 当前需要确认的问题

1. V1 是否只做个人本地 Web MVP，不做团队和桌面？
2. V1 是否必须覆盖项目接入、新建任务、Workflow Builder、Manual Gate、记忆管理五页？
3. 真实 runner 是否放到 Web MVP 之后，通过接口预留？
4. 桌面版是否在 Web MVP 跑通后，以复用 Web UI 的方式推进？

当前建议答案：

- 是，V1 只做个人本地 Web MVP。
- 是，五页是 V1 闭环的必要页面。
- 是，真实 runner 后置。
- 是，桌面版复用 Web UI，后续封装。
