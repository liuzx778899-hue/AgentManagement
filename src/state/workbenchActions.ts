import type {
  GateStatus,
  MemoryItem,
  Project,
  WorkflowStep,
  WorkflowTemplate,
  AgentRole,
  ModelProvider,
  ModelInfo,
  Task,
  ImAdapter,
  ImEventType,
  GitCredential,
  GitStatus,
  McpServerCapability,
  SkillCapability,
  PluginCapability,
  AgentCapability,
} from "../domain/workbench";
import type { RunnerProfile } from "../domain/runner";
import type { Memory } from "../domain/memory";
import type { AppSettings } from "../types/settings";
import type { Notification, CreateNotificationInput } from "../domain/notification";

// Action Types
export type WorkbenchAction =
  | { type: "UPDATE_GATE_STATUS"; gateId: string; status: GateStatus }
  | { type: "REASSIGN_AGENT_RUN"; runId: string; newRoleId: string }
  | { type: "ADD_MEMORY"; memory: Omit<MemoryItem, "id" | "createdAt" | "updatedAt"> }
  | { type: "UPDATE_MEMORY"; memoryId: string; updates: Partial<Pick<MemoryItem, "title" | "body">> }
  | { type: "DELETE_MEMORY"; memoryId: string }
  | { type: "CREATE_TASK"; task: Omit<Task, "id" | "createdAt" | "updatedAt"> }
  | { type: "UPDATE_TASK"; taskId: string; updates: Partial<Task> }
  | { type: "DELETE_TASK"; taskId: string }
  | { type: "ADD_PROJECT"; project: Omit<Project, "id" | "createdAt" | "updatedAt"> }
  | { type: "UPDATE_PROJECT"; projectId: string; updates: Partial<Project> }
  | { type: "DELETE_PROJECT"; projectId: string }
  | { type: "ADD_ROLE"; role: Omit<AgentRole, "id"> & { id?: string } }
  | { type: "UPDATE_ROLE"; roleId: string; updates: Partial<AgentRole> }
  | { type: "ADD_WORKFLOW_STEP"; templateId: string; step: WorkflowStep }
  | { type: "UPDATE_WORKFLOW_STEP"; templateId: string; stepId: string; updates: Partial<WorkflowStep> }
  | { type: "DELETE_WORKFLOW_STEP"; templateId: string; stepId: string }
  | { type: "ADD_MODEL_PROVIDER"; provider: Omit<ModelProvider, "id"> }
  | { type: "UPDATE_MODEL_PROVIDER"; providerId: string; updates: Partial<ModelProvider> }
  | { type: "DELETE_MODEL_PROVIDER"; providerId: string }
  | { type: "ADD_PROVIDER_MODEL"; providerId: string; modelInfo: ModelInfo }
  | { type: "DELETE_PROVIDER_MODEL"; providerId: string; modelName: string }
  | { type: "SET_DEFAULT_MODEL"; providerId: string; modelName: string }
  | { type: "SET_AI_ASSISTANT_MODEL"; providerId: string; modelName: string }
  | { type: "ADD_IM_ADAPTER"; adapter: Omit<ImAdapter, "id" | "createdAt" | "updatedAt"> }
  | { type: "UPDATE_IM_ADAPTER"; adapterId: string; updates: Partial<ImAdapter> }
  | { type: "DELETE_IM_ADAPTER"; adapterId: string }
  | { type: "TOGGLE_IM_ADAPTER_ROUTE"; adapterId: string; eventType: ImEventType; enabled: boolean }
  | { type: "ADD_GIT_CREDENTIAL"; credential: Omit<GitCredential, "id" | "createdAt" | "updatedAt"> }
  | { type: "UPDATE_GIT_CREDENTIAL"; credentialId: string; updates: Partial<GitCredential> }
  | { type: "DELETE_GIT_CREDENTIAL"; credentialId: string }
  | { type: "ADD_WORKFLOW_TEMPLATE"; template: Omit<WorkflowTemplate, "id" | "createdAt" | "updatedAt"> }
  | { type: "UPDATE_WORKFLOW_TEMPLATE"; templateId: string; updates: Partial<WorkflowTemplate> }
  | { type: "DELETE_WORKFLOW_TEMPLATE"; templateId: string }
  | { type: "UPDATE_RUNNER"; runnerId: string; updates: Partial<RunnerProfile> }
  | { type: "SET_DEFAULT_RUNNER"; runnerId: string | undefined }
  | { type: "REFRESH_GIT_STATUS_START"; payload: { projectId: string } }
  | { type: "UPDATE_GIT_STATUS"; payload: { projectId: string; status: Partial<GitStatus> } }
  | { type: "SET_PROJECTS"; payload: Project[] }
  | { type: "SET_MEMORIES"; payload: MemoryItem[] }
  | { type: "SET_MODEL_PROVIDERS"; payload: { providers: ModelProvider[]; aiAssistantModel?: { providerId: string; modelName: string } | null } }
  | { type: "SET_WORKFLOW_TEMPLATES"; payload: WorkflowTemplate[] }
  | { type: "SET_ROLES"; payload: AgentRole[] }
  | { type: "SET_CAPABILITIES"; payload: { mcpServers: McpServerCapability[]; skills: SkillCapability[]; plugins: PluginCapability[]; agents: AgentCapability[] } }
  | { type: "SET_TASKS"; payload: Task[] }
  | { type: "SET_SETTINGS"; payload: AppSettings }
  | { type: "UPDATE_SETTINGS"; payload: Partial<AppSettings> }
  | { type: "ADD_NOTIFICATION"; payload: Notification }
  | { type: "MARK_NOTIFICATION_READ"; payload: { notificationId: string } }
  | { type: "CLEAR_NOTIFICATIONS" }
  | { type: "SET_NOTIFICATIONS"; payload: Notification[] }

// Action Creators
export function updateGateStatus(gateId: string, status: GateStatus): WorkbenchAction {
  return { type: "UPDATE_GATE_STATUS", gateId, status };
}

export function reassignAgentRun(runId: string, newRoleId: string): WorkbenchAction {
  return { type: "REASSIGN_AGENT_RUN", runId, newRoleId };
}

export function addMemory(memory: Omit<MemoryItem, "id" | "createdAt" | "updatedAt">): WorkbenchAction {
  return { type: "ADD_MEMORY", memory };
}

export function updateMemory(memoryId: string, updates: Partial<Pick<MemoryItem, "title" | "body">>): WorkbenchAction {
  return { type: "UPDATE_MEMORY", memoryId, updates };
}

export function deleteMemory(memoryId: string): WorkbenchAction {
  return { type: "DELETE_MEMORY", memoryId };
}

export function createTask(task: Omit<Task, "id" | "createdAt" | "updatedAt">): WorkbenchAction {
  return { type: "CREATE_TASK", task };
}

export function updateTaskAction(taskId: string, updates: Partial<Task>): WorkbenchAction {
  return { type: "UPDATE_TASK", taskId, updates };
}

export function deleteTask(taskId: string): WorkbenchAction {
  return { type: "DELETE_TASK", taskId };
}

export function addProject(project: Omit<Project, "id" | "createdAt" | "updatedAt">): WorkbenchAction {
  return { type: "ADD_PROJECT", project };
}

export function updateProject(projectId: string, updates: Partial<Project>): WorkbenchAction {
  return { type: "UPDATE_PROJECT", projectId, updates };
}

export function deleteProject(projectId: string): WorkbenchAction {
  return { type: "DELETE_PROJECT", projectId };
}

export function addRole(role: Omit<AgentRole, "id">): WorkbenchAction {
  return { type: "ADD_ROLE", role };
}

export function updateRole(roleId: string, updates: Partial<AgentRole>): WorkbenchAction {
  return { type: "UPDATE_ROLE", roleId, updates };
}

export function updateWorkflowStep(templateId: string, stepId: string, updates: Partial<WorkflowStep>): WorkbenchAction {
  return { type: "UPDATE_WORKFLOW_STEP", templateId, stepId, updates };
}

export function addWorkflowStep(templateId: string, step: WorkflowStep): WorkbenchAction {
  return { type: "ADD_WORKFLOW_STEP", templateId, step };
}

export function deleteWorkflowStep(templateId: string, stepId: string): WorkbenchAction {
  return { type: "DELETE_WORKFLOW_STEP", templateId, stepId };
}

export function addModelProvider(provider: Omit<ModelProvider, "id">): WorkbenchAction {
  return { type: "ADD_MODEL_PROVIDER", provider };
}

export function updateModelProvider(providerId: string, updates: Partial<ModelProvider>): WorkbenchAction {
  return { type: "UPDATE_MODEL_PROVIDER", providerId, updates };
}

export function deleteModelProvider(providerId: string): WorkbenchAction {
  return { type: "DELETE_MODEL_PROVIDER", providerId };
}

export function addProviderModel(providerId: string, modelInfo: ModelInfo): WorkbenchAction {
  return { type: "ADD_PROVIDER_MODEL", providerId, modelInfo };
}

export function deleteProviderModel(providerId: string, modelName: string): WorkbenchAction {
  return { type: "DELETE_PROVIDER_MODEL", providerId, modelName };
}

export function setDefaultModel(providerId: string, modelName: string): WorkbenchAction {
  return { type: "SET_DEFAULT_MODEL", providerId, modelName };
}

export function setAiAssistantModel(providerId: string, modelName: string): WorkbenchAction {
  return { type: "SET_AI_ASSISTANT_MODEL", providerId, modelName };
}

export function addImAdapter(adapter: Omit<ImAdapter, "id" | "createdAt" | "updatedAt">): WorkbenchAction {
  return { type: "ADD_IM_ADAPTER", adapter };
}

export function updateImAdapter(adapterId: string, updates: Partial<ImAdapter>): WorkbenchAction {
  return { type: "UPDATE_IM_ADAPTER", adapterId, updates };
}

export function deleteImAdapter(adapterId: string): WorkbenchAction {
  return { type: "DELETE_IM_ADAPTER", adapterId };
}

export function toggleImAdapterRoute(adapterId: string, eventType: ImEventType, enabled: boolean): WorkbenchAction {
  return { type: "TOGGLE_IM_ADAPTER_ROUTE", adapterId, eventType, enabled };
}

export function addGitCredential(credential: Omit<GitCredential, "id" | "createdAt" | "updatedAt">): WorkbenchAction {
  return { type: "ADD_GIT_CREDENTIAL", credential };
}

export function updateGitCredential(credentialId: string, updates: Partial<GitCredential>): WorkbenchAction {
  return { type: "UPDATE_GIT_CREDENTIAL", credentialId, updates };
}

export function deleteGitCredential(credentialId: string): WorkbenchAction {
  return { type: "DELETE_GIT_CREDENTIAL", credentialId };
}

export function addWorkflowTemplate(template: Omit<WorkflowTemplate, "id" | "createdAt" | "updatedAt">): WorkbenchAction {
  return { type: "ADD_WORKFLOW_TEMPLATE", template };
}

export function updateWorkflowTemplate(templateId: string, updates: Partial<WorkflowTemplate>): WorkbenchAction {
  return { type: "UPDATE_WORKFLOW_TEMPLATE", templateId, updates };
}

export function deleteWorkflowTemplate(templateId: string): WorkbenchAction {
  return { type: "DELETE_WORKFLOW_TEMPLATE", templateId };
}

export function updateRunner(runnerId: string, updates: Partial<RunnerProfile>): WorkbenchAction {
  return { type: "UPDATE_RUNNER", runnerId, updates };
}

export function setDefaultRunner(runnerId: string | undefined): WorkbenchAction {
  return { type: "SET_DEFAULT_RUNNER", runnerId };
}

// Git Status Actions
export function refreshGitStatusStart(projectId: string): WorkbenchAction {
  return { type: "REFRESH_GIT_STATUS_START", payload: { projectId } };
}

export function updateGitStatusAction(projectId: string, status: Partial<GitStatus>): WorkbenchAction {
  return { type: "UPDATE_GIT_STATUS", payload: { projectId, status } };
}

// Data Loading Actions
export function setProjects(projects: Project[]): WorkbenchAction {
  return { type: "SET_PROJECTS", payload: projects };
}

export function setMemories(memories: MemoryItem[]): WorkbenchAction {
  return { type: "SET_MEMORIES", payload: memories };
}

export function setModelProviders(providers: ModelProvider[], aiAssistantModel?: { providerId: string; modelName: string } | null): WorkbenchAction {
  return { type: "SET_MODEL_PROVIDERS", payload: { providers, aiAssistantModel } };
}

export function setWorkflowTemplates(templates: WorkflowTemplate[]): WorkbenchAction {
  return { type: "SET_WORKFLOW_TEMPLATES", payload: templates };
}

export function setRoles(roles: AgentRole[]): WorkbenchAction {
  return { type: "SET_ROLES", payload: roles };
}

export function setCapabilities(payload: {
  mcpServers: McpServerCapability[];
  skills: SkillCapability[];
  plugins: PluginCapability[];
  agents: AgentCapability[];
}): WorkbenchAction {
  return { type: "SET_CAPABILITIES", payload };
}

export function setTasks(tasks: Task[]): WorkbenchAction {
  return { type: "SET_TASKS", payload: tasks };
}

export function setSettings(settings: AppSettings): WorkbenchAction {
  return { type: "SET_SETTINGS", payload: settings };
}

export function updateSettings(updates: Partial<AppSettings>): WorkbenchAction {
  return { type: "UPDATE_SETTINGS", payload: updates };
}

// Notification Actions
export function addNotification(input: CreateNotificationInput & { id: string; createdAt: string }): WorkbenchAction {
  return { type: "ADD_NOTIFICATION", payload: { ...input, read: false } };
}

export function markNotificationRead(notificationId: string): WorkbenchAction {
  return { type: "MARK_NOTIFICATION_READ", payload: { notificationId } };
}

export function clearNotifications(): WorkbenchAction {
  return { type: "CLEAR_NOTIFICATIONS" };
}

export function setNotifications(notifications: Notification[]): WorkbenchAction {
  return { type: "SET_NOTIFICATIONS", payload: notifications };
}
