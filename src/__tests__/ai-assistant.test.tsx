import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { AiChatPanel } from "../components/AiChatPanel";
import { AiAssistant } from "../components/AiAssistant";
import { WorkbenchContext } from "../App";
import { workbenchData } from "../data/fixtures";

function mockProvider(overrides?: Record<string, unknown>) {
  const mockState = {
    data: workbenchData,
    updateGateStatus: vi.fn(),
    addMemory: vi.fn(),
    updateMemory: vi.fn(),
    deleteMemory: vi.fn(),
    createTask: vi.fn(),
    addProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
    addWorkflowStep: vi.fn(),
    updateWorkflowStep: vi.fn(),
    deleteWorkflowStep: vi.fn(),
    addModelProvider: vi.fn(),
    updateModelProvider: vi.fn(),
    deleteModelProvider: vi.fn(),
    addProviderModel: vi.fn(),
    deleteProviderModel: vi.fn(),
    setDefaultProviderModel: vi.fn(),
    setAiAssistantModel: vi.fn(),
    reassignAgentRun: vi.fn(),
    addImAdapter: vi.fn(),
    updateImAdapter: vi.fn(),
    deleteImAdapter: vi.fn(),
    toggleImAdapterRoute: vi.fn(),
    addGitCredential: vi.fn(),
    updateGitCredential: vi.fn(),
    deleteGitCredential: vi.fn(),
    addWorkflowTemplate: vi.fn().mockResolvedValue(null),
    deleteWorkflowTemplate: vi.fn(),
    updateRunner: vi.fn(),
    updateTask: vi.fn(),
    setDefaultRunner: vi.fn(),
    updateSettings: vi.fn(),
    setTasks: vi.fn(),
    ...overrides,
  };
  function Wrapper({ children }: { children: ReactNode }) {
    return <WorkbenchContext.Provider value={mockState}>{children}</WorkbenchContext.Provider>;
  }
  return { Wrapper, mockState };
}

describe("AI Assistant", () => {
  it("shows floating bubble when closed", () => {
    const { Wrapper } = mockProvider();
    render(<AiAssistant view="workbench" data={workbenchData} />, { wrapper: Wrapper });
    expect(screen.getByTitle("打开工程助手")).toBeInTheDocument();
  });

  it("opens panel when bubble clicked", () => {
    const { Wrapper } = mockProvider();
    render(<AiAssistant view="workbench" data={workbenchData} />, { wrapper: Wrapper });
    fireEvent.click(screen.getByTitle("打开工程助手"));
    expect(screen.getByPlaceholderText(/输入问题/)).toBeInTheDocument();
  });

  it("can dock and undock", () => {
    const { Wrapper } = mockProvider();
    render(<AiAssistant view="workbench" data={workbenchData} />, { wrapper: Wrapper });

    // Open panel
    fireEvent.click(screen.getByTitle("打开工程助手"));
    expect(document.querySelector(".ai-assistant-panel")).toBeInTheDocument();

    // Dock it
    const dockBtn = screen.getByTitle("固定到右侧");
    fireEvent.click(dockBtn);
    expect(document.querySelector(".ai-assistant-docked")).toBeInTheDocument();

    // Undock (float)
    const floatBtn = screen.getByTitle("浮动面板");
    fireEvent.click(floatBtn);
    expect(document.querySelector(".ai-assistant-panel")).toBeInTheDocument();
  });

  it("displays welcome message based on current view", () => {
    const { Wrapper } = mockProvider();
    render(<AiChatPanel view="workflows" data={workbenchData} />, { wrapper: Wrapper });
    expect(screen.getByText(/工作流画布/)).toBeInTheDocument();
  });

  it("responds to 检查配置 query", async () => {
    const { Wrapper } = mockProvider();
    render(<AiChatPanel view="workflows" data={workbenchData} />, { wrapper: Wrapper });
    const input = screen.getByPlaceholderText(/输入问题/);
    fireEvent.change(input, { target: { value: "检查配置" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => {
      expect(screen.getByText(/配置检查/)).toBeInTheDocument();
    });
  });

  it("responds to 生成角色 query", async () => {
    const { Wrapper } = mockProvider();
    render(<AiChatPanel view="workflows" data={workbenchData} />, { wrapper: Wrapper });
    const input = screen.getByPlaceholderText(/输入问题/);
    fireEvent.change(input, { target: { value: "生成产品经理的角色" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => {
      const matches = screen.getAllByText(/产品经理/);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows context-aware suggestion chips", () => {
    const { Wrapper } = mockProvider();
    render(<AiChatPanel view="workflows" data={workbenchData} />, { wrapper: Wrapper });
    // Should show suggestions specific to workflows page
    expect(screen.getByText("检查工作流配置")).toBeInTheDocument();
    expect(screen.getByText("生成角色MD")).toBeInTheDocument();
  });

  it("shows different suggestions for settings page", () => {
    const { Wrapper } = mockProvider();
    render(<AiChatPanel view="settings" data={workbenchData} />, { wrapper: Wrapper });
    expect(screen.getByText("检查模型配置")).toBeInTheDocument();
    expect(screen.getByText("推荐优化")).toBeInTheDocument();
  });

  it("responds to 生成项目MD query", async () => {
    const { Wrapper } = mockProvider();
    render(<AiChatPanel view="project-workspace" data={workbenchData} />, { wrapper: Wrapper });
    const input = screen.getByPlaceholderText(/输入问题/);
    fireEvent.change(input, { target: { value: "生成项目MD" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => {
      // Use getAllByText since "项目文档" appears multiple times
      const matches = screen.getAllByText(/项目文档/);
      expect(matches.length).toBeGreaterThanOrEqual(1);
      // Also check for the action button
      expect(screen.getByText("保存项目 MD")).toBeInTheDocument();
    });
  });

  it("responds to 跳转页面 query", async () => {
    const { Wrapper } = mockProvider();
    render(<AiChatPanel view="workbench" data={workbenchData} />, { wrapper: Wrapper });
    const input = screen.getByPlaceholderText(/输入问题/);
    fireEvent.change(input, { target: { value: "打开设置" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => {
      expect(screen.getByText(/跳转/)).toBeInTheDocument();
    });
  });

  it("save-role-md action calls addMemory", async () => {
    const { Wrapper, mockState } = mockProvider();
    render(<AiChatPanel view="workflows" data={workbenchData} />, { wrapper: Wrapper });
    const input = screen.getByPlaceholderText(/输入问题/);
    fireEvent.change(input, { target: { value: "生成角色" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => {
      expect(screen.getByText("保存角色定义")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("保存角色定义"));
    expect(mockState.addMemory).toHaveBeenCalled();
  });
});
