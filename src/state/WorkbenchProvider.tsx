import { createContext, useContext, useMemo, useReducer, useCallback, useEffect, useState, useRef, type ReactNode } from "react";
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
  updateSettings as updateSettingsAction,
  setDefaultRunner as setDefaultRunnerAction,
  setProjects as setProjectsAction,
  setMemories as setMemoriesAction,
} from "./workbenchActions";
import { projectApi, memoryApi, settingsApi, checkServerAvailable, workflowApi, rolesApi, capabilitiesApi, taskApi } from "../services/api";
import { setModelProviders as setModelProvidersAction, setWorkflowTemplates as setWorkflowTemplatesAction, setRoles as setRolesAction, setCapabilities as setCapabilitiesAction, setTasks as setTasksAction, setSettings as setSettingsAction } from "./workbenchActions";

// Default runner profiles - commonly used CLI tools
const defaultRunnerProfiles: RunnerProfile[] = [
  {
    id: "runner-claude-code",
    kind: "claude-code",
    displayName: "Claude Code",
    command: "claude",
    defaultArgs: [],
    description: "Anthropic's official CLI for Claude AI",
    enabled: true,
  },
  {
    id: "runner-codex-cli",
    kind: "codex-cli",
    displayName: "Codex CLI",
    command: "codex",
    defaultArgs: [],
    description: "OpenAI's Codex command-line interface",
    enabled: true,
  },
  {
    id: "runner-cursor-cli",
    kind: "cursor-cli",
    displayName: "Cursor CLI",
    command: "cursor",
    defaultArgs: [],
    description: "Cursor AI code editor CLI",
    enabled: false,
  },
  {
    id: "runner-gemini-cli",
    kind: "gemini-cli",
    displayName: "Gemini CLI",
    command: "gemini",
    defaultArgs: [],
    description: "Google Gemini command-line interface",
    enabled: false,
  },
];

// Empty initial data - loads everything from API
const emptyData: WorkbenchData = {
  activeProjectId: "",
  activeView: "project-management",

  projects: [],
  tasks: [],
  workflowTemplates: [],
  roles: [],
  modelProviders: [],
  agentRuns: [],
  manualGates: [],
  engineeringFeedback: null,
  memories: [],
  capabilityPacks: [],
  mcpServers: [],
  skills: [],
  plugins: [],
  agents: [],
  imAdapters: [],
  projectImBindings: [],
  gitCredentials: [],
  gitStatuses: [],
  repoIssues: [],
  repoPullRequests: [],
  ciPipelines: [],
  repoCommits: [],
  gitBranches: [],
  runnerProfiles: defaultRunnerProfiles,
  defaultRunner: "runner-claude-code",
  settings: {
    theme: 'system',
    language: 'zh-CN',
    notifications: true,
    autoSave: true,
    editorFontSize: 14,
    editorFontFamily: 'monospace',
    runner: { defaultTimeout: 300000, autoRestart: false },
    git: { autoFetch: true, fetchInterval: 60000 },
  },
};

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
  addRole?: (role: Omit<AgentRole, "id">) => Promise<AgentRole | null>;
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
  addWorkflowTemplate: (template: Omit<WorkflowTemplate, "id" | "createdAt" | "updatedAt">) => Promise<WorkflowTemplate | null>;
  updateWorkflowTemplate?: (templateId: string, updates: Partial<WorkflowTemplate>) => void;
  deleteWorkflowTemplate: (templateId: string) => void;
  updateRunner: (runnerId: string, updates: Partial<RunnerProfile>) => void;
  setDefaultRunner: (runnerId: string | undefined) => void;
  addRolesBatch?: (roles: Array<Omit<AgentRole, "id"> & { id?: string }>) => Promise<AgentRole[]>;
  updateSettings: (updates: Partial<import("../types/settings").AppSettings>) => void;
  setTasks: (tasks: WorkbenchData["tasks"]) => void;
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
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [data, dispatch] = useReducer(workbenchReducer, emptyData);
  const isMounted = useRef(true);

  // 从 API 加载初始数据
  useEffect(() => {
    isMounted.current = true;

    async function loadInitialData() {
      // 在测试环境中跳过 API 加载 (vitest 设置了 import.meta.env.VITEST)
      if (typeof import.meta !== 'undefined' && import.meta.env?.VITEST) {
        if (isMounted.current) {
          setInitialLoadDone(true);
        }
        return;
      }

      const available = await checkServerAvailable();
      if (!isMounted.current) return;

      if (!available) {
        console.log('[WorkbenchProvider] API server not available, using empty data');
        if (isMounted.current) {
          setInitialLoadDone(true);
        }
        return;
      }

      try {
        // 并行加载所有数据
        const [projectsResult, memoriesResult, settingsResult, modelProvidersResult, workflowTemplatesResult, rolesResult, capabilitiesResult, tasksResult] = await Promise.all([
          projectApi.list(),
          memoryApi.list(),
          settingsApi.get(),
          settingsApi.getModelProviders(),
          workflowApi.listTemplates(),
          rolesApi.list(),
          capabilitiesApi.getAll(),
          taskApi.list(),
        ]);

        if (!isMounted.current) return;

        // 更新项目列表（替换整个列表，避免重复 fixture 数据）
        if (projectsResult.ok && projectsResult.data) {
          dispatch(setProjectsAction(projectsResult.data));
        }

        // 更新记忆列表
        if (memoriesResult.ok && memoriesResult.data) {
          // 将 Memory 转换为 MemoryItem 格式
          const memoryItems: MemoryItem[] = memoriesResult.data.map(m => ({
            id: m.id,
            kind: m.kind || 'project',
            scope: m.scope || 'project',
            projectId: m.projectId || '',
            roleId: m.roleId || null,
            taskId: m.taskId || null,
            title: m.title,
            body: m.body || m.content || '',
            citation: m.citation || [],
            createdAt: m.createdAt,
            updatedAt: m.updatedAt,
          }));
          dispatch(setMemoriesAction(memoryItems));
        }

        // 更新设置
        if (settingsResult.ok && settingsResult.data) {
          dispatch(setSettingsAction(settingsResult.data));
        }

        // 更新模型配置
        if (modelProvidersResult.ok && modelProvidersResult.data) {
          dispatch(setModelProvidersAction(
            modelProvidersResult.data.providers,
            modelProvidersResult.data.aiAssistantModel
          ));
        }

        // 更新工作流模板
        if (workflowTemplatesResult.ok && workflowTemplatesResult.data) {
          dispatch(setWorkflowTemplatesAction(workflowTemplatesResult.data));
        }

        // 更新角色列表
        if (rolesResult.ok && rolesResult.data) {
          dispatch(setRolesAction(rolesResult.data));
        }

        // 更新能力中心数据
        if (capabilitiesResult.ok && capabilitiesResult.data) {
          dispatch(setCapabilitiesAction(capabilitiesResult.data));
        }

        // 更新任务列表
        if (tasksResult.ok && tasksResult.data) {
          dispatch(setTasksAction(tasksResult.data));
        }

        console.log('[WorkbenchProvider] Loaded data from API:', {
          projects: projectsResult.ok ? projectsResult.data?.length : 'failed',
          memories: memoriesResult.ok ? memoriesResult.data?.length : 'failed',
          modelProviders: modelProvidersResult.ok ? modelProvidersResult.data?.providers?.length : 'failed',
          workflowTemplates: workflowTemplatesResult.ok ? workflowTemplatesResult.data?.length : 'failed',
          roles: rolesResult.ok ? rolesResult.data?.length : 'failed',
          capabilities: capabilitiesResult.ok ? 'loaded' : 'failed',
          tasks: tasksResult.ok ? tasksResult.data?.length : 'failed',
        });
      } catch (error) {
        console.error('[WorkbenchProvider] Failed to load data from API:', error);
      }

      if (isMounted.current) {
        setInitialLoadDone(true);
      }
    }

    loadInitialData();

    return () => {
      isMounted.current = false;
    };
  }, []);

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

  const addRole = useCallback(async (role: Omit<AgentRole, "id">) => {
    const result = await rolesApi.create(role);
    if (result.ok && result.data) {
      dispatch(addRoleAction(result.data));
      return result.data;
    } else {
      console.error('[WorkbenchProvider] Failed to save role:', result.error);
      dispatch(addRoleAction(role));
      return null;
    }
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

  const addWorkflowTemplate = useCallback(async (template: Omit<WorkflowTemplate, "id" | "createdAt" | "updatedAt">) => {
    // 先调用 API 持久化
    const result = await workflowApi.createTemplate(template);
    if (result.ok && result.data) {
      // 使用 API 返回的完整数据（包含 id、createdAt、updatedAt）
      dispatch(addWorkflowTemplateAction(result.data));
      return result.data;
    } else {
      console.error('[WorkbenchProvider] Failed to save workflow template:', result.error);
      // 即使 API 失败，仍然更新本地状态（离线支持）
      dispatch(addWorkflowTemplateAction(template));
      return null;
    }
  }, []);

  const addRolesBatch = useCallback(async (roles: Array<Omit<AgentRole, "id"> & { id?: string }>) => {
    const result = await rolesApi.createBatch(roles);
    if (result.ok && result.data) {
      // 更新本地角色池
      result.data.forEach(role => {
        dispatch(addRoleAction(role as Omit<AgentRole, "id">));
      });
      return result.data;
    } else {
      console.error('[WorkbenchProvider] Failed to save roles batch:', result.error);
      return [];
    }
  }, []);

  const updateWorkflowTemplate = useCallback((templateId: string, updates: Partial<WorkflowTemplate>) => {
    dispatch(updateWorkflowTemplateAction(templateId, updates));
    workflowApi.updateTemplate(templateId, updates).catch(err => {
      console.error('[WorkbenchProvider] Failed to update template on server:', err);
    });
  }, []);

  const deleteWorkflowTemplate = useCallback((templateId: string) => {
    dispatch(deleteWorkflowTemplateAction(templateId));
    workflowApi.deleteTemplate(templateId).catch(err => {
      console.error('[WorkbenchProvider] Failed to delete template from server:', err);
    });
  }, []);

  const updateRunner = useCallback((runnerId: string, updates: Partial<RunnerProfile>) => {
    dispatch(updateRunnerAction(runnerId, updates));
  }, []);

  const setDefaultRunner = useCallback((runnerId: string | undefined) => {
    dispatch(setDefaultRunnerAction(runnerId));
  }, []);

  const updateSettings = useCallback((updates: Partial<import("../types/settings").AppSettings>) => {
    dispatch(updateSettingsAction(updates));
  }, []);

  const setTasks = useCallback((tasks: WorkbenchData["tasks"]) => {
    dispatch(setTasksAction(tasks));
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
      addRolesBatch,
      updateSettings,
      setTasks,
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
      addRolesBatch,
      updateSettings,
      setTasks,
    ]
  );

  return <WorkbenchContext.Provider value={state}>{children}</WorkbenchContext.Provider>;
}
