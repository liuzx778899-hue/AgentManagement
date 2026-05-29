# Phase 1 Web MVP Execution Constraints

更新时间：2026-05-15  
适用对象：负责编码实现的工具或工程师  
当前目录：`D:\work\vibecode\Agent Management`

## 一句话原则

Phase 1 只实现个人本地 Web MVP。不要实现后端，不要实现真实 runner，不要实现多 Agent 调度，不要实现团队权限，不要实现桌面客户端。

Phase 1 的目标是验证产品流程、页面结构、信息架构和交互闭环是否成立。

## 必须严格遵守

- 只做前端 Web 应用。
- 使用 Vite + React + TypeScript。
- 使用 typed fixtures。
- 使用本地 UI state。
- 所有数据先在前端模拟。
- 不接真实数据库。
- 不写 API server。
- 不写 Node/Express/Koa/Fastify 后端。
- 不实现真实命令执行。
- 不实现真实 worktree 创建。
- 不实现真实 agent 进程管理。
- 不实现多 Agent 调度器。
- 不实现登录、成员、团队权限。
- 不实现 Electron/Tauri/桌面壳。
- 不实现 RAG、向量库、embedding 计算。

## 可以预留，但不能实现

这些概念可以出现在类型和 fixtures 中，但 Phase 1 只能作为字段或静态状态存在：

- `runnerKind`
- `desktopIntegrationStatus`
- `scope`
- `workspaceId`
- `ownerId`
- `permissionLevel`
- `visibility`
- `embeddingStatus`
- `retrievalScope`
- `agentRun.status`
- `manualGate.status`

示例：可以写 `desktopIntegrationStatus: "deferred"`，不能做桌面集成。

## Phase 1 必须实现的页面

编码工具应按 MVP plan 的 Task 4 实现这些页面：

- `src/components/WorkbenchHome.tsx`
- `src/components/ProjectOnboarding.tsx`
- `src/components/NewTaskFlow.tsx`
- `src/components/WorkflowBuilder.tsx`
- `src/components/ManualGateDecision.tsx`
- `src/components/MemoryManager.tsx`
- `src/components/RunnerLogs.tsx`

这些页面必须对齐：

- `docs/superpowers/specs/2026-05-15-v1-product-flow.md`
- `mockups/v1-product-flow.html`
- `docs/PRODUCT_ROADMAP_AND_ARCHITECTURE.md`

## 页面验收标准

### WorkbenchHome

- 展示当前项目、当前任务、运行中的 Agent、等待中的 Gate。
- 展示 Workflow 步骤状态。
- 展示工程反馈摘要：diff、测试、预览、日志、记忆建议。

### ProjectOnboarding

- 展示仓库路径、默认分支、worktree 根目录。
- 展示 install/test/build/preview 命令。
- 展示 detected stack。
- 展示风险提示和项目记忆草稿。
- 保存只更新本地状态。

### NewTaskFlow

- 展示项目选择、目标、验收标准。
- 展示 Workflow 选择。
- 展示 Role 分配。
- 展示 Capability Pack 授权。
- 展示启动策略。
- 创建任务只更新本地状态。

### WorkflowBuilder

- 展示 Workflow 模板列表。
- 展示步骤列表。
- 展示当前步骤配置：Role、输入、输出、gate、失败策略。
- 展示版本和项目覆盖。
- 不要求真实拖拽。

### ManualGateDecision

- 必须展示证据，而不是只有按钮。
- 证据包括 diff、测试、预览/截图、日志、权限使用、风险、记忆建议。
- 按钮包括继续、重跑、改派、终止、保存记忆。
- 决策只更新本地状态。

### MemoryManager

- 展示 Project Memory、Role Memory、Task Memory。
- 支持选择一条记忆并编辑 title/body/scope。
- 展示来源、作用域、启用状态。
- 不做真实向量检索。

### RunnerLogs

- 展示 runner logs。
- 使用等宽字体。
- 支持滚动。
- 不接真实 log stream。

## 数据要求

继续使用：

- `src/domain/workbench.ts`
- `src/data/fixtures.ts`

可以扩展类型，但不要引入后端依赖。

所有页面都应从 fixtures 或 App 级本地状态读取数据。

## UI 要求

- 深色优先。
- 高密度、工程感、信息层级清楚。
- 不做营销式 landing page。
- 卡片半径控制在 8px 以内。
- 状态不能只靠颜色表达，必须有文字。
- icon-only button 必须有 `aria-label`。
- 桌面主按钮至少 36px 高。
- 移动端堆叠按钮至少 44px 高。
- 不允许横向滚动。
- 不允许文字重叠。

## 测试要求

编码工具必须保持这些命令通过：

```powershell
npm --cache .npm-cache test
npm --cache .npm-cache run build
```

至少补充以下测试：

- 新建任务流程能显示项目、目标、Workflow、Role 和启动按钮。
- Manual Gate 点击继续后显示已确认继续。
- Memory Manager 编辑记忆标题后 input value 更新。

## 禁止事项

不要新增这些内容：

- `server/`
- `api/`
- `backend/`
- `prisma/`
- `typeorm/`
- `drizzle/`
- `express`
- `koa`
- `fastify`
- `electron`
- `tauri`
- Docker 配置
- 数据库配置
- 真实 shell 命令执行器
- 真实 agent orchestration service

如果确实觉得需要其中任何一项，先停止实现，回到方案审查。

## 交付后给审查线程的材料

编码完成后，请提供：

- 本地预览地址。
- 变更摘要。
- 已实现页面清单。
- 测试输出。
- 构建输出。
- 已知问题。
- 与 `mockups/v1-product-flow.html` 不一致的地方。

## 下一阶段说明

Phase 2 才考虑 Local Runner / Backend Layer：

- 本地任务状态机。
- worktree 管理。
- CLI agent 启动。
- 命令执行。
- 日志流。
- 权限 gate。
- 文件系统访问。

Phase 3 以后再考虑团队模型和桌面客户端。
