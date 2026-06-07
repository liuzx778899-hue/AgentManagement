/**
 * Integration test: emitEvent end-to-end flow
 *
 * Seeds assignments, emits event, verifies routes + notifications
 * All in-memory stores are cleared between tests.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as assignmentRepo from '../../../../services/local/repositories/workflowAssignmentRepository';
import * as notificationRepo from '../../../../services/local/repositories/notificationRepository';
import * as eventRepo from '../../../../services/local/repositories/workflowEventRepository';
import {
  emitEvent,
  processEventById,
  getWorkflowEvents,
  getRoleNotifications,
  updateNotificationStatus,
} from '../../../../services/local/useCases/workflowEventUseCase';
import type { WorkflowAssignment } from '../../../../domain/workflowAssignment';
import type { Task } from '../../../../domain/task';

beforeEach(() => {
  assignmentRepo.clear();
  notificationRepo.clear();
  eventRepo.clear();
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
    workflowStepId: 'step-dev',
    assignmentId: 'asgn-dev',
    priority: 10,
    dependsOnTaskIds: [],
    notifyTaskIds: [],
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
    workflowStepId: 'step-qa',
    assignmentId: 'asgn-qa',
    priority: 30,
    dependsOnTaskIds: [],
    notifyTaskIds: [],
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
    // asgn-dev has 2 task_completed routes + asgn-qa has 1 = 3 routes total
    expect(result.data!.results).toHaveLength(3);

    const unblock = result.data!.results.find(r => r.action === 'unblock_task');
    expect(unblock).toBeDefined();

    // 2 notify routes (one from asgn-dev, one from asgn-qa)
    const notifyRoutes = result.data!.results.filter(r => r.action === 'notify');
    expect(notifyRoutes).toHaveLength(2);
    expect(notifyRoutes.every(r => r.status === 'completed')).toBe(true);

    // Both notify routes produce notifications
    expect(result.data!.notifications).toHaveLength(2);
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
    // Only asgn-dev has task_failed route
    expect(result.data!.results).toHaveLength(1);
    expect(result.data!.results[0].action).toBe('notify');
    expect(result.data!.results[0].status).toBe('completed');
    expect(result.data!.notifications).toHaveLength(1);
  });

  it('should emit gate_failed and produce reassign_task', async () => {
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
    expect(result.data!.results).toHaveLength(1);
    expect(result.data!.results[0].action).toBe('reassign_task');
    expect(result.data!.results[0].targetRoleId).toBe('role-dev');
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

    const emitResult = await emitEvent({
      workflowId: 'wf-ci',
      sourceAssignmentId: 'asgn-dev',
      sourceStepId: 'step-dev',
      trigger: 'task_completed',
      payload: {},
      tasks: makeTasks(),
    });

    const eventsResult = await getWorkflowEvents('wf-ci');
    expect(eventsResult.ok).toBe(true);
    expect(eventsResult.data!).toHaveLength(1);
    expect(eventsResult.data![0].trigger).toBe('task_completed');
    expect(eventsResult.data![0].id).toBe(emitResult.data!.event.id);
  });

  it('should process event by id from repository', async () => {
    await seedAssignments();

    const emitResult = await emitEvent({
      workflowId: 'wf-ci',
      sourceAssignmentId: 'asgn-dev',
      sourceStepId: 'step-dev',
      trigger: 'task_completed',
      payload: {},
      tasks: makeTasks(),
    });

    const eventId = emitResult.data!.event.id;

    // Process again by id
    const processResult = await processEventById(eventId);
    expect(processResult.ok).toBe(true);
    expect(processResult.data!.event.id).toBe(eventId);
    expect(processResult.data!.results.length).toBeGreaterThan(0);
  });

  it('should not duplicate notifications when processEventById is called on already-processed event', async () => {
    await seedAssignments();

    // Emit creates event + processes routes (1 notification for task_failed)
    const emitResult = await emitEvent({
      workflowId: 'wf-ci',
      sourceAssignmentId: 'asgn-dev',
      sourceStepId: 'step-dev',
      trigger: 'task_failed',
      payload: {},
      tasks: makeTasks(),
    });

    expect(emitResult.data!.notifications).toHaveLength(1);

    // Calling processEventById again should skip completed routes
    const reprocessResult = await processEventById(emitResult.data!.event.id);
    expect(reprocessResult.ok).toBe(true);
    expect(reprocessResult.data!.notifications).toHaveLength(0);

    // Verify no duplicate in notification store
    const notifs = await getRoleNotifications('role-pm');
    expect(notifs.data!).toHaveLength(1);
  });

  it('should fail processEventById for nonexistent event', async () => {
    const result = await processEventById('evt-nonexistent');
    expect(result.ok).toBe(false);
  });

  it('should manage notification lifecycle', async () => {
    await seedAssignments();

    await emitEvent({
      workflowId: 'wf-ci',
      sourceAssignmentId: 'asgn-dev',
      sourceStepId: 'step-dev',
      trigger: 'task_failed',
      payload: {},
      tasks: makeTasks(),
    });

    const notifsResult = await getRoleNotifications('role-pm');
    expect(notifsResult.ok).toBe(true);
    expect(notifsResult.data!).toHaveLength(1);

    const notif = notifsResult.data![0];
    expect(notif.status).toBe('unread');

    const updated = await updateNotificationStatus(notif.id, 'delivered');
    expect(updated.ok).toBe(true);
    expect(updated.data!.status).toBe('delivered');

    const consumed = await updateNotificationStatus(notif.id, 'consumed');
    expect(consumed.ok).toBe(true);
    expect(consumed.data!.status).toBe('consumed');

    const resolved = await updateNotificationStatus(notif.id, 'resolved');
    expect(resolved.ok).toBe(true);
    expect(resolved.data!.status).toBe('resolved');
  });
});
