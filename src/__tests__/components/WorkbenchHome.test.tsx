/**
 * Tests for WorkbenchHome component - Status Panel
 *
 * Validates that the right sidebar status panel correctly displays:
 * - Runner process state
 * - AgentRun status
 * - Task status
 * - Timing info (start time, duration, last log)
 * - Log count
 * - Step progress
 * - Aggregated counts (active agents, pending gates)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Mock useLocalServices before importing the component
vi.mock("../../hooks/useLocalServices", () => ({
  useLocalServices: () => ({
    processRunner: {
      start: vi.fn().mockResolvedValue({ ok: false, error: { message: "not available" } }),
      stop: vi.fn().mockResolvedValue({ ok: true }),
      getLogs: vi.fn().mockResolvedValue({ ok: true, data: [] }),
      getStatus: vi.fn().mockResolvedValue({ ok: false }),
      listProcesses: vi.fn().mockResolvedValue({ ok: true, data: [] }),
      cleanup: vi.fn().mockResolvedValue({ ok: true }),
    },
  }),
}));

// Mock fetch for API calls from useLocalServices internals
global.fetch = vi.fn().mockResolvedValue({
  ok: false,
  status: 500,
  json: () => Promise.resolve({ error: "Server not running" }),
});

import { WorkbenchHome } from "../../components/WorkbenchHome";
import type { WorkbenchData } from "../../domain/workbench";
import { workbenchData } from "../../data/fixtures";

describe("WorkbenchHome Status Panel", () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the session status panel header", () => {
    render(
      <WorkbenchHome
        data={workbenchData}
        onNavigate={mockNavigate}
        activeProjectId="proj-001"
      />
    );

    expect(screen.getByText("会话状态")).toBeInTheDocument();
  });

  it("shows idle runner process state when no process is running", () => {
    render(
      <WorkbenchHome
        data={workbenchData}
        onNavigate={mockNavigate}
        activeProjectId="proj-001"
      />
    );

    // The header should show "空闲" when no tab is running
    const idlePills = screen.getAllByText("空闲");
    expect(idlePills.length).toBeGreaterThanOrEqual(1);
  });

  it("displays Runner process state for active tab", () => {
    render(
      <WorkbenchHome
        data={workbenchData}
        onNavigate={mockNavigate}
        activeProjectId="proj-001"
      />
    );

    // Runner 进程 label should be visible
    expect(screen.getByText("Runner 进程")).toBeInTheDocument();
  });

  it("displays timing labels in the status panel", () => {
    render(
      <WorkbenchHome
        data={workbenchData}
        onNavigate={mockNavigate}
        activeProjectId="proj-001"
      />
    );

    expect(screen.getByText("开始时间")).toBeInTheDocument();
    expect(screen.getByText("运行时长")).toBeInTheDocument();
    expect(screen.getByText("最近日志")).toBeInTheDocument();
    expect(screen.getByText("日志行数")).toBeInTheDocument();
  });

  it("displays step progress section", () => {
    render(
      <WorkbenchHome
        data={workbenchData}
        onNavigate={mockNavigate}
        activeProjectId="proj-001"
      />
    );

    expect(screen.getByText("步骤进度")).toBeInTheDocument();
  });

  it("displays aggregated counts for active agents and pending gates", () => {
    render(
      <WorkbenchHome
        data={workbenchData}
        onNavigate={mockNavigate}
        activeProjectId="proj-001"
      />
    );

    expect(screen.getByText("活跃 Agent")).toBeInTheDocument();
    expect(screen.getByText("待处理 Gate")).toBeInTheDocument();
  });

  it("shows 恢复会话 action link in status panel", () => {
    render(
      <WorkbenchHome
        data={workbenchData}
        onNavigate={mockNavigate}
        activeProjectId="proj-001"
      />
    );

    // 恢复会话 appears both in topbar and status panel
    const links = screen.getAllByText("恢复会话");
    expect(links.length).toBeGreaterThanOrEqual(2);
    // The status panel one should be a wb-panel-link
    const panelLink = links.find((el) => el.classList.contains("wb-panel-link"));
    expect(panelLink).toBeTruthy();
  });

  it("shows AgentRun status when active tab matches a running agent run", () => {
    // The fixture has agentRuns with step IDs that match the workflow steps.
    // The first tab corresponds to the first step.
    // The fixture agentRun run-002 has currentStepId "step-003" and status "running".
    // The fixture agentRun run-001 has currentStepId "step-001" and status "waiting_gate".
    // Since the first tab uses step-001, and run-001 has that step with waiting_gate,
    // the panel should show AgentRun row.

    render(
      <WorkbenchHome
        data={workbenchData}
        onNavigate={mockNavigate}
        activeProjectId="proj-001"
      />
    );

    // AgentRun label should appear if there's a matching run
    expect(screen.getByText("AgentRun")).toBeInTheDocument();
  });

  it("displays log count as 0 when no logs are streaming", () => {
    render(
      <WorkbenchHome
        data={workbenchData}
        onNavigate={mockNavigate}
        activeProjectId="proj-001"
      />
    );

    // The status panel should show 日志行数: 0 for idle tabs
    const logCountValue = screen.getByText("0");
    expect(logCountValue).toBeInTheDocument();
  });

  it("shows empty state message when no project is available", () => {
    const emptyData: WorkbenchData = {
      ...workbenchData,
      projects: [],
      activeProjectId: "",
    };

    render(
      <WorkbenchHome
        data={emptyData}
        onNavigate={mockNavigate}
      />
    );

    expect(screen.getByText("暂无项目")).toBeInTheDocument();
    expect(screen.getByText("请先在项目管理中创建或导入项目。")).toBeInTheDocument();
  });

  it("renders status progress bar element", () => {
    const { container } = render(
      <WorkbenchHome
        data={workbenchData}
        onNavigate={mockNavigate}
        activeProjectId="proj-001"
      />
    );

    const progressBar = container.querySelector(".wb-status-progress");
    expect(progressBar).toBeInTheDocument();
  });

  it("renders status dot with correct class based on process state", () => {
    const { container } = render(
      <WorkbenchHome
        data={workbenchData}
        onNavigate={mockNavigate}
        activeProjectId="proj-001"
      />
    );

    // When idle, should have at least one status dot with idle class
    const idleDots = container.querySelectorAll(".wb-status-dot.idle");
    expect(idleDots.length).toBeGreaterThanOrEqual(1);
  });
});
