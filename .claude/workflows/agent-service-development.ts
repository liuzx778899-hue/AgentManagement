/**
 * Workflow: Agent Service Development
 *
 * 开发 #32 #33 #34 三个 Issue 的工作流
 */

export const meta = {
  name: 'agent-service-development',
  description: '开发 AgentManagement SDK + Agent Service 核心功能',
  phases: [
    { title: 'Domain Protocol', detail: '定义领域协议类型' },
    { title: 'Agent Service MVP', detail: '构建任务运行时服务' },
    { title: 'External SDK', detail: '建立外部 SDK 接入' },
  ],
};

// Phase 1: Domain Protocol (Issue #32) - 已完成
// - 创建 domain/*.ts 类型定义
// - Agent, Role, Task, Runner, WorkflowEvent, Notification, Memory, Artifact, Audit

// Phase 2: Agent Service MVP (Issue #33)
// - Agent Registry
// - Task Service
// - Task Queue
// - Mock Runner Adapter
// - Runner Session Service
// - Event Log Service
// - Audit Log Service
// - REST API Routes

// Phase 3: External SDK (Issue #34)
// - OpenAPI 3.1 规范
// - TypeScript SDK Client
// - Webhook 支持
// - Request ID / Idempotency Key 支持
