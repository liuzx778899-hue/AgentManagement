export interface Task {
  id: string;
  projectId: string;
  goal: string;
  acceptanceCriteria: string[];
  workflowTemplateId: string;
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