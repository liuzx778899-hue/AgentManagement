import { useState, useCallback, useMemo } from 'react';
import { Play, Pause, RotateCcw, Square, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useLocalServices } from '../hooks/useLocalServices';
import type { WorkflowTemplate } from '../domain/workflow';

interface PwWorkflowControlProps {
  projectId: string;
  templates: WorkflowTemplate[];
  currentRunId?: string;
  currentStepIndex?: number;
  onRunChange?: (runId: string | null) => void;
}

type RunState = 'idle' | 'running' | 'paused' | 'completed' | 'failed';

export function PwWorkflowControl({
  projectId,
  templates,
  currentRunId,
  currentStepIndex = 0,
  onRunChange,
}: PwWorkflowControlProps) {
  const services = useLocalServices();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    templates[0]?.id ?? ''
  );
  const [runState, setRunState] = useState<RunState>('idle');
  const [runId, setRunId] = useState<string | null>(currentRunId ?? null);
  const [error, setError] = useState<string | null>(null);

  // Get selected template for step progress
  const selectedTemplate = useMemo(() => {
    return templates.find(t => t.id === selectedTemplateId);
  }, [templates, selectedTemplateId]);

  // Calculate step progress
  const stepProgress = useMemo(() => {
    if (!selectedTemplate || selectedTemplate.steps.length === 0) {
      return { completed: 0, total: 0, pct: 0, currentStepName: null };
    }
    const total = selectedTemplate.steps.length;
    const completed = runState === 'completed' ? total : currentStepIndex;
    const pct = Math.round((completed / total) * 100);
    const currentStepName = runState === 'running' || runState === 'paused'
      ? selectedTemplate.steps[currentStepIndex]?.name ?? null
      : null;
    return { completed, total, pct, currentStepName };
  }, [selectedTemplate, currentStepIndex, runState]);

  const handleStart = useCallback(async () => {
    if (!selectedTemplateId || !services.createWorkflowRun) return;

    setError(null);
    setRunState('running');

    const result = await services.createWorkflowRun(projectId, selectedTemplateId);

    if (result.ok) {
      setRunId(result.data!.runId);
      onRunChange?.(result.data!.runId);
    } else {
      setRunState('idle');
      setError(result.error?.message ?? '启动失败');
    }
  }, [selectedTemplateId, projectId, services, onRunChange]);

  const handlePause = useCallback(async () => {
    if (!runId || !services.pauseWorkflowRun) return;

    const result = await services.pauseWorkflowRun(runId);
    if (result.ok) {
      setRunState('paused');
    } else {
      setError(result.error?.message ?? '暂停失败');
    }
  }, [runId, services]);

  const handleResume = useCallback(async () => {
    if (!runId || !services.resumeWorkflowRun) return;

    const result = await services.resumeWorkflowRun(runId);
    if (result.ok) {
      setRunState('running');
    } else {
      setError(result.error?.message ?? '恢复失败');
    }
  }, [runId, services]);

  const handleCancel = useCallback(async () => {
    if (!runId || !services.cancelWorkflowRun) return;

    const result = await services.cancelWorkflowRun(runId);
    if (result.ok) {
      setRunState('idle');
      setRunId(null);
      onRunChange?.(null);
    } else {
      setError(result.error?.message ?? '取消失败');
    }
  }, [runId, services, onRunChange]);

  const stateColors: Record<RunState, string> = {
    idle: 'var(--muted)',
    running: 'var(--ok)',
    paused: 'var(--warn)',
    completed: 'var(--ok)',
    failed: 'var(--danger)',
  };

  return (
    <div className="pw-workflow-control">
      <header className="pw-wfc-header">
        <h3>
          <ChevronRight size={18} />
          工作流执行
        </h3>
        <span className="pw-wfc-status" style={{ color: stateColors[runState] }}>
          {runState.toUpperCase()}
        </span>
      </header>

      {/* Step Progress Section */}
      {(runState === 'running' || runState === 'paused' || runState === 'completed') && stepProgress.total > 0 && (
        <div className="pw-wfc-progress">
          <div className="pw-wfc-progress-header">
            <span className="pw-wfc-progress-label">
              步骤进度
            </span>
            <span className="pw-wfc-progress-count">
              {stepProgress.completed} / {stepProgress.total}
            </span>
          </div>
          <div className="pw-wfc-progress-bar">
            <div
              className="pw-wfc-progress-fill"
              style={{ width: `${stepProgress.pct}%` }}
            />
          </div>
          {stepProgress.currentStepName && (
            <div className="pw-wfc-current-step">
              <span className="pw-wfc-current-step-label">当前步骤:</span>
              <span className="pw-wfc-current-step-name">{stepProgress.currentStepName}</span>
            </div>
          )}
          {runState === 'completed' && (
            <div className="pw-wfc-completed">
              <CheckCircle2 size={14} />
              <span>工作流已完成</span>
            </div>
          )}
        </div>
      )}

      <div className="pw-wfc-body">
        {runState === 'idle' && (
          <div className="pw-wfc-start">
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="pw-wfc-select"
              aria-label="选择工作流模板"
            >
              <option value="">选择工作流模板...</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (v{t.version})
                </option>
              ))}
            </select>

            <button
              className="btn primary"
              onClick={handleStart}
              disabled={!selectedTemplateId}
              aria-label="启动工作流"
            >
              <Play size={14} />
              启动工作流
            </button>
          </div>
        )}

        {runState === 'running' && (
          <div className="pw-wfc-controls">
            <button
              className="btn"
              onClick={handlePause}
              aria-label="暂停"
            >
              <Pause size={14} />
              暂停
            </button>
            <button
              className="btn danger"
              onClick={handleCancel}
              aria-label="取消"
            >
              <Square size={14} />
              取消
            </button>
          </div>
        )}

        {runState === 'paused' && (
          <div className="pw-wfc-controls">
            <button
              className="btn primary"
              onClick={handleResume}
              aria-label="恢复"
            >
              <RotateCcw size={14} />
              恢复
            </button>
            <button
              className="btn danger"
              onClick={handleCancel}
              aria-label="取消"
            >
              <Square size={14} />
              取消
            </button>
          </div>
        )}

        {error && (
          <div className="pw-wfc-error">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
