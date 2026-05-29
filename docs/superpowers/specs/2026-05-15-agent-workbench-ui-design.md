# AI 软件项目经理工作台 UI/UX 设计

日期：2026-05-15  
范围：主工作台、设置中心、高保真效果图  
主展示页：[mockups/agent-workbench-review-page.html](../../../mockups/agent-workbench-review-page.html)
完整高保真参考：[mockups/agent-workbench-ui.html](../../../mockups/agent-workbench-ui.html)
静态预览：[mockups/agent-workbench-ui-preview.svg](../../../mockups/agent-workbench-ui-preview.svg)

## 目标

这个界面服务的是一个人同时管理多个项目、多个 Agent、多个 workflow 的本地工作台。它不是普通聊天工具，也不是简单 Kanban，而是“AI 软件项目经理工作台”：从需求、架构、前后端实现、Review、测试、UI 验证到合并发布，都要能被一个人稳定地调度和检查。

第一版以个人本地模式为主，预留团队模式。产品不直接复制 Nimbalyst 或 Vibe Kanban，而是吸收它们的工作台形态，重做信息架构、Agent Profile、workflow gate、工程反馈和记忆层。

## 设计系统

产品类型：专业生产力 / 开发者工作台 / 多 Agent 调度台。

视觉方向：深色优先、高密度、工程感、信息层级清晰。避免营销式大卡片和装饰性视觉，优先让用户快速扫描任务状态、运行日志、diff、测试和 gate。

色彩策略：

- 背景使用接近黑灰的中性面，降低长时间使用疲劳。
- 主色使用蓝色表达可执行动作、当前状态和选中态。
- 绿色表达通过、可用、启用。
- 琥珀色表达等待人工确认或风险提示。
- 紫色仅用于区分 Agent / Provider 类型，不作为主背景。
- 所有状态都同时使用文字标签，不只依赖颜色。

排版策略：

- 系统字体优先，保证中文和英文混排稳定。
- 13-15px 用于密集操作界面，关键指标使用 22px。
- 日志、分支、文件路径、时间戳使用等宽字体。
- 卡片半径控制在 6-8px，保持专业工具感。

交互规则：

- 所有主要按钮至少 36px 高，移动端和触控场景需要扩展到 44px。
- 图标按钮必须有 `aria-label`，不能只靠视觉符号。
- 主工作台中的危险或不可逆操作必须经过 manual gate。
- 设置中心采用渐进披露：普通用户看到 Provider/Profile/模型选择，高级 Launcher 才显示命令、脚本、环境变量。
- 每个 Agent Run 都要有可追踪的日志、产物、状态、耗时和权限使用记录。

## 主工作台

主工作台采用三层结构：

1. 左侧全局导航：项目、任务队列、记忆库、设置中心，以及项目列表和 Agent 占用状态。
2. 中间任务执行区：当前任务、workflow 步骤、Agent Run 时间线、会话摘要、manual gate 操作。
3. 右侧工程反馈区：diff、测试结果、页面预览、运行产物、记忆建议、权限记录、commit/merge 操作。

顶部保留全局搜索、新建任务、打开终端和导入仓库。搜索覆盖项目、任务、Agent、日志和记忆，后续可以接入向量检索/RAG。

主工作台第一屏必须回答四个问题：

- 现在有哪些项目和任务在跑？
- 哪个 Agent 正在做什么？
- 哪些步骤需要我确认？
- 当前改了什么、测了什么、能不能合并？

## 设置中心

设置中心分成 User 设置、Project 设置、Role Library、Workflow Library 和 Capability Packs。Workflow 不应该只是项目设置里的一个字段，而应该是独立一级模块：用户先在 Workflow Library 里定义任意流程模板，项目再选择某个模板作为默认流程，也可以对个别步骤做项目级覆盖。

User 设置包括：

- 全局偏好：语言、默认模式、worktree 根目录、高风险 gate 策略。
- Provider / Model：DeepSeek、Tencent、Claude Code、Codex 等来源。
- Agent Profiles：产品经理、架构师、后端、前端、Review、测试、UI。
- Workflow Templates：需求到部署的步骤模板，每步绑定 Agent、模型和 gate 模式。
- Capability Packs：MCP、Skills、Plugins 的全局安装和授权策略。
- Workspace Memory：跨项目可复用的个人偏好和经验。

Project 设置包括：

- 仓库路径、默认分支、worktree 根目录。
- 测试、构建、预览命令。
- Provider 和 Agent Profile 覆盖。
- 项目可用 MCP / Skill / Plugin。
- Project Memory：项目结构、技术约定、命名习惯、常见坑。
- Workflow Override：该项目独有流程。

## Agent Profile

Agent Profile 更准确地说应该拆成 Role Library + Launcher/Profile 配置。角色可以任意定制，不限于系统内置角色。普通模式只暴露角色、Provider、模型、权限和能力包；高级模式才展示 Launcher 命令、环境变量、启动目录和超时策略。

建议第一版内置这些角色：

- 产品经理：需求澄清、验收标准、任务拆分。
- 架构师：系统设计、数据模型、接口边界。
- 后端：服务端实现、数据库、API。
- 前端：UI 实现、交互、浏览器验证。
- Review：代码审查、风险提示、测试建议。
- 测试：运行测试、解释失败、生成验证报告。
- UI：视觉质量、截图检查、响应式问题。

这些只是默认角色。用户可以新增、删除、复制和重命名角色，例如“数据库专家”“部署 Agent”“文档 Agent”“安全审查 Agent”。Workflow 步骤绑定的是角色，而不是固定代码里的枚举。角色再决定用哪个 Provider、模型、权限和能力包。

Codex 集成策略：如果用户只有 ChatGPT 订阅里的 Codex 能力，工作台不应假装可以通过 API 消耗订阅额度。第一版可以把 Codex 作为本地可启动 Agent 入口或弱集成入口，由工作台管理任务、worktree、日志和人工 gate。

## Workflow

Workflow 必须作为独立资源管理，不能写死，也不能只藏在项目设置里。推荐信息结构是：

- Role Library：定义可被步骤绑定的角色。
- Workflow Library：定义可复用流程模板。
- Project Workflow：项目选择一个默认 workflow 模板。
- Step Override：项目可以覆盖模板里某些步骤的角色、gate 或能力包。

默认模板可以是：

需求澄清 -> 架构设计 -> 后端实现 -> 前端实现 -> Review -> 测试 -> UI 验证 -> 合并发布。

每个步骤至少包含：

- 步骤名称。
- 绑定角色。
- 输入来源。
- 输出要求。
- 是否自动继续。
- manual gate 条件。
- 可用能力包。
- 失败重试策略。

项目和 workflow 的关系是引用关系，不是复制关系。项目选择设定好的 workflow 后，新任务默认按这个 workflow 创建；如果模板后续升级，项目可以选择跟随模板更新，也可以锁定在某个模板版本。这样既能复用流程，又不会因为改一个全局模板影响正在跑的项目。

manual gate 是核心体验。用户在 gate 上应能选择继续、重跑、改派、终止、保存记忆或进入手动终端。

## 记忆与能力复用

记忆层分三层：

- 项目记忆：项目结构、技术栈、测试命令、部署方式、约定。
- 角色记忆：不同 Agent 的偏好、风格和常见修正。
- 任务记忆：本次任务结论、决策、失败原因和可复用经验。

MCP / Skill / Plugin 作为 Capability Pack 管理。它们应支持用户级安装、项目级启用、Agent 级授权。高风险能力需要在运行前显示风险说明和使用记录。

RAG / 向量检索放入后续路线图，但第一版的数据模型要预留 memory source、embedding status、retrieval scope。

## 响应式

桌面端优先展示三栏工作台。中等宽度下收缩左侧导航，工作台改为单列堆叠。移动端不是主要生产环境，但必须保证无横向滚动、主要内容可读、按钮可点。

## 第一版交付范围

第一版 UI 应包含：

- 工作台 shell。
- 项目列表和任务队列。
- 当前任务执行区。
- workflow 步骤条。
- Agent Run 时间线。
- manual gate 操作条。
- 工程反馈面板。
- 设置中心。
- Agent Profile 配置。
- Workflow Template 配置。
- Capability Pack 展示。
- Runner Logs 区域。

不进入第一版实现的内容：

- 完整团队权限系统。
- 远程多用户实时协同。
- 自动 RAG 检索排序。
- 真正的云端 Agent 统一调度。

## 自检

- 没有未解决的 TBD/TODO。
- 主工作台、设置中心、Agent Profile、Workflow、记忆层之间没有范围冲突。
- 第一版聚焦个人本地模式，团队模式和 RAG 均作为后续扩展。
- Codex 订阅额度能力边界已明确，不把 ChatGPT 订阅误写成可被第三方 API 直接消耗。
