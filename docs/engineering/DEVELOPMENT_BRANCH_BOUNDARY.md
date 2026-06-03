# 开发主线与 SDK 分支边界

本文档用于防止多 Agent 协同时混淆产品主线和 SDK/Agent Service 分支。任何开发者或 AI Agent 开始任务前，必须先确认当前 Issue 属于哪条线。

## 当前结论

`#27` / `#28` / `#30` 继续属于 `main` 产品主线。

`#32` / `#33` / `#34` 属于 SDK / Agent Service 接入层探索，暂时不能替代 `main` 主线能力。

## main 产品主线

`main` 主线负责 AgentManagement 的核心产品能力：

- 管理平台
- 流程编排
- 工作台
- Runner 真实运行态
- WorkflowEvent
- 通知流转
- 任务路由

主线 Issue 包括：

- `#27`：流程节点支持多个角色任务，升级为 `WorkflowStep + WorkflowAssignment` 模型。
- `#28`：工作台接入真实 Runner / Terminal 运行态。
- `#30`：WorkflowEvent 驱动的角色任务流转、通知管理和任务路由。

这些能力是系统地基。后续 SDK/Agent Service 必须基于这些稳定模型封装，不得反向替代它们。

## SDK / Agent Service 分支

SDK / Agent Service 分支负责对外接入层：

- 外部系统 API
- SDK Client
- Agent Service 任务入口
- OpenAPI 契约
- 外部系统调用 AgentManagement 能力的协议封装

相关 Issue 包括：

- `#32`
- `#33`
- `#34`

这条线的定位是未来基于 `main` 主线能力做服务化封装。它不能在 `main` 流程/Runner/事件模型未稳定前，提前合并并替代主线实现。

## 集成时机

`#32/#33/#34` 只有在以下条件满足后，才允许开始和主线做正式集成：

1. `#27` 完成：流程模型已经统一为 `WorkflowStep + WorkflowAssignment`，生产代码不再依赖旧 `WorkflowStep.roleId`。
2. `#28` 完成：工作台可以通过 `workbenchRunApi/useCase` 启动真实 Runner，`AgentRun.processId` 能绑定 `RunnerProcess.id`，Terminal 能读取真实日志。
3. `#30` 完成：WorkflowEvent、通知状态、任务路由和工作台事件展示形成闭环。
4. 主线 build/test 通过，并且 Owner 明确批准 SDK 分支进入集成阶段。

在这些条件满足前，SDK 分支只允许保持为独立 PR 或探索分支。

## 分支规则

主线功能分支：

```text
issue-27-workflow-assignment-model
issue-28-workbench-real-runner
issue-30-workflow-event-routing
```

SDK/Agent Service 分支：

```text
feature/sdk-agent-service
issue-32-*
issue-33-*
issue-34-*
```

禁止事项：

- 不允许在 SDK 分支里验收或关闭 `#27/#28/#30`。
- 不允许用 SDK 的模拟任务运行替代工作台真实 Runner 运行态。
- 不允许在 `#32/#33/#34` PR 中顺手重写 `WorkflowStep`、`Workbench`、`RunnerProcess` 主线模型，除非 PR 明确声明为集成 PR 且 Owner 批准。
- 不允许为了兼容旧实现保留 `WorkflowStep.roleId` 作为生产模型。

## PR 必填检查

每个 PR 必须说明：

```text
影响范围：
- main 产品主线 / SDK 接入层 / 文档 / 测试 / UI

是否修改流程模型：
是否修改工作台 Runner：
是否修改 WorkflowEvent：
是否修改 SDK/API：

如果是 SDK 分支：
- 是否依赖 #27/#28/#30 的主线能力？
- 是否只是封装接口，没有替代主线模型？
```

如果 SDK PR 修改了以下文件，需要额外说明原因并等待 Owner 审核：

- `src/domain/workflow.ts`
- `src/domain/task.ts`
- `src/components/Workbench*`
- `src/components/ProjectWorkspace*`
- `src/services/local/useCases/workflowEventRouter.ts`
- Runner / AgentRun / Terminal 相关 use case 和 adapter

## 当前工程进度判断

当前项目整体处于“主线地基继续建设，SDK 分支暂缓合流”的阶段：

- 页面和交互基线已经初步定稿。
- Phase 2 底层 Adapter/Repository 基础设施已完成。
- 主线关键缺口仍在：
  - 流程模型多角色任务化未彻底完成。
  - 工作台真实 Runner 运行链路未闭环。
  - WorkflowEvent + 通知 + 任务路由未闭环。
- SDK/Agent Service 可以继续独立推进，但不能替代以上主线能力。

