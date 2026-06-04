/**
 * WorkbenchViewModel - 工作台视图模型
 * Issue: #27 #28
 */

import type { Task, AgentRun } from './task';
import type { WorkflowStep } from './workflow';
import type { WorkflowAssignment } from './workflowAssignment';

export interface AssignmentViewModel {
  assignment: WorkflowAssignment;
  task?: Task;
  run?: AgentRun;
  priority: number;
  dependenciesMet: boolean;
  waitingForAssignmentIds: string[];
}

export interface StepViewModel {
  step: WorkflowStep;
  assignments: AssignmentViewModel[];
  status: 'pending' | 'running' | 'completed' | 'failed' | 'waiting';
  progress: { completed: number; total: number };
}

export interface WorkbenchViewModel {
  projectId: string;
  workflowTemplateId: string;
  steps: StepViewModel[];
  assignmentSummary: {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
    waiting: number;
  };
}

export function buildWorkbenchViewModel(input: {
  steps: WorkflowStep[];
  assignments: WorkflowAssignment[];
  tasks: Task[];
  runs: AgentRun[];
  projectId: string;
  workflowTemplateId: string;
}): WorkbenchViewModel {
  const { steps, assignments, tasks, runs, projectId, workflowTemplateId } = input;

  const taskByAssignmentId = new Map<string, Task>();
  for (const task of tasks) {
    if (task.roleAssignment) {
      for (const [key, value] of Object.entries(task.roleAssignment)) {
        taskByAssignmentId.set(key, task);
        taskByAssignmentId.set(value, task);
      }
    }
  }

  const runByTaskId = new Map<string, AgentRun>();
  for (const run of runs) {
    runByTaskId.set(run.taskId, run);
  }

  const assignmentsByStepId = new Map<string, WorkflowAssignment[]>();
  for (const assignment of assignments) {
    const existing = assignmentsByStepId.get(assignment.workflowStepId) || [];
    existing.push(assignment);
    assignmentsByStepId.set(assignment.workflowStepId, existing);
  }

  const completedAssignmentIds = new Set<string>();
  for (const assignment of assignments) {
    const task = taskByAssignmentId.get(assignment.id);
    if (task?.status === 'done') {
      completedAssignmentIds.add(assignment.id);
    }
  }

  const stepViewModels: StepViewModel[] = steps.map((step, index) => {
    const stepAssignments = assignmentsByStepId.get(step.id) || [];

    const assignmentViewModels: AssignmentViewModel[] = stepAssignments.map(assignment => {
      const task = taskByAssignmentId.get(assignment.id);
      const run = task ? runByTaskId.get(task.id) : undefined;

      const waitingForAssignmentIds = assignment.dependsOnAssignmentIds.filter(
        depId => !completedAssignmentIds.has(depId)
      );

      return {
        assignment,
        task,
        run,
        priority: (index + 1) * 10,
        dependenciesMet: waitingForAssignmentIds.length === 0,
        waitingForAssignmentIds,
      };
    });

    const completed = assignmentViewModels.filter(a => a.task?.status === 'done').length;
    const failed = assignmentViewModels.filter(a => a.task?.status === 'failed').length;
    const running = assignmentViewModels.filter(
      a => a.task?.status === 'running' || a.run?.status === 'running' || a.run?.status === 'starting'
    ).length;

    let status: StepViewModel['status'] = 'pending';
    if (failed > 0) status = 'failed';
    else if (running > 0) status = 'running';
    else if (completed === assignmentViewModels.length && assignmentViewModels.length > 0) status = 'completed';
    else if (completed > 0) status = 'running';
    if (assignmentViewModels.some(a => a.task?.status === 'gate')) status = 'waiting';

    return {
      step,
      assignments: assignmentViewModels,
      status,
      progress: { completed, total: assignmentViewModels.length },
    };
  });

  const allAssignments = stepViewModels.flatMap(s => s.assignments);
  const assignmentSummary = {
    total: allAssignments.length,
    pending: allAssignments.filter(a => !a.task || a.task.status === 'queued' || a.task.status === 'draft').length,
    running: allAssignments.filter(a => a.task?.status === 'running').length,
    completed: allAssignments.filter(a => a.task?.status === 'done').length,
    failed: allAssignments.filter(a => a.task?.status === 'failed').length,
    waiting: allAssignments.filter(a => !a.dependenciesMet).length,
  };

  return { projectId, workflowTemplateId, steps: stepViewModels, assignmentSummary };
}
