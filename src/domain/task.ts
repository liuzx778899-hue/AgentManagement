/**
 * Task Priority - 动态优先级
 *
 * 优先级按流程节点动态生成：
 * - 第 1 个流程节点下所有任务为 P0
 * - 第 2 个流程节点下所有任务为 P1
 * - 第 N 个流程节点下所有任务为 P{N-1}
 */
export type TaskPriority = 'P0' | 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7' | 'P8' | 'P9';

/**
 * Task - 项目实例中的真实执行任务
 *
 * Task 从 WorkflowAssignment 生成，记录完整的执行上下文。
 *
 * 重要变更（Issue #27）：
 * - 新增：workflowStepId, assignmentId 关联到流程设计
 * - 新增：dependsOnTaskIds, notifyTaskIds 支持任务间依赖
 * - 新增：priority 动态优先级
 * - 新增：runnerId, modelProviderId, modelName 从 assignment 继承
 */
export interface Task {
  /** 任务唯一标识 */
  id: string;
  /** 所属项目 */
  projectId: string;
  /** 任务目标 */
  goal: string;
  /** 验收标准 */
  acceptanceCriteria: string[];
  /** 关联的流程模板 */
  workflowTemplateId: string;
  /** 关联的流程步骤 ID（新字段） */
  workflowStepId?: string;
  /** 关联的 Assignment ID（新字段） */
  assignmentId?: string;
  /** 执行角色（新字段） */
  roleId?: string;
  /** Runner 配置（新字段） */
  runnerId?: string;
  /** 模型供应商（新字段） */
  modelProviderId?: string;
  /** 模型名称（新字段） */
  modelName?: string;
  /** 动态优先级（新字段） */
  priority?: TaskPriority;
  /** 依赖的任务 ID 列表（新字段） */
  dependsOnTaskIds?: string[];
  /** 完成后通知的任务 ID 列表（新字段） */
  notifyTaskIds?: string[];
  /** 角色分配（向后兼容） */
  roleAssignment: Record<string, string>;
  /** 授权的能力 */
  capabilityAuthorization: string[];
  /** 启动策略 */
  launchStrategy: "worktree" | "direct";
  /** 任务状态 */
  status: "draft" | "queued" | "running" | "gate" | "done" | "failed";
  /** 当前活跃的运行 ID */
  activeRunId: string | null;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

export interface AgentRun {
  id: string;
  taskId: string;
  roleId: string;
  modelProviderId: string;
  modelName: string;
  currentStepId: string;
  status: "starting" | "running" | "waiting_gate" | "done" | "failed";
  log: string[];
  startedAt: string;
  finishedAt: string | null;
}