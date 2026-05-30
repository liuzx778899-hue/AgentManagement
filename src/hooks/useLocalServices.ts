import { useContext, useEffect, useState } from 'react';
import { ServiceContext } from '../context/ServiceContext';
import { checkServerAvailable, runnerApi, projectApi, workflowApi, gitApi, memoryApi, settingsApi } from '../services/api';
import { createLocalServices } from '../services/local';
import type { LocalEngineeringServices } from '../services/local';
import type { RunnerProcess, LogEntry } from '../types/localEngineering';
import type { RunnerKind } from '../domain/runner';
import type { Project } from '../domain/project';
import type { Memory, MemoryKind, MemoryScope } from '../domain/memory';
import type { AppSettings } from '../types/settings';
import type { WorkflowRun } from '../services/local/useCases/workflowExecutionUseCase';

export function useLocalServices(): LocalEngineeringServices {
  const services = useContext(ServiceContext);
  const [apiAvailable, setApiAvailable] = useState(false);

  useEffect(() => {
    checkServerAvailable().then(setApiAvailable);
  }, []);

  if (apiAvailable) {
    // Return API-based services
    return createApiServices();
  }

  if (services) {
    return services;
  }

  // Fallback: browser environment uses mock
  if (typeof window !== 'undefined') {
    return createMockServices();
  }

  throw new Error('useLocalServices must be used within ServiceProvider');
}

function createApiServices(): LocalEngineeringServices {
  return {
    // Core adapters (empty placeholders - use API methods instead)
    git: {} as any,
    fileStore: {} as any,
    processRunner: {} as any,
    repositories: {} as any,

    // Runner methods
    startRunner: async (runnerId: string, kind: RunnerKind, cwd: string) => {
      const result = await runnerApi.start(runnerId, kind, cwd);
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
    importProject: async (path: string) => {
      const result = await projectApi.import(path);
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
      return result as { ok: boolean; data?: { branch: string; ahead: number; behind: number; staged: number; unstaged: number; untracked: number; isClean: boolean }; error?: { code: string; message: string } };
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
  };
}

function createMockServices(): LocalEngineeringServices {
  return createLocalServices({ enableMock: true });
}