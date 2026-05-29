import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryManager } from "../components/MemoryManager";
import { workbenchData } from "../data/fixtures";
import { WorkbenchContext } from "../App";

const mockState = {
  data: workbenchData,
  updateGateStatus: () => {},
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
  reassignAgentRun: () => {},
  addImAdapter: () => {},
  updateImAdapter: () => {},
  deleteImAdapter: () => {},
  toggleImAdapterRoute: () => {},
  addGitCredential: () => {},
  updateGitCredential: () => {},
  deleteGitCredential: () => {},
  addWorkflowTemplate: () => {},
  deleteWorkflowTemplate: () => {},
  updateRunner: () => {},
  setDefaultRunner: () => {},
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <WorkbenchContext.Provider value={mockState}>{children}</WorkbenchContext.Provider>
);

describe("MemoryManager", () => {
  it("renders the memory manager header as knowledge asset center", () => {
    render(<MemoryManager data={workbenchData} />, { wrapper });

    expect(screen.getByText("知识资产中心")).toBeInTheDocument();
    expect(screen.getByText(/管理项目、角色、任务三层记忆与知识资产/)).toBeInTheDocument();
  });

  it("displays category filter tabs in the center workspace", () => {
    render(<MemoryManager data={workbenchData} />, { wrapper });

    // Category tabs in the new design: 全部记忆, 决策记录, 角色经验, 风险与坑
    expect(screen.getByText("全部记忆")).toBeInTheDocument();
    expect(screen.getByText("决策记录")).toBeInTheDocument();
    expect(screen.getByText("角色经验")).toBeInTheDocument();
    expect(screen.getByText("风险与坑")).toBeInTheDocument();
  });

  it("shows memory cards from fixtures", () => {
    render(<MemoryManager data={workbenchData} />, { wrapper });

    expect(screen.getByText("AgentDevelop 项目背景")).toBeInTheDocument();
  });

  it("filters memories by category tab", () => {
    render(<MemoryManager data={workbenchData} />, { wrapper });

    // Click the "决策记录" filter tab (project kind)
    const projectTab = screen.getByText("决策记录");
    fireEvent.click(projectTab);

    // Should still show the project memory
    expect(screen.getByText("AgentDevelop 项目背景")).toBeInTheDocument();
  });

  it("shows add memory button in header", () => {
    render(<MemoryManager data={workbenchData} />, { wrapper });

    expect(screen.getByRole("button", { name: "新增记忆" })).toBeInTheDocument();
  });

  it("shows search input", () => {
    render(<MemoryManager data={workbenchData} />, { wrapper });

    const searchInput = screen.getByPlaceholderText("搜索记忆标题或内容...");
    expect(searchInput).toBeInTheDocument();
  });

  it("shows AI refine button", () => {
    render(<MemoryManager data={workbenchData} />, { wrapper });

    expect(screen.getByText("AI 提炼")).toBeInTheDocument();
  });

  it("shows batch checkbox for select all", () => {
    render(<MemoryManager data={workbenchData} />, { wrapper });

    expect(screen.getByText("全选")).toBeInTheDocument();
  });

  it("opens AI summary modal when AI 提炼 button is clicked", () => {
    render(<MemoryManager data={workbenchData} />, { wrapper });

    // Fire AI refine (clicking generates summary from all 3 fixture memories)
    const aiBtn = screen.getByText("AI 提炼");
    fireEvent.click(aiBtn);

    // Should show summary with Brain and Sparkles icons and generated text
    expect(screen.getByText("AI 记忆提炼")).toBeInTheDocument();
  });

  it("toggles batch selection and shows batch delete button", () => {
    render(<MemoryManager data={workbenchData} />, { wrapper });

    const selectAllLabel = screen.getAllByText("全选")[0];
    const selectAllCheckbox = selectAllLabel.parentElement?.querySelector("input[type='checkbox']");
    expect(selectAllCheckbox).toBeDefined();
    fireEvent.click(selectAllCheckbox!);

    // After select all, batch delete button should appear
    expect(screen.getByText(/批量删除/)).toBeInTheDocument();
  });

  it("displays memory kind and scope badges on cards", () => {
    render(<MemoryManager data={workbenchData} />, { wrapper });

    // Kind badges appear on cards. With tree also showing them, we verify > 0.
    const projectBadges = screen.getAllByText("项目");
    expect(projectBadges.length).toBeGreaterThan(0);

    const roleBadges = screen.getAllByText("角色");
    expect(roleBadges.length).toBeGreaterThan(0);

    // Scope badges (fixture has project-scoped memories)
    const scopeBadges = screen.getAllByText("项目");
    expect(scopeBadges.length).toBeGreaterThan(0);
  });

  it("renders three-column layout with left project tree", () => {
    render(<MemoryManager data={workbenchData} />, { wrapper });

    // Left tree should show "知识库" node and project names exist
    expect(screen.getByText("知识库")).toBeInTheDocument();

    // "AgentDevelop" appears both in tree and card meta, so use getAllByText
    const treeItems = screen.getAllByText("AgentDevelop");
    expect(treeItems.length).toBeGreaterThan(0);
  });

  it("renders KPI cards in center workspace", () => {
    render(<MemoryManager data={workbenchData} />, { wrapper });

    expect(screen.getByText("记忆总数")).toBeInTheDocument();
    expect(screen.getByText("已提炼")).toBeInTheDocument();
    expect(screen.getByText("可复用")).toBeInTheDocument();
    expect(screen.getByText("待确认")).toBeInTheDocument();
  });

  it("renders right intelligence panel", () => {
    render(<MemoryManager data={workbenchData} />, { wrapper });

    expect(screen.getByText("跨项目洞察")).toBeInTheDocument();
    expect(screen.getByText("可沉淀为知识库")).toBeInTheDocument();
    expect(screen.getByText("推荐给当前项目")).toBeInTheDocument();
    expect(screen.getByText("记忆审计")).toBeInTheDocument();
  });
});
