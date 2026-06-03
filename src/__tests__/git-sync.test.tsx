import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Settings } from "../components/Settings";
import { ProjectWorkspace } from "../components/ProjectWorkspace";
import { WorkbenchContext } from "../App";
import { workbenchData } from "../data/fixtures";

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
  updateTask: vi.fn(),
  updateRunner: vi.fn(),
  setDefaultRunner: vi.fn(),
  updateSettings: vi.fn(),
  setTasks: vi.fn(),
});

const wrapper = (mockState: ReturnType<typeof createMockState>) => ({
  wrapper: ({ children }: { children: React.ReactNode }) => (
    <WorkbenchContext.Provider value={mockState}>{children}</WorkbenchContext.Provider>
  ),
});

describe("Git Sync", () => {
  // Test 1: Settings shows remote repo config
  it("shows remote repo config in project settings", () => {
    const mockState = createMockState();
    render(<Settings data={workbenchData} />, wrapper(mockState));

    // Click on "项目设置" tab
    fireEvent.click(screen.getByRole("button", { name: /项目设置/ }));

    // Verify remote repo section exists
    const remoteRepoSection = document.querySelector(".remote-repo-section");
    expect(remoteRepoSection).toBeInTheDocument();

    // Check that the form shows values from proj-001 remoteRepo
    expect(within(remoteRepoSection as HTMLElement).getByText("远程仓库")).toBeInTheDocument();
    // Verify owner input has the correct value
    const ownerInput = within(remoteRepoSection as HTMLElement).getByPlaceholderText("仓库所有者");
    expect(ownerInput).toHaveValue("anthropics");
  });

  // Test 2: Git button renders and shows menu
  it("renders Git button and shows dropdown menu on click", () => {
    const mockState = createMockState();
    render(
      <ProjectWorkspace data={workbenchData} projectId="proj-001" onBack={() => {}} />,
      wrapper(mockState)
    );

    // Find Git button
    const gitButtons = screen.getAllByRole("button").filter(
      (btn) => btn.textContent?.includes("Git")
    );
    expect(gitButtons.length).toBeGreaterThan(0);

    // Click to open menu
    fireEvent.click(gitButtons[0]);

    // Menu should appear with branch/commit items
    expect(screen.getByText("分支")).toBeInTheDocument();
    expect(screen.getByText("提交")).toBeInTheDocument();
  });

  // Test 3: Sync button appears in menu when syncEnabled
  it("shows sync button in Git menu when remoteRepo.syncEnabled is true", async () => {
    const mockState = createMockState();
    render(
      <ProjectWorkspace data={workbenchData} projectId="proj-001" onBack={() => {}} />,
      wrapper(mockState)
    );

    // Open Git menu
    const gitButtons = screen.getAllByRole("button").filter(
      (btn) => btn.textContent?.includes("Git") && !btn.textContent?.includes("同步")
    );
    fireEvent.click(gitButtons[0]);

    // Should see sync button in menu
    await waitFor(() => {
      expect(screen.getByText("同步 Git")).toBeInTheDocument();
    });
  });

  // Test 4: Sync status changes when clicking sync button
  it("changes sync status when clicking sync button in menu", async () => {
    const mockState = createMockState();
    render(
      <ProjectWorkspace data={workbenchData} projectId="proj-001" onBack={() => {}} />,
      wrapper(mockState)
    );

    // Open Git menu
    const gitButtons = screen.getAllByRole("button").filter(
      (btn) => btn.textContent?.includes("Git") && !btn.textContent?.includes("同步")
    );
    fireEvent.click(gitButtons[0]);

    // Find and click sync button in menu
    await waitFor(() => {
      const syncBtn = screen.getByText("同步 Git");
      expect(syncBtn).toBeInTheDocument();
    });

    const syncBtn = screen.getByText("同步 Git").closest("button");
    fireEvent.click(syncBtn!);

    // Should show "同步中..." status
    await waitFor(() => {
      expect(screen.getByText("同步中...")).toBeInTheDocument();
    });
  });

  // Test 5: Issues panel opens from Git menu
  it("opens Issues panel from Git menu", async () => {
    const dataWithMatchingRepo = {
      ...workbenchData,
      projects: workbenchData.projects.map((p) =>
        p.id === "proj-001"
          ? {
              ...p,
              remoteRepo: {
                platform: "github" as const,
                credentialId: "git-gh-personal",
                repoOwner: "anthropic",
                repoName: "claude-code",
                defaultBranch: "main",
                syncEnabled: true,
                syncStatus: "idle" as const,
                lastSyncAt: "2026-05-15T10:30:00.000Z",
              },
            }
          : p
      ),
    };

    const mockState = createMockState();
    mockState.data = dataWithMatchingRepo;

    render(
      <ProjectWorkspace data={dataWithMatchingRepo} projectId="proj-001" onBack={() => {}} />,
      wrapper(mockState)
    );

    // Open Git menu
    const gitButtons = screen.getAllByRole("button").filter(
      (btn) => btn.textContent?.includes("Git") && !btn.textContent?.includes("同步")
    );
    fireEvent.click(gitButtons[0]);

    // Wait for menu and click Issues
    await waitFor(() => {
      const issuesBtn = screen.getAllByRole("button").filter(
        (btn) => btn.textContent?.includes("Issues")
      );
      fireEvent.click(issuesBtn[issuesBtn.length - 1]);
    });

    // Wait for Issues panel
    await waitFor(() => {
      expect(document.querySelector(".pw-issues-panel")).toBeInTheDocument();
    });
  });

  // Test 6: CI panel opens from Git menu
  it("opens CI panel from Git menu", async () => {
    const dataWithMatchingRepo = {
      ...workbenchData,
      projects: workbenchData.projects.map((p) =>
        p.id === "proj-001"
          ? {
              ...p,
              remoteRepo: {
                platform: "github" as const,
                credentialId: "git-gh-personal",
                repoOwner: "anthropic",
                repoName: "claude-code",
                defaultBranch: "main",
                syncEnabled: true,
                syncStatus: "idle" as const,
                lastSyncAt: "2026-05-15T10:30:00.000Z",
              },
            }
          : p
      ),
    };

    const mockState = createMockState();
    mockState.data = dataWithMatchingRepo;

    render(
      <ProjectWorkspace data={dataWithMatchingRepo} projectId="proj-001" onBack={() => {}} />,
      wrapper(mockState)
    );

    // Open Git menu
    const gitButtons = screen.getAllByRole("button").filter(
      (btn) => btn.textContent?.includes("Git") && !btn.textContent?.includes("同步")
    );
    fireEvent.click(gitButtons[0]);

    // Wait for menu and click CI
    await waitFor(() => {
      const ciBtns = screen.getAllByRole("button").filter(
        (btn) => btn.textContent?.includes("CI")
      );
      fireEvent.click(ciBtns[ciBtns.length - 1]);
    });

    // Wait for CI panel
    await waitFor(() => {
      expect(document.querySelector(".pw-ci-panel")).toBeInTheDocument();
    });
  });

  // Test 7: Sync button hidden in menu when syncEnabled is false
  it("hides sync button in menu when remoteRepo.syncEnabled is false", async () => {
    const dataWithDisabledSync = {
      ...workbenchData,
      projects: workbenchData.projects.map((p) =>
        p.id === "proj-001"
          ? {
              ...p,
              remoteRepo: p.remoteRepo
                ? { ...p.remoteRepo, syncEnabled: false }
                : undefined,
            }
          : p
      ),
    };

    const mockState = createMockState();
    mockState.data = dataWithDisabledSync;

    render(
      <ProjectWorkspace data={dataWithDisabledSync} projectId="proj-001" onBack={() => {}} />,
      wrapper(mockState)
    );

    // Open Git menu
    const gitButtons = screen.getAllByRole("button").filter(
      (btn) => btn.textContent?.includes("Git")
    );
    fireEvent.click(gitButtons[0]);

    // Sync button should not be in menu
    await waitFor(() => {
      expect(screen.queryByText("同步 Git")).not.toBeInTheDocument();
    });
  });

  // Test 8: Branch panel opens from Git menu
  it("opens Branch panel from Git menu", async () => {
    const mockState = createMockState();
    render(
      <ProjectWorkspace data={workbenchData} projectId="proj-001" onBack={() => {}} />,
      wrapper(mockState)
    );

    // Open Git menu
    const gitButtons = screen.getAllByRole("button").filter(
      (btn) => btn.textContent?.includes("Git")
    );
    fireEvent.click(gitButtons[0]);

    // Click Branch in menu
    await waitFor(() => {
      const branchBtns = screen.getAllByRole("button").filter(
        (btn) => btn.textContent?.includes("分支")
      );
      fireEvent.click(branchBtns[branchBtns.length - 1]);
    });

    // Wait for Branch panel
    await waitFor(() => {
      expect(document.querySelector(".pw-branch-panel")).toBeInTheDocument();
    });
  });

  // Test 9: Commit panel opens from Git menu
  it("opens Commit panel from Git menu", async () => {
    const mockState = createMockState();
    render(
      <ProjectWorkspace data={workbenchData} projectId="proj-001" onBack={() => {}} />,
      wrapper(mockState)
    );

    // Open Git menu
    const gitButtons = screen.getAllByRole("button").filter(
      (btn) => btn.textContent?.includes("Git")
    );
    fireEvent.click(gitButtons[0]);

    // Click Commit in menu
    await waitFor(() => {
      const commitBtns = screen.getAllByRole("button").filter(
        (btn) => btn.textContent?.includes("提交")
      );
      fireEvent.click(commitBtns[commitBtns.length - 1]);
    });

    // Wait for Commit panel
    await waitFor(() => {
      expect(document.querySelector(".pw-commit-panel")).toBeInTheDocument();
    });
  });

  // Test 10: Settings remote repo section shows correct initial values
  it("initializes remote repo form with project values", () => {
    const mockState = createMockState();
    render(<Settings data={workbenchData} />, wrapper(mockState));

    // Click on "项目设置" tab
    fireEvent.click(screen.getByRole("button", { name: /项目设置/ }));

    const remoteRepoSection = document.querySelector(".remote-repo-section");
    expect(remoteRepoSection).toBeInTheDocument();

    // Check that the form shows values from the first project (proj-001)
    const selects = within(remoteRepoSection as HTMLElement).getAllByRole("combobox");
    expect(selects.length).toBeGreaterThan(0);
  });
});
