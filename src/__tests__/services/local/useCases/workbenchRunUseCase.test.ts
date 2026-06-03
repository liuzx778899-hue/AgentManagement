import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  startWorkbenchRun,
  getWorkbenchRunView,
  getWorkbenchRunProgress,
  advanceWorkbenchStepRun,
  handleWorkbenchGateRun,
  stopWorkbenchRun,
  pauseWorkbenchRunAction,
  resumeWorkbenchRunAction,
  listProjectWorkbenchRuns,
  getWorkbenchRunLogs,
  clearActiveProcess,
  getActiveProcessMappings,
  resetAllState,
  getTaskRunMappings,
  checkDuplicateStart,
  getTaskActiveRunId,
  detectStaleSession,
  recoverStaleSession,
  cleanupStaleSessions,
  type StartWorkbenchRunConfig,
  type AdvanceWorkbenchStepConfig,
  type HandleWorkbenchGateConfig,
  type StopWorkbenchRunConfig,
} from '../../../../services/local/useCases/workbenchRunUseCase';
import { ProcessRunnerAdapter } from '../../../../services/local/adapters/processRunnerAdapter';
import type { AdapterConfig } from '../../../../types/localEngineering';
import type { Workflow } from '../../../../domain/workflow';
import type { Project } from '../../../../domain/project';
import type { Task } from '../../../../domain/task';

describe('workbenchRunUseCase', () => {
  let adapter: ProcessRunnerAdapter;
  const adapterConfig: AdapterConfig = {
    enableMock: true,
    defaultTimeout: 30000,
    projectRoot: process.cwd(),
  };

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

  const mockProject: Project = {
    id: 'proj-001',
    name: '测试项目',
    repoPath: '/test/repo',
    defaultBranch: 'main',
    worktreeRoot: '/test/worktrees',
    scope: 'personal',
    desktopIntegrationStatus: 'deferred',
    permissions: { permissionLevel: 'owner' },
    settings: {
      installCommand: 'npm install',
      testCommand: 'npm test',
      buildCommand: 'npm run build',
      previewCommand: 'npm run dev',
      detectedStack: 'react',
      riskSummary: '',
    },
    workflowTemplateId: 'wf-001',
    createdAt: '2026-05-01',
    updatedAt: '2026-05-01',
  };

  const mockTask: Task = {
    id: 'task-001',
    projectId: 'proj-001',
    goal: '实现工作台运行用例',
    acceptanceCriteria: ['测试通过', '类型检查通过'],
    workflowTemplateId: 'wf-001',
    roleAssignment: {},
    capabilityAuthorization: [],
    launchStrategy: 'direct',
    status: 'queued',
    activeRunId: null,
    createdAt: '2026-05-01',
    updatedAt: '2026-05-01',
  };

  const baseConfig: Omit<StartWorkbenchRunConfig, 'adapter'> = {
    workflow: mockWorkflow,
    project: mockProject,
    task: mockTask,
    triggeredBy: 'user-001',
    runnerKind: 'claude-code',
    cwd: process.cwd(),
  };

  beforeEach(() => {
    adapter = new ProcessRunnerAdapter(adapterConfig);
    // Clear all internal state for clean test isolation
    resetAllState();
  });

  // ========================================================================
  // startWorkbenchRun
  // ========================================================================
  describe('startWorkbenchRun', () => {
    it('should start a workbench run and return enriched view', async () => {
      const result = await startWorkbenchRun(adapter, baseConfig);

      expect(result.ok).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.run.projectId).toBe('proj-001');
      expect(result.data!.run.workflowId).toBe('wf-001');
      expect(result.data!.run.state).toBe('running');
      expect(result.data!.run.currentStepId).toBe('step-1');
      expect(result.data!.steps).toHaveLength(4);
      expect(result.data!.activeProcessId).toBeDefined();
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics!.length).toBeGreaterThan(0);
    });

    it('should have first step in running state and rest in pending', async () => {
      const result = await startWorkbenchRun(adapter, baseConfig);

      expect(result.data!.steps[0].execution.state).toBe('running');
      expect(result.data!.steps[1].execution.state).toBe('pending');
      expect(result.data!.steps[2].execution.state).toBe('pending');
      expect(result.data!.steps[3].execution.state).toBe('pending');
    });

    it('should return error when workflow has no steps', async () => {
      const emptyWorkflow: Workflow = { ...mockWorkflow, steps: [] };

      const result = await startWorkbenchRun(adapter, {
        ...baseConfig,
        workflow: emptyWorkflow,
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('INVALID_INPUT');
      expect(result.error?.message).toContain('no steps');
    });

    it('should return error when cwd is missing', async () => {
      const result = await startWorkbenchRun(adapter, {
        ...baseConfig,
        cwd: '',
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('INVALID_INPUT');
      expect(result.error?.message).toContain('cwd');
    });

    it('should track active process in mapping', async () => {
      const result = await startWorkbenchRun(adapter, baseConfig);
      const runId = result.data!.run.id;

      const mappings = getActiveProcessMappings();
      expect(mappings.has(runId)).toBe(true);
      expect(mappings.get(runId)).toBe(result.data!.activeProcessId);
    });
  });

  // ========================================================================
  // getWorkbenchRunView
  // ========================================================================
  describe('getWorkbenchRunView', () => {
    it('should return enriched view for existing run', async () => {
      const startResult = await startWorkbenchRun(adapter, baseConfig);
      const runId = startResult.data!.run.id;

      const result = await getWorkbenchRunView(adapter, runId);

      expect(result.ok).toBe(true);
      expect(result.data!.run.id).toBe(runId);
      expect(result.data!.steps).toHaveLength(4);
    });

    it('should return error for non-existent run', async () => {
      const result = await getWorkbenchRunView(adapter, 'non-existent-run');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('DIRECTORY_NOT_FOUND');
    });
  });

  // ========================================================================
  // getWorkbenchRunProgress
  // ========================================================================
  describe('getWorkbenchRunProgress', () => {
    it('should return progress for existing run', async () => {
      const startResult = await startWorkbenchRun(adapter, baseConfig);
      const runId = startResult.data!.run.id;

      const result = await getWorkbenchRunProgress(runId);

      expect(result.ok).toBe(true);
      expect(result.data!.totalSteps).toBe(4);
      expect(result.data!.completedSteps).toBe(0);
      expect(result.data!.percentage).toBe(0);
      expect(result.data!.state).toBe('running');
    });

    it('should return error for non-existent run', async () => {
      const result = await getWorkbenchRunProgress('non-existent-run');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('DIRECTORY_NOT_FOUND');
    });
  });

  // ========================================================================
  // advanceWorkbenchStepRun
  // ========================================================================
  describe('advanceWorkbenchStepRun', () => {
    it('should advance to next step and start new runner', async () => {
      const startResult = await startWorkbenchRun(adapter, baseConfig);
      const runId = startResult.data!.run.id;

      const result = await advanceWorkbenchStepRun(adapter, {
        runId,
        completedStepId: 'step-1',
        outputArtifacts: ['docs/requirements.md'],
        workflow: mockWorkflow,
      });

      expect(result.ok).toBe(true);
      expect(result.data!.run.currentStepId).toBe('step-2');
      expect(result.data!.run.state).toBe('running');
      expect(result.data!.steps[0].execution.state).toBe('completed');
      expect(result.data!.steps[1].execution.state).toBe('running');
      // Should have a new active process
      expect(result.data!.activeProcessId).toBeDefined();
    });

    it('should complete workflow when last step finishes', async () => {
      const startResult = await startWorkbenchRun(adapter, baseConfig);
      const runId = startResult.data!.run.id;

      // Advance through all 4 steps
      await advanceWorkbenchStepRun(adapter, { runId, completedStepId: 'step-1', workflow: mockWorkflow });
      await advanceWorkbenchStepRun(adapter, { runId, completedStepId: 'step-2', workflow: mockWorkflow });
      await advanceWorkbenchStepRun(adapter, { runId, completedStepId: 'step-3', workflow: mockWorkflow });

      const finalResult = await advanceWorkbenchStepRun(adapter, {
        runId,
        completedStepId: 'step-4',
        workflow: mockWorkflow,
      });

      expect(finalResult.ok).toBe(true);
      expect(finalResult.data!.run.state).toBe('completed');
      expect(finalResult.data!.run.currentStepId).toBeNull();
      // No active process after completion
      expect(finalResult.data!.activeProcessId).toBeUndefined();
    });

    it('should enter waiting-gate state at manual gate step', async () => {
      const startResult = await startWorkbenchRun(adapter, baseConfig);
      const runId = startResult.data!.run.id;

      await advanceWorkbenchStepRun(adapter, { runId, completedStepId: 'step-1', workflow: mockWorkflow });
      const result = await advanceWorkbenchStepRun(adapter, {
        runId,
        completedStepId: 'step-2',
        outputArtifacts: ['src/components/'],
        workflow: mockWorkflow,
      });

      expect(result.ok).toBe(true);
      expect(result.data!.run.state).toBe('waiting-gate');
      expect(result.data!.run.currentStepId).toBe('step-3');
      // No runner process at gate
      expect(result.data!.activeProcessId).toBeUndefined();
    });

    it('should fail workflow when step has error', async () => {
      const startResult = await startWorkbenchRun(adapter, baseConfig);
      const runId = startResult.data!.run.id;

      const result = await advanceWorkbenchStepRun(adapter, {
        runId,
        completedStepId: 'step-1',
        error: 'Something went wrong',
        workflow: mockWorkflow,
      });

      expect(result.ok).toBe(true);
      expect(result.data!.run.state).toBe('failed');
      expect(result.data!.steps[0].execution.state).toBe('failed');
      expect(result.data!.steps[0].execution.error).toBe('Something went wrong');
    });

    it('should return error for non-existent step', async () => {
      const startResult = await startWorkbenchRun(adapter, baseConfig);
      const runId = startResult.data!.run.id;

      const result = await advanceWorkbenchStepRun(adapter, {
        runId,
        completedStepId: 'non-existent-step',
        workflow: mockWorkflow,
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('INVALID_INPUT');
    });

    it('should return error for non-existent run', async () => {
      const result = await advanceWorkbenchStepRun(adapter, {
        runId: 'non-existent-run',
        completedStepId: 'step-1',
        workflow: mockWorkflow,
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('DIRECTORY_NOT_FOUND');
    });

    it('should pass output artifacts to next step input', async () => {
      const startResult = await startWorkbenchRun(adapter, baseConfig);
      const runId = startResult.data!.run.id;

      const result = await advanceWorkbenchStepRun(adapter, {
        runId,
        completedStepId: 'step-1',
        outputArtifacts: ['docs/requirements.md', 'docs/user-stories.md'],
        workflow: mockWorkflow,
      });

      expect(result.data!.steps[0].execution.outputArtifacts).toContain('docs/requirements.md');
      expect(result.data!.steps[1].execution.inputArtifacts).toContain('docs/requirements.md');
    });
  });

  // ========================================================================
  // handleWorkbenchGateRun
  // ========================================================================
  describe('handleWorkbenchGateRun', () => {
    async function startAndAdvanceToGate(): Promise<string> {
      const startResult = await startWorkbenchRun(adapter, baseConfig);
      const runId = startResult.data!.run.id;
      await advanceWorkbenchStepRun(adapter, { runId, completedStepId: 'step-1', workflow: mockWorkflow });
      await advanceWorkbenchStepRun(adapter, { runId, completedStepId: 'step-2', workflow: mockWorkflow });
      return runId;
    }

    it('should approve gate and start runner for next step', async () => {
      const runId = await startAndAdvanceToGate();

      const result = await handleWorkbenchGateRun(adapter, mockWorkflow, {
        runId,
        decision: 'approve',
        decidedBy: 'reviewer-001',
        reason: '代码符合规范',
      });

      expect(result.ok).toBe(true);
      expect(result.data!.run.state).toBe('running');
      expect(result.data!.run.currentStepId).toBe('step-4');
      expect(result.data!.activeProcessId).toBeDefined();
    });

    it('should reject gate and fail the workflow', async () => {
      const runId = await startAndAdvanceToGate();

      const result = await handleWorkbenchGateRun(adapter, mockWorkflow, {
        runId,
        decision: 'reject',
        decidedBy: 'reviewer-001',
        reason: '存在严重 bug',
      });

      expect(result.ok).toBe(true);
      expect(result.data!.run.state).toBe('failed');
      expect(result.data!.run.currentStepId).toBeNull();
    });

    it('should record gate decision in step', async () => {
      const runId = await startAndAdvanceToGate();

      const result = await handleWorkbenchGateRun(adapter, mockWorkflow, {
        runId,
        decision: 'approve',
        decidedBy: 'reviewer-001',
        reason: '代码质量良好',
      });

      const gateStep = result.data!.steps[2]; // step-3 is gate
      expect(gateStep.execution.gateDecision).toBe('approve');
      expect(gateStep.execution.gateReason).toContain('代码质量良好');
    });

    it('should return error when not in waiting-gate state', async () => {
      const startResult = await startWorkbenchRun(adapter, baseConfig);
      const runId = startResult.data!.run.id;

      const result = await handleWorkbenchGateRun(adapter, mockWorkflow, {
        runId,
        decision: 'approve',
        decidedBy: 'reviewer-001',
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('INVALID_INPUT');
      expect(result.error?.message).toContain('not in waiting-gate');
    });

    it('should return error for non-existent run', async () => {
      const result = await handleWorkbenchGateRun(adapter, mockWorkflow, {
        runId: 'non-existent-run',
        decision: 'approve',
        decidedBy: 'reviewer-001',
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('DIRECTORY_NOT_FOUND');
    });
  });

  // ========================================================================
  // stopWorkbenchRun
  // ========================================================================
  describe('stopWorkbenchRun', () => {
    it('should stop a running workbench run', async () => {
      const startResult = await startWorkbenchRun(adapter, baseConfig);
      const runId = startResult.data!.run.id;

      const result = await stopWorkbenchRun(adapter, { runId });

      expect(result.ok).toBe(true);
      expect(result.data!.run.state).toBe('cancelled');
      expect(result.data!.activeProcessId).toBeUndefined();
    });

    it('should stop with a reason', async () => {
      const startResult = await startWorkbenchRun(adapter, baseConfig);
      const runId = startResult.data!.run.id;

      const result = await stopWorkbenchRun(adapter, {
        runId,
        reason: 'User requested',
      });

      expect(result.ok).toBe(true);
      expect(result.data!.run.error).toContain('User requested');
    });

    it('should clear active process mapping', async () => {
      const startResult = await startWorkbenchRun(adapter, baseConfig);
      const runId = startResult.data!.run.id;

      await stopWorkbenchRun(adapter, { runId });

      const mappings = getActiveProcessMappings();
      expect(mappings.has(runId)).toBe(false);
    });

    it('should return error for non-existent run', async () => {
      const result = await stopWorkbenchRun(adapter, { runId: 'non-existent-run' });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('DIRECTORY_NOT_FOUND');
    });
  });

  // ========================================================================
  // pauseWorkbenchRunAction
  // ========================================================================
  describe('pauseWorkbenchRunAction', () => {
    it('should pause a running workbench run', async () => {
      const startResult = await startWorkbenchRun(adapter, baseConfig);
      const runId = startResult.data!.run.id;

      const result = await pauseWorkbenchRunAction(adapter, runId);

      expect(result.ok).toBe(true);
      expect(result.data!.run.state).toBe('paused');
      // Active process should be cleared
      expect(result.data!.activeProcessId).toBeUndefined();
    });

    it('should clear active process on pause', async () => {
      const startResult = await startWorkbenchRun(adapter, baseConfig);
      const runId = startResult.data!.run.id;

      await pauseWorkbenchRunAction(adapter, runId);

      const mappings = getActiveProcessMappings();
      expect(mappings.has(runId)).toBe(false);
    });

    it('should not pause non-running run', async () => {
      const startResult = await startWorkbenchRun(adapter, baseConfig);
      const runId = startResult.data!.run.id;

      await stopWorkbenchRun(adapter, { runId });
      const result = await pauseWorkbenchRunAction(adapter, runId);

      expect(result.ok).toBe(false);
    });
  });

  // ========================================================================
  // resumeWorkbenchRunAction
  // ========================================================================
  describe('resumeWorkbenchRunAction', () => {
    it('should resume a paused workbench run', async () => {
      const startResult = await startWorkbenchRun(adapter, baseConfig);
      const runId = startResult.data!.run.id;

      await pauseWorkbenchRunAction(adapter, runId);
      const result = await resumeWorkbenchRunAction(adapter, mockWorkflow, runId);

      expect(result.ok).toBe(true);
      expect(result.data!.run.state).toBe('running');
      expect(result.data!.activeProcessId).toBeDefined();
    });

    it('should not resume non-paused run', async () => {
      const startResult = await startWorkbenchRun(adapter, baseConfig);
      const runId = startResult.data!.run.id;

      const result = await resumeWorkbenchRunAction(adapter, mockWorkflow, runId);

      expect(result.ok).toBe(false);
    });
  });

  // ========================================================================
  // listProjectWorkbenchRuns
  // ========================================================================
  describe('listProjectWorkbenchRuns', () => {
    it('should list runs for a project', async () => {
      await startWorkbenchRun(adapter, baseConfig);
      await startWorkbenchRun(adapter, baseConfig);

      const result = await listProjectWorkbenchRuns('proj-001');

      expect(result.ok).toBe(true);
      expect(result.data!.length).toBeGreaterThanOrEqual(2);
    });

    it('should return empty array for project with no runs', async () => {
      const result = await listProjectWorkbenchRuns('non-existent-project');

      expect(result.ok).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  // ========================================================================
  // getWorkbenchRunLogs
  // ========================================================================
  describe('getWorkbenchRunLogs', () => {
    it('should return logs for active process', async () => {
      const startResult = await startWorkbenchRun(adapter, baseConfig);
      const runId = startResult.data!.run.id;

      const result = await getWorkbenchRunLogs(adapter, runId);

      expect(result.ok).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should return empty array when no active process', async () => {
      const startResult = await startWorkbenchRun(adapter, baseConfig);
      const runId = startResult.data!.run.id;

      // Stop the run first
      await stopWorkbenchRun(adapter, { runId });

      const result = await getWorkbenchRunLogs(adapter, runId);

      expect(result.ok).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  // ========================================================================
  // Full lifecycle integration test
  // ========================================================================
  describe('full lifecycle', () => {
    it('should complete a full run-pause-resume-stop lifecycle', async () => {
      // Start
      const startResult = await startWorkbenchRun(adapter, baseConfig);
      const runId = startResult.data!.run.id;
      expect(startResult.data!.run.state).toBe('running');

      // Advance step 1
      const advance1 = await advanceWorkbenchStepRun(adapter, {
        runId,
        completedStepId: 'step-1',
        outputArtifacts: ['docs/requirements.md'],
        workflow: mockWorkflow,
      });
      expect(advance1.data!.run.currentStepId).toBe('step-2');

      // Pause
      const pauseResult = await pauseWorkbenchRunAction(adapter, runId);
      expect(pauseResult.data!.run.state).toBe('paused');

      // Resume
      const resumeResult = await resumeWorkbenchRunAction(adapter, mockWorkflow, runId);
      expect(resumeResult.data!.run.state).toBe('running');

      // Advance step 2 -> gate
      const advance2 = await advanceWorkbenchStepRun(adapter, {
        runId,
        completedStepId: 'step-2',
        outputArtifacts: ['src/components/'],
        workflow: mockWorkflow,
      });
      expect(advance2.data!.run.state).toBe('waiting-gate');

      // Approve gate
      const gateResult = await handleWorkbenchGateRun(adapter, mockWorkflow, {
        runId,
        decision: 'approve',
        decidedBy: 'reviewer-001',
        reason: 'LGTM',
      });
      expect(gateResult.data!.run.state).toBe('running');
      expect(gateResult.data!.run.currentStepId).toBe('step-4');

      // Advance last step -> complete
      const advance4 = await advanceWorkbenchStepRun(adapter, {
        runId,
        completedStepId: 'step-4',
        workflow: mockWorkflow,
      });
      expect(advance4.data!.run.state).toBe('completed');
      expect(advance4.data!.activeProcessId).toBeUndefined();
    });
  });

  // ========================================================================
  // clearActiveProcess / getActiveProcessMappings
  // ========================================================================
  describe('utility functions', () => {
    it('should clear active process', async () => {
      const startResult = await startWorkbenchRun(adapter, baseConfig);
      const runId = startResult.data!.run.id;

      expect(getActiveProcessMappings().has(runId)).toBe(true);
      clearActiveProcess(runId);
      expect(getActiveProcessMappings().has(runId)).toBe(false);
    });

    it('should return readonly copy of mappings', () => {
      const mappings1 = getActiveProcessMappings();
      const mappings2 = getActiveProcessMappings();
      // Different Map instances
      expect(mappings1).not.toBe(mappings2);
    });
  });

  // ========================================================================
  // Duplicate start check (Issue #28 Task 13: 防重复启动)
  // ========================================================================
  describe('duplicate start check', () => {
    it('should return the existing session when starting a task that already has a running process', async () => {
      // First start
      const first = await startWorkbenchRun(adapter, baseConfig);
      expect(first.ok).toBe(true);
      const firstRunId = first.data!.run.id;

      // Second start with the same task — should return existing session
      const second = await startWorkbenchRun(adapter, baseConfig);
      expect(second.ok).toBe(true);
      // Should return the same run, not a new one
      expect(second.data!.run.id).toBe(firstRunId);
      expect(second.diagnostics).toBeDefined();
      expect(second.diagnostics!.some(d => d.includes('Duplicate start prevented'))).toBe(true);
    });

    it('should track task->run mapping after start', async () => {
      expect(getTaskActiveRunId('task-001')).toBeUndefined();

      await startWorkbenchRun(adapter, baseConfig);

      expect(getTaskActiveRunId('task-001')).toBeDefined();
    });

    it('should allow restart after stop', async () => {
      // Start and stop
      const first = await startWorkbenchRun(adapter, baseConfig);
      const runId = first.data!.run.id;
      await stopWorkbenchRun(adapter, { runId, taskId: 'task-001' });

      // Should be clean now
      expect(getTaskActiveRunId('task-001')).toBeUndefined();

      // Start again — should succeed with a new run
      const second = await startWorkbenchRun(adapter, baseConfig);
      expect(second.ok).toBe(true);
      expect(second.data!.run.id).not.toBe(runId);
    });

    it('should allow different tasks to run concurrently', async () => {
      // Start first task
      const first = await startWorkbenchRun(adapter, baseConfig);
      expect(first.ok).toBe(true);

      // Start a different task
      const otherTask: Task = { ...mockTask, id: 'task-002' };
      const second = await startWorkbenchRun(adapter, {
        ...baseConfig,
        task: otherTask,
      });
      expect(second.ok).toBe(true);
      expect(second.data!.run.id).not.toBe(first.data!.run.id);

      // Both tasks should be tracked
      expect(getTaskActiveRunId('task-001')).toBeDefined();
      expect(getTaskActiveRunId('task-002')).toBeDefined();
    });

    it('checkDuplicateStart should return false when no active run exists', async () => {
      const result = await checkDuplicateStart(adapter, 'task-001');
      expect(result.duplicate).toBe(false);
    });

    it('checkDuplicateStart should return true with view when run is active', async () => {
      await startWorkbenchRun(adapter, baseConfig);

      const result = await checkDuplicateStart(adapter, 'task-001');
      expect(result.duplicate).toBe(true);
      if (result.duplicate) {
        expect(result.runId).toBeDefined();
        expect(result.view).not.toBeNull();
      }
    });

    it('getTaskRunMappings should reflect active task->run pairs', async () => {
      expect(getTaskRunMappings().size).toBe(0);

      await startWorkbenchRun(adapter, baseConfig);

      const mappings = getTaskRunMappings();
      expect(mappings.size).toBe(1);
      expect(mappings.has('task-001')).toBe(true);
    });

    it('should clean up task->run mapping when run is stopped with taskId', async () => {
      await startWorkbenchRun(adapter, baseConfig);
      const runId = getTaskActiveRunId('task-001')!;
      expect(runId).toBeDefined();

      await stopWorkbenchRun(adapter, { runId, taskId: 'task-001' });

      expect(getTaskActiveRunId('task-001')).toBeUndefined();
      expect(getTaskRunMappings().size).toBe(0);
    });

    it('should clean up task->run mapping when run is stopped without taskId (scan)', async () => {
      await startWorkbenchRun(adapter, baseConfig);
      const runId = getTaskActiveRunId('task-001')!;
      expect(runId).toBeDefined();

      // Stop without taskId — should still clean up via scan
      await stopWorkbenchRun(adapter, { runId });

      expect(getTaskActiveRunId('task-001')).toBeUndefined();
    });
  });

  // ========================================================================
  // Stale Session Detection & Recovery (Issue #28)
  // ========================================================================
  describe('stale session detection', () => {
    it('should detect non-stale session when process is running', async () => {
      const startResult = await startWorkbenchRun(adapter, baseConfig);
      const runId = startResult.data!.run.id;

      const result = await detectStaleSession(adapter, runId);

      expect(result.isStale).toBe(false);
      expect(result.runId).toBe(runId);
      expect(result.processState).toBe('running');
    });

    it('should detect stale session when process has exited', async () => {
      const startResult = await startWorkbenchRun(adapter, baseConfig);
      const runId = startResult.data!.run.id;

      // Stop the process directly (bypassing workbenchRun tracking)
      const mappings = getActiveProcessMappings();
      const processId = mappings.get(runId)!;

      // Stop the process through the adapter directly to simulate natural exit
      await adapter.stop(processId);

      // The process is now stopped, but the activeProcesses mapping still exists
      const result = await detectStaleSession(adapter, runId);

      expect(result.isStale).toBe(true);
      expect(result.runId).toBe(runId);
      expect(result.reason).toBeDefined();
      expect(result.processState).toBe('stopped');
    });

    it('should detect stale session when no process is tracked for a running run', async () => {
      const startResult = await startWorkbenchRun(adapter, baseConfig);
      const runId = startResult.data!.run.id;

      // Simulate page refresh: clear the process mapping but keep the WorkflowRun
      clearActiveProcess(runId);

      const result = await detectStaleSession(adapter, runId);

      expect(result.isStale).toBe(true);
      expect(result.reason).toContain('no process is tracked');
      expect(result.processState).toBe('not-tracked');
    });

    it('should detect stale session when adapter loses process info', async () => {
      const startResult = await startWorkbenchRun(adapter, baseConfig);
      const runId = startResult.data!.run.id;

      // Create a fresh adapter that doesn't know about the process
      const freshAdapter = new ProcessRunnerAdapter(adapterConfig);

      const result = await detectStaleSession(freshAdapter, runId);

      expect(result.isStale).toBe(true);
      expect(result.processState).toBe('not-found');
    });

    it('should return not-stale for completed runs', async () => {
      const startResult = await startWorkbenchRun(adapter, baseConfig);
      const runId = startResult.data!.run.id;

      // Complete the run
      await advanceWorkbenchStepRun(adapter, { runId, completedStepId: 'step-1', workflow: mockWorkflow });
      await advanceWorkbenchStepRun(adapter, { runId, completedStepId: 'step-2', workflow: mockWorkflow });
      await advanceWorkbenchStepRun(adapter, { runId, completedStepId: 'step-3', workflow: mockWorkflow });
      await advanceWorkbenchStepRun(adapter, { runId, completedStepId: 'step-4', workflow: mockWorkflow });

      const result = await detectStaleSession(adapter, runId);
      expect(result.isStale).toBe(false);
    });

    it('should return not-stale for non-existent run', async () => {
      const result = await detectStaleSession(adapter, 'non-existent-run');
      expect(result.isStale).toBe(false);
    });

    it('should not flag waiting-gate as stale when no process is tracked', async () => {
      // Advance to gate step (step-3 is manual gate)
      const startResult = await startWorkbenchRun(adapter, baseConfig);
      const runId = startResult.data!.run.id;
      await advanceWorkbenchStepRun(adapter, { runId, completedStepId: 'step-1', workflow: mockWorkflow });
      await advanceWorkbenchStepRun(adapter, { runId, completedStepId: 'step-2', workflow: mockWorkflow });

      const result = await detectStaleSession(adapter, runId);
      // waiting-gate should not be considered stale just because there's no process
      expect(result.isStale).toBe(false);
    });
  });

  // ========================================================================
  // Stale Session Recovery
  // ========================================================================
  describe('stale session recovery', () => {
    it('should recover from stale session and clean up tracking', async () => {
      const startResult = await startWorkbenchRun(adapter, baseConfig);
      const runId = startResult.data!.run.id;

      // Simulate stale: stop process through adapter directly
      const mappings = getActiveProcessMappings();
      const processId = mappings.get(runId)!;
      await adapter.stop(processId);

      // Verify it's stale
      const detection = await detectStaleSession(adapter, runId);
      expect(detection.isStale).toBe(true);

      // Recover
      const recovery = await recoverStaleSession(adapter, runId);
      expect(recovery.recovered).toBe(true);
      expect(recovery.runId).toBe(runId);

      // Process mapping should be cleaned
      expect(getActiveProcessMappings().has(runId)).toBe(false);
      // Task mapping should be cleaned
      expect(getTaskActiveRunId('task-001')).toBeUndefined();
    });

    it('should allow starting a new run after stale recovery', async () => {
      const startResult = await startWorkbenchRun(adapter, baseConfig);
      const runId = startResult.data!.run.id;

      // Make the session stale
      const mappings = getActiveProcessMappings();
      const processId = mappings.get(runId)!;
      await adapter.stop(processId);

      // Recover
      await recoverStaleSession(adapter, runId);

      // Should be able to start a new run
      const newStart = await startWorkbenchRun(adapter, baseConfig);
      expect(newStart.ok).toBe(true);
      expect(newStart.data!.run.id).not.toBe(runId);
    });

    it('should not recover when session is not stale', async () => {
      const startResult = await startWorkbenchRun(adapter, baseConfig);
      const runId = startResult.data!.run.id;

      const recovery = await recoverStaleSession(adapter, runId);
      expect(recovery.recovered).toBe(false);
    });

    it('should recover when no task mapping exists (orphaned process)', async () => {
      const startResult = await startWorkbenchRun(adapter, baseConfig);
      const runId = startResult.data!.run.id;

      // Simulate stale process
      const mappings = getActiveProcessMappings();
      const processId = mappings.get(runId)!;
      await adapter.stop(processId);

      // Remove the task mapping manually (simulating an orphaned process)
      resetAllState();
      // Re-add just the process mapping without the task mapping
      // This simulates an edge case
      const activeMappings = getActiveProcessMappings();

      // The process and task mappings are gone now, but the WorkflowRun still exists
      // Detecting on a run that has no process tracked should still be stale
      const detection = await detectStaleSession(adapter, runId);
      expect(detection.isStale).toBe(true);

      // Recovery should still work even without task mapping
      const recovery = await recoverStaleSession(adapter, runId);
      expect(recovery.recovered).toBe(true);
    });
  });

  // ========================================================================
  // Batch Stale Session Cleanup
  // ========================================================================
  describe('cleanupStaleSessions', () => {
    it('should clean up all stale sessions at once', async () => {
      // Start two runs for different tasks
      const run1 = await startWorkbenchRun(adapter, baseConfig);
      const otherTask: Task = { ...mockTask, id: 'task-002' };
      const run2 = await startWorkbenchRun(adapter, { ...baseConfig, task: otherTask });

      const runId1 = run1.data!.run.id;
      const runId2 = run2.data!.run.id;

      // Stop both processes through adapter directly (simulating natural exit)
      const mappings = getActiveProcessMappings();
      await adapter.stop(mappings.get(runId1)!);
      await adapter.stop(mappings.get(runId2)!);

      // Cleanup all stale sessions
      const result = await cleanupStaleSessions(adapter);

      expect(result.cleanedRunIds).toHaveLength(2);
      expect(result.cleanedRunIds).toContain(runId1);
      expect(result.cleanedRunIds).toContain(runId2);
      expect(result.errors).toHaveLength(0);
    });

    it('should not touch non-stale sessions', async () => {
      await startWorkbenchRun(adapter, baseConfig);

      const result = await cleanupStaleSessions(adapter);

      expect(result.cleanedRunIds).toHaveLength(0);
    });

    it('should handle mixed stale and active sessions', async () => {
      const run1 = await startWorkbenchRun(adapter, baseConfig);
      const otherTask: Task = { ...mockTask, id: 'task-002' };
      const run2 = await startWorkbenchRun(adapter, { ...baseConfig, task: otherTask });

      const runId1 = run1.data!.run.id;
      const runId2 = run2.data!.run.id;

      // Make only run1 stale
      const mappings = getActiveProcessMappings();
      await adapter.stop(mappings.get(runId1)!);

      const result = await cleanupStaleSessions(adapter);

      expect(result.cleanedRunIds).toHaveLength(1);
      expect(result.cleanedRunIds).toContain(runId1);
      // run2 should still be active
      expect(getActiveProcessMappings().has(runId2)).toBe(true);
    });
  });

  // ========================================================================
  // getWorkbenchRunView syncs stale state automatically
  // ========================================================================
  describe('automatic stale sync via getWorkbenchRunView', () => {
    it('should detect process exit and sync WorkflowRun to completed', async () => {
      const startResult = await startWorkbenchRun(adapter, baseConfig);
      const runId = startResult.data!.run.id;

      // Simulate normal process exit (exit code 0)
      const mappings = getActiveProcessMappings();
      const processId = mappings.get(runId)!;
      await adapter.stop(processId);

      // getWorkbenchRunView should detect the exit and sync the run state
      const viewResult = await getWorkbenchRunView(adapter, runId);

      expect(viewResult.ok).toBe(true);
      // The run should now be completed (exit code 0 = success)
      expect(viewResult.data!.run.state).toBe('completed');
      // Process mapping should be cleaned up
      expect(getActiveProcessMappings().has(runId)).toBe(false);
    });
  });
});
