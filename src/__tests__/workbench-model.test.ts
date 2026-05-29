import { describe, expect, it } from "vitest";
import { activeGate, workbenchData } from "../data/fixtures";

describe("workbench fixtures", () => {
  it("covers the V1 flow pages", () => {
    expect(workbenchData.projects[0].repoPath).toContain("AgentDevelop");
    expect(workbenchData.tasks[0].workflowTemplateId).toBe("software-dev-v1");
    expect(workbenchData.workflowTemplates[0].steps.some((step) => step.gateMode === "manual")).toBe(true);
    expect(activeGate(workbenchData)?.status).toBe("waiting");
    expect(workbenchData.memories.map((item) => item.kind)).toEqual(
      expect.arrayContaining(["project", "role", "task"])
    );
  });

  it("keeps team and desktop as deferred model fields", () => {
    expect(workbenchData.projects[0]).toMatchObject({
      scope: "personal",
      desktopIntegrationStatus: "deferred",
    });
    expect(workbenchData.projects[0].permissions.permissionLevel).toBe("owner");
  });
});
