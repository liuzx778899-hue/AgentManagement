import { describe, it, expect } from 'vitest';
import { resolveEventRouteTarget, resolveAllRoutes, resolveHandoffTarget } from '../../../../services/local/useCases/resolveEventRouteTarget';
import type { WorkflowEventRoute, WorkflowAssignment } from '../../../../domain/workflowAssignment';
import type { Task } from '../../../../domain/task';
import type { DependencyContext } from '../../../../services/local/useCases/resolveEventRouteTarget';

describe('resolveEventRouteTarget', () => {
  const makeDepCtx = (tasks: Task[]): DependencyContext => ({
    completedTaskIds: new Set(tasks.filter(t => t.status === 'done').map(t => t.id)),
    tasks,
  });

  const mockTask: Task = {
    id: 'task-1',
    projectId: 'proj-1',
    goal: 'Dev task',
    acceptanceCriteria: [],
    workflowTemplateId: 'wf-1',
    roleAssignment: { 'asgn-1': 'role-dev' },
    capabilityAuthorization: [],
    launchStrategy: 'direct',
    status: 'done',
    activeRunId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('should return null when trigger does not match route trigger', () => {
    const route: WorkflowEventRoute = {
      trigger: 'task_failed',
      action: 'notify',
      targetRoleId: 'role-pm',
    };

    const result = resolveEventRouteTarget('task_completed', route, 'asgn-1', makeDepCtx([mockTask]));
    expect(result).toBeNull();
  });

  it('should resolve create_task route action', () => {
    const route: WorkflowEventRoute = {
      trigger: 'task_completed',
      action: 'create_task',
      targetAssignmentId: 'asgn-2',
    };

    const result = resolveEventRouteTarget('task_completed', route, 'asgn-1', makeDepCtx([mockTask]));
    expect(result).not.toBeNull();
    expect(result!.action).toBe('create_task');
    expect(result!.targetAssignmentId).toBe('asgn-2');
  });

  it('should resolve notify route action', () => {
    const route: WorkflowEventRoute = {
      trigger: 'task_failed',
      action: 'notify',
      targetRoleId: 'role-pm',
    };

    const result = resolveEventRouteTarget('task_failed', route, 'asgn-1', makeDepCtx([mockTask]));
    expect(result).not.toBeNull();
    expect(result!.action).toBe('notify');
    expect(result!.targetRoleId).toBe('role-pm');
  });

  it('should resolve request_gate route action', () => {
    const route: WorkflowEventRoute = {
      trigger: 'gate_requested',
      action: 'request_gate',
      targetAssignmentId: 'asgn-2',
    };

    const result = resolveEventRouteTarget('gate_requested', route, 'asgn-1', makeDepCtx([mockTask]));
    expect(result).not.toBeNull();
    expect(result!.action).toBe('request_gate');
    expect(result!.targetAssignmentId).toBe('asgn-2');
  });

  it('should resolve reassign_task route action', () => {
    const route: WorkflowEventRoute = {
      trigger: 'gate_failed',
      action: 'reassign_task',
      targetRoleId: 'role-dev2',
    };

    const result = resolveEventRouteTarget('gate_failed', route, 'asgn-1', makeDepCtx([mockTask]));
    expect(result).not.toBeNull();
    expect(result!.action).toBe('reassign_task');
    expect(result!.targetRoleId).toBe('role-dev2');
  });

  it('should resolve fail_task route action', () => {
    const route: WorkflowEventRoute = {
      trigger: 'task_failed',
      action: 'fail_task',
      targetAssignmentId: 'asgn-2',
    };

    const result = resolveEventRouteTarget('task_failed', route, 'asgn-1', makeDepCtx([mockTask]));
    expect(result).not.toBeNull();
    expect(result!.action).toBe('fail_task');
  });

  it('should resolve unblock_task when target task is queued', () => {
    const queuedTask: Task = {
      ...mockTask,
      id: 'task-2',
      status: 'queued',
      roleAssignment: { 'step-2': 'role-qa' },
    };

    const route: WorkflowEventRoute = {
      trigger: 'task_completed',
      action: 'unblock_task',
      targetAssignmentId: 'role-qa',
    };

    const result = resolveEventRouteTarget('task_completed', route, 'asgn-1', makeDepCtx([mockTask, queuedTask]));
    expect(result).not.toBeNull();
    expect(result!.action).toBe('unblock_task');
    expect(result!.targetTaskId).toBe('task-2');
  });

  it('should handle handoff_requested trigger', () => {
    const route: WorkflowEventRoute = {
      trigger: 'handoff_requested',
      action: 'notify',
      targetRoleId: 'role-qa',
    };

    const result = resolveEventRouteTarget('handoff_requested', route, 'asgn-1', makeDepCtx([mockTask]));
    expect(result).not.toBeNull();
    expect(result!.action).toBe('notify');
    expect(result!.targetRoleId).toBe('role-qa');
  });
});

describe('resolveHandoffTarget', () => {
  const assignments: WorkflowAssignment[] = [
    {
      id: 'asgn-1',
      workflowTemplateId: 'wf-1',
      workflowStepId: 'step-1',
      roleId: 'role-dev',
      runnerId: 'runner-1',
      modelProviderId: 'p1',
      modelName: 'm1',
      goal: 'Dev',
      acceptanceCriteria: [],
      dependsOnAssignmentIds: [],
      notifyAssignmentIds: [],
      eventRoutes: [],
    },
    {
      id: 'asgn-2',
      workflowTemplateId: 'wf-1',
      workflowStepId: 'step-2',
      roleId: 'role-qa',
      runnerId: 'runner-1',
      modelProviderId: 'p1',
      modelName: 'm1',
      goal: 'Test',
      acceptanceCriteria: [],
      dependsOnAssignmentIds: [],
      notifyAssignmentIds: [],
      eventRoutes: [],
    },
  ];

  it('should resolve handoff to target assignment', () => {
    const result = resolveHandoffTarget('asgn-1', 'asgn-2', undefined, assignments);
    expect(result).not.toBeNull();
    expect(result!.action).toBe('reassign_task');
    expect(result!.targetAssignmentId).toBe('asgn-2');
    expect(result!.status).toBe('pending');
  });

  it('should fail when target assignment does not exist', () => {
    const result = resolveHandoffTarget('asgn-1', 'asgn-nonexistent', undefined, assignments);
    expect(result).not.toBeNull();
    expect(result!.status).toBe('failed');
  });

  it('should fail when no target specified', () => {
    const result = resolveHandoffTarget('asgn-1', undefined, undefined, assignments);
    expect(result).not.toBeNull();
    expect(result!.status).toBe('failed');
  });
});

describe('resolveAllRoutes', () => {
  const makeDepCtx = (tasks: Task[]): DependencyContext => ({
    completedTaskIds: new Set(tasks.filter(t => t.status === 'done').map(t => t.id)),
    tasks,
  });

  it('should resolve routes from matching assignments', () => {
    const task: Task = {
      id: 'task-1',
      projectId: 'proj-1',
      goal: 'Dev task',
      acceptanceCriteria: [],
      workflowTemplateId: 'wf-1',
      roleAssignment: {},
      capabilityAuthorization: [],
      launchStrategy: 'direct',
      status: 'done',
      activeRunId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const assignments: WorkflowAssignment[] = [
      {
        id: 'asgn-1',
        workflowTemplateId: 'wf-1',
        workflowStepId: 'step-1',
        roleId: 'role-dev',
        runnerId: 'runner-1',
        modelProviderId: 'p1',
        modelName: 'm1',
        goal: 'Dev',
        acceptanceCriteria: [],
        dependsOnAssignmentIds: [],
        notifyAssignmentIds: [],
        eventRoutes: [
          { trigger: 'task_completed', action: 'unblock_task', targetAssignmentId: 'asgn-2' },
          { trigger: 'task_completed', action: 'notify', targetRoleId: 'role-pm' },
        ],
      },
      {
        id: 'asgn-2',
        workflowTemplateId: 'wf-1',
        workflowStepId: 'step-2',
        roleId: 'role-qa',
        runnerId: 'runner-1',
        modelProviderId: 'p1',
        modelName: 'm1',
        goal: 'Test',
        acceptanceCriteria: [],
        dependsOnAssignmentIds: [],
        notifyAssignmentIds: [],
        eventRoutes: [
          { trigger: 'handoff_requested', action: 'notify', targetRoleId: 'role-qa' },
        ],
      },
    ];

    const results = resolveAllRoutes('task_completed', 'asgn-1', assignments, makeDepCtx([task]));
    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results.some(r => r.action === 'unblock_task')).toBe(true);
    expect(results.some(r => r.action === 'notify')).toBe(true);
  });

  it('should return empty array for assignments with no matching routes', () => {
    const assignments: WorkflowAssignment[] = [
      {
        id: 'asgn-1',
        workflowTemplateId: 'wf-1',
        workflowStepId: 'step-1',
        roleId: 'role-dev',
        runnerId: 'runner-1',
        modelProviderId: 'p1',
        modelName: 'm1',
        goal: 'Dev',
        acceptanceCriteria: [],
        dependsOnAssignmentIds: [],
        notifyAssignmentIds: [],
        eventRoutes: [],
      },
    ];

    const results = resolveAllRoutes('task_completed', 'asgn-1', assignments, makeDepCtx([]));
    expect(results).toHaveLength(0);
  });

  it('should handle handoff_requested trigger across assignments', () => {
    const assignments: WorkflowAssignment[] = [
      {
        id: 'asgn-1',
        workflowTemplateId: 'wf-1',
        workflowStepId: 'step-1',
        roleId: 'role-dev',
        runnerId: 'runner-1',
        modelProviderId: 'p1',
        modelName: 'm1',
        goal: 'Dev',
        acceptanceCriteria: [],
        dependsOnAssignmentIds: [],
        notifyAssignmentIds: [],
        eventRoutes: [
          { trigger: 'handoff_requested', action: 'reassign_task', targetAssignmentId: 'asgn-2' },
        ],
      },
      {
        id: 'asgn-2',
        workflowTemplateId: 'wf-1',
        workflowStepId: 'step-2',
        roleId: 'role-qa',
        runnerId: 'runner-1',
        modelProviderId: 'p1',
        modelName: 'm1',
        goal: 'Test',
        acceptanceCriteria: [],
        dependsOnAssignmentIds: [],
        notifyAssignmentIds: [],
        eventRoutes: [],
      },
    ];

    const results = resolveAllRoutes('handoff_requested', 'asgn-1', assignments, makeDepCtx([]));
    expect(results).toHaveLength(1);
    expect(results[0].action).toBe('reassign_task');
    expect(results[0].targetAssignmentId).toBe('asgn-2');
  });
});
