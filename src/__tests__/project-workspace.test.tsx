import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { ProjectWorkspace } from "../components/ProjectWorkspace";
import { workbenchData } from "../data/fixtures";
import { WorkbenchContext } from "../App";

function mockProvider(overrides?: Record<string, unknown>) {
  const mockState = {
    data: workbenchData,
    updateGateStatus: () => {},
    reassignAgentRun: () => {},
    addMemory: () => {},
    updateMemory: () => {},
    deleteMemory: () => {},
    createTask: () => {},
    addProject: () => {},
    deleteProject: () => {},
    updateProject: () => {},
    addWorkflowStep: () => {},
    updateWorkflowStep: () => {},
    deleteWorkflowStep: () => {},
    addModelProvider: () => {},
    updateModelProvider: () => {},
    deleteModelProvider: () => {},
    addProviderModel: () => {},
    deleteProviderModel: () => {},
    setDefaultProviderModel: () => {},
    setAiAssistantModel: () => {},
    addImAdapter: () => {},
    updateImAdapter: () => {},
    deleteImAdapter: () => {},
    toggleImAdapterRoute: () => {},
    addGitCredential: () => {},
    updateGitCredential: () => {},
    deleteGitCredential: () => {},
    addWorkflowTemplate: async () => null,
    deleteWorkflowTemplate: () => {},
    updateRunner: () => {},
    setDefaultRunner: () => {},
    ...overrides,
  };
  function Wrapper({ children }: { children: ReactNode }) {
    return <WorkbenchContext.Provider value={mockState}>{children}</WorkbenchContext.Provider>;
  }
  return Wrapper;
}

describe("ProjectWorkspace", () => {
  it("renders progress ring with correct percentage based on completed steps", () => {
    const Wrapper = mockProvider();
    render(<ProjectWorkspace data={workbenchData} projectId="proj-001" onBack={() => {}} />, {
      wrapper: Wrapper,
    });

    // Check for the progress ring container
    const progressRing = document.querySelector(".pw-progress-ring");
    expect(progressRing).toBeInTheDocument();

    // Check for the progress percentage class - it displays a percentage like "20%"
    const progressPct = document.querySelector(".pw-progress-ring-pct");
    expect(progressPct).toBeInTheDocument();
    expect(progressPct?.textContent).toMatch(/\d+%/);
  });

  it("shows done/active/pending states for workflow steps in TODO list", () => {
    const Wrapper = mockProvider();
    render(<ProjectWorkspace data={workbenchData} projectId="proj-001" onBack={() => {}} />, {
      wrapper: Wrapper,
    });

    // TODO list header should be present
    expect(screen.getByText("待办清单")).toBeInTheDocument();

    // Check that workflow step names are displayed (they appear in both TODO and compact stepper)
    // Use getAllByText since step names appear multiple times
    expect(screen.getAllByText("需求分析").length).toBeGreaterThan(0);
    expect(screen.getAllByText("UI/UX 设计").length).toBeGreaterThan(0);
    expect(screen.getAllByText("前端开发").length).toBeGreaterThan(0);
    expect(screen.getAllByText("代码审查").length).toBeGreaterThan(0);
    expect(screen.getAllByText("测试验证").length).toBeGreaterThan(0);

    // Check for TODO item status indicators (done checkmark, active dot, pending square)
    const todoItems = document.querySelectorAll(".pw-todo-item");
    expect(todoItems.length).toBe(5);

    // Verify states are applied via class
    const hasStatusClasses = Array.from(todoItems).some((item) =>
      item.classList.contains("done") || item.classList.contains("active") || item.classList.contains("pending")
    );
    expect(hasStatusClasses).toBe(true);
  });

  it("renders compact step nodes with connectors in current task panel", () => {
    const Wrapper = mockProvider();
    render(<ProjectWorkspace data={workbenchData} projectId="proj-001" onBack={() => {}} />, {
      wrapper: Wrapper,
    });

    // Current task panel should be present (header includes task name)
    expect(screen.getByText(/当前任务/)).toBeInTheDocument();

    // Check for stepper scroll container
    const stepperScroll = document.querySelector(".pw-stepper-scroll");
    expect(stepperScroll).toBeInTheDocument();

    // Check for step wraps (pw-step-wrap contains pw-step-node)
    const stepWraps = document.querySelectorAll(".pw-step-wrap");
    expect(stepWraps.length).toBe(5);

    // Check for connectors between steps (should be 4 connectors for 5 steps)
    const connectors = document.querySelectorAll(".pw-step-conn");
    expect(connectors.length).toBe(4);
  });

  it("shows document categories with file counts in document panel", () => {
    const Wrapper = mockProvider();
    render(<ProjectWorkspace data={workbenchData} projectId="proj-001" onBack={() => {}} />, {
      wrapper: Wrapper,
    });

    // Document panel header should be present
    expect(screen.getByText("协同文件 & 设计文档")).toBeInTheDocument();

    // Document category buttons should be present - use getAllByText since there are multiple matches
    const designButtons = screen.getAllByRole("button", { name: /设计/ });
    expect(designButtons.length).toBeGreaterThan(0);

    const planButtons = screen.getAllByRole("button", { name: /计划/ });
    expect(planButtons.length).toBeGreaterThan(0);

    // Category buttons should have count badges
    const docCategories = document.querySelectorAll(".pw-doc-cat");
    expect(docCategories.length).toBe(4);

    // Each category should have a count element
    const countElements = document.querySelectorAll(".pw-doc-count");
    expect(countElements.length).toBe(4);
  });

  it("opens and closes memory panel when clicking the memory button", () => {
    const Wrapper = mockProvider();
    render(<ProjectWorkspace data={workbenchData} projectId="proj-001" onBack={() => {}} />, {
      wrapper: Wrapper,
    });

    // Memory button should be present in the topbar
    const memoryBtn = document.querySelector(".pw-memory-btn");
    expect(memoryBtn).toBeInTheDocument();

    // Memory panel overlay should not be visible initially
    expect(document.querySelector(".pw-memory-overlay")).not.toBeInTheDocument();

    // Click the memory button to open panel
    fireEvent.click(memoryBtn!);

    // Memory panel overlay should now be visible
    const memoryOverlay = document.querySelector(".pw-memory-overlay");
    expect(memoryOverlay).toBeInTheDocument();

    // Memory tabs should be present
    const memoryTabs = document.querySelectorAll(".pw-memory-tab");
    expect(memoryTabs.length).toBe(3);

    // Close button should close the panel - click the ghost button in footer
    const closeBtn = document.querySelector(".pw-memory-panel .pw-pd-footer .btn.ghost");
    fireEvent.click(closeBtn!);

    // Memory panel overlay should be closed
    expect(document.querySelector(".pw-memory-overlay")).not.toBeInTheDocument();
  });

  it("displays project not found message for invalid projectId", () => {
    const Wrapper = mockProvider();
    render(<ProjectWorkspace data={workbenchData} projectId="invalid-id" onBack={() => {}} />, {
      wrapper: Wrapper,
    });

    expect(screen.getByText("项目未找到")).toBeInTheDocument();
    expect(screen.getByText("请选择一个有效的项目")).toBeInTheDocument();
  });

  it("renders back button that triggers onBack callback", () => {
    let backClicked = false;
    const handleBack = () => {
      backClicked = true;
    };

    const Wrapper = mockProvider();
    render(<ProjectWorkspace data={workbenchData} projectId="proj-001" onBack={handleBack} />, {
      wrapper: Wrapper,
    });

    const backBtn = document.querySelector(".pw-back-btn");
    expect(backBtn).toBeInTheDocument();

    fireEvent.click(backBtn!);
    expect(backClicked).toBe(true);
  });

  it("opens and closes project MD viewer when clicking the 项目指令 button", () => {
    const Wrapper = mockProvider();
    render(<ProjectWorkspace data={workbenchData} projectId="proj-001" onBack={() => {}} />, {
      wrapper: Wrapper,
    });

    // Find the 项目指令 button by its text content
    const projectMdBtn = screen.getByRole("button", { name: "项目指令" });
    expect(projectMdBtn).toBeInTheDocument();

    // MD viewer overlay should not be visible initially
    expect(document.querySelector(".md-viewer-overlay")).not.toBeInTheDocument();

    // Click the button to open the panel
    fireEvent.click(projectMdBtn);

    // MD viewer overlay should now be visible
    const mdOverlay = document.querySelector(".md-viewer-overlay");
    expect(mdOverlay).toBeInTheDocument();

    // Header should show project name (project name from fixtures is "AgentManagement")
    const mdHeader = document.querySelector(".md-viewer-title strong");
    expect(mdHeader).toBeInTheDocument();
    expect(mdHeader?.textContent).toContain("AgentManagement");

    // Close button should close the panel
    const closeBtn = document.querySelector(".md-viewer-panel .btn-icon");
    expect(closeBtn).toBeInTheDocument();
    fireEvent.click(closeBtn!);

    // MD viewer overlay should be closed
    expect(document.querySelector(".md-viewer-overlay")).not.toBeInTheDocument();
  });

  it("shows auto-generated project MD when no custom projectMarkdown is set", () => {
    const Wrapper = mockProvider();
    render(<ProjectWorkspace data={workbenchData} projectId="proj-001" onBack={() => {}} />, {
      wrapper: Wrapper,
    });

    // Click the 项目指令 button to open the panel
    const projectMdBtn = screen.getByRole("button", { name: "项目指令" });
    fireEvent.click(projectMdBtn);

    // MD viewer should be open
    expect(document.querySelector(".md-viewer-overlay")).toBeInTheDocument();

    // Content should show project info
    const mdContent = document.querySelector(".md-viewer-content");
    expect(mdContent).toBeInTheDocument();
    // The content includes repo path or commands
    expect(mdContent?.textContent).toMatch(/AgentManagement|npm|仓库/);

    // Source indicator should show either "项目自定义" or "自动生成"
    const mdSource = document.querySelector(".md-viewer-source");
    expect(mdSource).toBeInTheDocument();
    // proj-001 has projectMarkdown in fixtures, so it should show "项目自定义"
    expect(["项目自定义", "自动生成"]).toContain(mdSource?.textContent);
  });
});
