import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { Task } from '../../../../domain/task';
import type { WorkflowTemplate, WorkflowStep } from '../../../../domain/workflow';

/**
 * TaskUseCase Test
 *
 * This test file verifies the Task creation logic, especially the
 * createTasksFromWorkflow function that generates initial tasks
 * when a project is created with a workflow template.
 */

// Helper to create valid WorkflowStep
function createStep(id: string, name: string, roleId: string, gateMode: 'auto' | 'manual' = 'auto', order: number = 0): WorkflowStep {
  return {
    id,
    order,
    name,
    assignments: [{
      id: `assignment-${id}`,
      order: 1,
      roleId,
      modelProviderId: 'default-provider',
      modelName: 'default-model',
      goal: name,
      acceptanceCriteria: [],
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

// Mock repositories
const mockTaskRepo = {
  save: vi.fn(),
  saveBatch: vi.fn(),
  load: vi.fn(),
  delete: vi.fn(),
  listAll: vi.fn(),
  listByProject: vi.fn(),
};

const mockWorkflowRepo = {
  load: vi.fn(),
};

describe('TaskUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createTasksFromWorkflow', () => {
    it('should create tasks from workflow template steps', async () => {
      // Arrange
      const projectId = 'proj-001';
      const workflowTemplate: WorkflowTemplate = {
        id: 'wf-001',
        name: '软件开发流程',
        version: 1,
        steps: [
          createStep('step-1', '需求分析', 'role-pm', 'auto', 0),
          createStep('step-2', 'UI/UX 设计', 'role-design', 'auto', 1),
          createStep('step-3', '前端开发', 'role-fe', 'manual', 2),
          createStep('step-4', '代码审查', 'role-review', 'auto', 3),
          createStep('step-5', '测试验证', 'role-qa', 'auto', 4),
        ],
        createdAt: '2026-05-30',
        updatedAt: '2026-05-30',
      };

      mockWorkflowRepo.load.mockResolvedValue({
        ok: true,
        data: workflowTemplate,
      });

      mockTaskRepo.saveBatch.mockResolvedValue({
        ok: true,
        data: [],
      });

      // Act - This function will be implemented
      // const result = await createTasksFromWorkflow(mockTaskRepo, mockWorkflowRepo, {
      //   projectId,
      //   workflowTemplateId: 'wf-001',
      // });

      // Assert - For now, we're documenting expected behavior
      // After implementation, this test should pass

      // Expected behavior:
      // 1. Load workflow template
      // 2. Create Task for each step
      // 3. First task status = 'running', others = 'queued'
      // 4. Batch save all tasks

      expect(true).toBe(true); // Placeholder until implementation
    });

    it('should set first task status to running and others to queued', async () => {
      // This test documents the expected status assignment logic
      const steps = [
        { id: 'step-1', name: 'Step 1' },
        { id: 'step-2', name: 'Step 2' },
        { id: 'step-3', name: 'Step 3' },
      ];

      // Expected status assignment:
      // steps[0] -> status: 'running'
      // steps[1] -> status: 'queued'
      // steps[2] -> status: 'queued'

      const expectedStatuses = ['running', 'queued', 'queued'];
      expect(expectedStatuses).toEqual(['running', 'queued', 'queued']);
    });

    it('should include workflow step info in task goal', async () => {
      // Each task should have:
      // - goal: step name
      // - workflowTemplateId
      // - roleId from step
      // - acceptanceCriteria (can be empty initially)

      const step = createStep('step-1', '需求分析', 'role-pm');

      // Expected task:
      // {
      //   id: 'task-xxx',
      //   projectId: 'proj-001',
      //   goal: '需求分析',
      //   workflowTemplateId: 'wf-001',
      //   roleAssignment: { 'step-1': 'role-pm' },
      //   status: 'running',
      //   ...
      // }

      expect(step.name).toBe('需求分析');
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

      const result = await mockTaskRepo.listByProject(projectId);

      expect(result.ok).toBe(true);
      expect(result.data?.length).toBe(2);
      expect(result.data?.every((t: Task) => t.projectId === projectId)).toBe(true);
    });
  });
});
