import { useState, useCallback } from 'react';
import { Play, Pause, RotateCcw, Square, ChevronRight } from 'lucide-react';
import { useLocalServices } from '../hooks/useLocalServices';
import type { WorkflowTemplate } from '../domain/workflow';

interface PwWorkflowControlProps {
  projectId: string;
  templates: WorkflowTemplate[];
  currentRunId?: string;
  onRunChange?: (runId: string | null) => void;
}

type RunState = 'idle' | 'running' | 'paused' | 'completed' | 'failed';

export function PwWorkflowControl({
  projectId,
  templates,
  currentRunId,
  onRunChange,
}: PwWorkflowControlProps) {
  const services = useLocalServices();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    templates[0]?.id ?? ''
  );
  const [runState, setRunState] = useState<RunState>('idle');
  const [runId, setRunId] = useState<string | null>(currentRunId ?? null);
  const [error, setError] = useState<string | null>(null);

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
