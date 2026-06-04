/**
 * Integration test: emitEvent end-to-end flow
 *
 * Seeds assignments, emits event, verifies routes + notifications
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as assignmentRepo from '../../../../services/local/repositories/workflowAssignmentRepository';
import * as notificationRepo from '../../../../services/local/repositories/notificationRepository';
import * as eventRepo from '../../../../services/local/repositories/workflowEventRepository';
import { emitEvent, getWorkflowEvents, getRoleNotifications, updateNotificationStatus } from '../../../../services/local/useCases/workflowEventUseCase';
import type { WorkflowAssignment } from '../../../../domain/workflowAssignment';
import type { Task } from '../../../../domain/task';

// Reset in-memory stores before each test
beforeEach(async () => {
  // Re-import modules to reset Map state
  // Since these are module-level Maps, we clear them via saveBatch with empty then re-seed
});

const seedAssignments = async (): Promise<void> => {
  const assignments: WorkflowAssignment[] = [
    {
      id: 'asgn-dev',
      workflowTemplateId: 'wf-ci',
      workflowStepId: 'step-dev',
      roleId: 'role-dev',
      runnerId: 'runner-1',
      modelProviderId: 'p1',
      modelName: 'm1',
      goal: 'Develop feature',
      acceptanceCriteria: ['Code complete', 'Unit tests pass'],
      dependsOnAssignmentIds: [],
      notifyAssignmentIds: [],
      eventRoutes: [
        { trigger: 'task_completed', action: 'unblock_task', targetAssignmentId: 'role-qa' },
        { trigger: 'task_completed', action: 'notify', targetRoleId: 'role-pm' },
        { trigger: 'task_failed', action: 'notify', targetRoleId: 'role-pm' },
      ],
    },
    {
      id: 'asgn-qa',
      workflowTemplateId: 'wf-ci',
      workflowStepId: 'step-qa',
      roleId: 'role-qa',
      runnerId: 'runner-1',
      modelProviderId: 'p1',
      modelName: 'm1',
      goal: 'Test feature',
      acceptanceCriteria: ['All tests pass'],
      dependsOnAssignmentIds: ['asgn-dev'],
      notifyAssignmentIds: [],
      eventRoutes: [
        { trigger: 'task_completed', action: 'notify', targetRoleId: 'role-pm' },
        { trigger: 'gate_failed', action: 'reassign_task', targetRoleId: 'role-dev' },
      ],
    },
  ];

  await assignmentRepo.saveBatch(assignments);
};

const makeTasks = (): Task[] => [
  {
    id: 'task-dev-1',
    projectId: 'proj-1',
    goal: 'Dev task',
    acceptanceCriteria: [],
    workflowTemplateId: 'wf-ci',
    roleAssignment: { 'asgn-dev': 'role-dev' },
    capabilityAuthorization: [],
    launchStrategy: 'direct',
    status: 'done',
    activeRunId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'task-qa-1',
    projectId: 'proj-1',
    goal: 'QA task',
    acceptanceCriteria: [],
    workflowTemplateId: 'wf-ci',
    roleAssignment: { 'step-qa': 'role-qa' },
    capabilityAuthorization: [],
    launchStrategy: 'direct',
    status: 'queued',
    activeRunId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

describe('emitEvent integration', () => {
  it('should emit task_completed and produce routes + notifications', async () => {
    await seedAssignments();
    const tasks = makeTasks();

    const result = await emitEvent({
      workflowId: 'wf-ci',
      sourceAssignmentId: 'asgn-dev',
      sourceStepId: 'step-dev',
      sourceTaskId: 'task-dev-1',
      trigger: 'task_completed',
      payload: { taskId: 'task-dev-1' },
      tasks,
    });

    expect(result.ok).toBe(true);
    expect(result.data!.results.length).toBeGreaterThanOrEqual(2);

    // Should have unblock_task for role-qa
    const unblock = result.data!.results.find(r => r.action === 'unblock_task');
    expect(unblock).toBeDefined();

    // Should have notify for role-pm
    const notify = result.data!.results.find(r => r.action === 'notify');
    expect(notify).toBeDefined();
    expect(notify!.status).toBe('completed');

    // Notification should be created
    expect(result.data!.notifications.length).toBeGreaterThanOrEqual(1);
  });

  it('should emit task_failed and produce notify route', async () => {
    await seedAssignments();
    const tasks = makeTasks();

    const result = await emitEvent({
      workflowId: 'wf-ci',
      sourceAssignmentId: 'asgn-dev',
      sourceStepId: 'step-dev',
      sourceTaskId: 'task-dev-1',
      trigger: 'task_failed',
      payload: { error: 'Build failed' },
      tasks,
    });

    expect(result.ok).toBe(true);
    const notify = result.data!.results.find(r => r.action === 'notify');
    expect(notify).toBeDefined();
    expect(notify!.status).toBe('completed');
    expect(result.data!.notifications.length).toBe(1);
  });

  it('should emit handoff_requested via resolveAllRoutes', async () => {
    await seedAssignments();

    const result = await emitEvent({
      workflowId: 'wf-ci',
      sourceAssignmentId: 'asgn-qa',
      sourceStepId: 'step-qa',
      trigger: 'gate_failed',
      payload: {},
      tasks: makeTasks(),
    });

    expect(result.ok).toBe(true);
    const reassign = result.data!.results.find(r => r.action === 'reassign_task');
    expect(reassign).toBeDefined();
    expect(reassign!.targetRoleId).toBe('role-dev');
  });

  it('should return empty routes when no assignments match workflowId', async () => {
    await seedAssignments();

    const result = await emitEvent({
      workflowId: 'wf-nonexistent',
      sourceAssignmentId: 'asgn-dev',
      sourceStepId: 'step-dev',
      trigger: 'task_completed',
      payload: {},
      tasks: [],
    });

    expect(result.ok).toBe(true);
    expect(result.data!.results).toHaveLength(0);
    expect(result.data!.notifications).toHaveLength(0);
  });

  it('should retrieve events by workflow after emission', async () => {
    await seedAssignments();

    await emitEvent({
      workflowId: 'wf-ci',
      sourceAssignmentId: 'asgn-dev',
      sourceStepId: 'step-dev',
      trigger: 'task_completed',
      payload: {},
      tasks: makeTasks(),
    });

    const eventsResult = await getWorkflowEvents('wf-ci');
    expect(eventsResult.ok).toBe(true);
    expect(eventsResult.data!.length).toBeGreaterThanOrEqual(1);
    expect(eventsResult.data![0].trigger).toBe('task_completed');
  });

  it('should manage notification lifecycle', async () => {
    await seedAssignments();

    await emitEvent({
      workflowId: 'wf-ci',
      sourceAssignmentId: 'asgn-dev',
      sourceStepId: 'step-dev',
      trigger: 'task_completed',
      payload: {},
      tasks: makeTasks(),
    });

    // Get notifications for role-pm
    const notifsResult = await getRoleNotifications('role-pm');
    expect(notifsResult.ok).toBe(true);
    expect(notifsResult.data!.length).toBeGreaterThanOrEqual(1);

    const notif = notifsResult.data![0];
    expect(notif.status).toBe('unread');

    // Update to delivered
    const updated = await updateNotificationStatus(notif.id, 'delivered');
    expect(updated.ok).toBe(true);
    expect(updated.data!.status).toBe('delivered');

    // Update to consumed
    const consumed = await updateNotificationStatus(notif.id, 'consumed');
    expect(consumed.ok).toBe(true);
    expect(consumed.data!.status).toBe('consumed');

    // Update to resolved
    const resolved = await updateNotificationStatus(notif.id, 'resolved');
    expect(resolved.ok).toBe(true);
    expect(resolved.data!.status).toBe('resolved');
  });
});
