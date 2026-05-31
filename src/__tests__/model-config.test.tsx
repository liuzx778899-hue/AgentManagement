import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Settings } from "../components/Settings";
import { StepEditModal } from "../components/StepEditModal";
import { WorkbenchContext } from "../App";
import { workbenchData } from "../data/fixtures";
import type { WorkflowStep, WorkflowTemplate } from "../domain/workflow";

const createMockState = () => ({
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
  setDefaultRunner: vi.fn(),
});

const wrapper = (mockState: ReturnType<typeof createMockState>) => ({
  wrapper: ({ children }: { children: React.ReactNode }) => (
    <WorkbenchContext.Provider value={mockState}>{children}</WorkbenchContext.Provider>
  ),
});

describe("Settings Model Configuration CRUD", () => {
  it("shows model configuration tab with add provider button", () => {
    const mockState = createMockState();
    render(<Settings data={workbenchData} />, wrapper(mockState));

    // Click models tab via settings-nav-item
    fireEvent.click(screen.getByRole("button", { name: /模型配置/ }));

    expect(screen.getAllByText("模型配置").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /新增供应商/ })).toBeInTheDocument();
  });

  it("displays existing providers as flat cards", () => {
    const mockState = createMockState();
    render(<Settings data={workbenchData} />, wrapper(mockState));

    fireEvent.click(screen.getByRole("button", { name: /模型配置/ }));

    // Provider names appear in cards (no expand/collapse)
    expect(screen.getAllByText("OpenAI").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("DeepSeek").length).toBeGreaterThanOrEqual(1);
  });

  it("can add a new provider", async () => {
    const mockState = createMockState();
    render(<Settings data={workbenchData} />, wrapper(mockState));

    fireEvent.click(screen.getByRole("button", { name: /模型配置/ }));
    fireEvent.click(screen.getByRole("button", { name: /新增供应商/ }));

    const input = screen.getByPlaceholderText("供应商名称，例如：OpenAI");
    fireEvent.change(input, { target: { value: "Test Provider" } });

    const addForm = input.closest(".add-provider-form");
    if (addForm) {
      const buttons = within(addForm as HTMLElement).getAllByRole("button");
      const confirmButton = buttons[0];
      fireEvent.click(confirmButton);
    }

    await waitFor(() => {
      expect(mockState.addModelProvider).toHaveBeenCalledWith({
        name: "Test Provider",
        apiKeyStatus: "missing",
        models: [],
        defaultModel: "",
        enabled: true,
      });
    });
  });

  it("opens config overlay on double-click with model table", async () => {
    const mockState = createMockState();
    render(<Settings data={workbenchData} />, wrapper(mockState));

    fireEvent.click(screen.getByRole("button", { name: /模型配置/ }));

    // Double-click OpenAI provider card
    const openAiTexts = screen.getAllByText("OpenAI");
    const openAiStrong = openAiTexts.find(el => el.tagName === "STRONG") || openAiTexts[0];
    const providerCard = openAiStrong.closest(".provider-card-header");
    if (!providerCard) throw new Error("Provider card header not found");
    fireEvent.doubleClick(providerCard);

    // Overlay should appear with the wide config panel
    await waitFor(() => {
      expect(screen.getByText(/详细配置/)).toBeInTheDocument();
    });

    // Check API fields are present
    expect(screen.getByPlaceholderText("sk-...")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("https://api.example.com/v1")).toBeInTheDocument();

    // Check model table is present with model names
    expect(screen.getAllByText("gpt-5.5").length).toBeGreaterThan(0);
    expect(screen.getAllByText("默认").length).toBeGreaterThan(0);

    // Check test button
    expect(screen.getByRole("button", { name: "测试连接" })).toBeInTheDocument();

    // Fill in API Key and save
    const keyInput = screen.getByPlaceholderText("sk-...");
    fireEvent.change(keyInput, { target: { value: "sk-test-key-123" } });

    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(mockState.updateModelProvider).toHaveBeenCalledWith("provider-openai", expect.objectContaining({
        apiKey: "sk-test-key-123",
        apiKeyStatus: "configured",
      }));
    });
  });

  it("renders AI assistant model config section", async () => {
    const mockState = createMockState();
    render(<Settings data={workbenchData} />, wrapper(mockState));

    fireEvent.click(screen.getByRole("button", { name: /模型配置/ }));

    // Check AI assistant section header exists
    await waitFor(() => {
      expect(screen.getByText("AI 工程助手默认模型")).toBeInTheDocument();
    });

    // Check current config display
    expect(screen.getByText(/当前：/)).toBeInTheDocument();

    // Check supplier dropdown exists
    const supplierLabel = screen.getByText("供应商");
    expect(supplierLabel).toBeInTheDocument();
  });

  it("updates model dropdown when provider changes", async () => {
    const mockState = createMockState();
    render(<Settings data={workbenchData} />, wrapper(mockState));

    fireEvent.click(screen.getByRole("button", { name: /模型配置/ }));

    await waitFor(() => {
      expect(screen.getByText("AI 工程助手默认模型")).toBeInTheDocument();
    });

    // Find the supplier dropdown in AI section
    const aiSection = screen.getByText("AI 工程助手默认模型").closest(".ai-assistant-section");
    if (!aiSection) throw new Error("AI section not found");

    const selects = within(aiSection as HTMLElement).getAllByRole("combobox");
    const supplierSelect = selects[0];

    // Check DeepSeek is an option (enabled provider)
    expect(within(supplierSelect).getByText("DeepSeek")).toBeInTheDocument();

    // Select DeepSeek
    fireEvent.change(supplierSelect, { target: { value: "provider-deepseek" } });

    // Model dropdown should now show DeepSeek models
    const modelSelect = selects[1];
    await waitFor(() => {
      expect(within(modelSelect).getByText("deepseek-v4-pro")).toBeInTheDocument();
    });
  });
});

describe("CLI Runner Configuration", () => {
  it("renders CLI Runner section with runner profiles", () => {
    const mockState = createMockState();
    render(<Settings data={workbenchData} />, wrapper(mockState));

    // Click CLI Runner tab
    fireEvent.click(screen.getByRole("button", { name: /CLI Runner/ }));

    // Check CLI Runner header appears
    expect(screen.getAllByText("CLI Runner").length).toBeGreaterThan(0);

    // Check runner profiles are displayed (use getAllByText since names appear in both cards and dropdown)
    expect(screen.getAllByText("Claude Code CLI").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Codex CLI").length).toBeGreaterThanOrEqual(1);

    // Check enabled badge count
    expect(screen.getByText(/个已启用/)).toBeInTheDocument();

    // Check default runner selector exists
    expect(screen.getByText("默认 CLI Runner")).toBeInTheDocument();
  });

  it("shows runner dropdown in StepEditModal", async () => {
    const mockState = createMockState();

    // Create mock step and template
    const mockStep: WorkflowStep = {
      id: "step-test",
      order: 1,
      name: "Test Step",
      roleId: "role-001",
      modelProviderId: "provider-deepseek",
      modelName: "deepseek-v4-pro",
      inputs: [],
      outputs: [],
      gateMode: "auto",
      failureStrategy: "stop",
      projectOverride: false,
    };

    const mockTemplate: WorkflowTemplate = {
      id: "test-template",
      name: "Test Template",
      version: 1,
      steps: [mockStep],
      createdAt: "2026-05-15T06:00:00.000Z",
      updatedAt: "2026-05-15T06:00:00.000Z",
    };

    render(
      <StepEditModal
        step={mockStep}
        template={mockTemplate}
        data={workbenchData}
        onSave={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
      wrapper(mockState)
    );

    // Check modal header
    expect(screen.getByText(/编辑步骤/)).toBeInTheDocument();

    // Check CLI Runner dropdown label exists
    expect(screen.getByText("CLI Runner")).toBeInTheDocument();

    // Check that default runner option exists in the runner select
    expect(screen.getByText("使用默认 Runner")).toBeInTheDocument();

    // Check that enabled runners appear as options (Claude Code CLI and Codex CLI are enabled in fixtures)
    expect(screen.getByText("Claude Code CLI (claude)")).toBeInTheDocument();
    expect(screen.getByText("Codex CLI (codex)")).toBeInTheDocument();
  });
});
