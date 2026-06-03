import type { Workflow, WorkflowStep } from '../../../domain/workflow';
import type { Project } from '../../../domain/project';
import type { LocalResult } from '../../../types/localEngineering';
import {
  type WorkflowEvent,
  createEventBase,
} from '../../../domain/workflowEvent';
import { workflowEventEmitter } from '../workflowEventEmitter';

/**
 * Workflow 运行状态
 */
export type WorkflowRunState =
  | 'pending'
  | 'running'
  | 'waiting-gate'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * 步骤执行记录
 */
export interface StepExecution {
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
}

/**
 * Workflow 运行实例
 */
export interface WorkflowRun {
  id: string;
  workflowId: string;
  workflowVersion: string;
  projectId: string;
  projectName: string;
  state: WorkflowRunState;
  currentStepId: string | null;
  currentStepIndex: number;
  steps: StepExecution[];
  triggeredBy: string;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

/**
 * 创建运行配置
 */
export interface CreateWorkflowRunConfig {
  workflow: Workflow;
  project: Project;
  triggeredBy: string;
}

/**
 * 运行进度
 */
export interface WorkflowRunProgress {
  totalSteps: number;
  completedSteps: number;
  currentStep: string;
  percentage: number;
  state: WorkflowRunState;
}

// 简单的运行实例存储（实际应该持久化）
export const workflowRuns = new Map<string, WorkflowRun>();

/**
 * 生成运行 ID
 */
function generateRunId(): string {
  return `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 创建 Workflow 运行实例
 */
export async function createWorkflowRun(
  config: CreateWorkflowRunConfig
): Promise<LocalResult<WorkflowRun>> {
  const { workflow, project, triggeredBy } = config;

  // 验证
  if (!workflow.steps || workflow.steps.length === 0) {
    return {
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'Workflow 没有步骤',
        recoverable: false,
      },
    };
  }

  const now = new Date().toISOString();
  const runId = generateRunId();

  // 初始化步骤执行记录
  const stepExecutions: StepExecution[] = workflow.steps.map((step: WorkflowStep, index: number) => ({
    stepId: step.id,
    stepName: step.name,
    roleId: step.roleId || '',
    state: index === 0 ? 'running' : 'pending',
    inputArtifacts: [],
    outputArtifacts: [],
  }));

  const run: WorkflowRun = {
    id: runId,
    workflowId: workflow.id,
    workflowVersion: workflow.version,
    projectId: project.id,
    projectName: project.name,
    state: 'running',
    currentStepId: workflow.steps[0].id,
    currentStepIndex: 0,
    steps: stepExecutions,
    triggeredBy,
    startedAt: now,
  };

  // 存储
  workflowRuns.set(runId, run);

  // 发出 RUN_CREATED 和 RUN_STARTED 事件
  emitRunCreatedEvent(run, triggeredBy, workflow.steps.length);
  emitRunStartedEvent(run, triggeredBy, workflow.steps[0]);

  return {
    ok: true,
    data: run,
    diagnostics: [`创建 Workflow 运行: ${runId}`, `当前步骤: ${workflow.steps[0].name}`],
  };
}

/**
 * 推进工作流步骤配置
 */
export interface AdvanceWorkflowStepConfig {
  run: WorkflowRun;
  workflow: Workflow;
  completedStepId: string;
  outputArtifacts?: string[];
  error?: string;
}

/**
 * 推进到下一步
 */
export async function advanceWorkflowStep(
  config: AdvanceWorkflowStepConfig
): Promise<LocalResult<WorkflowRun>> {
  const { run, workflow, completedStepId, outputArtifacts, error } = config;

  // 验证完成的是当前步骤，防止跳步
  if (run.currentStepId !== completedStepId) {
    return {
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: `当前步骤是 ${run.currentStepId}，不能完成 ${completedStepId}`,
        recoverable: false,
      },
    };
  }

  // 找到完成的步骤索引
  const completedIndex = run.steps.findIndex(s => s.stepId === completedStepId);
  if (completedIndex === -1) {
    return {
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: `步骤不存在: ${completedStepId}`,
        recoverable: false,
      },
    };
  }

  // 更新完成的步骤
  const updatedSteps = [...run.steps];
  updatedSteps[completedIndex] = {
    ...updatedSteps[completedIndex],
    state: error ? 'failed' : 'completed',
    completedAt: new Date().toISOString(),
    outputArtifacts: outputArtifacts || [],
    error,
  };

  // 如果步骤失败，整个运行失败
  if (error) {
    const failedRun: WorkflowRun = {
      ...run,
      steps: updatedSteps,
      state: 'failed',
      currentStepId: null,
      error,
      completedAt: new Date().toISOString(),
    };
    workflowRuns.set(run.id, failedRun);
    // 发出 STEP_FAILED 和 RUN_FAILED 事件
    emitStepFailedEvent(failedRun, updatedSteps[completedIndex], completedIndex, error);
    emitRunFailedEvent(failedRun, completedStepId, updatedSteps[completedIndex].stepName, error);
    return { ok: true, data: failedRun };
  }

  // 发出 STEP_COMPLETED 事件
  const startTime = run.steps[completedIndex].startedAt ? new Date(run.steps[completedIndex].startedAt!).getTime() : Date.now();
  const durationMs = Date.now() - startTime;
  emitStepCompletedEvent(run, updatedSteps[completedIndex], completedIndex, durationMs);

  // 检查下一步
  const nextIndex = completedIndex + 1;

  // 如果是最后一步，完成运行
  if (nextIndex >= workflow.steps.length) {
    const completedRun: WorkflowRun = {
      ...run,
      steps: updatedSteps,
      state: 'completed',
      currentStepId: null,
      currentStepIndex: -1,
      completedAt: new Date().toISOString(),
    };
    workflowRuns.set(run.id, completedRun);
    // 发出 RUN_COMPLETED 事件
    const completedStepsCount = updatedSteps.filter(s => s.state === 'completed').length;
    const runDurationMs = new Date(completedRun.completedAt!).getTime() - new Date(run.startedAt).getTime();
    emitRunCompletedEvent(completedRun, completedStepsCount, runDurationMs);
    return { ok: true, data: completedRun };
  }

  const nextStep = workflow.steps[nextIndex];

  // 检查下一步是否是 Gate
  const isGate = nextStep.gateType === 'manual';
  const newState: WorkflowRunState = isGate ? 'waiting-gate' : 'running';

  // 更新下一步状态
  updatedSteps[nextIndex] = {
    ...updatedSteps[nextIndex],
    state: 'running',
    startedAt: new Date().toISOString(),
    // 传递上一步的输出作为输入
    inputArtifacts: outputArtifacts || [],
  };

  const advancedRun: WorkflowRun = {
    ...run,
    steps: updatedSteps,
    state: newState,
    currentStepId: nextStep.id,
    currentStepIndex: nextIndex,
  };

  workflowRuns.set(run.id, advancedRun);

  // 发出 STEP_STARTED 或 GATE_OPENED 事件
  if (isGate) {
    emitGateOpenedEvent(advancedRun, nextStep, nextStep.roleId || '');
  } else {
    emitStepStartedEvent(advancedRun, nextStep, nextIndex, outputArtifacts || []);
  }

  return {
    ok: true,
    data: advancedRun,
    diagnostics: [`推进到步骤: ${nextStep.name}`, isGate ? '等待 Gate 决策' : '继续执行'],
  };
}

/**
 * Gate 决策配置
 */
export interface HandleWorkflowGateConfig {
  run: WorkflowRun;
  decision: 'approve' | 'reject';
  decidedBy: string;
  reason?: string;
}

/**
 * 处理 Gate 决策
 */
export async function handleWorkflowGate(
  config: HandleWorkflowGateConfig
): Promise<LocalResult<WorkflowRun>> {
  const { run, decision, decidedBy, reason } = config;

  if (run.state !== 'waiting-gate') {
    return {
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: '当前不在 Gate 等待状态',
        recoverable: false,
      },
    };
  }

  const currentStepIndex = run.currentStepIndex;
  const updatedSteps = [...run.steps];

  // 记录 Gate 决策
  updatedSteps[currentStepIndex] = {
    ...updatedSteps[currentStepIndex],
    gateDecision: decision,
    gateReason: reason,
    completedAt: new Date().toISOString(),
  };

  if (decision === 'reject') {
    // Gate 拒绝，运行失败
    const failedRun: WorkflowRun = {
      ...run,
      steps: updatedSteps,
      state: 'failed',
      currentStepId: null,
      error: `Gate 被拒绝: ${reason || '无原因'}`,
      completedAt: new Date().toISOString(),
    };
    workflowRuns.set(run.id, failedRun);
    // 发出 GATE_REJECTED 和 RUN_FAILED 事件
    const currentStep = updatedSteps[currentStepIndex];
    emitGateRejectedEvent(failedRun, currentStep.stepId, currentStep.stepName, decidedBy, reason);
    emitRunFailedEvent(failedRun, currentStep.stepId, currentStep.stepName, failedRun.error || 'Gate rejected');
    return { ok: true, data: failedRun };
  }

  // Gate 通过，继续执行
  // 发出 GATE_APPROVED 事件
  const gateStep = updatedSteps[currentStepIndex];
  emitGateApprovedEvent(run, gateStep.stepId, gateStep.stepName, decidedBy, reason);

  // 标记当前步骤完成
  updatedSteps[currentStepIndex].state = 'completed';

  // 检查是否有下一步
  const nextIndex = currentStepIndex + 1;

  // 假设我们知道 workflow 的 steps 长度（需要传入或存储）
  // 这里简化处理
  const totalSteps = run.steps.length;

  if (nextIndex >= totalSteps) {
    // 运行完成
    const completedRun: WorkflowRun = {
      ...run,
      steps: updatedSteps,
      state: 'completed',
      currentStepId: null,
      currentStepIndex: -1,
      completedAt: new Date().toISOString(),
    };
    workflowRuns.set(run.id, completedRun);
    // 发出 RUN_COMPLETED 事件
    const completedStepsCount = updatedSteps.filter(s => s.state === 'completed').length;
    const runDurationMs = new Date(completedRun.completedAt!).getTime() - new Date(run.startedAt).getTime();
    emitRunCompletedEvent(completedRun, completedStepsCount, runDurationMs);
    return { ok: true, data: completedRun };
  }

  // 继续下一步
  // 收集之前所有步骤的输出制品作为下一步的输入
  const accumulatedArtifacts = updatedSteps
    .slice(0, currentStepIndex + 1)
    .flatMap(s => s.outputArtifacts || []);

  updatedSteps[nextIndex] = {
    ...updatedSteps[nextIndex],
    state: 'running',
    startedAt: new Date().toISOString(),
    inputArtifacts: accumulatedArtifacts,
  };

  const continuedRun: WorkflowRun = {
    ...run,
    steps: updatedSteps,
    state: 'running',
    currentStepIndex: nextIndex,
    currentStepId: updatedSteps[nextIndex].stepId,
  };

  workflowRuns.set(run.id, continuedRun);

  // 发出 STEP_STARTED 事件
  const nextStepExec = updatedSteps[nextIndex];
  emitStepStartedEvent(continuedRun, { id: nextStepExec.stepId, name: nextStepExec.stepName, roleId: nextStepExec.roleId } as WorkflowStep, nextIndex, accumulatedArtifacts);

  return {
    ok: true,
    data: continuedRun,
    diagnostics: [`Gate 通过: ${reason || '批准'}`, `继续步骤: ${updatedSteps[nextIndex].stepName}`],
  };
}

/**
 * 获取运行状态
 */
export async function getWorkflowRunStatus(
  runId: string
): Promise<LocalResult<WorkflowRunProgress>> {
  const run = workflowRuns.get(runId);

  if (!run) {
    return {
      ok: false,
      error: {
        code: 'DIRECTORY_NOT_FOUND',
        message: `运行实例不存在: ${runId}`,
        recoverable: false,
      },
    };
  }

  const completedSteps = run.steps.filter(
    s => s.state === 'completed' || s.state === 'skipped'
  ).length;

  const currentStep = run.steps[run.currentStepIndex];

  return {
    ok: true,
    data: {
      totalSteps: run.steps.length,
      completedSteps,
      currentStep: currentStep?.stepName || '已完成',
      percentage: Math.round((completedSteps / run.steps.length) * 100),
      state: run.state,
    },
  };
}

/**
 * 暂停运行
 */
export async function pauseWorkflowRun(
  runId: string
): Promise<LocalResult<WorkflowRun>> {
  const run = workflowRuns.get(runId);

  if (!run) {
    return {
      ok: false,
      error: {
        code: 'DIRECTORY_NOT_FOUND',
        message: `运行实例不存在: ${runId}`,
        recoverable: false,
      },
    };
  }

  if (run.state !== 'running') {
    return {
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: '只能暂停运行中的工作流',
        recoverable: false,
      },
    };
  }

  const pausedRun: WorkflowRun = {
    ...run,
    state: 'paused',
  };

  workflowRuns.set(runId, pausedRun);

  // 发出 RUN_PAUSED 事件
  emitRunPausedEvent(pausedRun);

  return { ok: true, data: pausedRun };
}

/**
 * 恢复运行
 */
export async function resumeWorkflowRun(
  runId: string
): Promise<LocalResult<WorkflowRun>> {
  const run = workflowRuns.get(runId);

  if (!run) {
    return {
      ok: false,
      error: {
        code: 'DIRECTORY_NOT_FOUND',
        message: `运行实例不存在: ${runId}`,
        recoverable: false,
      },
    };
  }

  if (run.state !== 'paused') {
    return {
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: '只能恢复暂停的工作流',
        recoverable: false,
      },
    };
  }

  const resumedRun: WorkflowRun = {
    ...run,
    state: 'running',
  };

  workflowRuns.set(runId, resumedRun);

  return { ok: true, data: resumedRun };
}

/**
 * 取消运行
 */
export async function cancelWorkflowRun(
  runId: string,
  reason?: string
): Promise<LocalResult<WorkflowRun>> {
  const run = workflowRuns.get(runId);

  if (!run) {
    return {
      ok: false,
      error: {
        code: 'DIRECTORY_NOT_FOUND',
        message: `运行实例不存在: ${runId}`,
        recoverable: false,
      },
    };
  }

  if (run.state === 'completed' || run.state === 'failed' || run.state === 'cancelled') {
    return {
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: '已完成/失败/取消的工作流不能再取消',
        recoverable: false,
      },
    };
  }

  const cancelledRun: WorkflowRun = {
    ...run,
    state: 'cancelled',
    completedAt: new Date().toISOString(),
    error: reason || '用户取消',
  };

  workflowRuns.set(runId, cancelledRun);

  return {
    ok: true,
    data: cancelledRun,
    diagnostics: [`取消原因: ${reason || '用户取消'}`],
  };
}

/**
 * 列出项目的所有运行
 */
export async function listProjectWorkflowRuns(
  projectId: string
): Promise<LocalResult<WorkflowRun[]>> {
  const runs = Array.from(workflowRuns.values()).filter(r => r.projectId === projectId);
  return { ok: true, data: runs };
}

/**
 * 获取运行详情
 */
export async function getWorkflowRun(
  runId: string
): Promise<LocalResult<WorkflowRun>> {
  const run = workflowRuns.get(runId);

  if (!run) {
    return {
      ok: false,
      error: {
        code: 'DIRECTORY_NOT_FOUND',
        message: `运行实例不存在: ${runId}`,
        recoverable: false,
      },
    };
  }

  return { ok: true, data: run };
}

// ---------------------------------------------------------------------------
// Event Emission Helpers
// ---------------------------------------------------------------------------

/**
 * Emit RUN_CREATED event
 */
function emitRunCreatedEvent(run: WorkflowRun, triggeredBy: string, totalSteps: number): void {
  const event: WorkflowEvent = {
    ...createEventBase('RUN_CREATED', run.id, run.projectId, run.workflowId),
    type: 'RUN_CREATED',
    payload: {
      triggeredBy,
      totalSteps,
    },
  };
  workflowEventEmitter.emit(event);
}

/**
 * Emit RUN_STARTED event
 */
function emitRunStartedEvent(run: WorkflowRun, triggeredBy: string, firstStep: WorkflowStep): void {
  const event: WorkflowEvent = {
    ...createEventBase('RUN_STARTED', run.id, run.projectId, run.workflowId),
    type: 'RUN_STARTED',
    payload: {
      triggeredBy,
      firstStepId: firstStep.id,
      firstStepName: firstStep.name,
    },
  };
  workflowEventEmitter.emit(event);
}

/**
 * Emit STEP_STARTED event
 */
function emitStepStartedEvent(run: WorkflowRun, step: WorkflowStep, stepIndex: number, inputArtifacts: string[]): void {
  const event: WorkflowEvent = {
    ...createEventBase('STEP_STARTED', run.id, run.projectId, run.workflowId),
    type: 'STEP_STARTED',
    payload: {
      stepId: step.id,
      stepName: step.name,
      roleId: step.roleId || '',
      stepIndex,
      inputArtifacts,
    },
  };
  workflowEventEmitter.emit(event);
}

/**
 * Emit STEP_COMPLETED event
 */
function emitStepCompletedEvent(run: WorkflowRun, step: StepExecution, stepIndex: number, durationMs: number): void {
  const event: WorkflowEvent = {
    ...createEventBase('STEP_COMPLETED', run.id, run.projectId, run.workflowId),
    type: 'STEP_COMPLETED',
    payload: {
      stepId: step.stepId,
      stepName: step.stepName,
      roleId: step.roleId,
      stepIndex,
      outputArtifacts: step.outputArtifacts,
      durationMs,
    },
  };
  workflowEventEmitter.emit(event);
}

/**
 * Emit STEP_FAILED event
 */
function emitStepFailedEvent(run: WorkflowRun, step: StepExecution, stepIndex: number, error: string): void {
  const event: WorkflowEvent = {
    ...createEventBase('STEP_FAILED', run.id, run.projectId, run.workflowId),
    type: 'STEP_FAILED',
    payload: {
      stepId: step.stepId,
      stepName: step.stepName,
      roleId: step.roleId,
      stepIndex,
      error,
    },
  };
  workflowEventEmitter.emit(event);
}

/**
 * Emit RUN_COMPLETED event
 */
function emitRunCompletedEvent(run: WorkflowRun, completedSteps: number, durationMs: number): void {
  const event: WorkflowEvent = {
    ...createEventBase('RUN_COMPLETED', run.id, run.projectId, run.workflowId),
    type: 'RUN_COMPLETED',
    payload: {
      completedSteps,
      totalSteps: run.steps.length,
      durationMs,
    },
  };
  workflowEventEmitter.emit(event);
}

/**
 * Emit RUN_FAILED event
 */
function emitRunFailedEvent(run: WorkflowRun, failedAtStepId: string, failedAtStepName: string, error: string): void {
  const event: WorkflowEvent = {
    ...createEventBase('RUN_FAILED', run.id, run.projectId, run.workflowId),
    type: 'RUN_FAILED',
    payload: {
      failedAtStepId,
      failedAtStepName,
      error,
    },
  };
  workflowEventEmitter.emit(event);
}

/**
 * Emit RUN_PAUSED event
 */
function emitRunPausedEvent(run: WorkflowRun): void {
  const currentStep = run.steps[run.currentStepIndex];
  const event: WorkflowEvent = {
    ...createEventBase('RUN_PAUSED', run.id, run.projectId, run.workflowId),
    type: 'RUN_PAUSED',
    payload: {
      pausedAtStepId: currentStep?.stepId || '',
      pausedAtStepName: currentStep?.stepName || '',
    },
  };
  workflowEventEmitter.emit(event);
}

/**
 * Emit RUN_RESUMED event
 */
function emitRunResumedEvent(run: WorkflowRun): void {
  const currentStep = run.steps[run.currentStepIndex];
  const event: WorkflowEvent = {
    ...createEventBase('RUN_RESUMED', run.id, run.projectId, run.workflowId),
    type: 'RUN_RESUMED',
    payload: {
      resumedAtStepId: currentStep?.stepId || '',
      resumedAtStepName: currentStep?.stepName || '',
    },
  };
  workflowEventEmitter.emit(event);
}

/**
 * Emit RUN_CANCELLED event
 */
function emitRunCancelledEvent(run: WorkflowRun, reason: string, cancelledBy: string): void {
  const event: WorkflowEvent = {
    ...createEventBase('RUN_CANCELLED', run.id, run.projectId, run.workflowId),
    type: 'RUN_CANCELLED',
    payload: {
      reason,
      cancelledBy,
    },
  };
  workflowEventEmitter.emit(event);
}

/**
 * Emit GATE_OPENED event
 */
function emitGateOpenedEvent(run: WorkflowRun, step: WorkflowStep, requiredDeciderRoleId: string): void {
  const event: WorkflowEvent = {
    ...createEventBase('GATE_OPENED', run.id, run.projectId, run.workflowId),
    type: 'GATE_OPENED',
    payload: {
      stepId: step.id,
      stepName: step.name,
      gateType: 'manual',
      requiredDeciderRoleId,
    },
  };
  workflowEventEmitter.emit(event);
}

/**
 * Emit GATE_APPROVED event
 */
function emitGateApprovedEvent(run: WorkflowRun, stepId: string, stepName: string, decidedBy: string, reason?: string): void {
  const event: WorkflowEvent = {
    ...createEventBase('GATE_APPROVED', run.id, run.projectId, run.workflowId),
    type: 'GATE_APPROVED',
    payload: {
      stepId,
      stepName,
      decidedBy,
      reason,
    },
  };
  workflowEventEmitter.emit(event);
}

/**
 * Emit GATE_REJECTED event
 */
function emitGateRejectedEvent(run: WorkflowRun, stepId: string, stepName: string, decidedBy: string, reason?: string): void {
  const event: WorkflowEvent = {
    ...createEventBase('GATE_REJECTED', run.id, run.projectId, run.workflowId),
    type: 'GATE_REJECTED',
    payload: {
      stepId,
      stepName,
      decidedBy,
      reason,
    },
  };
  workflowEventEmitter.emit(event);
}