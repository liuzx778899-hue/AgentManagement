import { describe, it, expect } from "vitest";
import { getMyTasks, getWaitingTasks, getReadyTasks, checkTaskDependenciesMet } from "../../state/selectors";
import type { Task } from "../../domain/task";

// Mock tasks for testing
const mockTasks: Task[] = [
  {
    id: "task-1",
    projectId: "project-1",
    goal: "Task 1 - completed",
    acceptanceCriteria: [],
    workflowTemplateId: "workflow-1",
    roleId: "role-1",
    status: "done",
    roleAssignment: {},
    capabilityAuthorization: [],
    launchStrategy: "direct",
    activeRunId: null,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    dependsOnTaskIds: [],
    priority: "P0",
  },
  {
    id: "task-2",
    projectId: "project-1",
    goal: "Task 2 - running",
    acceptanceCriteria: [],
    workflowTemplateId: "workflow-1",
    roleId: "role-1",
    status: "running",
    roleAssignment: {},
    capabilityAuthorization: [],
    launchStrategy: "direct",
    activeRunId: "run-1",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    dependsOnTaskIds: [],
    priority: "P1",
  },
  {
    id: "task-3",
    projectId: "project-1",
    goal: "Task 3 - queued waiting for task-1",
    acceptanceCriteria: [],
    workflowTemplateId: "workflow-1",
    roleId: "role-2",
    status: "queued",
    roleAssignment: {},
    capabilityAuthorization: [],
    launchStrategy: "direct",
    activeRunId: null,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    dependsOnTaskIds: ["task-1"],
    priority: "P2",
  },
  {
    id: "task-4",
    projectId: "project-1",
    goal: "Task 4 - queued waiting for task-2 (not done)",
    acceptanceCriteria: [],
    workflowTemplateId: "workflow-1",
    roleId: "role-2",
    status: "queued",
    roleAssignment: {},
    capabilityAuthorization: [],
    launchStrategy: "direct",
    activeRunId: null,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    dependsOnTaskIds: ["task-2"],
    priority: "P2",
  },
  {
    id: "task-5",
    projectId: "project-1",
    goal: "Task 5 - draft with dependencies",
    acceptanceCriteria: [],
    workflowTemplateId: "workflow-1",
    roleId: "role-1",
    status: "draft",
    roleAssignment: {},
    capabilityAuthorization: [],
    launchStrategy: "direct",
    activeRunId: null,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    dependsOnTaskIds: ["task-1", "task-2"],
    priority: "P3",
  },
  {
    id: "task-6",
    projectId: "project-1",
    goal: "Task 6 - queued no dependencies",
    acceptanceCriteria: [],
    workflowTemplateId: "workflow-1",
    roleId: "role-3",
    status: "queued",
    roleAssignment: {},
    capabilityAuthorization: [],
    launchStrategy: "direct",
    activeRunId: null,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    dependsOnTaskIds: [],
    priority: "P1",
  },
  {
    id: "task-7",
    projectId: "project-1",
    goal: "Task 7 - failed",
    acceptanceCriteria: [],
    workflowTemplateId: "workflow-1",
    roleId: "role-1",
    status: "failed",
    roleAssignment: {},
    capabilityAuthorization: [],
    launchStrategy: "direct",
    activeRunId: null,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    dependsOnTaskIds: [],
    priority: "P0",
  },
];

describe("Task Selectors (Issue #30)", () => {
  describe("getMyTasks", () => {
    it("returns tasks assigned to the specified role", () => {
      const result = getMyTasks(mockTasks, "role-1");
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((t) => t.roleId === "role-1")).toBe(true);
    });

    it("excludes done and failed tasks", () => {
      const result = getMyTasks(mockTasks, "role-1");
      expect(result.some((t) => t.status === "done")).toBe(false);
      expect(result.some((t) => t.status === "failed")).toBe(false);
    });

    it("returns empty array when no tasks match", () => {
      const result = getMyTasks(mockTasks, "non-existent-role");
      expect(result).toEqual([]);
    });
  });

  describe("getWaitingTasks", () => {
    it("returns tasks waiting for dependencies", () => {
      const result = getWaitingTasks(mockTasks);
      // task-3 depends on task-1 (done) - not waiting
      // task-4 depends on task-2 (running) - waiting
      // task-5 depends on task-1 (done) and task-2 (running) - waiting
      expect(result.length).toBeGreaterThan(0);
    });

    it("includes waiting info for each task", () => {
      const result = getWaitingTasks(mockTasks);
      const task4Waiting = result.find((item) => item.task.id === "task-4");
      expect(task4Waiting).toBeDefined();
      expect(task4Waiting!.waitingFor.some((t) => t.id === "task-2")).toBe(true);
    });

    it("excludes tasks with no dependencies", () => {
      const result = getWaitingTasks(mockTasks);
      expect(result.some((item) => item.task.id === "task-6")).toBe(false);
    });
  });

  describe("getReadyTasks", () => {
    it("returns queued tasks with all dependencies met", () => {
      const result = getReadyTasks(mockTasks);
      // task-3: queued, depends on task-1 (done) - ready
      // task-6: queued, no dependencies - ready
      expect(result.some((t) => t.id === "task-3")).toBe(true);
      expect(result.some((t) => t.id === "task-6")).toBe(true);
    });

    it("excludes tasks with unmet dependencies", () => {
      const result = getReadyTasks(mockTasks);
      // task-4: queued, depends on task-2 (running) - not ready
      expect(result.some((t) => t.id === "task-4")).toBe(false);
    });

    it("excludes tasks that are not queued", () => {
      const result = getReadyTasks(mockTasks);
      // task-5: draft - not ready (not queued)
      expect(result.some((t) => t.id === "task-5")).toBe(false);
    });
  });

  describe("checkTaskDependenciesMet", () => {
    it("returns true for tasks with no dependencies", () => {
      const task = mockTasks.find((t) => t.id === "task-6")!;
      expect(checkTaskDependenciesMet(task, mockTasks)).toBe(true);
    });

    it("returns true when all dependencies are done", () => {
      const task = mockTasks.find((t) => t.id === "task-3")!;
      expect(checkTaskDependenciesMet(task, mockTasks)).toBe(true);
    });

    it("returns false when some dependencies are not done", () => {
      const task = mockTasks.find((t) => t.id === "task-4")!;
      expect(checkTaskDependenciesMet(task, mockTasks)).toBe(false);
    });

    it("returns false when dependency task is missing", () => {
      const task: Task = {
        ...mockTasks[0],
        id: "task-x",
        dependsOnTaskIds: ["non-existent-task"],
      };
      expect(checkTaskDependenciesMet(task, mockTasks)).toBe(false);
    });
  });
});
