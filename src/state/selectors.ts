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

// ---------------------------------------------------------------------------
// Issue #30: 工作台任务分类 Selectors
// ---------------------------------------------------------------------------

/**
 * 获取当前角色的待办任务
 *
 * @param tasks 所有任务列表
 * @param currentRoleId 当前角色 ID
 * @returns 分配给当前角色的未完成任务
 */
export function getMyTasks(tasks: Task[], currentRoleId: string): Task[] {
  return tasks.filter(
    (task) => task.roleId === currentRoleId && task.status !== "done" && task.status !== "failed"
  );
}

/**
 * 获取等待依赖完成的任务
 *
 * 返回状态为 draft 或 queued，但依赖任务未全部完成的任务。
 * 同时返回每个任务正在等待的任务信息。
 *
 * @param tasks 所有任务列表
 * @returns 等待依赖的任务及等待信息
 */
export function getWaitingTasks(tasks: Task[]): Array<{ task: Task; waitingFor: Task[] }> {
  return tasks
    .filter((task) => task.status === "draft" || task.status === "queued")
    .filter((task) => task.dependsOnTaskIds && task.dependsOnTaskIds.length > 0)
    .map((task) => {
      const waitingFor = task.dependsOnTaskIds!
        .map((depId) => tasks.find((t) => t.id === depId))
        .filter((t): t is Task => t !== undefined && t.status !== "done");

      return { task, waitingFor };
    })
    .filter((item) => item.waitingFor.length > 0);
}

/**
 * 获取可以开始的任务
 *
 * 返回状态为 queued 且依赖全部满足的任务。
 *
 * @param tasks 所有任务列表
 * @returns 可以立即开始的任务
 */
export function getReadyTasks(tasks: Task[]): Task[] {
  return tasks.filter((task) => {
    if (task.status !== "queued") return false;

    // 检查依赖是否全部满足
    if (!task.dependsOnTaskIds || task.dependsOnTaskIds.length === 0) {
      return true;
    }

    return task.dependsOnTaskIds.every((depId) => {
      const depTask = tasks.find((t) => t.id === depId);
      return depTask?.status === "done";
    });
  });
}

/**
 * 检查任务的依赖是否全部满足
 *
 * @param task 要检查的任务
 * @param tasks 所有任务列表
 * @returns 依赖是否满足
 */
export function checkTaskDependenciesMet(task: Task, tasks: Task[]): boolean {
  if (!task.dependsOnTaskIds || task.dependsOnTaskIds.length === 0) {
    return true;
  }

  return task.dependsOnTaskIds.every((depId) => {
    const depTask = tasks.find((t) => t.id === depId);
    return depTask?.status === "done";
  });
}