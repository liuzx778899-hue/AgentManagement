import { describe, expect, it } from 'vitest';
import type { WorkflowStep, WorkflowStepAssignment } from '../../domain/workbench';
import type { Task } from '../../domain/task';
import { workbenchData } from '../../data/fixtures';
import { getStepStatus, buildTabs, escapeHtml } from '../../components/WorkbenchHome';

// Minimal mock data matching actual domain types
const mockAssignment: WorkflowStepAssignment = {
  id: 'assign-1',
  order: 0,
  roleId: 'role-pm',
  modelProviderId: 'anthropic',
  modelName: 'claude-3-haiku',
  goal: '分析需求',
  acceptanceCriteria: [],
  inputs: [],
  outputs: [],
};

const mockStep: WorkflowStep = {
  id: 'step-1',
  order: 0,
  name: '需求分析',
  assignments: [mockAssignment],
  inputs: [],
  outputs: [],
  gateMode: 'auto',
  failureStrategy: 'stop',
  projectOverride: false,
};

const mockTask: Task = {
  id: 'task-1',
  projectId: 'proj-1',
  workflowTemplateId: 'wf-1',
  workflowStepId: 'step-1',
  assignmentId: 'assign-1',
  goal: 'Test task',
  acceptanceCriteria: [],
  roleAssignment: {},
  capabilityAuthorization: [],
  launchStrategy: 'direct',
  status: 'queued',
  activeRunId: null,
  createdAt: '2026-06-06T00:00:00Z',
  updatedAt: '2026-06-06T00:00:00Z',
};

describe('getStepStatus', () => {
  it('returns idle when no tasks for step', () => {
    const result = getStepStatus(mockStep, []);
    expect(result).toEqual({ cls: 'idle', label: '待开始' });
  });

  it('returns running when task is running', () => {
    const tasks: Task[] = [{ ...mockTask, status: 'running' }];
    const result = getStepStatus(mockStep, tasks);
    expect(result).toEqual({ cls: 'run', label: '运行中' });
  });

  it('returns ok when all tasks are done', () => {
    const tasks: Task[] = [{ ...mockTask, status: 'done' }];
    const result = getStepStatus(mockStep, tasks);
    expect(result).toEqual({ cls: 'ok', label: '已完成' });
  });

  it('returns error when task failed', () => {
    const tasks: Task[] = [{ ...mockTask, status: 'failed' }];
    const result = getStepStatus(mockStep, tasks);
    expect(result).toEqual({ cls: 'error', label: '失败' });
  });

  it('returns wait when task is in gate', () => {
    const tasks: Task[] = [{ ...mockTask, status: 'gate' }];
    const result = getStepStatus(mockStep, tasks);
    expect(result).toEqual({ cls: 'wait', label: '等待 Gate' });
  });

  it('matches task by workflowStepId', () => {
    const tasks: Task[] = [
      { ...mockTask, workflowStepId: 'step-1', status: 'running' },
      { ...mockTask, id: 'task-2', workflowStepId: 'step-2', status: 'done' },
    ];
    const result = getStepStatus(mockStep, tasks);
    expect(result).toEqual({ cls: 'run', label: '运行中' });
  });

  it('returns queued when task is queued', () => {
    const tasks: Task[] = [{ ...mockTask, status: 'queued' }];
    const result = getStepStatus(mockStep, tasks);
    expect(result).toEqual({ cls: 'queued', label: '排队中' });
  });

  it('returns queued when task is draft', () => {
    const tasks: Task[] = [{ ...mockTask, status: 'draft' }];
    const result = getStepStatus(mockStep, tasks);
    expect(result).toEqual({ cls: 'queued', label: '排队中' });
  });

  it('prioritizes running over failed', () => {
    const tasks: Task[] = [
      { ...mockTask, id: 'task-a', status: 'running' },
      { ...mockTask, id: 'task-b', status: 'failed' },
    ];
    const result = getStepStatus(mockStep, tasks);
    expect(result).toEqual({ cls: 'run', label: '运行中' });
  });

  it('handles undefined workflowStepId', () => {
    const tasks: Task[] = [{ ...mockTask, workflowStepId: undefined }];
    const result = getStepStatus(mockStep, tasks);
    expect(result).toEqual({ cls: 'idle', label: '待开始' });
  });
});

describe('escapeHtml', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  it('escapes ampersands', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#39;s');
  });

  it('escapes all special characters together', () => {
    expect(escapeHtml(`<div onclick="alert('xss')">`)).toBe(
      '&lt;div onclick=&quot;alert(&#39;xss&#39;)&quot;&gt;'
    );
  });

  it('returns plain text unchanged', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });
});

describe('buildTabs', () => {
  it('returns empty array when no template', () => {
    const data = { ...workbenchData, workflowTemplates: [] };
    const result = buildTabs(data, []);
    expect(result).toEqual([]);
  });

  it('builds tabs from workflow steps with real fixture data', () => {
    const tasks = workbenchData.tasks;
    const result = buildTabs(workbenchData, tasks);
    expect(result.length).toBeGreaterThan(0);
    // Each tab should have required fields
    for (const tab of result) {
      expect(tab).toHaveProperty('id');
      expect(tab).toHaveProperty('label');
      expect(tab).toHaveProperty('stepId');
      expect(tab).toHaveProperty('status');
      expect(tab).toHaveProperty('logs');
    }
  });

  it('sets status to running when task is running', () => {
    const runningTask: Task = {
      ...workbenchData.tasks[0],
      status: 'running',
    };
    const result = buildTabs(workbenchData, [runningTask]);
    const tab = result.find(t => t.stepId === runningTask.workflowStepId);
    expect(tab?.status).toBe('running');
  });

  it('sets status to completed when task is done', () => {
    const doneTask: Task = {
      ...workbenchData.tasks[0],
      status: 'done',
    };
    const result = buildTabs(workbenchData, [doneTask]);
    const tab = result.find(t => t.stepId === doneTask.workflowStepId);
    expect(tab?.status).toBe('completed');
  });

  it('sets status to failed when task failed', () => {
    const failedTask: Task = {
      ...workbenchData.tasks[0],
      status: 'failed',
    };
    const result = buildTabs(workbenchData, [failedTask]);
    const tab = result.find(t => t.stepId === failedTask.workflowStepId);
    expect(tab?.status).toBe('failed');
  });

  it('initializes with empty logs', () => {
    const result = buildTabs(workbenchData, []);
    for (const tab of result) {
      expect(tab.logs).toEqual([]);
    }
  });
});
