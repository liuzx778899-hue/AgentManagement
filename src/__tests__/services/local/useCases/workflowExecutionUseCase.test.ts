import { describe, it, expect, beforeEach } from 'vitest';
import {
  createWorkflowRun,
  advanceWorkflowStep,
  handleWorkflowGate,
  getWorkflowRunStatus,
} from '../../../../services/local/useCases/workflowExecutionUseCase';
import type { Workflow } from '../../../../domain/workflow';

describe('workflowExecutionUseCase', () => {
  const defaultStep = {
    modelProviderId: 'provider-1',
    modelName: 'model-1',
    inputs: [] as string[],
    outputs: [] as string[],
    gateMode: 'auto' as const,
    failureStrategy: 'stop' as const,
    projectOverride: false,
  };

  const mockWorkflow: Workflow = {
    id: 'wf-001',
    name: '开发流程',
    description: '完整开发流程',
    version: '1.0',
    steps: [
      { id: 'step-1', name: '需求分析', roleId: 'role-pm', order: 1, ...defaultStep },
      { id: 'step-2', name: '前端开发', roleId: 'role-fe', order: 2, ...defaultStep },
      { id: 'step-3', name: '代码审查', roleId: 'role-reviewer', order: 3, gateType: 'manual', ...defaultStep },
      { id: 'step-4', name: '测试验证', roleId: 'role-qa', order: 4, ...defaultStep },
    ],
    status: 'active',
    createdAt: '2026-05-01',
    updatedAt: '2026-05-01',
  };

  const mockProject = {
    id: 'proj-001',
    name: '测试项目',
  };

  describe('createWorkflowRun', () => {
    it('should create a workflow run from workflow and project', async () => {
      const result = await createWorkflowRun({
        workflow: mockWorkflow,
        project: mockProject as any,
        triggeredBy: 'user-001',
      });

      expect(result.ok).toBe(true);
      expect(result.data?.workflowId).toBe('wf-001');
      expect(result.data?.projectId).toBe('proj-001');
      expect(result.data?.currentStepId).toBe('step-1');
      expect(result.data?.state).toBe('running');
    });

    it('should validate workflow has steps', async () => {
      const emptyWorkflow: Workflow = {
        ...mockWorkflow,
        steps: [],
      };

      const result = await createWorkflowRun({
        workflow: emptyWorkflow,
        project: mockProject as any,
        triggeredBy: 'user-001',
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('INVALID_INPUT');
    });
  });

  describe('advanceWorkflowStep', () => {
    it('should advance to next step', async () => {
      const runResult = await createWorkflowRun({
        workflow: mockWorkflow,
        project: mockProject as any,
        triggeredBy: 'user-001',
      });

      const run = runResult.data!;

      const result = await advanceWorkflowStep({
        run,
        workflow: mockWorkflow,
        completedStepId: 'step-1',
        outputArtifacts: ['docs/requirements.md'],
      });

      expect(result.ok).toBe(true);
      expect(result.data?.currentStepId).toBe('step-2');
      expect(result.data?.state).toBe('running');
    });

    it('should complete workflow when last step finishes', async () => {
      const runResult = await createWorkflowRun({
        workflow: mockWorkflow,
        project: mockProject as any,
        triggeredBy: 'user-001',
      });

      const run = runResult.data!;

      let currentRun = run;
      for (let i = 1; i <= 3; i++) {
        const result = await advanceWorkflowStep({
          run: currentRun,
          workflow: mockWorkflow,
          completedStepId: `step-${i}`,
        });
        currentRun = result.data!;
      }

      const finalResult = await advanceWorkflowStep({
        run: currentRun,
        workflow: mockWorkflow,
        completedStepId: 'step-4',
      });

      expect(finalResult.ok).toBe(true);
      expect(finalResult.data?.state).toBe('completed');
    });
  });

  describe('handleWorkflowGate', () => {
    it('should wait at manual gate', async () => {
      const runResult = await createWorkflowRun({
        workflow: mockWorkflow,
        project: mockProject as any,
        triggeredBy: 'user-001',
      });

      const run = runResult.data!;

      const advanceResult = await advanceWorkflowStep({
        run,
        workflow: mockWorkflow,
        completedStepId: 'step-2',
      });

      expect(advanceResult.ok).toBe(true);
      expect(advanceResult.data?.state).toBe('waiting-gate');
    });

    it('should pass gate with approval', async () => {
      const runResult = await createWorkflowRun({
        workflow: mockWorkflow,
        project: mockProject as any,
        triggeredBy: 'user-001',
      });

      const run = runResult.data!;

      const gateResult = await advanceWorkflowStep({
        run,
        workflow: mockWorkflow,
        completedStepId: 'step-2',
      });

      const gateRun = gateResult.data!;

      const result = await handleWorkflowGate({
        run: gateRun,
        decision: 'approve',
        decidedBy: 'user-001',
        reason: '代码符合规范',
      });

      expect(result.ok).toBe(true);
      expect(result.data?.state).toBe('running');
      expect(result.data?.currentStepId).toBe('step-4');
    });

    it('should fail workflow on gate rejection', async () => {
      const runResult = await createWorkflowRun({
        workflow: mockWorkflow,
        project: mockProject as any,
        triggeredBy: 'user-001',
      });

      const run = runResult.data!;

      const gateResult = await advanceWorkflowStep({
        run,
        workflow: mockWorkflow,
        completedStepId: 'step-2',
      });

      const gateRun = gateResult.data!;

      const result = await handleWorkflowGate({
        run: gateRun,
        decision: 'reject',
        decidedBy: 'user-001',
        reason: '存在严重 bug',
      });

      expect(result.ok).toBe(true);
      expect(result.data?.state).toBe('failed');
    });
  });

  describe('getWorkflowRunStatus', () => {
    it('should return current run status', async () => {
      const runResult = await createWorkflowRun({
        workflow: mockWorkflow,
        project: mockProject as any,
        triggeredBy: 'user-001',
      });

      const run = runResult.data!;

      const result = await getWorkflowRunStatus(run.id);

      expect(result.ok).toBe(true);
      expect(result.data?.state).toBe('running');
      expect(result.data?.currentStep).toBeDefined();
    });
  });
});