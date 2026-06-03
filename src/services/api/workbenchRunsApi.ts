/**
 * Workbench Runs API Client
 *
 * Frontend API client for workbench run lifecycle operations.
 */
import { apiCall, type ApiResponse } from './client';
import type { WorkflowRun, WorkflowRunProgress } from '../../services/local/useCases/workflowExecutionUseCase';
import type { LogEntry } from '../../types/localEngineering';

/** Step with optional process info */
export interface StepWithProcessInfo {
  execution: {
    stepId: string;
    stepName: string;
    roleId: string;
    state: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    startedAt?: string;
    completedAt?: string;
    inputArtifacts: string[];
    outputArtifacts: string[];
    gateDecision?: 'approve' | 'reject' | 'auto';
    gateReason?: string;
    error?: string;
  };
  process?: {
    id: string;
    runnerId: string;
    pid?: number;
    state: string;
    startedAt?: string;
    logs: LogEntry[];
  };
}

/** Full workbench run view returned from API */
export interface WorkbenchRunView {
  run: WorkflowRun;
  steps: StepWithProcessInfo[];
  activeProcessId?: string;
}

/** Params for starting a workbench run */
export interface StartWorkbenchRunParams {
  projectId: string;
  taskId: string;
  workflowId: string;
  triggeredBy?: string;
  runnerKind?: string;
  cwd: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
}

/** Params for advancing a step */
export interface AdvanceStepParams {
  completedStepId: string;
  workflowId: string;
  outputArtifacts?: string[];
  error?: string;
}

/** Params for gate decision */
export interface GateDecisionParams {
  decision: 'approve' | 'reject';
  decidedBy: string;
  reason?: string;
  workflowId: string;
}

/** Params for resuming a run */
export interface ResumeRunParams {
  workflowId: string;
  cwd?: string;
}

export const workbenchRunsApi = {
  /**
   * Start a new workbench run
   */
  start: (params: StartWorkbenchRunParams) =>
    apiCall<WorkbenchRunView>('POST', '/workbench-runs/start', params),

  /**
   * Get workbench run status with step/process info
   */
  getRun: (runId: string) =>
    apiCall<WorkbenchRunView>('GET', `/workbench-runs/${runId}`),

  /**
   * Get workbench run progress summary
   */
  getProgress: (runId: string) =>
    apiCall<WorkflowRunProgress>('GET', `/workbench-runs/${runId}/progress`),

  /**
   * Get logs for the active runner process
   */
  getLogs: (runId: string) =>
    apiCall<LogEntry[]>('GET', `/workbench-runs/${runId}/logs`),

  /**
   * Advance to the next step
   */
  advanceStep: (runId: string, params: AdvanceStepParams) =>
    apiCall<WorkbenchRunView>('POST', `/workbench-runs/${runId}/advance`, params),

  /**
   * Handle gate decision
   */
  handleGate: (runId: string, params: GateDecisionParams) =>
    apiCall<WorkbenchRunView>('POST', `/workbench-runs/${runId}/gate`, params),

  /**
   * Stop a workbench run
   */
  stop: (runId: string, reason?: string) =>
    apiCall<WorkbenchRunView>('POST', `/workbench-runs/${runId}/stop`, { reason }),

  /**
   * Pause a workbench run
   */
  pause: (runId: string) =>
    apiCall<WorkbenchRunView>('POST', `/workbench-runs/${runId}/pause`),

  /**
   * Resume a paused workbench run
   */
  resume: (runId: string, params: ResumeRunParams) =>
    apiCall<WorkbenchRunView>('POST', `/workbench-runs/${runId}/resume`, params),

  /**
   * List all workbench runs for a project
   */
  listByProject: (projectId: string) =>
    apiCall<WorkflowRun[]>('GET', `/workbench-runs/project/${projectId}`),
};
