export interface Task {
  id: string;
  projectId: string;
  goal: string;
  acceptanceCriteria: string[];
  workflowTemplateId: string;
  roleAssignment: Record<string, string>;
  capabilityAuthorization: string[];
  launchStrategy: "worktree" | "direct";
  status: "draft" | "queued" | "running" | "gate" | "done" | "failed";
  activeRunId: string | null;
  createdAt: string;
  updatedAt: string;
}

// AgentRun has been extracted to its own domain file.
// Re-export for backward compatibility with existing imports.
export type { AgentRun, AgentRunStatus, CreateAgentRunInput, AgentRunUpdate } from "./agentRun";