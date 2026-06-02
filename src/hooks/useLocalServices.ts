import { useContext, useEffect, useState } from 'react';
import { ServiceContext } from '../context/ServiceContext';
import { checkServerAvailable, runnerApi, projectApi, workflowApi, gitApi, memoryApi, settingsApi, aiApi, apiCall, type ImportProjectInput, type RunnerStartParams } from '../services/api';
import type { LocalEngineeringServices } from '../services/local';
import type { RunnerProcess, LogEntry } from '../types/localEngineering';
import type { RunnerKind } from '../domain/runner';
import type { Project } from '../domain/project';
import type { Memory, MemoryKind, MemoryScope } from '../domain/memory';
import type { AppSettings } from '../types/settings';
import type { WorkflowRun } from '../services/local/useCases/workflowExecutionUseCase';

export function useLocalServices(): LocalEngineeringServices {
  const services = useContext(ServiceContext);
  const [apiAvailable, setApiAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    checkServerAvailable().then((available) => {
      console.log('[useLocalServices] API available:', available);
      setApiAvailable(available);
    });
  }, []);

  // If we've checked and API is available, use API services
  if (apiAvailable === true) {
    return createApiServices();
  }

  // If we've checked and API is not available, use context or mock
  if (apiAvailable === false) {
    if (services) {
      return services;
    }
    if (typeof window !== 'undefined') {
      return createMockServices();
    }
  }

  // While checking (apiAvailable === null), return mock services to avoid blocking
  // This prevents the UI from hanging while waiting for the API check
  if (services) {
    return services;
  }

  if (typeof window !== 'undefined') {
    // Return mock services with API methods that will work once API is available
    return createApiServices();
  }

  throw new Error('useLocalServices must be used within ServiceProvider');
}

function createApiServices(): LocalEngineeringServices {
  return {
    // Core adapters - API-backed implementations
    git: {} as any,
    fileStore: {} as any,
    processRunner: {
      start: async (config: import('../services/local/adapters/processRunnerAdapter').ProcessStartConfig) => {
        const params: RunnerStartParams = {
          runnerId: config.runnerId,
          kind: 'claude-code' as RunnerKind,
          cwd: config.cwd,
          command: config.command,
          args: config.args,
          env: config.env,
          timeout: config.timeout,
        };
        const result = await runnerApi.start(params);
        return result as { ok: boolean; data?: RunnerProcess; error?: { code: string; message: string } };
      },
      stop: async (processId: string) => {
        const result = await runnerApi.stop(processId);
        return result as { ok: boolean; data?: RunnerProcess; error?: { code: string; message: string } };
      },
      getLogs: async (processId: string) => {
        const result = await runnerApi.getLogs(processId);
        return result as { ok: boolean; data?: LogEntry[]; error?: { code: string; message: string } };
      },
      getStatus: async (processId: string) => {
        const result = await runnerApi.getStatus(processId);
        return result as { ok: boolean; data?: RunnerProcess; error?: { code: string; message: string } };
      },
      listProcesses: async () => {
        const result = await runnerApi.list();
        return result as { ok: boolean; data?: RunnerProcess[]; error?: { code: string; message: string } };
      },
      cleanup: async () => ({ ok: true }),
    } as any,
    llm: {} as any,
    repositories: {} as any,

    // Runner methods
    startRunner: async (runnerId: string, kind: RunnerKind, cwd: string) => {
      const result = await runnerApi.start({ runnerId, kind, cwd });
      return result as { ok: boolean; data?: RunnerProcess; error?: { code: string; message: string } };
    },
    stopRunner: async (processId: string) => {
      const result = await runnerApi.stop(processId);
      return result as { ok: boolean; error?: { code: string; message: string } };
    },
    getLogs: async (processId: string) => {
      const result = await runnerApi.getLogs(processId);
      return result as { ok: boolean; data?: LogEntry[]; error?: { code: string; message: string } };
    },
    getStatus: async (processId: string) => {
      const result = await runnerApi.getStatus(processId);
      return result as { ok: boolean; data?: RunnerProcess; error?: { code: string; message: string } };
    },
    listProcesses: async () => {
      const result = await runnerApi.list();
      return result as { ok: boolean; data?: RunnerProcess[]; error?: { code: string; message: string } };
    },

    // Project methods
    createProject: async (input: { name: string; repoPath: string; defaultBranch: string; worktreeRoot: string; workflowTemplateId?: string }) => {
      const result = await projectApi.create(input);
      return result as { ok: boolean; data?: Project; error?: { code: string; message: string } };
    },
    importProject: async (path: string, options?: Omit<ImportProjectInput, 'path'>) => {
      const result = await projectApi.import({ path, ...options });
      return result as { ok: boolean; data?: Project; error?: { code: string; message: string } };
    },
    getProject: async (id: string) => {
      const result = await projectApi.get(id);
      return result as { ok: boolean; data?: Project; error?: { code: string; message: string } };
    },
    listProjects: async () => {
      const result = await projectApi.list();
      return result as { ok: boolean; data?: Project[]; error?: { code: string; message: string } };
    },
    updateProject: async (id: string, input: Partial<Project>) => {
      const result = await projectApi.update(id, input);
      return result as { ok: boolean; data?: Project; error?: { code: string; message: string } };
    },
    deleteProject: async (id: string) => {
      const result = await projectApi.delete(id);
      return result as { ok: boolean; error?: { code: string; message: string } };
    },

    // Workflow methods
    createWorkflowRun: async (projectId: string, templateId: string) => {
      const result = await workflowApi.run(projectId, templateId);
      return result as { ok: boolean; data?: { runId: string }; error?: { code: string; message: string } };
    },
    pauseWorkflowRun: async (runId: string) => {
      const result = await workflowApi.pause(runId);
      return result as { ok: boolean; error?: { code: string; message: string } };
    },
    resumeWorkflowRun: async (runId: string) => {
      const result = await workflowApi.resume(runId);
      return result as { ok: boolean; error?: { code: string; message: string } };
    },
    cancelWorkflowRun: async (runId: string) => {
      const result = await workflowApi.cancel(runId);
      return result as { ok: boolean; error?: { code: string; message: string } };
    },
    getWorkflowRunStatus: async (runId: string) => {
      const result = await workflowApi.getStatus(runId);
      return result as { ok: boolean; data?: WorkflowRun; error?: { code: string; message: string } };
    },

    // Git methods
    getGitStatus: async (repoPath: string) => {
      const result = await gitApi.getStatus(repoPath);
      return result as { ok: boolean; data?: import('../services/api/gitApi').GitStatus; error?: { code: string; message: string } };
    },
    getGitBranches: async (repoPath: string) => {
      const result = await gitApi.getBranches(repoPath);
      return result as { ok: boolean; data?: string[]; error?: { code: string; message: string } };
    },
    getGitWorktrees: async (repoPath: string) => {
      const result = await gitApi.getWorktrees(repoPath);
      return result as { ok: boolean; data?: { path: string; branch: string; commitSha: string; isMainWorktree: boolean }[]; error?: { code: string; message: string } };
    },

    // Memory methods
    createMemory: async (input: { kind: MemoryKind; scope: MemoryScope; projectId: string; roleId?: string | null; taskId?: string | null; title: string; body: string }) => {
      const result = await memoryApi.create(input);
      return result as { ok: boolean; data?: Memory; error?: { code: string; message: string } };
    },
    updateMemory: async (id: string, input: { title?: string; body?: string; scope?: MemoryScope }) => {
      const result = await memoryApi.update(id, input);
      return result as { ok: boolean; data?: Memory; error?: { code: string; message: string } };
    },
    deleteMemory: async (id: string) => {
      const result = await memoryApi.delete(id);
      return result as { ok: boolean; error?: { code: string; message: string } };
    },
    listMemories: async (projectId: string) => {
      const result = await memoryApi.list(projectId);
      return result as { ok: boolean; data?: Memory[]; error?: { code: string; message: string } };
    },
    searchMemories: async (keyword: string, projectId?: string) => {
      const result = await memoryApi.search(keyword, projectId);
      return result as { ok: boolean; data?: Memory[]; error?: { code: string; message: string } };
    },

    // Settings methods
    getSettings: async () => {
      const result = await settingsApi.get();
      return result as { ok: boolean; data?: AppSettings; error?: { code: string; message: string } };
    },
    saveSettings: async (settings: Partial<AppSettings>) => {
      const result = await settingsApi.save(settings);
      return result as { ok: boolean; data?: AppSettings; error?: { code: string; message: string } };
    },
    saveModelProviders: async (data: { providers: any[]; aiAssistantModel?: any }) => {
      const result = await settingsApi.saveModelProviders(data);
      return result as { ok: boolean; error?: { code: string; message: string } };
    },

    // AI Assistant methods
    getAiAssistantConfig: async () => {
      const result = await apiCall<{ systemPrompt: string }>('GET', '/ai/assistant-config');
      return result;
    },
    saveAiAssistantConfig: async (data: { systemPrompt: string }) => {
      const result = await apiCall<void>('PUT', '/ai/assistant-config', data);
      return result;
    },
  };
}

function createMockServices(): LocalEngineeringServices {
  // Dynamic import to avoid bundling Node.js modules in browser build
  // The services/local module contains Node.js imports that can't be bundled for browser
  // In test environment, we need to handle this differently
  if (typeof require !== 'undefined') {
    try {
      const { createLocalServices } = require('../services/local');
      return createLocalServices({ enableMock: true });
    } catch {
      // Fallback for test environment where require might fail
    }
  }

  // Return a minimal mock implementation for browser/test
  return {
    git: {} as any,
    fileStore: {} as any,
    processRunner: {} as any,
    llm: {} as any,
    repositories: {} as any,
  };
}
