import { createContext, useContext, useMemo, useReducer, useCallback, type ReactNode } from "react";
import type {
  WorkbenchView,
  WorkbenchData,
  GateStatus,
  MemoryItem,
  Project,
  AgentRole,
  WorkflowStep,
  WorkflowTemplate,
  ModelProvider,
  ModelInfo,
  ImAdapter,
  ImEventType,
  GitCredential,
} from "../domain/workbench";
import type { RunnerProfile } from "../domain/runner";
import { workbenchReducer } from "./workbenchReducer";
import {
  updateGateStatus as updateGateStatusAction,
  reassignAgentRun as reassignAgentRunAction,
  addMemory as addMemoryAction,
  updateMemory as updateMemoryAction,
  deleteMemory as deleteMemoryAction,
  createTask as createTaskAction,
  addProject as addProjectAction,
  updateProject as updateProjectAction,
  deleteProject as deleteProjectAction,
  addRole as addRoleAction,
  updateRole as updateRoleAction,
  addWorkflowStep as addWorkflowStepAction,
  updateWorkflowStep as updateWorkflowStepAction,
  deleteWorkflowStep as deleteWorkflowStepAction,
  addModelProvider as addModelProviderAction,
  updateModelProvider as updateModelProviderAction,
  deleteModelProvider as deleteModelProviderAction,
  addProviderModel as addProviderModelAction,
  deleteProviderModel as deleteProviderModelAction,
  setDefaultModel as setDefaultModelAction,
  setAiAssistantModel as setAiAssistantModelAction,
  addImAdapter as addImAdapterAction,
  updateImAdapter as updateImAdapterAction,
  deleteImAdapter as deleteImAdapterAction,
  toggleImAdapterRoute as toggleImAdapterRouteAction,
  addGitCredential as addGitCredentialAction,
  updateGitCredential as updateGitCredentialAction,
  deleteGitCredential as deleteGitCredentialAction,
  addWorkflowTemplate as addWorkflowTemplateAction,
  updateWorkflowTemplate as updateWorkflowTemplateAction,
  deleteWorkflowTemplate as deleteWorkflowTemplateAction,
  updateRunner as updateRunnerAction,
  setDefaultRunner as setDefaultRunnerAction,
} from "./workbenchActions";
import { workbenchData as initialData } from "../data/fixtures";

// State Context
interface WorkbenchState {
  data: WorkbenchData;
  updateGateStatus: (gateId: string, status: GateStatus) => void;
  addMemory: (memory: Omit<MemoryItem, "id" | "createdAt" | "updatedAt">) => void;
  updateMemory: (memoryId: string, updates: Partial<Pick<MemoryItem, "title" | "body">>) => void;
  deleteMemory: (memoryId: string) => void;
  createTask: (task: Omit<WorkbenchData["tasks"][0], "id" | "createdAt" | "updatedAt">) => void;
  addProject: (project: Omit<Project, "id" | "createdAt" | "updatedAt">) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  deleteProject: (projectId: string) => void;
  addRole?: (role: Omit<AgentRole, "id">) => void;
  updateRole?: (roleId: string, updates: Partial<AgentRole>) => void;
  addWorkflowStep: (templateId: string, step: WorkflowStep) => void;
  updateWorkflowStep: (templateId: string, stepId: string, updates: Partial<WorkflowStep>) => void;
  deleteWorkflowStep: (templateId: string, stepId: string) => void;
  addModelProvider: (provider: Omit<ModelProvider, "id">) => void;
  updateModelProvider: (providerId: string, updates: Partial<ModelProvider>) => void;
  deleteModelProvider: (providerId: string) => void;
  addProviderModel: (providerId: string, modelInfo: ModelInfo) => void;
  deleteProviderModel: (providerId: string, modelName: string) => void;
  setDefaultProviderModel: (providerId: string, modelName: string) => void;
  setAiAssistantModel: (providerId: string, modelName: string) => void;
  reassignAgentRun: (runId: string, newRoleId: string) => void;
  addImAdapter: (adapter: Omit<ImAdapter, "id" | "createdAt" | "updatedAt">) => void;
  updateImAdapter: (adapterId: string, updates: Partial<ImAdapter>) => void;
  deleteImAdapter: (adapterId: string) => void;
  toggleImAdapterRoute: (adapterId: string, eventType: ImEventType, enabled: boolean) => void;
  addGitCredential: (credential: Omit<GitCredential, "id" | "createdAt" | "updatedAt">) => void;
  updateGitCredential: (credentialId: string, updates: Partial<GitCredential>) => void;
  deleteGitCredential: (credentialId: string) => void;
  addWorkflowTemplate: (template: Omit<WorkflowTemplate, "id" | "createdAt" | "updatedAt">) => void;
  updateWorkflowTemplate?: (templateId: string, updates: Partial<WorkflowTemplate>) => void;
  deleteWorkflowTemplate: (templateId: string) => void;
  updateRunner: (runnerId: string, updates: Partial<RunnerProfile>) => void;
  setDefaultRunner: (runnerId: string | undefined) => void;
}

export const WorkbenchContext = createContext<WorkbenchState | null>(null);

export function useWorkbenchState(): WorkbenchState {
  const ctx = useContext(WorkbenchContext);
  if (!ctx) throw new Error("useWorkbenchState must be used within WorkbenchProvider");
  return ctx;
}

interface WorkbenchProviderProps {
  children: ReactNode;
  initialView?: WorkbenchView;
}

export function WorkbenchProvider({ children }: WorkbenchProviderProps) {
  const [data, dispatch] = useReducer(workbenchReducer, initialData);

  const updateGateStatus = useCallback((gateId: string, status: GateStatus) => {
    dispatch(updateGateStatusAction(gateId, status));
  }, []);

  const reassignAgentRun = useCallback((runId: string, newRoleId: string) => {
    dispatch(reassignAgentRunAction(runId, newRoleId));
  }, []);

  const addMemory = useCallback((memory: Omit<MemoryItem, "id" | "createdAt" | "updatedAt">) => {
    dispatch(addMemoryAction(memory));
  }, []);

  const updateMemory = useCallback((memoryId: string, updates: Partial<Pick<MemoryItem, "title" | "body">>) => {
    dispatch(updateMemoryAction(memoryId, updates));
  }, []);

  const deleteMemory = useCallback((memoryId: string) => {
    dispatch(deleteMemoryAction(memoryId));
  }, []);

  const createTask = useCallback((task: Omit<WorkbenchData["tasks"][0], "id" | "createdAt" | "updatedAt">) => {
    dispatch(createTaskAction(task));
  }, []);

  const addProject = useCallback((project: Omit<Project, "id" | "createdAt" | "updatedAt">) => {
    dispatch(addProjectAction(project));
  }, []);

  const updateProject = useCallback((projectId: string, updates: Partial<Project>) => {
    dispatch(updateProjectAction(projectId, updates));
  }, []);

  const deleteProject = useCallback((projectId: string) => {
    dispatch(deleteProjectAction(projectId));
  }, []);

  const addRole = useCallback((role: Omit<AgentRole, "id">) => {
    dispatch(addRoleAction(role));
  }, []);

  const updateRole = useCallback((roleId: string, updates: Partial<AgentRole>) => {
    dispatch(updateRoleAction(roleId, updates));
  }, []);

  const updateWorkflowStep = useCallback((templateId: string, stepId: string, updates: Partial<WorkflowStep>) => {
    dispatch(updateWorkflowStepAction(templateId, stepId, updates));
  }, []);

  const addWorkflowStep = useCallback((templateId: string, step: WorkflowStep) => {
    dispatch(addWorkflowStepAction(templateId, step));
  }, []);

  const deleteWorkflowStep = useCallback((templateId: string, stepId: string) => {
    dispatch(deleteWorkflowStepAction(templateId, stepId));
  }, []);

  const addModelProvider = useCallback((provider: Omit<ModelProvider, "id">) => {
    dispatch(addModelProviderAction(provider));
  }, []);

  const updateModelProvider = useCallback((providerId: string, updates: Partial<ModelProvider>) => {
    dispatch(updateModelProviderAction(providerId, updates));
  }, []);

  const deleteModelProvider = useCallback((providerId: string) => {
    dispatch(deleteModelProviderAction(providerId));
  }, []);

  const addProviderModel = useCallback((providerId: string, modelInfo: ModelInfo) => {
    dispatch(addProviderModelAction(providerId, modelInfo));
  }, []);

  const deleteProviderModel = useCallback((providerId: string, modelName: string) => {
    dispatch(deleteProviderModelAction(providerId, modelName));
  }, []);

  const setDefaultProviderModel = useCallback((providerId: string, modelName: string) => {
    dispatch(setDefaultModelAction(providerId, modelName));
  }, []);

  const setAiAssistantModel = useCallback((providerId: string, modelName: string) => {
    dispatch(setAiAssistantModelAction(providerId, modelName));
  }, []);

  const addImAdapter = useCallback((adapter: Omit<ImAdapter, "id" | "createdAt" | "updatedAt">) => {
    dispatch(addImAdapterAction(adapter));
  }, []);

  const updateImAdapter = useCallback((adapterId: string, updates: Partial<ImAdapter>) => {
    dispatch(updateImAdapterAction(adapterId, updates));
  }, []);

  const deleteImAdapter = useCallback((adapterId: string) => {
    dispatch(deleteImAdapterAction(adapterId));
  }, []);

  const toggleImAdapterRoute = useCallback((adapterId: string, eventType: ImEventType, enabled: boolean) => {
    dispatch(toggleImAdapterRouteAction(adapterId, eventType, enabled));
  }, []);

  const addGitCredential = useCallback((credential: Omit<GitCredential, "id" | "createdAt" | "updatedAt">) => {
    dispatch(addGitCredentialAction(credential));
  }, []);

  const updateGitCredential = useCallback((credentialId: string, updates: Partial<GitCredential>) => {
    dispatch(updateGitCredentialAction(credentialId, updates));
  }, []);

  const deleteGitCredential = useCallback((credentialId: string) => {
    dispatch(deleteGitCredentialAction(credentialId));
  }, []);

  const addWorkflowTemplate = useCallback((template: Omit<WorkflowTemplate, "id" | "createdAt" | "updatedAt">) => {
    dispatch(addWorkflowTemplateAction(template));
  }, []);

  const updateWorkflowTemplate = useCallback((templateId: string, updates: Partial<WorkflowTemplate>) => {
    dispatch(updateWorkflowTemplateAction(templateId, updates));
  }, []);

  const deleteWorkflowTemplate = useCallback((templateId: string) => {
    dispatch(deleteWorkflowTemplateAction(templateId));
  }, []);

  const updateRunner = useCallback((runnerId: string, updates: Partial<RunnerProfile>) => {
    dispatch(updateRunnerAction(runnerId, updates));
  }, []);

  const setDefaultRunner = useCallback((runnerId: string | undefined) => {
    dispatch(setDefaultRunnerAction(runnerId));
  }, []);

  const state = useMemo(
    () => ({
      data,
      updateGateStatus,
      addMemory,
      updateMemory,
      deleteMemory,
      createTask,
      addProject,
      updateProject,
      deleteProject,
      addRole,
      updateRole,
      addWorkflowStep,
      updateWorkflowStep,
      deleteWorkflowStep,
      addModelProvider,
      updateModelProvider,
      deleteModelProvider,
      addProviderModel,
      deleteProviderModel,
      setDefaultProviderModel,
      setAiAssistantModel,
      reassignAgentRun,
      addImAdapter,
      updateImAdapter,
      deleteImAdapter,
      toggleImAdapterRoute,
      addGitCredential,
      updateGitCredential,
      deleteGitCredential,
      addWorkflowTemplate,
      updateWorkflowTemplate,
      deleteWorkflowTemplate,
      updateRunner,
      setDefaultRunner,
    }),
    [
      data,
      updateGateStatus,
      addMemory,
      updateMemory,
      deleteMemory,
      createTask,
      addProject,
      updateProject,
      deleteProject,
      addRole,
      updateRole,
      addWorkflowStep,
      updateWorkflowStep,
      deleteWorkflowStep,
      addModelProvider,
      updateModelProvider,
      deleteModelProvider,
      addProviderModel,
      deleteProviderModel,
      setDefaultProviderModel,
      setAiAssistantModel,
      reassignAgentRun,
      addImAdapter,
      updateImAdapter,
      deleteImAdapter,
      toggleImAdapterRoute,
      addGitCredential,
      updateGitCredential,
      deleteGitCredential,
      addWorkflowTemplate,
      updateWorkflowTemplate,
      deleteWorkflowTemplate,
      updateRunner,
      setDefaultRunner,
    ]
  );

  return <WorkbenchContext.Provider value={state}>{children}</WorkbenchContext.Provider>;
}
