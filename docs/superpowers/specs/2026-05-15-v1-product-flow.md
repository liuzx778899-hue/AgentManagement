# Agent Workbench V1 Product Flow

日期：2026-05-15  
状态：V1 scope lock  
可视化参考：`mockups/v1-product-flow.html`  
上层路线图：`docs/PRODUCT_ROADMAP_AND_ARCHITECTURE.md`

## 目标

第一版要先做个人本地 Web MVP。它服务一个人管理多个本地软件项目，并通过 Agent、Workflow、worktree、manual gate、工程反馈和记忆沉淀完成软件任务。

V1 不追求完整团队协作、桌面客户端、真实云端 Agent 调度或自动 RAG 排序。V1 要把一条主路径跑通：

接入项目 -> 新建任务 -> 选择 Workflow -> 启动 Agent Run -> Manual Gate 决策 -> 合并或保存记忆。

## 产品边界

### V1 必须包含

- 项目接入页。
- 新建任务流程页。
- Workflow Builder 细页。
- Manual Gate 决策页。
- 记忆管理页。
- 主工作台 shell。
- 设置中心基础版。
- Runner Logs。
- 本地 typed fixtures。
- 本地 UI 状态。

### V1 明确不做

- 完整团队权限系统。
- 多人实时协同。
- 云端 Agent 统一调度。
- 桌面客户端。
- 自动 RAG 检索排序。
- 真实 runner 进程生命周期管理。

V1 的数据模型要为团队、桌面和真实 runner 预留字段，但界面和交互不实现这些后续能力。

## 页面 1：项目接入页

### 用户目标

用户把一个本地仓库接入 Agent Workbench，让系统知道仓库在哪里、如何安装依赖、如何测试、如何构建、如何预览，以及哪些项目约定要写入项目记忆。

### 页面输入

- 仓库路径。
- 默认分支。
- worktree 根目录。
- 安装命令。
- 测试命令。
- 构建命令。
- 预览命令。
- 默认 Workflow。
- 高风险 gate 策略。

### 页面输出

- Project 记录。
- Project Settings。
- Project Memory 草稿。
- 默认 Workflow 引用。
- 命令配置。
- 接入完成状态。

### 关键交互

- 用户选择或输入仓库路径。
- 系统展示技术栈检测结果。
- 用户确认安装、测试、构建、预览命令。
- 用户确认 worktree 根目录。
- 用户保存项目配置。
- 如果命令未验证，首次启动任务前显示 manual gate。

### V1 验收

- 页面能展示一个项目接入表单。
- 页面能展示检测结果和风险提示。
- 页面能展示项目记忆草稿。
- 保存动作只更新本地 UI 状态，不需要写真实配置文件。

## 页面 2：新建任务流程页

### 用户目标

用户把一个自然语言目标转成可执行任务，并确认项目、Workflow、Role、能力包、worktree 和启动策略。

### 页面输入

- 项目。
- 任务目标。
- 验收标准。
- Workflow 模板。
- Role 分配。
- Capability Pack 授权。
- 是否创建 worktree。
- 是否自动推进到下一个步骤。

### 页面输出

- Task。
- Workflow Run。
- 初始 Step Run。
- 预设 Agent Run 队列。
- Manual Gate 策略。

### 关键交互

- 用户输入目标和验收标准。
- 用户选择项目和 Workflow。
- 系统展示默认 Role 分配。
- 用户确认能力包授权。
- 用户创建任务。
- 系统进入当前任务执行区。

### V1 验收

- 页面能分步展示任务定义、Workflow、Role、启动策略。
- 用户能看到任务启动前的风险和权限。
- 创建任务后可以在本地状态中显示为当前任务。

## 页面 3：Workflow Builder 细页

### 用户目标

用户维护可复用的 Workflow 模板，并能看到项目如何覆盖模板步骤。

### 页面输入

- Workflow 名称。
- 模板版本。
- 步骤列表。
- 步骤名称。
- 绑定 Role。
- 输入来源。
- 输出要求。
- auto/manual gate。
- 失败重试策略。
- 可用 Capability Pack。

### 页面输出

- Workflow Template。
- Step 定义。
- 模板版本。
- Project Workflow Override。

### 关键交互

- 用户选择模板。
- 用户选择步骤。
- 用户编辑步骤配置。
- 用户看到项目覆盖差异。
- 用户发布新模板版本。
- 项目可选择跟随新版本或锁定旧版本。

### V1 验收

- 页面能展示模板列表。
- 页面能展示步骤编排。
- 页面能编辑当前步骤的 Role、gate、输入和输出。
- 页面能展示模板版本和项目覆盖提示。
- V1 不要求真实拖拽，先用按钮或静态顺序表达。

## 页面 4：Manual Gate 决策页

### 用户目标

用户基于工程证据决定一个步骤是否继续、重跑、改派、终止、保存记忆或进入手动终端。

### 页面输入

- 当前 Task。
- 当前 Step Run。
- 当前 Agent Run。
- diff 摘要。
- 测试结果。
- 构建结果。
- 页面预览或截图。
- 日志摘要。
- 权限使用记录。
- 风险提示。
- 记忆建议。

### 页面输出

- Gate Decision。
- 下一步状态。
- 记忆保存请求。
- 改派请求。
- 重跑请求。
- 终止原因。

### 关键交互

- 用户查看证据面板。
- 用户选择继续。
- 用户选择重跑当前步骤。
- 用户选择改派到其他 Role。
- 用户选择终止任务并填写原因。
- 用户保存一条记忆。
- 用户进入手动终端。

### V1 验收

- 页面必须展示证据，而不是只有确认按钮。
- 决策按钮包括继续、重跑、改派、终止、保存记忆。
- 决策结果写入本地 UI 状态。
- 高风险操作按钮有明显风险样式。

## 页面 5：记忆管理页

### 用户目标

用户审查、编辑、启用或禁用项目记忆、角色记忆和任务记忆，决定哪些内容会进入后续 Agent context。

### 页面输入

- 记忆标题。
- 记忆正文。
- 记忆来源。
- 记忆类型。
- 作用域。
- 启用状态。
- 风险等级。

### 页面输出

- Project Memory。
- Role Memory。
- Task Memory。
- 记忆引用策略。

### 关键交互

- 用户查看不同类型的记忆。
- 用户编辑记忆内容。
- 用户切换作用域。
- 用户启用或禁用记忆。
- 用户将任务记忆提升为项目记忆。
- 高风险记忆修改进入 manual gate。

### V1 验收

- 页面展示三类记忆。
- 页面支持编辑当前选中的记忆。
- 页面展示引用策略。
- V1 不做向量检索，只保留 embedding status 和 retrieval scope 字段。

## 数据模型要求

V1 数据模型至少包含：

- `Project`
- `ProjectSettings`
- `Task`
- `WorkflowTemplate`
- `WorkflowStep`
- `WorkflowRun`
- `StepRun`
- `Role`
- `LauncherProfile`
- `AgentRun`
- `ManualGate`
- `GateDecision`
- `EngineeringFeedback`
- `MemoryItem`
- `CapabilityPack`

团队和桌面后续字段需要预留：

- `ownerId`
- `workspaceId`
- `scope`
- `visibility`
- `permissionLevel`
- `runnerKind`
- `desktopIntegrationStatus`

V1 可以用 fixtures 填充这些字段，不需要真实后端。

## 页面导航

Web MVP 的第一版导航建议：

- Workbench：主工作台。
- Projects：项目接入和项目配置。
- New Task：新建任务流程。
- Workflows：Workflow Builder。
- Gates：Manual Gate 队列和决策页。
- Memory：记忆管理。
- Settings：Role、Launcher、Capability、Provider 设置。
- Logs：Runner Logs。

## 实现约束

- 使用 Vite + React + TypeScript。
- 使用本地 fixtures 和本地 UI state。
- 先不接真实 runner。
- 先不接真实数据库。
- 所有 icon-only button 必须有 `aria-label`。
- 所有主要按钮桌面至少 36px 高，移动端堆叠场景至少 44px。
- 页面不能横向溢出。
- 状态不能只靠颜色表达，必须有文字标签。

## 成功标准

- `mockups/v1-product-flow.html` 中的五页都能在 React MVP 中找到对应页面或视图。
- 用户能从接入项目一路走到保存记忆。
- Manual Gate 页面能让用户基于证据决策。
- Workflow 是独立资源，项目只是引用和覆盖。
- Role 和 Launcher/Profile 的边界清晰。
- 团队模型和桌面客户端被明确后置，但数据模型保留升级空间。

## 后续步骤

1. 更新 MVP 实施计划，使任务顺序从 V1 flow 开始。
2. 创建 Vite + React + TypeScript 脚手架。
3. 建立 domain types 和 fixtures。
4. 实现 App Shell 和 V1 五页。
5. 加入测试、构建和浏览器验证。
