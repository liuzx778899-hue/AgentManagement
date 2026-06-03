/**
 * WorkflowEventUseCase Tests
 *
 * Tests the event-emitting orchestration functions that wrap
 * workflowExecutionUseCase and runnerUseCase.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getWorkflowEventEmitter,
  resetWorkflowEventEmitter,
  createEventedWorkflowRun,
  startEventedWorkbenchRun,
  advanceEventedStep,
  handleEventedGate,
  pauseEventedRun,
  resumeEventedRun,
  cancelEventedRun,
  emitRunnerLogEvent,
  emitRunnerStoppedEvent,
  emitRunErrorEvent,
  emitStepSkippedEvent,
  getRunEvents,
  getAllEvents,
  resetEventUseCaseState,
} from '../../../services/local/useCases/workflowEventUseCase';
import { workflowRuns } from '../../../services/local/useCases/workflowExecutionUseCase';
import type { WorkflowEvent } from '../../../domain/workflowEvent';
import type { Workflow, WorkflowStep } from '../../../domain/workflow';
import type { Project } from '../../../domain/project';
import type { Task } from '../../../domain/task';
import type { LocalResult, RunnerProcess } from '../../../types/localEngineering';
import { ProcessRunnerAdapter } from '../../../services/local/adapters/processRunnerAdapter';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

function makeWorkflowStep(overrides: Partial<WorkflowStep> = {}): WorkflowStep {
  return {
    id: 's1',
    order: 0,
    name: 'Plan',
    roleId: 'planner',
    modelProviderId: 'anthropic',
    modelName: 'claude-3',
    inputs: [],
    outputs: [],
    gateMode: 'auto',
    gateType: 'auto',
    failureStrategy: 'stop',
    projectOverride: false,
    ...overrides,
  };
}

const mockWorkflow: Workflow = {
  id: 'wf-test-1',
  name: 'Test Workflow',
  version: '1.0.0',
  status: 'active',
  description: 'Test workflow for events',
  steps: [
    makeWorkflowStep({ id: 's1', order: 0, name: 'Plan', roleId: 'planner', gateType: 'auto' }),
    makeWorkflowStep({ id: 's2', order: 1, name: 'Review', roleId: 'reviewer', gateType: 'manual' }),
    makeWorkflowStep({ id: 's3', order: 2, name: 'Build', roleId: 'builder', gateType: 'auto' }),
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockProject: Project = {
  id: 'proj-test-1',
  name: 'Test Project',
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
    previewCommand: 'npm run preview',
    detectedStack: 'react',
    riskSummary: 'low',
  },
  workflowTemplateId: 'wf-test-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockTask: Task = {
  id: 'task-test-1',
  projectId: 'proj-test-1',
  goal: 'Test the event use case',
  acceptanceCriteria: ['Passes all tests'],
  workflowTemplateId: 'wf-test-1',
  roleAssignment: { planner: 'role-1' },
  capabilityAuthorization: [],
  launchStrategy: 'worktree',
  status: 'running',
  activeRunId: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function createMockAdapter(): ProcessRunnerAdapter {
  const mockProcess: RunnerProcess = {
    id: 'proc-1',
    runnerId: 'runner-1',
    state: 'running',
    pid: 1234,
    startedAt: new Date().toISOString(),
  };

  return {
    config: { projectRoot: '/test' },
    start: vi.fn(async () => ({ ok: true, data: mockProcess } as LocalResult<RunnerProcess>)),
    stop: vi.fn(async () => ({ ok: true })),
    getLogs: vi.fn(async () => ({ ok: true, data: [] })),
    getStatus: vi.fn(async () => ({ ok: true, data: mockProcess })),
    listProcesses: vi.fn(async () => ({ ok: true, data: [] })),
    on: vi.fn(() => () => {}),
    removeAllListeners: vi.fn(),
  } as unknown as ProcessRunnerAdapter;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WorkflowEventUseCase', () => {
  beforeEach(() => {
    resetWorkflowEventEmitter();
    resetEventUseCaseState();
    workflowRuns.clear();
  });

  describe('getWorkflowEventEmitter', () => {
    it('returns the global emitter instance', () => {
      const emitter = getWorkflowEventEmitter();
      expect(emitter).toBeDefined();
      expect(typeof emitter.emit).toBe('function');
      expect(typeof emitter.subscribe).toBe('function');
      expect(typeof emitter.on).toBe('function');
      expect(typeof emitter.onRun).toBe('function');
      expect(typeof emitter.clear).toBe('function');
    });

    it('subscriberCount reflects active subscriptions', () => {
      const emitter = getWorkflowEventEmitter();
      expect(emitter.subscriberCount).toBe(0);

      const unsub1 = emitter.subscribe(() => {});
      expect(emitter.subscriberCount).toBe(1);

      const unsub2 = emitter.on('RUN_STARTED', () => {});
      expect(emitter.subscriberCount).toBe(2);

      const unsub3 = emitter.onRun('run-1', () => {});
      expect(emitter.subscriberCount).toBe(3);

      unsub1();
      unsub2();
      unsub3();
      expect(emitter.subscriberCount).toBe(0);
    });
  });

  describe('createEventedWorkflowRun', () => {
    it('creates a run and emits RUN_CREATED, RUN_STARTED, STEP_STARTED events', async () => {
      const events: WorkflowEvent[] = [];
      const emitter = getWorkflowEventEmitter();
      emitter.subscribe((e) => events.push(e));

      const result = await createEventedWorkflowRun({
        workflow: mockWorkflow,
        project: mockProject,
        triggeredBy: 'user',
      });

      expect(result.ok).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.state).toBe('running');
      expect(result.data!.id).toMatch(/^run-/);

      // Check emitted events
      expect(events).toHaveLength(3);
      expect(events[0].type).toBe('RUN_CREATED');
      expect(events[0].payload).toMatchObject({ triggeredBy: 'user', totalSteps: 3 });
      expect(events[0].runId).toBe(result.data!.id);

      expect(events[1].type).toBe('RUN_STARTED');
      expect(events[1].payload).toMatchObject({ triggeredBy: 'user', firstStepId: 's1', firstStepName: 'Plan' });

      expect(events[2].type).toBe('STEP_STARTED');
      expect(events[2].payload).toMatchObject({ stepId: 's1', stepName: 'Plan', stepIndex: 0 });
    });

    it('returns error for workflow with no steps', async () => {
      const emptyWorkflow: Workflow = { ...mockWorkflow, steps: [] };
      const result = await createEventedWorkflowRun({
        workflow: emptyWorkflow,
        project: mockProject,
        triggeredBy: 'user',
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('INVALID_INPUT');
    });
  });

  describe('startEventedWorkbenchRun', () => {
    it('starts a run with runner process and emits events', async () => {
      const events: WorkflowEvent[] = [];
      const emitter = getWorkflowEventEmitter();
      emitter.subscribe((e) => events.push(e));

      const adapter = createMockAdapter();

      const result = await startEventedWorkbenchRun(adapter, {
        workflow: mockWorkflow,
        project: mockProject,
        task: mockTask,
        triggeredBy: 'user',
        runnerKind: 'claude-code',
        cwd: '/test/cwd',
      });

      expect(result.ok).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.run.id).toMatch(/^run-/);
      expect(result.data!.processId).toBe('proc-1');

      // Check events: RUN_CREATED, RUN_STARTED, STEP_STARTED, RUNNER_STARTED
      const types = events.map((e) => e.type);
      expect(types).toContain('RUN_CREATED');
      expect(types).toContain('RUN_STARTED');
      expect(types).toContain('STEP_STARTED');
      expect(types).toContain('RUNNER_STARTED');

      const runnerStarted = events.find((e) => e.type === 'RUNNER_STARTED');
      expect(runnerStarted?.payload).toMatchObject({
        stepId: 's1',
        processId: 'proc-1',
        runnerKind: 'claude-code',
      });
    });

    it('prevents duplicate start for the same task', async () => {
      const adapter = createMockAdapter();

      const result1 = await startEventedWorkbenchRun(adapter, {
        workflow: mockWorkflow,
        project: mockProject,
        task: mockTask,
        triggeredBy: 'user',
        runnerKind: 'claude-code',
        cwd: '/test/cwd',
      });

      expect(result1.ok).toBe(true);

      // Second start attempt
      const result2 = await startEventedWorkbenchRun(adapter, {
        workflow: mockWorkflow,
        project: mockProject,
        task: mockTask,
        triggeredBy: 'user',
        runnerKind: 'claude-code',
        cwd: '/test/cwd',
      });

      expect(result2.ok).toBe(false);
      expect(result2.error?.code).toBe('DUPLICATE_START');
    });
  });

  describe('advanceEventedStep', () => {
    it('advances step and emits STEP_COMPLETED, STEP_STARTED events', async () => {
      const adapter = createMockAdapter();
      const runResult = await startEventedWorkbenchRun(adapter, {
        workflow: mockWorkflow,
        project: mockProject,
        task: mockTask,
        triggeredBy: 'user',
        runnerKind: 'claude-code',
        cwd: '/test/cwd',
      });

      resetWorkflowEventEmitter(); // Clear previous events
      const events: WorkflowEvent[] = [];
      getWorkflowEventEmitter().subscribe((e) => events.push(e));

      const advanceResult = await advanceEventedStep({
        runId: runResult.data!.run.id,
        completedStepId: 's1',
        outputArtifacts: ['artifact-1'],
        workflow: mockWorkflow,
      });

      expect(advanceResult.ok).toBe(true);
      expect(advanceResult.data!.currentStepId).toBe('s2');

      const types = events.map((e) => e.type);
      expect(types).toContain('STEP_COMPLETED');
      expect(types).toContain('ARTIFACT_PRODUCED');
      // Note: next step s2 has gateType: 'manual', so we expect GATE_OPENED

      const stepCompleted = events.find((e) => e.type === 'STEP_COMPLETED');
      expect(stepCompleted?.payload).toMatchObject({
        stepId: 's1',
        stepName: 'Plan',
        outputArtifacts: ['artifact-1'],
      });

      const artifactEvent = events.find((e) => e.type === 'ARTIFACT_PRODUCED');
      expect(artifactEvent?.payload).toMatchObject({
        stepId: 's1',
        artifactId: 'artifact-1',
      });

      const gateOpened = events.find((e) => e.type === 'GATE_OPENED');
      expect(gateOpened).toBeDefined();
    });

    it('emits RUN_COMPLETED when advancing past last step', async () => {
      // Create a single-step workflow
      const singleStepWorkflow: Workflow = {
        ...mockWorkflow,
        steps: [makeWorkflowStep({ id: 's1', order: 0, name: 'Only Step', gateType: 'auto' })],
      };
      const adapter = createMockAdapter();

      const runResult = await startEventedWorkbenchRun(adapter, {
        workflow: singleStepWorkflow,
        project: mockProject,
        task: mockTask,
        triggeredBy: 'user',
        runnerKind: 'claude-code',
        cwd: '/test/cwd',
      });

      resetWorkflowEventEmitter();
      const events: WorkflowEvent[] = [];
      getWorkflowEventEmitter().subscribe((e) => events.push(e));

      const advanceResult = await advanceEventedStep({
        runId: runResult.data!.run.id,
        completedStepId: 's1',
        workflow: singleStepWorkflow,
      });

      expect(advanceResult.ok).toBe(true);
      expect(advanceResult.data!.state).toBe('completed');

      const types = events.map((e) => e.type);
      expect(types).toContain('STEP_COMPLETED');
      expect(types).toContain('RUN_COMPLETED');

      const runCompleted = events.find((e) => e.type === 'RUN_COMPLETED');
      expect(runCompleted?.payload).toMatchObject({
        completedSteps: 1,
        totalSteps: 1,
      });
    });

    it('emits STEP_FAILED and RUN_FAILED on error', async () => {
      const adapter = createMockAdapter();
      const runResult = await startEventedWorkbenchRun(adapter, {
        workflow: mockWorkflow,
        project: mockProject,
        task: mockTask,
        triggeredBy: 'user',
        runnerKind: 'claude-code',
        cwd: '/test/cwd',
      });

      resetWorkflowEventEmitter();
      const events: WorkflowEvent[] = [];
      getWorkflowEventEmitter().subscribe((e) => events.push(e));

      const advanceResult = await advanceEventedStep({
        runId: runResult.data!.run.id,
        completedStepId: 's1',
        error: 'Build failed',
        workflow: mockWorkflow,
      });

      expect(advanceResult.ok).toBe(true);
      expect(advanceResult.data!.state).toBe('failed');

      const types = events.map((e) => e.type);
      expect(types).toContain('STEP_FAILED');
      expect(types).toContain('RUN_FAILED');

      const runFailed = events.find((e) => e.type === 'RUN_FAILED');
      expect(runFailed?.payload).toMatchObject({
        failedAtStepId: 's1',
        failedAtStepName: 'Plan',
        error: 'Build failed',
      });
    });
  });

  describe('handleEventedGate', () => {
    it('approves gate and emits GATE_APPROVED, STEP_COMPLETED, STEP_STARTED', async () => {
      const adapter = createMockAdapter();
      const runResult = await startEventedWorkbenchRun(adapter, {
        workflow: mockWorkflow,
        project: mockProject,
        task: mockTask,
        triggeredBy: 'user',
        runnerKind: 'claude-code',
        cwd: '/test/cwd',
      });

      // Advance to gate step (s2 has gateType: manual)
      await advanceEventedStep({
        runId: runResult.data!.run.id,
        completedStepId: 's1',
        workflow: mockWorkflow,
      });

      resetWorkflowEventEmitter();
      const events: WorkflowEvent[] = [];
      getWorkflowEventEmitter().subscribe((e) => events.push(e));

      const gateResult = await handleEventedGate({
        runId: runResult.data!.run.id,
        decision: 'approve',
        decidedBy: 'lead',
        reason: 'Looks good',
        workflow: mockWorkflow,
      });

      expect(gateResult.ok).toBe(true);

      const types = events.map((e) => e.type);
      expect(types).toContain('GATE_APPROVED');
      expect(types).toContain('STEP_COMPLETED');

      const gateApproved = events.find((e) => e.type === 'GATE_APPROVED');
      expect(gateApproved?.payload).toMatchObject({
        stepId: 's2',
        stepName: 'Review',
        decidedBy: 'lead',
        reason: 'Looks good',
      });
    });

    it('rejects gate and emits GATE_REJECTED, RUN_FAILED', async () => {
      const adapter = createMockAdapter();
      const runResult = await startEventedWorkbenchRun(adapter, {
        workflow: mockWorkflow,
        project: mockProject,
        task: mockTask,
        triggeredBy: 'user',
        runnerKind: 'claude-code',
        cwd: '/test/cwd',
      });

      await advanceEventedStep({
        runId: runResult.data!.run.id,
        completedStepId: 's1',
        workflow: mockWorkflow,
      });

      resetWorkflowEventEmitter();
      const events: WorkflowEvent[] = [];
      getWorkflowEventEmitter().subscribe((e) => events.push(e));

      const gateResult = await handleEventedGate({
        runId: runResult.data!.run.id,
        decision: 'reject',
        decidedBy: 'lead',
        reason: 'Not ready',
        workflow: mockWorkflow,
      });

      expect(gateResult.ok).toBe(true);
      expect(gateResult.data!.state).toBe('failed');

      const types = events.map((e) => e.type);
      expect(types).toContain('GATE_REJECTED');
      expect(types).toContain('STEP_FAILED');
      expect(types).toContain('RUN_FAILED');

      const gateRejected = events.find((e) => e.type === 'GATE_REJECTED');
      expect(gateRejected?.payload).toMatchObject({
        stepId: 's2',
        stepName: 'Review',
        decidedBy: 'lead',
        reason: 'Not ready',
      });
    });
  });

  describe('pauseEventedRun', () => {
    it('pauses run and emits RUN_PAUSED', async () => {
      const adapter = createMockAdapter();
      const runResult = await startEventedWorkbenchRun(adapter, {
        workflow: mockWorkflow,
        project: mockProject,
        task: mockTask,
        triggeredBy: 'user',
        runnerKind: 'claude-code',
        cwd: '/test/cwd',
      });

      resetWorkflowEventEmitter();
      const events: WorkflowEvent[] = [];
      getWorkflowEventEmitter().subscribe((e) => events.push(e));

      const pauseResult = await pauseEventedRun(runResult.data!.run.id);

      expect(pauseResult.ok).toBe(true);
      expect(pauseResult.data!.state).toBe('paused');

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('RUN_PAUSED');
      expect(events[0].payload).toMatchObject({
        pausedAtStepId: 's1',
        pausedAtStepName: 'Plan',
      });
    });
  });

  describe('resumeEventedRun', () => {
    it('resumes run and emits RUN_RESUMED', async () => {
      const adapter = createMockAdapter();
      const runResult = await startEventedWorkbenchRun(adapter, {
        workflow: mockWorkflow,
        project: mockProject,
        task: mockTask,
        triggeredBy: 'user',
        runnerKind: 'claude-code',
        cwd: '/test/cwd',
      });

      await pauseEventedRun(runResult.data!.run.id);

      resetWorkflowEventEmitter();
      const events: WorkflowEvent[] = [];
      getWorkflowEventEmitter().subscribe((e) => events.push(e));

      const resumeResult = await resumeEventedRun(runResult.data!.run.id);

      expect(resumeResult.ok).toBe(true);
      expect(resumeResult.data!.state).toBe('running');

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('RUN_RESUMED');
      expect(events[0].payload).toMatchObject({
        resumedAtStepId: 's1',
        resumedAtStepName: 'Plan',
      });
    });
  });

  describe('cancelEventedRun', () => {
    it('cancels run and emits RUN_CANCELLED', async () => {
      const adapter = createMockAdapter();
      const runResult = await startEventedWorkbenchRun(adapter, {
        workflow: mockWorkflow,
        project: mockProject,
        task: mockTask,
        triggeredBy: 'user',
        runnerKind: 'claude-code',
        cwd: '/test/cwd',
      });

      resetWorkflowEventEmitter();
      const events: WorkflowEvent[] = [];
      getWorkflowEventEmitter().subscribe((e) => events.push(e));

      const cancelResult = await cancelEventedRun(runResult.data!.run.id, 'User requested', 'user');

      expect(cancelResult.ok).toBe(true);
      expect(cancelResult.data!.state).toBe('cancelled');

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('RUN_CANCELLED');
      expect(events[0].payload).toMatchObject({
        reason: 'User requested',
        cancelledBy: 'user',
      });
    });
  });

  describe('emit helpers', () => {
    it('emitRunnerLogEvent emits RUNNER_LOG event', () => {
      const events: WorkflowEvent[] = [];
      getWorkflowEventEmitter().subscribe((e) => events.push(e));

      emitRunnerLogEvent(
        { runId: 'run-1', projectId: 'proj-1', workflowId: 'wf-1' },
        's1',
        'proc-1',
        'stdout',
        'Hello world'
      );

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('RUNNER_LOG');
      expect(events[0].payload).toMatchObject({
        stepId: 's1',
        processId: 'proc-1',
        stream: 'stdout',
        content: 'Hello world',
      });
    });

    it('emitRunnerStoppedEvent emits RUNNER_STOPPED event', () => {
      const events: WorkflowEvent[] = [];
      getWorkflowEventEmitter().subscribe((e) => events.push(e));

      emitRunnerStoppedEvent(
        { runId: 'run-1', projectId: 'proj-1', workflowId: 'wf-1' },
        's1',
        'proc-1',
        0,
        'completed'
      );

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('RUNNER_STOPPED');
      expect(events[0].payload).toMatchObject({
        stepId: 's1',
        processId: 'proc-1',
        exitCode: 0,
        reason: 'completed',
      });
    });

    it('emitRunErrorEvent emits RUN_ERROR event', () => {
      const events: WorkflowEvent[] = [];
      getWorkflowEventEmitter().subscribe((e) => events.push(e));

      emitRunErrorEvent(
        { runId: 'run-1', projectId: 'proj-1', workflowId: 'wf-1' },
        'TIMEOUT',
        'Process timed out',
        true,
        's1'
      );

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('RUN_ERROR');
      expect(events[0].payload).toMatchObject({
        stepId: 's1',
        errorCode: 'TIMEOUT',
        message: 'Process timed out',
        recoverable: true,
      });
    });

    it('emitStepSkippedEvent emits STEP_SKIPPED event', () => {
      const events: WorkflowEvent[] = [];
      getWorkflowEventEmitter().subscribe((e) => events.push(e));

      emitStepSkippedEvent(
        { runId: 'run-1', projectId: 'proj-1', workflowId: 'wf-1' },
        's1',
        'Optional Step',
        2,
        'Gate auto-approved'
      );

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('STEP_SKIPPED');
      expect(events[0].payload).toMatchObject({
        stepId: 's1',
        stepName: 'Optional Step',
        stepIndex: 2,
        reason: 'Gate auto-approved',
      });
    });
  });

  describe('event history', () => {
    it('getRunEvents returns events for a specific run', async () => {
      const adapter = createMockAdapter();
      const runResult = await startEventedWorkbenchRun(adapter, {
        workflow: mockWorkflow,
        project: mockProject,
        task: mockTask,
        triggeredBy: 'user',
        runnerKind: 'claude-code',
        cwd: '/test/cwd',
      });

      const events = getRunEvents(runResult.data!.run.id);
      expect(events.length).toBeGreaterThan(0);
      expect(events.every((e) => e.runId === runResult.data!.run.id)).toBe(true);
    });

    it('getAllEvents returns all events', async () => {
      const adapter = createMockAdapter();
      await startEventedWorkbenchRun(adapter, {
        workflow: mockWorkflow,
        project: mockProject,
        task: mockTask,
        triggeredBy: 'user',
        runnerKind: 'claude-code',
        cwd: '/test/cwd',
      });

      const events = getAllEvents();
      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe('subscriber patterns', () => {
    it('on() filters by event type', async () => {
      const runCreatedEvents: WorkflowEvent[] = [];
      const stepEvents: WorkflowEvent[] = [];

      const emitter = getWorkflowEventEmitter();
      emitter.on('RUN_CREATED', (e) => runCreatedEvents.push(e));
      emitter.on('STEP_STARTED', (e) => stepEvents.push(e));

      const adapter = createMockAdapter();
      await startEventedWorkbenchRun(adapter, {
        workflow: mockWorkflow,
        project: mockProject,
        task: mockTask,
        triggeredBy: 'user',
        runnerKind: 'claude-code',
        cwd: '/test/cwd',
      });

      expect(runCreatedEvents).toHaveLength(1);
      expect(runCreatedEvents[0].type).toBe('RUN_CREATED');

      expect(stepEvents).toHaveLength(1);
      expect(stepEvents[0].type).toBe('STEP_STARTED');
    });

    it('onRun() filters by runId', async () => {
      const eventsForRun: WorkflowEvent[] = [];

      const adapter = createMockAdapter();
      const runResult = await startEventedWorkbenchRun(adapter, {
        workflow: mockWorkflow,
        project: mockProject,
        task: mockTask,
        triggeredBy: 'user',
        runnerKind: 'claude-code',
        cwd: '/test/cwd',
      });

      const emitter = getWorkflowEventEmitter();
      emitter.onRun(runResult.data!.run.id, (e) => eventsForRun.push(e));

      // Emit another event to a different run
      emitRunnerLogEvent(
        { runId: 'other-run', projectId: 'p1', workflowId: 'w1' },
        's1',
        'p1',
        'stdout',
        'test'
      );

      const runEvents = getRunEvents(runResult.data!.run.id);
      // The onRun subscriber should only receive events for that run
      expect(eventsForRun.length).toBe(0); // No new events for that run after subscription
    });
  });
});
