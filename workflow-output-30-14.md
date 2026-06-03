# eventRoutes 目标查找报告

## 执行摘要

`eventRoutes` 是工作流模板中 Assignment（任务分配）对象的字段，当前**未实现**。所有工作流模板中该字段均为空数组 `[]`。

---

## 1. eventRoutes 定义位置

### 数据来源

在 `.agentmanagement/workflows/refactor-v1.json` 工作流模板中发现：

```json
{
  "id": "rf-step-001-assignment-0",
  "order": 0,
  "roleId": "role-004",
  "runnerId": "runner-claude-code",
  "modelProviderId": "provider-deepseek",
  "modelName": "deepseek-v4-pro",
  "taskGoal": "重构分析",
  "acceptanceCriteria": ["重构建议明确"],
  "inputs": ["代码库"],
  "outputs": ["重构建议"],
  "dependsOnAssignmentIds": [],
  "notifyAssignmentIds": ["rf-step-002-assignment-0"],
  "eventRoutes": [],   // <-- 此处
  "capabilityAuthorization": ["github", "local-shell"]
}
```

### 字段上下文

`eventRoutes` 与以下字段同属 Assignment 结构：
- `dependsOnAssignmentIds`: 依赖的其他 assignment ID
- `notifyAssignmentIds`: 完成后通知的 assignment ID
- `eventRoutes`: **事件路由规则（未实现）**

---

## 2. 相关设计文档

### workflowEvent.ts 领域模型

`src/domain/workflowEvent.ts` 定义了完整的工作流事件类型：

**事件类型 (WorkflowEventType):**
- Run-level: `RUN_CREATED`, `RUN_STARTED`, `RUN_PAUSED`, `RUN_RESUMED`, `RUN_COMPLETED`, `RUN_FAILED`, `RUN_CANCELLED`
- Step-level: `STEP_STARTED`, `STEP_COMPLETED`, `STEP_FAILED`, `STEP_SKIPPED`
- Gate-level: `GATE_OPENED`, `GATE_APPROVED`, `GATE_REJECTED`
- Runner-level: `RUNNER_STARTED`, `RUNNER_STOPPED`, `RUNNER_LOG`
- Artifact: `ARTIFACT_PRODUCED`
- Error: `RUN_ERROR`

**预留接口 (WorkflowEventEmitter):**
```typescript
interface WorkflowEventEmitter {
  emit(event: WorkflowEvent): void;
  subscribe(handler: WorkflowEventHandler): () => void;
  on(type: WorkflowEventType, handler: WorkflowEventHandler): () => void;
  onRun(runId: string, handler: WorkflowEventHandler): () => void;
  clear(): void;
}
```

**注释说明 (第 14-18 行):**
> Future integration points (reserved, not yet wired):
> - SSE route: /api/workflow/events?runId=xxx (stream WorkflowEvent via EventSource)
> - Reducer: DISPATCH_WORKFLOW_EVENT action processes events into state updates
> - IM notifications: ImRouteRule.eventType maps to WorkflowEventType
> - Audit log: persist events for workflow run history

---

## 3. 当前实现状态

| 组件 | 状态 | 说明 |
|------|------|------|
| `WorkflowEvent` 类型 | ✅ 已定义 | `src/domain/workflowEvent.ts` |
| `WorkflowEventEmitter` 接口 | ✅ 已定义 | 接口已预留，未实现 |
| `eventRoutes` 字段使用 | ❌ 未使用 | 模板中为空数组 |
| SSE 路由 `/api/workflow/events` | ❌ 未实现 | 注释中预留 |
| 事件发布/订阅机制 | ❌ 未实现 | 接口未连接 |
| IM 通知映射 | ❌ 未实现 | 注释中预留 |

---

## 4. eventRoutes 设计目标（推断）

根据 Assignment 上下文和相关设计文档，`eventRoutes` 的目标应该是：

### 预期功能

1. **事件路由配置**：定义当 Assignment 产生特定事件时，事件应该被路由到哪里
2. **通知触发**：映射 `WorkflowEventType` 到 IM 通知渠道
3. **状态同步**：触发前端状态更新或 SSE 推送
4. **审计日志**：记录事件到运行历史

### 可能的数据结构（推测）

```typescript
interface EventRoute {
  eventType: WorkflowEventType | '*';
  target: 'im' | 'sse' | 'audit' | 'webhook';
  config?: {
    imAdapterId?: string;
    webhookUrl?: string;
  };
}
```

---

## 5. 相关进行中的工作

根据任务列表，以下任务与 eventRoutes 相关：

| Task ID | 任务 | 关联性 |
|---------|------|--------|
| #84 | Extend WorkflowEvent model with task, bug, and change events | 扩展事件类型 |
| #85 | Implement WorkflowEventEmitter concrete class | 实现事件发射器 |
| #86 | Create workflowEventRouter use case that maps events to side effects | **直接相关** - 事件路由用例 |
| #87 | Wire workflowExecutionUseCase to emit events via emitter | 连接事件发射 |
| #88 | Wire workbenchRunUseCase to emit runner/process events | Runner 事件发射 |
| #89 | Add SSE route for streaming workflow events to frontend | SSE 路由实现 |

---

## 6. 推荐实现路径

1. **定义 EventRoute 接口**（在 `domain/workflowEvent.ts` 或新建 `domain/eventRoute.ts`）
2. **实现 WorkflowEventEmitter**（Task #85）
3. **实现 workflowEventRouter useCase**（Task #86）- 这是 eventRoutes 字段的核心消费方
4. **在 Assignment 处理逻辑中读取 eventRoutes 配置**
5. **添加 SSE 路由 `/api/workflow/events`**（Task #89）
6. **连接 IM 通知适配器**

---

## 7. 文件清单

### 已检查文件

| 文件路径 | 用途 |
|----------|------|
| `D:\work\vibecode\AgentDevelop\.agentmanagement\workflows\refactor-v1.json` | 工作流模板，包含 eventRoutes 字段 |
| `D:\work\vibecode\AgentDevelop\src\domain\workflowEvent.ts` | 事件领域模型定义 |
| `D:\work\vibecode\AgentDevelop\src\domain\workflow.ts` | WorkflowStep 接口（不含 eventRoutes） |
| `D:\work\vibecode\AgentDevelop\src\domain\workbench.ts` | 重导出 WorkflowEvent 类型 |
| `D:\work\vibecode\AgentDevelop\src\server\routes\index.ts` | 路由注册（无事件路由） |
| `D:\work\vibecode\AgentDevelop\src\server\routes\workbenchRuns.ts` | Workbench 运行 API |
| `D:\work\vibecode\AgentDevelop\docs\design\DESIGN_OVERVIEW.md` | 设计总览文档 |

---

## 8. 结论

**eventRoutes 是预留字段，目标是为 Assignment 配置事件路由规则，使工作流执行过程中产生的事件能够被路由到 IM 通知、SSE 推送、审计日志等目标。当前未实现，需要配合 Task #85-#89 系列任务一起完成。**
