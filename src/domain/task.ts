export interface Task {
  id: string;
  projectId: string;
  goal: string;
  acceptanceCriteria: string[];
  workflowTemplateId: string;
  /** 所属流程步骤 ID - Issue #41 */
  workflowStepId?: string;
  /** 所属 Assignment ID - Issue #41 */
  assignmentId?: string;
  /** 动态优先级（按 step order 计算） - Issue #41 */
  priority?: number;
  /** 依赖的任务 ID 列表 - Issue #41 */
  dependsOnTaskIds?: string[];
  /** 需要通知的任务 ID 列表 - Issue #41 */
  notifyTaskIds?: string[];
  roleAssignment: Record<string, string>;
  capabilityAuthorization: string[];
  launchStrategy: "worktree" | "direct";
  status: "draft" | "queued" | "running" | "gate" | "done" | "failed";
  activeRunId: string | null;
  phase?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentRun {
  id: string;
  /** 项目 ID - Issue #28 */
  projectId: string;
  taskId: string;
  /** 流程模板 ID - Issue #28 */
  workflowTemplateId: string;
  /** 所属流程步骤 ID - Issue #41 */
  workflowStepId?: string;
  /** 所属 Assignment ID - Issue #41 */
  assignmentId?: string;
  roleId: string;
  modelProviderId: string;
  modelName: string;
  /** Runner ID - Issue #41 */
  runnerId?: string;
  /** 进程 ID（绑定真实进程）- Issue #41 */
  processId?: string;
  currentStepId: string;
  status: "starting" | "running" | "waiting_gate" | "done" | "failed" | "stale";
  log: string[];
  startedAt: string;
  finishedAt: string | null;
  /** 退出码 - Issue #41 */
  exitCode?: number;
  /** 错误信息 - Issue #41 */
  errorMessage?: string;
}

export type TaskStatus = Task['status'];

export interface EventLog {
  id: string;
  taskId: string;
  runId?: string;
  type: 'task_created' | 'task_started' | 'task_completed' | 'task_failed' | 'task_cancelled' |
        'run_started' | 'run_completed' | 'run_failed' |
        'gate_requested' | 'gate_passed' | 'gate_failed';
  payload?: Record<string, unknown>;
  timestamp: string;
}

export interface AuditEntry {
  id: string;
  action: 'create_task' | 'start_task' | 'cancel_task' | 'update_status' |
          'create_run' | 'stop_run' |
          'pass_gate' | 'fail_gate';
  resourceId: string;
  resourceType: 'task' | 'run' | 'gate';
  actor?: string;
  details?: Record<string, unknown>;
  timestamp: string;
}