import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { NewProjectWizard } from "../components/NewProjectWizard";
import { ProjectCard } from "../components/ProjectCard";
import { Settings } from "../components/Settings";
import { WorkbenchProvider } from "../state/WorkbenchProvider";
import { ServiceContext } from "../context/ServiceContext";
import { workbenchData } from "../data/fixtures";
import type { WorkbenchData, Project } from "../domain/workbench";
import type { LocalEngineeringServices } from "../services/local";

// Create a complete mock services object
function createMockServices(overrides: Partial<LocalEngineeringServices> = {}): LocalEngineeringServices {
  return {
    git: {} as any,
    fileStore: {} as any,
    processRunner: {} as any,
    repositories: {
      project: {} as any,
      memory: {} as any,
      workflow: {} as any,
    },
    ...overrides,
  } as LocalEngineeringServices;
}

// Test that the components use the API services correctly
describe("UI Integration Tests", () => {
  describe("NewProjectWizard", () => {
    it("renders the wizard", () => {
      const mockCreateProject = vi.fn();
      const mockServices = createMockServices({
        createProject: mockCreateProject,
      });

      render(
        <WorkbenchProvider>
          <ServiceContext.Provider value={mockServices}>
            <NewProjectWizard data={workbenchData} />
          </ServiceContext.Provider>
        </WorkbenchProvider>
      );

      // Use getAllByText since the step label appears multiple times
      expect(screen.getAllByText("项目信息").length).toBeGreaterThan(0);
    });
  });

  describe("ProjectCard", () => {
    it("renders project card", () => {
      const mockDeleteProject = vi.fn();
      const mockServices = createMockServices({
        deleteProject: mockDeleteProject,
      });
      const mockProject = workbenchData.projects[0];

      render(
        <WorkbenchProvider>
          <ServiceContext.Provider value={mockServices}>
            <ProjectCard
              project={mockProject}
              data={workbenchData as unknown as WorkbenchData}
              onClick={() => {}}
            />
          </ServiceContext.Provider>
        </WorkbenchProvider>
      );

      expect(screen.getByText(mockProject.name)).toBeInTheDocument();
    });
  });

  describe("Settings", () => {
    it("renders settings page", () => {
      const mockSaveSettings = vi.fn();
      const mockServices = createMockServices({
        saveSettings: mockSaveSettings,
      });

      render(
        <WorkbenchProvider>
          <ServiceContext.Provider value={mockServices}>
            <Settings data={workbenchData} />
          </ServiceContext.Provider>
        </WorkbenchProvider>
      );

      expect(screen.getByText("设置中心")).toBeInTheDocument();
    });

    it("has save button that calls saveSettings API", async () => {
      const mockSaveSettings = vi.fn().mockResolvedValue({
        ok: true,
        data: {},
      });
      const mockServices = createMockServices({
        saveSettings: mockSaveSettings,
      });

      render(
        <WorkbenchProvider>
          <ServiceContext.Provider value={mockServices}>
            <Settings data={workbenchData} />
          </ServiceContext.Provider>
        </WorkbenchProvider>
      );

      const user = userEvent.setup();
      const saveButton = screen.getByRole("button", { name: /保存配置/i });

      await user.click(saveButton);

      await waitFor(() => {
        expect(mockSaveSettings).toHaveBeenCalled();
      });
    });
  });
});