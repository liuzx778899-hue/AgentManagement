// Re-export all domain types for backward compatibility
export type { Scope, DesktopIntegrationStatus, PermissionLevel, ProjectSettings, Project } from "./project";
export type { GateMode, FailureStrategy, WorkflowTemplate, WorkflowStep } from "./workflow";
export type { Task, AgentRun } from "./task";
export type { AgentRole } from "./role";
export type { GateStatus, ManualGate } from "./gate";
export type { MemoryKind, MemoryScope, MemoryItem } from "./memory";
export type {
  CapabilitySource,
  CapabilityStatus,
  McpServerCapability,
  SkillCapability,
  PluginCapability,
  AgentCapability,
  CapabilityPack,
} from "./capability";
export type { ModelProvider, ModelInfo } from "./model";
export type { EngineeringFeedback } from "./engineering";
export type {
  ImPlatform,
  ImEventType,
  ImMessageTemplate,
  ImRouteRule,
  ImAdapter,
  ProjectImBinding,
} from "./im";
export type {
  GitPlatform,
  GitCredential,
  RemoteRepo,
  RepoIssue,
  RepoPullRequest,
  CiPipeline,
  GitStatus,
  RepoCommit,
  GitBranch,
} from "./git";
export type { RunnerKind, RunnerProfile } from "./runner";
import type { AppSettings } from "../types/settings";
export type { AppSettings };

// View type (stays here as it's UI-specific)
export type WorkbenchView =
  | "workbench"
  | "project-management"
  | "project-workspace"
  | "project-detail"
  | "workflow-management"
  | "workflows"
  | "ai-workflow-design"
  | "memory"
  | "settings"
  | "ai-briefing";

// Aggregate data type
import type { Project } from "./project";
import type { Task, AgentRun } from "./task";
import type { WorkflowTemplate } from "./workflow";
import type { AgentRole } from "./role";
import type { ManualGate } from "./gate";
import type { MemoryItem } from "./memory";
import type { CapabilityPack, McpServerCapability, SkillCapability, PluginCapability, AgentCapability } from "./capability";
import type { ModelProvider } from "./model";
import type { EngineeringFeedback } from "./engineering";
import type { ImAdapter, ProjectImBinding } from "./im";
import type { GitCredential, RepoIssue, RepoPullRequest, CiPipeline, GitStatus, RepoCommit, GitBranch } from "./git";
import type { RunnerProfile } from "./runner";

export interface WorkbenchData {
  projects: Project[];
  tasks: Task[];
  workflowTemplates: WorkflowTemplate[];
  roles: AgentRole[];
  modelProviders: ModelProvider[];
  agentRuns: AgentRun[];
  manualGates: ManualGate[];
  engineeringFeedback: EngineeringFeedback | null;
  memories: MemoryItem[];
  capabilityPacks: CapabilityPack[];
  // Capability Center - split types
  mcpServers: McpServerCapability[];
  skills: SkillCapability[];
  plugins: PluginCapability[];
  agents: AgentCapability[];
  // IM Adapters
  imAdapters: ImAdapter[];
  projectImBindings: ProjectImBinding[];
  // Git/DevOps
  gitCredentials: GitCredential[];
  gitStatuses: GitStatus[];
  repoIssues: RepoIssue[];
  repoPullRequests: RepoPullRequest[];
  ciPipelines: CiPipeline[];
  repoCommits: RepoCommit[];
  gitBranches: GitBranch[];
  activeProjectId: string;
  activeView: WorkbenchView;
  aiAssistantModel?: {
    providerId: string;
    modelName: string;
  };
  // CLI Runners
  runnerProfiles: RunnerProfile[];
  defaultRunner?: string;
  // App Settings
  settings: AppSettings;
}