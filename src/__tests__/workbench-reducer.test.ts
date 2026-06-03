import { describe, it, expect } from "vitest";
import { workbenchReducer, generateId } from "../state/workbenchReducer";
import {
  updateGateStatus,
  addMemory,
  deleteMemory,
  createTask,
  updateTaskAction,
  addProject,
  deleteProject,
  addModelProvider,
  deleteModelProvider,
} from "../state/workbenchActions";
import { workbenchData as initialData } from "../data/fixtures";

describe("workbenchReducer", () => {
  describe("generateId", () => {
    it("generates unique IDs", () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^\d+-[a-z0-9]+$/);
    });
  });

  describe("memory actions", () => {
    it("adds a memory", () => {
      const initialCount = initialData.memories.length;
      const state = workbenchReducer(initialData, addMemory({
        kind: "project",
        scope: "project",
        projectId: "proj-001",
        roleId: null,
        taskId: null,
        title: "Test Memory",
        body: "Test content",
        citation: [],
      }));
      expect(state.memories.length).toBe(initialCount + 1);
      expect(state.memories[state.memories.length - 1].title).toBe("Test Memory");
    });

    it("deletes a memory", () => {
      const memoryId = initialData.memories[0].id;
      const state = workbenchReducer(initialData, deleteMemory(memoryId));
      expect(state.memories.find(m => m.id === memoryId)).toBeUndefined();
    });
  });

  describe("project actions", () => {
    it("adds a project", () => {
      const initialCount = initialData.projects.length;
      const state = workbenchReducer(initialData, addProject({
        name: "Test Project",
        repoPath: "/test/path",
        defaultBranch: "main",
        worktreeRoot: "/test/worktrees",
        scope: "personal",
        desktopIntegrationStatus: "deferred",
        permissions: { permissionLevel: "owner" },
        settings: {
          installCommand: "npm install",
          testCommand: "npm test",
          buildCommand: "npm run build",
          previewCommand: "npm run preview",
          detectedStack: "node",
          riskSummary: "low",
        },
        workflowTemplateId: "wf-001",
      }));
      expect(state.projects.length).toBe(initialCount + 1);
      expect(state.projects[state.projects.length - 1].name).toBe("Test Project");
    });

    it("deletes a project", () => {
      const projectId = initialData.projects[0].id;
      const state = workbenchReducer(initialData, deleteProject(projectId));
      expect(state.projects.find(p => p.id === projectId)).toBeUndefined();
    });
  });

  describe("model provider actions", () => {
    it("adds a model provider", () => {
      const initialCount = initialData.modelProviders.length;
      const state = workbenchReducer(initialData, addModelProvider({
        name: "Test Provider",
        apiKeyStatus: "configured",
        models: [{ name: "model-1", contextLength: 128000, temperature: 0.7, maxTokens: 16384 }, { name: "model-2", contextLength: 128000, temperature: 0.7, maxTokens: 16384 }],
        defaultModel: "model-1",
        enabled: true,
      }));
      expect(state.modelProviders.length).toBe(initialCount + 1);
    });

    it("deletes a model provider", () => {
      const providerId = initialData.modelProviders[0].id;
      const state = workbenchReducer(initialData, deleteModelProvider(providerId));
      expect(state.modelProviders.find(p => p.id === providerId)).toBeUndefined();
    });
  });

  describe("task actions", () => {
    it("creates a task", () => {
      const initialCount = initialData.tasks.length;
      const state = workbenchReducer(initialData, createTask({
        projectId: "proj-001",
        goal: "Test task",
        acceptanceCriteria: ["Criteria 1"],
        workflowTemplateId: "wf-001",
        roleAssignment: {},
        capabilityAuthorization: [],
        launchStrategy: "direct",
        status: "draft",
        activeRunId: null,
      }));
      expect(state.tasks.length).toBe(initialCount + 1);
      expect(state.tasks[state.tasks.length - 1].goal).toBe("Test task");
    });

    it("updates a task's activeRunId", () => {
      const task = initialData.tasks[0];
      expect(task.activeRunId).toBe("run-001");

      const state = workbenchReducer(initialData, updateTaskAction(task.id, {
        activeRunId: "run-new-123",
      }));

      const updatedTask = state.tasks.find(t => t.id === task.id);
      expect(updatedTask?.activeRunId).toBe("run-new-123");
      expect(updatedTask?.updatedAt).not.toBe(task.updatedAt);
    });

    it("updates a task's status", () => {
      const task = initialData.tasks[0];
      const state = workbenchReducer(initialData, updateTaskAction(task.id, {
        status: "done",
      }));

      const updatedTask = state.tasks.find(t => t.id === task.id);
      expect(updatedTask?.status).toBe("done");
    });

    it("does not mutate other tasks when updating one", () => {
      const task0 = initialData.tasks[0];
      const task1 = initialData.tasks[1];
      const state = workbenchReducer(initialData, updateTaskAction(task0.id, {
        activeRunId: "run-updated",
      }));

      const unchangedTask = state.tasks.find(t => t.id === task1.id);
      expect(unchangedTask?.activeRunId).toBe(task1.activeRunId);
    });
  });

  describe("gate actions", () => {
    it("updates gate status to approved", () => {
      const gate = initialData.manualGates.find(g => g.status === "waiting");
      if (gate) {
        const state = workbenchReducer(initialData, updateGateStatus(gate.id, "approved"));
        const updatedGate = state.manualGates.find(g => g.id === gate.id);
        expect(updatedGate?.status).toBe("approved");
        expect(updatedGate?.resolvedAt).not.toBeNull();
      }
    });
  });
});
