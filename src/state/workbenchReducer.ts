import type { WorkbenchData, ManualGate, AgentRun, Task, GitCredential, WorkflowTemplate, AgentRole, GitStatus } from "../domain/workbench";
import type { WorkbenchAction } from "./workbenchActions";

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function workbenchReducer(state: WorkbenchData, action: WorkbenchAction): WorkbenchData {
  const now = new Date().toISOString();

  switch (action.type) {
    case "UPDATE_GATE_STATUS": {
      const gate = state.manualGates.find((g) => g.id === action.gateId);
      if (!gate) return state;

      let updatedGates: ManualGate[] = state.manualGates.map((g) =>
        g.id === action.gateId ? { ...g, status: action.status, resolvedAt: action.status !== "waiting" ? now : null } : g
      );

      let updatedTasks: Task[] = state.tasks;
      let updatedRuns: AgentRun[] = state.agentRuns;

      if (action.status === "approved") {
        updatedTasks = state.tasks.map((t) => (t.id === gate.taskId ? { ...t, status: "running" as const } : t));
        updatedRuns = state.agentRuns.map((r) =>
          r.id === gate.runId
            ? { ...r, status: "running" as const, log: [...r.log, `${now} Gate approved, continuing...`] }
            : r
        );
      } else if (action.status === "rerun") {
        const existingRun = state.agentRuns.find((r) => r.id === gate.runId);
        if (existingRun) {
          const newRunId = generateId();
          updatedRuns = [
            ...state.agentRuns.map((r) =>
              r.id === gate.runId ? { ...r, status: "failed" as const, finishedAt: now } : r
            ),
            {
              id: newRunId,
              taskId: existingRun.taskId,
              roleId: existingRun.roleId,
              modelProviderId: existingRun.modelProviderId,
              modelName: existingRun.modelName,
              currentStepId: existingRun.currentStepId,
              status: "starting" as const,
              log: [`${now} Run restarted after manual gate rerun decision`],
              startedAt: now,
              finishedAt: null,
            },
          ];
          updatedGates = updatedGates.map((g) =>
            g.id === action.gateId ? { ...g, runId: newRunId, status: "waiting" as const, resolvedAt: null } : g
          );
        }
      } else if (action.status === "rejected" || action.status === "terminate") {
        updatedTasks = state.tasks.map((t) => (t.id === gate.taskId ? { ...t, status: "failed" as const } : t));
        updatedRuns = state.agentRuns.map((r) =>
          r.id === gate.runId
            ? { ...r, status: "failed" as const, finishedAt: now, log: [...r.log, `${now} Task terminated`] }
            : r
        );
      }

      return { ...state, manualGates: updatedGates, tasks: updatedTasks, agentRuns: updatedRuns };
    }

    case "REASSIGN_AGENT_RUN": {
      const run = state.agentRuns.find((r) => r.id === action.runId);
      if (!run) return state;

      const newRunId = generateId();
      const updatedRuns = [
        ...state.agentRuns.map((r) => (r.id === action.runId ? { ...r, status: "failed" as const, finishedAt: now } : r)),
        {
          id: newRunId,
          taskId: run.taskId,
          roleId: action.newRoleId,
          modelProviderId: run.modelProviderId,
          modelName: run.modelName,
          currentStepId: run.currentStepId,
          status: "starting" as const,
          log: [`${now} Run reassigned to role ${action.newRoleId}`],
          startedAt: now,
          finishedAt: null,
        },
      ];

      const updatedGates = state.manualGates.map((g) =>
        g.runId === action.runId ? { ...g, runId: newRunId, status: "waiting" as const, resolvedAt: null } : g
      );

      return { ...state, agentRuns: updatedRuns, manualGates: updatedGates };
    }

    case "ADD_MEMORY":
      return {
        ...state,
        memories: [
          ...state.memories,
          { ...action.memory, id: generateId(), createdAt: now, updatedAt: now },
        ],
      };

    case "UPDATE_MEMORY":
      return {
        ...state,
        memories: state.memories.map((m) =>
          m.id === action.memoryId ? { ...m, ...action.updates, updatedAt: now } : m
        ),
      };

    case "DELETE_MEMORY":
      return { ...state, memories: state.memories.filter((m) => m.id !== action.memoryId) };

    case "CREATE_TASK":
      return {
        ...state,
        tasks: [
          ...state.tasks,
          { ...action.task, id: generateId(), createdAt: now, updatedAt: now },
        ],
      };

    case "ADD_PROJECT":
      return {
        ...state,
        projects: [
          ...state.projects,
          { ...action.project, id: generateId(), createdAt: now, updatedAt: now },
        ],
      };

    case "UPDATE_PROJECT":
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === action.projectId ? { ...p, ...action.updates, updatedAt: now } : p
        ),
      };

    case "DELETE_PROJECT":
      return { ...state, projects: state.projects.filter((p) => p.id !== action.projectId) };

    case "ADD_ROLE": {
      const newRole: AgentRole = {
        ...action.role,
        id: `role-${generateId()}`,
      };
      return { ...state, roles: [...state.roles, newRole] };
    }

    case "UPDATE_ROLE":
      return {
        ...state,
        roles: state.roles.map((role) => (role.id === action.roleId ? { ...role, ...action.updates } : role)),
      };

    case "UPDATE_WORKFLOW_STEP":
      return {
        ...state,
        workflowTemplates: state.workflowTemplates.map((t) =>
          t.id === action.templateId
            ? { ...t, steps: t.steps.map((s) => (s.id === action.stepId ? { ...s, ...action.updates } : s)), updatedAt: now }
            : t
        ),
      };

    case "ADD_WORKFLOW_STEP":
      return {
        ...state,
        workflowTemplates: state.workflowTemplates.map((t) =>
          t.id === action.templateId
            ? { ...t, steps: [...t.steps, action.step], updatedAt: now }
            : t
        ),
      };

    case "DELETE_WORKFLOW_STEP":
      return {
        ...state,
        workflowTemplates: state.workflowTemplates.map((t) =>
          t.id === action.templateId
            ? { ...t, steps: t.steps.filter((s) => s.id !== action.stepId), updatedAt: now }
            : t
        ),
      };

    case "ADD_MODEL_PROVIDER":
      return {
        ...state,
        modelProviders: [...state.modelProviders, { ...action.provider, id: `provider-${generateId()}` }],
      };

    case "UPDATE_MODEL_PROVIDER":
      return {
        ...state,
        modelProviders: state.modelProviders.map((p) =>
          p.id === action.providerId ? { ...p, ...action.updates } : p
        ),
      };

    case "DELETE_MODEL_PROVIDER":
      return { ...state, modelProviders: state.modelProviders.filter((p) => p.id !== action.providerId) };

    case "ADD_PROVIDER_MODEL":
      return {
        ...state,
        modelProviders: state.modelProviders.map((p) =>
          p.id === action.providerId ? { ...p, models: [...p.models, action.modelInfo] } : p
        ),
      };

    case "DELETE_PROVIDER_MODEL":
      return {
        ...state,
        modelProviders: state.modelProviders.map((p) => {
          if (p.id !== action.providerId) return p;
          const newModels = p.models.filter((m) => m.name !== action.modelName);
          return {
            ...p,
            models: newModels,
            defaultModel: p.defaultModel === action.modelName ? (newModels[0]?.name ?? "") : p.defaultModel,
          };
        }),
      };

    case "SET_DEFAULT_MODEL":
      return {
        ...state,
        modelProviders: state.modelProviders.map((p) =>
          p.id === action.providerId ? { ...p, defaultModel: action.modelName } : p
        ),
      };

    case "SET_AI_ASSISTANT_MODEL":
      return {
        ...state,
        aiAssistantModel: { providerId: action.providerId, modelName: action.modelName },
      };

    case "ADD_IM_ADAPTER": {
      const newAdapter = {
        ...action.adapter,
        id: `im-${generateId()}`,
        createdAt: now,
        updatedAt: now,
      };
      return { ...state, imAdapters: [...state.imAdapters, newAdapter] };
    }

    case "UPDATE_IM_ADAPTER":
      return {
        ...state,
        imAdapters: state.imAdapters.map((a) =>
          a.id === action.adapterId ? { ...a, ...action.updates, updatedAt: now } : a
        ),
      };

    case "DELETE_IM_ADAPTER":
      return { ...state, imAdapters: state.imAdapters.filter((a) => a.id !== action.adapterId) };

    case "TOGGLE_IM_ADAPTER_ROUTE":
      return {
        ...state,
        imAdapters: state.imAdapters.map((a) => {
          if (a.id !== action.adapterId) return a;
          const routeRules = a.routeRules.map((r) =>
            r.eventType === action.eventType ? { ...r, enabled: action.enabled } : r
          );
          return { ...a, routeRules, updatedAt: now };
        }),
      };

    case "ADD_GIT_CREDENTIAL": {
      const newCredential: GitCredential = {
        ...action.credential,
        id: `git-${generateId()}`,
        createdAt: now,
        updatedAt: now,
      };
      return { ...state, gitCredentials: [...state.gitCredentials, newCredential] };
    }

    case "UPDATE_GIT_CREDENTIAL":
      return {
        ...state,
        gitCredentials: state.gitCredentials.map((c) =>
          c.id === action.credentialId ? { ...c, ...action.updates, updatedAt: now } : c
        ),
      };

    case "DELETE_GIT_CREDENTIAL":
      return { ...state, gitCredentials: state.gitCredentials.filter((c) => c.id !== action.credentialId) };

    case "ADD_WORKFLOW_TEMPLATE": {
      const newTemplate: WorkflowTemplate = {
        ...action.template,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
      };
      return { ...state, workflowTemplates: [...state.workflowTemplates, newTemplate] };
    }

    case "UPDATE_WORKFLOW_TEMPLATE":
      return {
        ...state,
        workflowTemplates: state.workflowTemplates.map((template) =>
          template.id === action.templateId ? { ...template, ...action.updates, updatedAt: now } : template
        ),
      };

    case "DELETE_WORKFLOW_TEMPLATE":
      return { ...state, workflowTemplates: state.workflowTemplates.filter((t) => t.id !== action.templateId) };

    case "UPDATE_RUNNER":
      return {
        ...state,
        runnerProfiles: state.runnerProfiles.map((r) =>
          r.id === action.runnerId ? { ...r, ...action.updates } : r
        ),
      };

    case "SET_DEFAULT_RUNNER":
      return { ...state, defaultRunner: action.runnerId };

    case "SET_PROJECTS":
      return { ...state, projects: action.payload };

    case "SET_MEMORIES":
      return { ...state, memories: action.payload };

    case "SET_MODEL_PROVIDERS":
      return {
        ...state,
        modelProviders: action.payload.providers,
        aiAssistantModel: action.payload.aiAssistantModel || undefined,
      };

    case "SET_WORKFLOW_TEMPLATES":
      return { ...state, workflowTemplates: action.payload };

    case "SET_ROLES":
      return { ...state, roles: action.payload };

    case "REFRESH_GIT_STATUS_START":
      // 可以设置 loading 状态
      return state;

    case "UPDATE_GIT_STATUS": {
      const { projectId, status } = action.payload;
      const existingStatus = state.gitStatuses.find(s => s.projectId === projectId);

      if (existingStatus) {
        return {
          ...state,
          gitStatuses: state.gitStatuses.map(s =>
            s.projectId === projectId ? { ...s, ...status } as GitStatus : s
          ),
        };
      }

      return {
        ...state,
        gitStatuses: [...state.gitStatuses, { projectId, ...status } as GitStatus],
      };
    }

    default:
      return state;
  }
}
