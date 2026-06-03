import { describe, it, expect, beforeEach } from 'vitest';
import {
  type WorkflowEvent,
  type WorkflowEventType,
  type WorkflowEventBase,
  type WorkflowEventHandler,
  type WorkflowEventEmitter,
  type RunCreatedEvent,
  type RunStartedEvent,
  type RunPausedEvent,
  type RunResumedEvent,
  type RunCompletedEvent,
  type RunFailedEvent,
  type RunCancelledEvent,
  type StepStartedEvent,
  type StepCompletedEvent,
  type StepFailedEvent,
  type StepSkippedEvent,
  type GateOpenedEvent,
  type GateApprovedEvent,
  type GateRejectedEvent,
  type RunnerStartedEvent,
  type RunnerStoppedEvent,
  type RunnerLogEvent,
  type ArtifactProducedEvent,
  type RunErrorEvent,
  createEventBase,
  generateEventId,
  resetEventCounter,
} from '../../domain/workflowEvent';

describe('WorkflowEvent', () => {
  beforeEach(() => {
    resetEventCounter();
  });

  describe('generateEventId', () => {
    it('generates unique IDs', () => {
      const id1 = generateEventId();
      const id2 = generateEventId();
      expect(id1).not.toBe(id2);
    });

    it('starts with evt- prefix', () => {
      const id = generateEventId();
      expect(id).toMatch(/^evt-/);
    });
  });

  describe('createEventBase', () => {
    it('creates a base event with all required fields', () => {
      const base = createEventBase('RUN_CREATED', 'run-1', 'proj-1', 'wf-1');

      expect(base.id).toMatch(/^evt-/);
      expect(base.type).toBe('RUN_CREATED');
      expect(base.timestamp).toBeTruthy();
      expect(base.runId).toBe('run-1');
      expect(base.projectId).toBe('proj-1');
      expect(base.workflowId).toBe('wf-1');
    });

    it('produces valid ISO 8601 timestamps', () => {
      const base = createEventBase('RUN_STARTED', 'run-1', 'proj-1', 'wf-1');
      const parsed = new Date(base.timestamp);
      expect(parsed.getTime()).not.toBeNaN();
    });
  });

  describe('event type discrimination', () => {
    it('each event type has a corresponding payload shape', () => {
      const allTypes: WorkflowEventType[] = [
        'RUN_CREATED',
        'RUN_STARTED',
        'RUN_PAUSED',
        'RUN_RESUMED',
        'RUN_COMPLETED',
        'RUN_FAILED',
        'RUN_CANCELLED',
        'STEP_STARTED',
        'STEP_COMPLETED',
        'STEP_FAILED',
        'STEP_SKIPPED',
        'GATE_OPENED',
        'GATE_APPROVED',
        'GATE_REJECTED',
        'RUNNER_STARTED',
        'RUNNER_STOPPED',
        'RUNNER_LOG',
        'ARTIFACT_PRODUCED',
        'RUN_ERROR',
      ];

      // 19 distinct event types
      expect(allTypes).toHaveLength(19);
      expect(new Set(allTypes).size).toBe(19);
    });

    it('can narrow events by type in a switch', () => {
      const events: WorkflowEvent[] = [
        {
          ...createEventBase('RUN_CREATED', 'run-1', 'proj-1', 'wf-1'),
          type: 'RUN_CREATED',
          payload: { triggeredBy: 'user', totalSteps: 4 },
        },
        {
          ...createEventBase('STEP_COMPLETED', 'run-1', 'proj-1', 'wf-1'),
          type: 'STEP_COMPLETED',
          payload: {
            stepId: 'step-1',
            stepName: 'Planning',
            roleId: 'planner',
            stepIndex: 0,
            outputArtifacts: ['artifact-1'],
            durationMs: 5000,
          },
        },
        {
          ...createEventBase('GATE_APPROVED', 'run-1', 'proj-1', 'wf-1'),
          type: 'GATE_APPROVED',
          payload: {
            stepId: 'step-3',
            stepName: 'Review',
            decidedBy: 'lead',
            reason: 'Looks good',
          },
        },
      ];

      // Discriminated union narrowing
      const runEvents: string[] = [];
      const stepEvents: string[] = [];
      const gateEvents: string[] = [];

      for (const event of events) {
        switch (event.type) {
          case 'RUN_CREATED':
            runEvents.push(event.payload.triggeredBy);
            break;
          case 'STEP_COMPLETED':
            stepEvents.push(event.payload.stepName);
            break;
          case 'GATE_APPROVED':
            gateEvents.push(event.payload.decidedBy);
            break;
        }
      }

      expect(runEvents).toEqual(['user']);
      expect(stepEvents).toEqual(['Planning']);
      expect(gateEvents).toEqual(['lead']);
    });
  });

  describe('full lifecycle event sequence', () => {
    it('can represent a complete workflow run lifecycle', () => {
      const lifecycle: WorkflowEvent[] = [
        {
          ...createEventBase('RUN_CREATED', 'run-1', 'proj-1', 'wf-1'),
          type: 'RUN_CREATED',
          payload: { triggeredBy: 'user', totalSteps: 3 },
        },
        {
          ...createEventBase('RUN_STARTED', 'run-1', 'proj-1', 'wf-1'),
          type: 'RUN_STARTED',
          payload: { triggeredBy: 'user', firstStepId: 's1', firstStepName: 'Plan' },
        },
        {
          ...createEventBase('STEP_STARTED', 'run-1', 'proj-1', 'wf-1'),
          type: 'STEP_STARTED',
          payload: { stepId: 's1', stepName: 'Plan', roleId: 'planner', stepIndex: 0, inputArtifacts: [] },
        },
        {
          ...createEventBase('RUNNER_STARTED', 'run-1', 'proj-1', 'wf-1'),
          type: 'RUNNER_STARTED',
          payload: { stepId: 's1', processId: 'proc-1', runnerKind: 'claude-code' },
        },
        {
          ...createEventBase('RUNNER_LOG', 'run-1', 'proj-1', 'wf-1'),
          type: 'RUNNER_LOG',
          payload: { stepId: 's1', processId: 'proc-1', stream: 'stdout', content: 'Planning...' },
        },
        {
          ...createEventBase('RUNNER_STOPPED', 'run-1', 'proj-1', 'wf-1'),
          type: 'RUNNER_STOPPED',
          payload: { stepId: 's1', processId: 'proc-1', exitCode: 0, reason: 'completed' },
        },
        {
          ...createEventBase('STEP_COMPLETED', 'run-1', 'proj-1', 'wf-1'),
          type: 'STEP_COMPLETED',
          payload: { stepId: 's1', stepName: 'Plan', roleId: 'planner', stepIndex: 0, outputArtifacts: ['plan.md'], durationMs: 3000 },
        },
        {
          ...createEventBase('STEP_STARTED', 'run-1', 'proj-1', 'wf-1'),
          type: 'STEP_STARTED',
          payload: { stepId: 's2', stepName: 'Review', roleId: 'reviewer', stepIndex: 1, inputArtifacts: ['plan.md'] },
        },
        {
          ...createEventBase('GATE_OPENED', 'run-1', 'proj-1', 'wf-1'),
          type: 'GATE_OPENED',
          payload: { stepId: 's2', stepName: 'Review', gateType: 'manual', requiredDeciderRoleId: 'lead' },
        },
        {
          ...createEventBase('GATE_APPROVED', 'run-1', 'proj-1', 'wf-1'),
          type: 'GATE_APPROVED',
          payload: { stepId: 's2', stepName: 'Review', decidedBy: 'lead', reason: 'Approved' },
        },
        {
          ...createEventBase('RUN_COMPLETED', 'run-1', 'proj-1', 'wf-1'),
          type: 'RUN_COMPLETED',
          payload: { completedSteps: 3, totalSteps: 3, durationMs: 10000 },
        },
      ];

      // Verify all events have required base fields
      for (const event of lifecycle) {
        expect(event.id).toMatch(/^evt-/);
        expect(event.timestamp).toBeTruthy();
        expect(event.runId).toBe('run-1');
        expect(event.projectId).toBe('proj-1');
        expect(event.workflowId).toBe('wf-1');
      }

      // Verify the lifecycle covers all phases
      const types = lifecycle.map(e => e.type);
      expect(types).toContain('RUN_CREATED');
      expect(types).toContain('RUN_STARTED');
      expect(types).toContain('STEP_STARTED');
      expect(types).toContain('RUNNER_STARTED');
      expect(types).toContain('RUNNER_LOG');
      expect(types).toContain('RUNNER_STOPPED');
      expect(types).toContain('STEP_COMPLETED');
      expect(types).toContain('GATE_OPENED');
      expect(types).toContain('GATE_APPROVED');
      expect(types).toContain('RUN_COMPLETED');
    });

    it('can represent a failed run lifecycle', () => {
      const failedEvents: WorkflowEvent[] = [
        {
          ...createEventBase('RUN_CREATED', 'run-2', 'proj-1', 'wf-1'),
          type: 'RUN_CREATED',
          payload: { triggeredBy: 'user', totalSteps: 2 },
        },
        {
          ...createEventBase('STEP_FAILED', 'run-2', 'proj-1', 'wf-1'),
          type: 'STEP_FAILED',
          payload: { stepId: 's1', stepName: 'Build', roleId: 'dev', stepIndex: 0, error: 'Compilation failed' },
        },
        {
          ...createEventBase('RUN_FAILED', 'run-2', 'proj-1', 'wf-1'),
          type: 'RUN_FAILED',
          payload: { failedAtStepId: 's1', failedAtStepName: 'Build', error: 'Compilation failed' },
        },
      ];

      expect(failedEvents[1].type).toBe('STEP_FAILED');
      if (failedEvents[1].type === 'STEP_FAILED') {
        expect(failedEvents[1].payload.error).toBe('Compilation failed');
      }

      expect(failedEvents[2].type).toBe('RUN_FAILED');
      if (failedEvents[2].type === 'RUN_FAILED') {
        expect(failedEvents[2].payload.failedAtStepName).toBe('Build');
      }
    });

    it('can represent a cancelled run', () => {
      const cancelledEvent: RunCancelledEvent = {
        ...createEventBase('RUN_CANCELLED', 'run-3', 'proj-1', 'wf-1'),
        type: 'RUN_CANCELLED',
        payload: { reason: 'User requested', cancelledBy: 'user' },
      };

      expect(cancelledEvent.type).toBe('RUN_CANCELLED');
      expect(cancelledEvent.payload.reason).toBe('User requested');
    });

    it('can represent a paused and resumed run', () => {
      const pausedEvent: RunPausedEvent = {
        ...createEventBase('RUN_PAUSED', 'run-4', 'proj-1', 'wf-1'),
        type: 'RUN_PAUSED',
        payload: { pausedAtStepId: 's1', pausedAtStepName: 'Build' },
      };

      const resumedEvent: RunResumedEvent = {
        ...createEventBase('RUN_RESUMED', 'run-4', 'proj-1', 'wf-1'),
        type: 'RUN_RESUMED',
        payload: { resumedAtStepId: 's1', resumedAtStepName: 'Build' },
      };

      expect(pausedEvent.type).toBe('RUN_PAUSED');
      expect(resumedEvent.type).toBe('RUN_RESUMED');
    });
  });

  describe('edge cases', () => {
    it('STEP_SKIPPED carries a reason', () => {
      const skippedEvent: StepSkippedEvent = {
        ...createEventBase('STEP_SKIPPED', 'run-1', 'proj-1', 'wf-1'),
        type: 'STEP_SKIPPED',
        payload: { stepId: 's2', stepName: 'Optional Review', stepIndex: 1, reason: 'Gate auto-approved' },
      };

      expect(skippedEvent.payload.reason).toBe('Gate auto-approved');
    });

    it('ARTIFACT_PRODUCED carries location', () => {
      const artifactEvent: ArtifactProducedEvent = {
        ...createEventBase('ARTIFACT_PRODUCED', 'run-1', 'proj-1', 'wf-1'),
        type: 'ARTIFACT_PRODUCED',
        payload: {
          stepId: 's1',
          artifactId: 'plan-md',
          artifactType: 'markdown',
          location: 'outputs/plan.md',
        },
      };

      expect(artifactEvent.payload.location).toBe('outputs/plan.md');
    });

    it('RUN_ERROR is recoverable or not', () => {
      const recoverableError: RunErrorEvent = {
        ...createEventBase('RUN_ERROR', 'run-1', 'proj-1', 'wf-1'),
        type: 'RUN_ERROR',
        payload: { stepId: 's1', errorCode: 'TIMEOUT', message: 'Runner timed out', recoverable: true },
      };

      const fatalError: RunErrorEvent = {
        ...createEventBase('RUN_ERROR', 'run-1', 'proj-1', 'wf-1'),
        type: 'RUN_ERROR',
        payload: { errorCode: 'PERMISSION_DENIED', message: 'No access', recoverable: false },
      };

      expect(recoverableError.payload.recoverable).toBe(true);
      expect(fatalError.payload.recoverable).toBe(false);
      expect(fatalError.payload.stepId).toBeUndefined();
    });

    it('GATE_REJECTED carries optional reason', () => {
      const rejected: GateRejectedEvent = {
        ...createEventBase('GATE_REJECTED', 'run-1', 'proj-1', 'wf-1'),
        type: 'GATE_REJECTED',
        payload: { stepId: 's2', stepName: 'Review', decidedBy: 'lead' },
      };

      expect(rejected.payload.reason).toBeUndefined();
    });
  });

  describe('WorkflowEventEmitter interface contract', () => {
    it('defines the expected interface shape', () => {
      // This test validates the interface contract exists and is structurally correct.
      // We create a mock implementation to verify it satisfies the interface.
      const mockEmitter: WorkflowEventEmitter = {
        emit: () => {},
        subscribe: () => () => {},
        on: () => () => {},
        onRun: () => () => {},
        clear: () => {},
      };

      expect(typeof mockEmitter.emit).toBe('function');
      expect(typeof mockEmitter.subscribe).toBe('function');
      expect(typeof mockEmitter.on).toBe('function');
      expect(typeof mockEmitter.onRun).toBe('function');
      expect(typeof mockEmitter.clear).toBe('function');
    });
  });
});
