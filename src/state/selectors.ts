import type { WorkbenchData, Task, AgentRun, ManualGate, Project, AgentRole, WorkflowTemplate } from "../domain/workbench";

// Project selectors
export function selectProjectById(data: WorkbenchData, projectId: string): Project | undefined {
  return data.projects.find((p) => p.id === projectId);
}

export function selectActiveProjects(data: WorkbenchData): Project[] {
  const activeProjectIds = new Set(
    data.tasks.filter((t) => t.status === "running" || t.status === "gate").map((t) => t.projectId)
  );
  return data.projects.filter((p) => activeProjectIds.has(p.id));
}

// Task selectors
export function selectTaskById(data: WorkbenchData, taskId: string): Task | undefined {
  return data.tasks.find((t) => t.id === taskId);
}

export function selectActiveTask(data: WorkbenchData): Task | undefined {
  return data.tasks.find((t) => t.status === "gate" || t.status === "running");
}

export function selectTasksByProject(data: WorkbenchData, projectId: string): Task[] {
  return data.tasks.filter((t) => t.projectId === projectId);
}

// Gate selectors
export function selectWaitingGate(data: WorkbenchData): ManualGate | undefined {
  return data.manualGates.find((g) => g.status === "waiting");
}

export function selectGateById(data: WorkbenchData, gateId: string): ManualGate | undefined {
  return data.manualGates.find((g) => g.id === gateId);
}

// AgentRun selectors
export function selectAgentRunById(data: WorkbenchData, runId: string): AgentRun | undefined {
  return data.agentRuns.find((r) => r.id === runId);
}

export function selectRunningAgents(data: WorkbenchData): AgentRun[] {
  return data.agentRuns.filter((r) => r.status === "running" || r.status === "waiting_gate");
}

// Role selectors
export function selectRoleById(data: WorkbenchData, roleId: string): AgentRole | undefined {
  return data.roles.find((r) => r.id === roleId);
}

// Workflow selectors
export function selectWorkflowById(data: WorkbenchData, workflowId: string): WorkflowTemplate | undefined {
  return data.workflowTemplates.find((w) => w.id === workflowId);
}

// Metrics
export function selectMetrics(data: WorkbenchData) {
  const activeProjects = data.projects.filter((p) =>
    data.tasks.some((t) => t.projectId === p.id && (t.status === "running" || t.status === "gate"))
  );
  const runningAgents = data.agentRuns.filter((r) => r.status === "running" || r.status === "waiting_gate");
  const waitingGates = data.manualGates.filter((g) => g.status === "waiting");
  const doneTasks = data.tasks.filter((t) => t.status === "done");

  return {
    activeProjects: activeProjects.length,
    runningAgents: runningAgents.length,
    waitingGates: waitingGates.length,
    doneTasks: doneTasks.length,
    totalProjects: data.projects.length,
    totalTasks: data.tasks.length,
  };
}