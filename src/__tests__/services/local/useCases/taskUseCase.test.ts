import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Task } from '../../../../domain/task';
import type { WorkflowTemplate, WorkflowStep, WorkflowStepAssignment } from '../../../../domain/workflow';
import {
  createTasksFromWorkflow,
  createTask,
  updateTask,
  deleteTask,
  listTasksByProject,
} from '../../../../services/local/useCases/taskUseCase';

// Helper to create valid WorkflowStep with single assignment
function createStep(id: string, name: string, roleId: string, gateMode: 'auto' | 'manual' = 'auto', order: number = 0): WorkflowStep {
  return {
    id,
    order,
    name,
    assignments: [{
      id: `assignment-${id}`,
      order: 0,
      roleId,
      modelProviderId: 'default-provider',
      modelName: 'default-model',
      goal: `执行${name}`,
      acceptanceCriteria: [`完成${name}`],
      inputs: [],
      outputs: [],
    }],
    inputs: [],
    outputs: [],
    gateMode,
    failureStrategy: 'stop',
    projectOverride: false,
  };
}

// Helper to create step with multiple assignments
function createMultiAssignmentStep(id: string, name: string, assignments: WorkflowStepAssignment[], order: number): WorkflowStep {
  return {
    id,
    order,
    name,
    assignments,
    inputs: [],
    outputs: [],
    gateMode: 'auto',
    failureStrategy: 'stop',
    projectOverride: false,
  };
}

// Mock repositories - cast to any to avoid requiring internal class properties
const mockTaskRepo = {
  save: vi.fn(),
  saveBatch: vi.fn(),
  load: vi.fn(),
  delete: vi.fn(),
  listAll: vi.fn(),
  listByProject: vi.fn(),
} as any;

const mockWorkflowRepo = {
  load: vi.fn(),
} as any;

describe('TaskUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTasksFromWorkflow', () => {
    it('should create one task per assignment (not per step)', async () => {
      const workflowTemplate: WorkflowTemplate = {
        id: 'wf-001',
        name: '软件开发流程',
        version: 1,
        steps: [
          createStep('step-1', '需求分析', 'role-pm', 'auto', 1),
          createStep('step-2', 'UI/UX 设计', 'role-design', 'auto', 2),
          createStep('step-3', '前端开发', 'role-fe', 'manual', 3),
          createStep('step-4', '代码审查', 'role-review', 'auto', 4),
          createStep('step-5', '测试验证', 'role-qa', 'auto', 5),
        ],
        createdAt: '2026-06-06',
        updatedAt: '2026-06-06',
      };

      mockWorkflowRepo.load.mockResolvedValue({ ok: true, data: workflowTemplate });
      mockTaskRepo.saveBatch.mockResolvedValue({ ok: true, data: [] });

      const result = await createTasksFromWorkflow(mockTaskRepo, mockWorkflowRepo, {
        projectId: 'proj-001',
        workflowTemplateId: 'wf-001',
      });

      expect(result.ok).toBe(true);
      // 5 steps with 1 assignment each = 5 tasks
      expect(result.data!.length).toBe(5);
    });

    it('should create multiple tasks when step has multiple assignments', async () => {
      const workflowTemplate: WorkflowTemplate = {
        id: 'wf-002',
        name: '多角色流程',
        version: 1,
        steps: [
          createStep('step-1', '需求分析', 'role-pm', 'auto', 1),
          createMultiAssignmentStep('step-2', '开发', [
            {
              id: 'assign-fe',
              order: 0,
              roleId: 'role-fe',
              modelProviderId: 'provider-openai',
              modelName: 'gpt-5',
              goal: '实现前端功能',
              acceptanceCriteria: ['前端测试通过'],
              inputs: [],
              outputs: ['前端代码'],
              dependsOnAssignmentIds: ['assignment-step-1'],
              notifyAssignmentIds: ['assign-review'],
            },
            {
              id: 'assign-be',
              order: 1,
              roleId: 'role-be',
              modelProviderId: 'provider-deepseek',
              modelName: 'deepseek-v4',
              goal: '实现后端 API',
              acceptanceCriteria: ['API 集成测试通过'],
              inputs: [],
              outputs: ['后端代码'],
              dependsOnAssignmentIds: ['assignment-step-1'],
              notifyAssignmentIds: ['assign-review'],
            },
          ], 2),
          createStep('step-3', '代码审查', 'role-review', 'auto', 3),
        ],
        createdAt: '2026-06-06',
        updatedAt: '2026-06-06',
      };

      mockWorkflowRepo.load.mockResolvedValue({ ok: true, data: workflowTemplate });
      mockTaskRepo.saveBatch.mockResolvedValue({ ok: true, data: [] });

      const result = await createTasksFromWorkflow(mockTaskRepo, mockWorkflowRepo, {
        projectId: 'proj-001',
        workflowTemplateId: 'wf-002',
      });

      expect(result.ok).toBe(true);
      // 3 steps, step-2 has 2 assignments = 4 tasks total
      expect(result.data!.length).toBe(4);
    });

    it('should set workflowStepId and assignmentId on each task', async () => {
      const workflowTemplate: WorkflowTemplate = {
        id: 'wf-003',
        name: '测试流程',
        version: 1,
        steps: [
          createStep('step-1', '需求分析', 'role-pm', 'auto', 1),
          createStep('step-2', '开发', 'role-dev', 'auto', 2),
        ],
        createdAt: '2026-06-06',
        updatedAt: '2026-06-06',
      };

      mockWorkflowRepo.load.mockResolvedValue({ ok: true, data: workflowTemplate });
      mockTaskRepo.saveBatch.mockResolvedValue({ ok: true, data: [] });

      const result = await createTasksFromWorkflow(mockTaskRepo, mockWorkflowRepo, {
        projectId: 'proj-001',
        workflowTemplateId: 'wf-003',
      });

      expect(result.ok).toBe(true);
      const tasks = result.data!;

      expect(tasks[0].workflowStepId).toBe('step-1');
      expect(tasks[0].assignmentId).toBe('assignment-step-1');
      expect(tasks[1].workflowStepId).toBe('step-2');
      expect(tasks[1].assignmentId).toBe('assignment-step-2');
    });

    it('should set priority based on step order', async () => {
      const workflowTemplate: WorkflowTemplate = {
        id: 'wf-004',
        name: '优先级测试',
        version: 1,
        steps: [
          createStep('step-1', '第一步', 'role-1', 'auto', 1),
          createStep('step-2', '第二步', 'role-2', 'auto', 2),
          createStep('step-3', '第三步', 'role-3', 'auto', 3),
        ],
        createdAt: '2026-06-06',
        updatedAt: '2026-06-06',
      };

      mockWorkflowRepo.load.mockResolvedValue({ ok: true, data: workflowTemplate });
      mockTaskRepo.saveBatch.mockResolvedValue({ ok: true, data: [] });

      const result = await createTasksFromWorkflow(mockTaskRepo, mockWorkflowRepo, {
        projectId: 'proj-001',
        workflowTemplateId: 'wf-004',
      });

      expect(result.ok).toBe(true);
      const tasks = result.data!;

      expect(tasks[0].priority).toBe(10); // step order 1 * 10
      expect(tasks[1].priority).toBe(20); // step order 2 * 10
      expect(tasks[2].priority).toBe(30); // step order 3 * 10
    });

    it('should set first assignment as running and rest as queued', async () => {
      const workflowTemplate: WorkflowTemplate = {
        id: 'wf-005',
        name: '状态测试',
        version: 1,
        steps: [
          createStep('step-1', '第一步', 'role-1', 'auto', 1),
          createStep('step-2', '第二步', 'role-2', 'auto', 2),
        ],
        createdAt: '2026-06-06',
        updatedAt: '2026-06-06',
      };

      mockWorkflowRepo.load.mockResolvedValue({ ok: true, data: workflowTemplate });
      mockTaskRepo.saveBatch.mockResolvedValue({ ok: true, data: [] });

      const result = await createTasksFromWorkflow(mockTaskRepo, mockWorkflowRepo, {
        projectId: 'proj-001',
        workflowTemplateId: 'wf-005',
      });

      expect(result.ok).toBe(true);
      const tasks = result.data!;

      expect(tasks[0].status).toBe('running');
      expect(tasks[1].status).toBe('queued');
    });

    it('should use assignment.goal instead of step.name for task goal', async () => {
      const workflowTemplate: WorkflowTemplate = {
        id: 'wf-006',
        name: '目标测试',
        version: 1,
        steps: [createStep('step-1', '需求分析', 'role-pm', 'auto', 1)],
        createdAt: '2026-06-06',
        updatedAt: '2026-06-06',
      };

      mockWorkflowRepo.load.mockResolvedValue({ ok: true, data: workflowTemplate });
      mockTaskRepo.saveBatch.mockResolvedValue({ ok: true, data: [] });

      const result = await createTasksFromWorkflow(mockTaskRepo, mockWorkflowRepo, {
        projectId: 'proj-001',
        workflowTemplateId: 'wf-006',
      });

      expect(result.ok).toBe(true);
      // createStep helper sets goal: `执行${name}` which is different from step.name
      expect(result.data![0].goal).toBe('执行需求分析');
    });

    it('should resolve dependsOnTaskIds from dependsOnAssignmentIds', async () => {
      const workflowTemplate: WorkflowTemplate = {
        id: 'wf-007',
        name: '依赖测试',
        version: 1,
        steps: [
          {
            id: 'step-1',
            order: 1,
            name: '需求',
            assignments: [{
              id: 'assign-a',
              order: 0,
              roleId: 'role-pm',
              modelProviderId: 'p1',
              modelName: 'm1',
              goal: '分析需求',
              acceptanceCriteria: [],
              inputs: [],
              outputs: [],
              notifyAssignmentIds: ['assign-b'],
            }],
            inputs: [],
            outputs: [],
            gateMode: 'auto' as const,
            failureStrategy: 'stop' as const,
            projectOverride: false,
          },
          {
            id: 'step-2',
            order: 2,
            name: '开发',
            assignments: [{
              id: 'assign-b',
              order: 0,
              roleId: 'role-dev',
              modelProviderId: 'p2',
              modelName: 'm2',
              goal: '开发功能',
              acceptanceCriteria: [],
              inputs: [],
              outputs: [],
              dependsOnAssignmentIds: ['assign-a'],
            }],
            inputs: [],
            outputs: [],
            gateMode: 'auto' as const,
            failureStrategy: 'stop' as const,
            projectOverride: false,
          },
        ],
        createdAt: '2026-06-06',
        updatedAt: '2026-06-06',
      };

      mockWorkflowRepo.load.mockResolvedValue({ ok: true, data: workflowTemplate });
      mockTaskRepo.saveBatch.mockResolvedValue({ ok: true, data: [] });

      const result = await createTasksFromWorkflow(mockTaskRepo, mockWorkflowRepo, {
        projectId: 'proj-001',
        workflowTemplateId: 'wf-007',
      });

      expect(result.ok).toBe(true);
      const tasks = result.data!;

      // Task 0 (assign-a) should notify Task 1 (assign-b)
      expect(tasks[0].notifyTaskIds).toHaveLength(1);
      expect(tasks[0].notifyTaskIds![0]).toBe(tasks[1].id);

      // Task 1 (assign-b) depends on Task 0 (assign-a)
      expect(tasks[1].dependsOnTaskIds).toHaveLength(1);
      expect(tasks[1].dependsOnTaskIds![0]).toBe(tasks[0].id);
    });

    it('should return error when workflow not found', async () => {
      mockWorkflowRepo.load.mockResolvedValue({
        ok: false,
        error: { code: 'NOT_FOUND', message: 'Not found' },
      });

      const result = await createTasksFromWorkflow(mockTaskRepo, mockWorkflowRepo, {
        projectId: 'proj-001',
        workflowTemplateId: 'nonexistent',
      });

      expect(result.ok).toBe(false);
    });

    it('should return error when projectId is missing', async () => {
      const result = await createTasksFromWorkflow(mockTaskRepo, mockWorkflowRepo, {
        projectId: '',
        workflowTemplateId: 'wf-001',
      });

      expect(result.ok).toBe(false);
    });
  });

  describe('listTasksByProject', () => {
    it('should return tasks filtered by projectId', async () => {
      const projectId = 'proj-001';

      mockTaskRepo.listByProject.mockResolvedValue({
        ok: true,
        data: [
          { id: 'task-1', projectId, goal: 'Task 1' } as Task,
          { id: 'task-2', projectId, goal: 'Task 2' } as Task,
        ],
      });

      const result = await listTasksByProject(mockTaskRepo, projectId);

      expect(result.ok).toBe(true);
      expect(result.data?.length).toBe(2);
      expect(result.data?.every((t: Task) => t.projectId === projectId)).toBe(true);
    });
  });
});
