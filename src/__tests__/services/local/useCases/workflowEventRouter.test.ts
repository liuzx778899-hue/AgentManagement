import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  executeEventRoute,
  processEventRoutes,
  createWorkflowEvent,
  type WorkflowEvent,
} from '../../../../services/local/useCases/workflowEventRouter';
import type { WorkflowEventRoute } from '../../../../domain/workflow';
import type { Task } from '../../../../domain/task';

// Use partial mock for TaskRepository to avoid creating full instance
type MockTaskRepository = {
  save: ReturnType<typeof vi.fn>;
  load: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  listAll: ReturnType<typeof vi.fn>;
  listByProject: ReturnType<typeof vi.fn>;
  saveBatch: ReturnType<typeof vi.fn>;
};

// Mock task repository
const mockTaskRepository: MockTaskRepository = {
  save: vi.fn(),
  load: vi.fn(),
  delete: vi.fn(),
  listAll: vi.fn(),
  listByProject: vi.fn(),
  saveBatch: vi.fn(),
};

// Helper to create a valid task
function createTask(
  id: string,
  projectId: string,
  status: Task['status'] = 'queued',
  options: Partial<Task> = {}
): Task {
  return {
    id,
    projectId,
    goal: `Task ${id}`,
    acceptanceCriteria: [],
    workflowTemplateId: 'wf-001',
    roleAssignment: {},
    capabilityAuthorization: [],
    launchStrategy: 'direct',
    status,
    activeRunId: null,
    createdAt: '2026-06-03T00:00:00Z',
    updatedAt: '2026-06-03T00:00:00Z',
    ...options,
  };
}

// Helper to create a valid event route
function createEventRoute(
  id: string,
  on: WorkflowEventRoute['on'],
  action: WorkflowEventRoute['action'],
  target?: Partial<WorkflowEventRoute['target']>
): WorkflowEventRoute {
  return {
    id,
    on,
    target: {
      type: 'assignment',
      id: 'assign-1',
      ...target,
    },
    action,
  };
}

describe('workflowEventRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createWorkflowEvent', () => {
    it('should create a workflow event with all required fields', () => {
      const event = createWorkflowEvent(
        'task_completed',
        'task-001',
        'proj-001',
        'wf-001',
        { message: 'Task finished' }
      );

      expect(event.type).toBe('task_completed');
      expect(event.sourceTaskId).toBe('task-001');
      expect(event.projectId).toBe('proj-001');
      expect(event.workflowTemplateId).toBe('wf-001');
      expect(event.timestamp).toBeDefined();
      expect(event.data?.message).toBe('Task finished');
    });

    it('should create event without optional data', () => {
      const event = createWorkflowEvent(
        'task_failed',
        'task-002',
        'proj-001',
        'wf-001'
      );

      expect(event.type).toBe('task_failed');
      expect(event.data).toBeUndefined();
    });
  });

  describe('executeEventRoute', () => {
    it('should execute notify action', async () => {
      const event: WorkflowEvent = createWorkflowEvent(
        'task_completed',
        'task-001',
        'proj-001',
        'wf-001'
      );

      const route = createEventRoute('route-1', 'task_completed', 'notify', {
        type: 'assignment',
        id: 'assign-1',
      });

      const allTasks: Task[] = [
        createTask('task-002', 'proj-001', 'queued', { assignmentId: 'assign-1' }),
      ];

      const result = await executeEventRoute(mockTaskRepository as any, event, route, allTasks);

      expect(result.ok).toBe(true);
      expect(result.data?.success).toBe(true);
      expect(result.data?.action).toBe('notify');
    });

    it('should return error for unknown action', async () => {
      const event: WorkflowEvent = createWorkflowEvent(
        'task_completed',
        'task-001',
        'proj-001',
        'wf-001'
      );

      const route = {
        id: 'route-1',
        on: 'task_completed' as const,
        target: { type: 'assignment' as const, id: 'assign-1' },
        action: 'unknown_action' as any,
      };

      const allTasks: Task[] = [];

      const result = await executeEventRoute(mockTaskRepository as any, event, route, allTasks);

      // Now action is validated early, before targetTasks check
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('UNKNOWN_ACTION');
    });

    it('should filter by severity condition', async () => {
      const event: WorkflowEvent = createWorkflowEvent(
        'bug_reported',
        'task-001',
        'proj-001',
        'wf-001',
        { severity: 'low', bugCategory: 'frontend' }
      );

      const route: WorkflowEventRoute = {
        id: 'route-1',
        on: 'bug_reported',
        target: { type: 'role', id: 'role-qa' },
        action: 'notify',
        condition: { severity: 'critical' },
      };

      const allTasks: Task[] = [];

      const result = await executeEventRoute(mockTaskRepository as any, event, route, allTasks);

      expect(result.ok).toBe(true);
      expect(result.data?.success).toBe(false);
      expect(result.data?.error).toContain('严重级别不匹配');
    });

    it('should filter by bug category condition', async () => {
      const event: WorkflowEvent = createWorkflowEvent(
        'bug_reported',
        'task-001',
        'proj-001',
        'wf-001',
        { severity: 'high', bugCategory: 'frontend' }
      );

      const route: WorkflowEventRoute = {
        id: 'route-1',
        on: 'bug_reported',
        target: { type: 'role', id: 'role-backend' },
        action: 'notify',
        condition: { bugCategory: 'backend' },
      };

      const allTasks: Task[] = [];

      const result = await executeEventRoute(mockTaskRepository as any, event, route, allTasks);

      expect(result.ok).toBe(true);
      expect(result.data?.success).toBe(false);
      expect(result.data?.error).toContain('Bug 分类不匹配');
    });

    it('should unblock queued tasks', async () => {
      const event: WorkflowEvent = createWorkflowEvent(
        'task_completed',
        'task-001',
        'proj-001',
        'wf-001'
      );

      const route = createEventRoute('route-1', 'task_completed', 'unblock_task', {
        type: 'assignment',
        id: 'assign-2',
      });

      const allTasks: Task[] = [
        createTask('task-002', 'proj-001', 'queued', { assignmentId: 'assign-2' }),
      ];

      mockTaskRepository.save.mockResolvedValue({
        ok: true,
        data: allTasks[0],
      });

      const result = await executeEventRoute(mockTaskRepository as any, event, route, allTasks);

      expect(result.ok).toBe(true);
      expect(result.data?.success).toBe(true);
      expect(result.data?.action).toBe('unblock_task');
    });

    it('should request gate for running tasks', async () => {
      const event: WorkflowEvent = createWorkflowEvent(
        'gate_requested',
        'task-001',
        'proj-001',
        'wf-001'
      );

      const route = createEventRoute('route-1', 'gate_requested', 'request_gate', {
        type: 'assignment',
        id: 'assign-1',
      });

      const allTasks: Task[] = [
        createTask('task-001', 'proj-001', 'running', { assignmentId: 'assign-1' }),
      ];

      mockTaskRepository.save.mockResolvedValue({
        ok: true,
        data: { ...allTasks[0], status: 'gate' },
      });

      const result = await executeEventRoute(mockTaskRepository as any, event, route, allTasks);

      expect(result.ok).toBe(true);
      expect(result.data?.success).toBe(true);
      expect(result.data?.action).toBe('request_gate');
    });
  });

  describe('processEventRoutes', () => {
    it('should process all matching routes', async () => {
      const event: WorkflowEvent = createWorkflowEvent(
        'task_completed',
        'task-001',
        'proj-001',
        'wf-001'
      );

      const routes: WorkflowEventRoute[] = [
        createEventRoute('route-1', 'task_completed', 'notify'),
        createEventRoute('route-2', 'task_completed', 'notify'),
        createEventRoute('route-3', 'task_failed', 'notify'), // Not matching
      ];

      const allTasks: Task[] = [
        createTask('task-001', 'proj-001', 'done', { assignmentId: 'assign-1' }),
        createTask('task-002', 'proj-001', 'queued', {
          assignmentId: 'assign-2',
          dependsOnTaskIds: ['task-001'],
        }),
      ];

      mockTaskRepository.listByProject.mockResolvedValue({
        ok: true,
        data: allTasks,
      });

      mockTaskRepository.save.mockResolvedValue({
        ok: true,
        data: allTasks[1],
      });

      const result = await processEventRoutes(mockTaskRepository as any, event, routes);

      expect(result.ok).toBe(true);
      expect(result.data?.length).toBeGreaterThan(0);
      // Should have executed route-1 and route-2, plus dependency check
    });

    it('should activate downstream tasks when dependencies are met', async () => {
      const event: WorkflowEvent = createWorkflowEvent(
        'task_completed',
        'task-001',
        'proj-001',
        'wf-001'
      );

      const routes: WorkflowEventRoute[] = [];

      const allTasks: Task[] = [
        createTask('task-001', 'proj-001', 'done'),
        createTask('task-002', 'proj-001', 'queued', {
          dependsOnTaskIds: ['task-001'],
        }),
        createTask('task-003', 'proj-001', 'queued', {
          dependsOnTaskIds: ['task-001', 'task-999'], // task-999 doesn't exist
        }),
      ];

      mockTaskRepository.listByProject.mockResolvedValue({
        ok: true,
        data: allTasks,
      });

      mockTaskRepository.save.mockResolvedValue({
        ok: true,
        data: allTasks[1],
      });

      const result = await processEventRoutes(mockTaskRepository as any, event, routes);

      expect(result.ok).toBe(true);
      // task-002 should be queued (dependency met)
      // task-003 should not be queued (dependency not met)
      const dependencyMet = result.data?.find((r: { action: string }) => r.action === 'dependency_satisfied');
      expect(dependencyMet?.targetTaskId).toBe('task-002');
    });

    it('should notify tasks on task_failed event', async () => {
      const event: WorkflowEvent = createWorkflowEvent(
        'task_failed',
        'task-001',
        'proj-001',
        'wf-001',
        { message: 'Build failed' }
      );

      const routes: WorkflowEventRoute[] = [];

      const allTasks: Task[] = [
        createTask('task-001', 'proj-001', 'failed', {
          notifyTaskIds: ['task-002', 'task-003'],
        }),
        createTask('task-002', 'proj-001', 'queued'),
        createTask('task-003', 'proj-001', 'queued'),
      ];

      mockTaskRepository.listByProject.mockResolvedValue({
        ok: true,
        data: allTasks,
      });

      const result = await processEventRoutes(mockTaskRepository as any, event, routes);

      expect(result.ok).toBe(true);
      const notifications = result.data?.filter((r: { action: string }) => r.action === 'notify');
      expect(notifications?.length).toBe(2);
    });

    it('should handle project_owner target type', async () => {
      const event: WorkflowEvent = createWorkflowEvent(
        'task_completed',
        'task-001',
        'proj-001',
        'wf-001'
      );

      const route: WorkflowEventRoute = {
        id: 'route-1',
        on: 'task_completed',
        target: { type: 'project_owner' },
        action: 'notify',
      };

      mockTaskRepository.listByProject.mockResolvedValue({
        ok: true,
        data: [],
      });

      const result = await processEventRoutes(mockTaskRepository as any, event, [route]);

      expect(result.ok).toBe(true);
      expect(result.data?.[0]?.success).toBe(true);
    });

    it('should handle manual_select target type', async () => {
      const event: WorkflowEvent = createWorkflowEvent(
        'change_requested',
        'task-001',
        'proj-001',
        'wf-001'
      );

      const route: WorkflowEventRoute = {
        id: 'route-1',
        on: 'change_requested',
        target: { type: 'manual_select' },
        action: 'notify',
      };

      mockTaskRepository.listByProject.mockResolvedValue({
        ok: true,
        data: [],
      });

      const result = await processEventRoutes(mockTaskRepository as any, event, [route]);

      expect(result.ok).toBe(true);
      expect(result.data?.[0]?.success).toBe(true);
    });
  });
});
