import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { PwWorkflowControl } from '../../components/PwWorkflowControl';
import type { WorkflowTemplate } from '../../domain/workflow';

// Mock useLocalServices
const mockCreateWorkflowRun = vi.fn();
const mockPauseWorkflowRun = vi.fn();
const mockResumeWorkflowRun = vi.fn();
const mockCancelWorkflowRun = vi.fn();
const mockGetWorkflowRunStatus = vi.fn();

vi.mock('../../hooks/useLocalServices', () => ({
  useLocalServices: () => ({
    createWorkflowRun: mockCreateWorkflowRun,
    pauseWorkflowRun: mockPauseWorkflowRun,
    resumeWorkflowRun: mockResumeWorkflowRun,
    cancelWorkflowRun: mockCancelWorkflowRun,
    getWorkflowRunStatus: mockGetWorkflowRunStatus,
  }),
}));

describe('PwWorkflowControl', () => {
  const mockTemplate: WorkflowTemplate = {
    id: 'tpl-001',
    name: '开发流程',
    version: 1,
    steps: [
      {
        id: 'step-1',
        order: 1,
        name: '需求分析',
        roleId: 'role-1',
        modelProviderId: 'provider-1',
        modelName: 'model-1',
        inputs: [],
        outputs: [],
        gateMode: 'auto',
        failureStrategy: 'stop',
        projectOverride: false,
      },
    ],
    createdAt: '2026-05-30T00:00:00Z',
    updatedAt: '2026-05-30T00:00:00Z',
  };

  const mockTemplate2: WorkflowTemplate = {
    id: 'tpl-002',
    name: '测试流程',
    version: 2,
    steps: [
      {
        id: 'step-2',
        order: 1,
        name: '单元测试',
        roleId: 'role-2',
        modelProviderId: 'provider-1',
        modelName: 'model-2',
        inputs: [],
        outputs: [],
        gateMode: 'manual',
        failureStrategy: 'retry',
        projectOverride: false,
      },
    ],
    createdAt: '2026-05-29T00:00:00Z',
    updatedAt: '2026-05-30T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateWorkflowRun.mockResolvedValue({ ok: true, data: { runId: 'run-001' } });
    mockPauseWorkflowRun.mockResolvedValue({ ok: true });
    mockResumeWorkflowRun.mockResolvedValue({ ok: true });
    mockCancelWorkflowRun.mockResolvedValue({ ok: true });
    mockGetWorkflowRunStatus.mockResolvedValue({ ok: true, data: { state: 'idle' } });
  });

  describe('rendering', () => {
    it('should render workflow template selector', () => {
      render(
        <PwWorkflowControl
          projectId="proj-001"
          templates={[mockTemplate]}
        />
      );

      expect(screen.getByText('工作流执行')).toBeInTheDocument();
      // Template name is split across nodes: "开发流程 (v1)"
      expect(screen.getByText(/开发流程/)).toBeInTheDocument();
    });

    it('should show template version in selector', () => {
      render(
        <PwWorkflowControl
          projectId="proj-001"
          templates={[mockTemplate]}
        />
      );

      // Check that the select contains the template with version
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
    });

    it('should show start button when idle', () => {
      render(
        <PwWorkflowControl
          projectId="proj-001"
          templates={[mockTemplate]}
        />
      );

      expect(screen.getByRole('button', { name: /启动工作流/i })).toBeInTheDocument();
    });

    it('should disable start button when no template selected', () => {
      render(
        <PwWorkflowControl
          projectId="proj-001"
          templates={[]}
        />
      );

      const startButton = screen.getByRole('button', { name: /启动工作流/i });
      expect(startButton).toBeDisabled();
    });

    it('should display IDLE status when not running', () => {
      render(
        <PwWorkflowControl
          projectId="proj-001"
          templates={[mockTemplate]}
        />
      );

      expect(screen.getByText('IDLE')).toBeInTheDocument();
    });
  });

  describe('start workflow', () => {
    it('should call createWorkflowRun when start clicked', async () => {
      render(
        <PwWorkflowControl
          projectId="proj-001"
          templates={[mockTemplate]}
        />
      );

      const startButton = screen.getByRole('button', { name: /启动工作流/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(mockCreateWorkflowRun).toHaveBeenCalledWith('proj-001', 'tpl-001');
      });
    });

    it('should show RUNNING status after start', async () => {
      render(
        <PwWorkflowControl
          projectId="proj-001"
          templates={[mockTemplate]}
        />
      );

      const startButton = screen.getByRole('button', { name: /启动工作流/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText('RUNNING')).toBeInTheDocument();
      });
    });

    it('should call onRunChange with runId after start', async () => {
      const onRunChange = vi.fn();

      render(
        <PwWorkflowControl
          projectId="proj-001"
          templates={[mockTemplate]}
          onRunChange={onRunChange}
        />
      );

      const startButton = screen.getByRole('button', { name: /启动工作流/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(onRunChange).toHaveBeenCalledWith('run-001');
      });
    });

    it('should show error message when start fails', async () => {
      mockCreateWorkflowRun.mockResolvedValue({
        ok: false,
        error: { code: 'START_FAILED', message: '启动失败：无效模板' },
      });

      render(
        <PwWorkflowControl
          projectId="proj-001"
          templates={[mockTemplate]}
        />
      );

      const startButton = screen.getByRole('button', { name: /启动工作流/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText(/启动失败：无效模板/i)).toBeInTheDocument();
      });
    });
  });

  describe('pause workflow', () => {
    it('should show pause button when running', async () => {
      render(
        <PwWorkflowControl
          projectId="proj-001"
          templates={[mockTemplate]}
        />
      );

      // Start workflow first
      const startButton = screen.getByRole('button', { name: /启动工作流/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /暂停/i })).toBeInTheDocument();
      });
    });

    it('should call pauseWorkflowRun when pause clicked', async () => {
      render(
        <PwWorkflowControl
          projectId="proj-001"
          templates={[mockTemplate]}
        />
      );

      // Start workflow first
      const startButton = screen.getByRole('button', { name: /启动工作流/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /暂停/i })).toBeInTheDocument();
      });

      const pauseButton = screen.getByRole('button', { name: /暂停/i });
      fireEvent.click(pauseButton);

      await waitFor(() => {
        expect(mockPauseWorkflowRun).toHaveBeenCalledWith('run-001');
      });
    });

    it('should show PAUSED status after pause', async () => {
      render(
        <PwWorkflowControl
          projectId="proj-001"
          templates={[mockTemplate]}
        />
      );

      // Start workflow first
      const startButton = screen.getByRole('button', { name: /启动工作流/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /暂停/i })).toBeInTheDocument();
      });

      const pauseButton = screen.getByRole('button', { name: /暂停/i });
      fireEvent.click(pauseButton);

      await waitFor(() => {
        expect(screen.getByText('PAUSED')).toBeInTheDocument();
      });
    });
  });

  describe('resume workflow', () => {
    it('should show resume button when paused', async () => {
      render(
        <PwWorkflowControl
          projectId="proj-001"
          templates={[mockTemplate]}
        />
      );

      // Start workflow first
      const startButton = screen.getByRole('button', { name: /启动工作流/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /暂停/i })).toBeInTheDocument();
      });

      // Pause
      const pauseButton = screen.getByRole('button', { name: /暂停/i });
      fireEvent.click(pauseButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /恢复/i })).toBeInTheDocument();
      });
    });

    it('should call resumeWorkflowRun when resume clicked', async () => {
      render(
        <PwWorkflowControl
          projectId="proj-001"
          templates={[mockTemplate]}
        />
      );

      // Start -> Pause -> Resume
      const startButton = screen.getByRole('button', { name: /启动工作流/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /暂停/i })).toBeInTheDocument();
      });

      const pauseButton = screen.getByRole('button', { name: /暂停/i });
      fireEvent.click(pauseButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /恢复/i })).toBeInTheDocument();
      });

      const resumeButton = screen.getByRole('button', { name: /恢复/i });
      fireEvent.click(resumeButton);

      await waitFor(() => {
        expect(mockResumeWorkflowRun).toHaveBeenCalledWith('run-001');
      });
    });

    it('should show RUNNING status after resume', async () => {
      render(
        <PwWorkflowControl
          projectId="proj-001"
          templates={[mockTemplate]}
        />
      );

      // Start -> Pause -> Resume
      const startButton = screen.getByRole('button', { name: /启动工作流/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /暂停/i })).toBeInTheDocument();
      });

      const pauseButton = screen.getByRole('button', { name: /暂停/i });
      fireEvent.click(pauseButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /恢复/i })).toBeInTheDocument();
      });

      const resumeButton = screen.getByRole('button', { name: /恢复/i });
      fireEvent.click(resumeButton);

      await waitFor(() => {
        expect(screen.getByText('RUNNING')).toBeInTheDocument();
      });
    });
  });

  describe('cancel workflow', () => {
    it('should show cancel button when running', async () => {
      render(
        <PwWorkflowControl
          projectId="proj-001"
          templates={[mockTemplate]}
        />
      );

      // Start workflow first
      const startButton = screen.getByRole('button', { name: /启动工作流/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /取消/i })).toBeInTheDocument();
      });
    });

    it('should call cancelWorkflowRun when cancel clicked', async () => {
      render(
        <PwWorkflowControl
          projectId="proj-001"
          templates={[mockTemplate]}
        />
      );

      // Start workflow first
      const startButton = screen.getByRole('button', { name: /启动工作流/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /取消/i })).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /取消/i });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(mockCancelWorkflowRun).toHaveBeenCalledWith('run-001');
      });
    });

    it('should return to IDLE status after cancel', async () => {
      render(
        <PwWorkflowControl
          projectId="proj-001"
          templates={[mockTemplate]}
        />
      );

      // Start -> Cancel
      const startButton = screen.getByRole('button', { name: /启动工作流/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText('RUNNING')).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /取消/i });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.getByText('IDLE')).toBeInTheDocument();
      });
    });

    it('should call onRunChange with null after cancel', async () => {
      const onRunChange = vi.fn();

      render(
        <PwWorkflowControl
          projectId="proj-001"
          templates={[mockTemplate]}
          onRunChange={onRunChange}
        />
      );

      // Start -> Cancel
      const startButton = screen.getByRole('button', { name: /启动工作流/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(onRunChange).toHaveBeenCalledWith('run-001');
      });

      const cancelButton = screen.getByRole('button', { name: /取消/i });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(onRunChange).toHaveBeenCalledWith(null);
      });
    });
  });

  describe('error handling', () => {
    it('should display error when pause fails', async () => {
      mockPauseWorkflowRun.mockResolvedValue({
        ok: false,
        error: { code: 'PAUSE_FAILED', message: '暂停失败：进程无响应' },
      });

      render(
        <PwWorkflowControl
          projectId="proj-001"
          templates={[mockTemplate]}
        />
      );

      // Start -> Pause
      const startButton = screen.getByRole('button', { name: /启动工作流/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /暂停/i })).toBeInTheDocument();
      });

      const pauseButton = screen.getByRole('button', { name: /暂停/i });
      fireEvent.click(pauseButton);

      await waitFor(() => {
        expect(screen.getByText(/暂停失败：进程无响应/i)).toBeInTheDocument();
      });
    });

    it('should display error when resume fails', async () => {
      mockResumeWorkflowRun.mockResolvedValue({
        ok: false,
        error: { code: 'RESUME_FAILED', message: '恢复失败：进程已终止' },
      });

      render(
        <PwWorkflowControl
          projectId="proj-001"
          templates={[mockTemplate]}
        />
      );

      // Start -> Pause -> Resume
      const startButton = screen.getByRole('button', { name: /启动工作流/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /暂停/i })).toBeInTheDocument();
      });

      const pauseButton = screen.getByRole('button', { name: /暂停/i });
      fireEvent.click(pauseButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /恢复/i })).toBeInTheDocument();
      });

      const resumeButton = screen.getByRole('button', { name: /恢复/i });
      fireEvent.click(resumeButton);

      await waitFor(() => {
        expect(screen.getByText(/恢复失败：进程已终止/i)).toBeInTheDocument();
      });
    });

    it('should display error when cancel fails', async () => {
      mockCancelWorkflowRun.mockResolvedValue({
        ok: false,
        error: { code: 'CANCEL_FAILED', message: '取消失败：权限不足' },
      });

      render(
        <PwWorkflowControl
          projectId="proj-001"
          templates={[mockTemplate]}
        />
      );

      // Start -> Cancel
      const startButton = screen.getByRole('button', { name: /启动工作流/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /取消/i })).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /取消/i });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.getByText(/取消失败：权限不足/i)).toBeInTheDocument();
      });
    });
  });

  describe('multiple templates', () => {
    it('should list all templates in selector', () => {
      render(
        <PwWorkflowControl
          projectId="proj-001"
          templates={[mockTemplate, mockTemplate2]}
        />
      );

      const select = screen.getByRole('combobox');
      const options = select.querySelectorAll('option');

      expect(options.length).toBe(3); // 1 placeholder + 2 templates
    });

    it('should use selected template for workflow run', async () => {
      render(
        <PwWorkflowControl
          projectId="proj-001"
          templates={[mockTemplate, mockTemplate2]}
        />
      );

      // Select second template
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'tpl-002' } });

      const startButton = screen.getByRole('button', { name: /启动工作流/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(mockCreateWorkflowRun).toHaveBeenCalledWith('proj-001', 'tpl-002');
      });
    });
  });
});
