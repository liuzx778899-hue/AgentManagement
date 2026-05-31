import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { WorkflowBuilder } from "../components/WorkflowBuilder";
import { WorkbenchContext } from "../App";
import { workbenchData } from "../data/fixtures";

function mockProvider(overrides?: Partial<{ updateWorkflowStep: () => void }>) {
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

describe("Workflow Canvas V2", () => {
  it("renders sidebar with template list", () => {
    const Wrapper = mockProvider();
    render(<WorkflowBuilder data={workbenchData} />, { wrapper: Wrapper });
    expect(screen.getByText("流程模板")).toBeInTheDocument();
    // V2: The mock template cards use static data with the name "软件开发完整流程"
    const templateNames = screen.getAllByText("软件开发完整流程");
    expect(templateNames.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("项目角色池")).toBeInTheDocument();
  });

  it("renders template count and status badges", () => {
    const Wrapper = mockProvider();
    render(<WorkflowBuilder data={workbenchData} />, { wrapper: Wrapper });
    // V2: Template cards show step count text like "5 个步骤"
    expect(screen.getByText("5 个步骤")).toBeInTheDocument();
    // V2: Status badges
    expect(screen.getByText("已启用")).toBeInTheDocument();
  });

  it("renders step nodes with name and badges on canvas", () => {
    const Wrapper = mockProvider();
    render(<WorkflowBuilder data={workbenchData} />, { wrapper: Wrapper });
    // V2: Step names from the canvas nodes (from selectedTemplate steps)
    expect(screen.getByText("需求分析")).toBeInTheDocument();
    expect(screen.getByText("UI/UX 设计")).toBeInTheDocument();
    expect(screen.getByText("前端开发")).toBeInTheDocument();
    // V2: Step number badges show 01, 03, etc.
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("03")).toBeInTheDocument();
  });

  it("shows empty state when no templates", () => {
    const Wrapper = mockProvider();
    const emptyData = { ...workbenchData, workflowTemplates: [] };
    render(<WorkflowBuilder data={emptyData} />, { wrapper: Wrapper });
    // V2: Canvas area shows a prompt when no template is selected
    expect(screen.getByText(/请选择一个流程模板/)).toBeInTheDocument();
  });

  it("renders workspace controls", () => {
    const Wrapper = mockProvider();
    render(<WorkflowBuilder data={workbenchData} />, { wrapper: Wrapper });
    // V2: Canvas toolbar elements
    expect(screen.getByText("流程画布")).toBeInTheDocument();
    expect(screen.getByText("对齐")).toBeInTheDocument();
    expect(screen.getByText(/版本管理/)).toBeInTheDocument();
  });

  it("renders role pool items", () => {
    const Wrapper = mockProvider();
    render(<WorkflowBuilder data={workbenchData} />, { wrapper: Wrapper });
    // V2: Roles from data.roles should appear in the role pool
    const roleNames = workbenchData.roles.slice(0, 3).map(r => r.name);
    roleNames.forEach(name => {
      const elements = screen.getAllByText(name);
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });
  });
});
