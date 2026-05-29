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