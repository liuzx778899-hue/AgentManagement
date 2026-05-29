export type Scope = "personal" | "team";
export type DesktopIntegrationStatus = "deferred" | "active";
export type PermissionLevel = "owner" | "admin" | "member" | "viewer";

export type ProjectSourceType = "claude-code" | "codex" | "generic" | "mixed" | "ai-briefing";
export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface ProjectSettings {
  installCommand: string;
  testCommand: string;
  buildCommand: string;
  previewCommand: string;
  detectedStack: string;
  riskSummary: string;
  projectDescription?: string;
}

export interface Project {
  id: string;
  name: string;
  repoPath: string;
  defaultBranch: string;
  worktreeRoot: string;
  scope: Scope;
  desktopIntegrationStatus: DesktopIntegrationStatus;
  permissions: {
    permissionLevel: PermissionLevel;
  };
  settings: ProjectSettings;
  workflowTemplateId: string;
  remoteRepo?: import("./git").RemoteRepo;
  roleOverrides?: Record<string, string>;
  projectMarkdown?: string;
  workflowOverrides?: string;
  // Project management overview fields
  sourceType?: ProjectSourceType;
  phase?: string;
  healthScore?: number;
  riskLevel?: RiskLevel;
  currentMilestone?: string;
  nextCheckpoint?: string;
  lastCheckAt?: string;
  discoveryChanges?: number;
  runStatus?: string;
  status?: "running" | "waiting" | "completed" | "paused";
  progress?: number;
  createdAt: string;
  updatedAt: string;
}