// Adapters
export { BaseAdapter } from './adapters/baseAdapter';
export { GitAdapter } from './adapters/gitAdapter';
export { FileStoreAdapter } from './adapters/fileStoreAdapter';
export { ProcessRunnerAdapter } from './adapters/processRunnerAdapter';
export { GitHubAdapter } from './adapters/githubAdapter';
export { LlmAdapter } from './adapters/llmAdapter';

// UseCases
export * from './useCases';

// Repositories
export { ProjectRepository, MemoryRepository, WorkflowRepository, RoleRepository, TaskRepository, AgentRunRepository } from './repositories';

// Security
export {
  sanitizeLog,
  validatePath,
  isCommandAllowed,
  addToCommandWhitelist,
  confirmHighRiskOperation,
  AuditLogger,
  auditLogger,
  type PathValidationResult,
  type OperationRiskResult,
  type AuditLogEntry,
  type AuditLogQuery,
} from './security';

// Services
import { GitAdapter } from './adapters/gitAdapter';
import { FileStoreAdapter } from './adapters/fileStoreAdapter';
import { ProcessRunnerAdapter } from './adapters/processRunnerAdapter';
import { LlmAdapter } from './adapters/llmAdapter';
import { ProjectRepository, MemoryRepository, WorkflowRepository, RoleRepository, TaskRepository, AgentRunRepository } from './repositories';
import type { AdapterConfig, RunnerProcess, LogEntry } from '../../types/localEngineering';
import type { RunnerKind } from '../../domain/runner';
import type { Project } from '../../domain/project';
import type { Memory, MemoryKind, MemoryScope } from '../../domain/memory';
import type { AppSettings } from '../../types/settings';
import type { WorkflowRun } from './useCases/workflowExecutionUseCase';

export interface LocalEngineeringServices {
  // Core adapters
  git: GitAdapter;
  fileStore: FileStoreAdapter;
  processRunner: ProcessRunnerAdapter;
  llm: LlmAdapter;
  repositories: {
    project: ProjectRepository;
    memory: MemoryRepository;
    workflow: WorkflowRepository;
    role: RoleRepository;
    task: TaskRepository;
    agentRun: AgentRunRepository;
  };

  // Runner service methods
  startRunner?: (runnerId: string, kind: RunnerKind, cwd: string) => Promise<{ ok: boolean; data?: RunnerProcess; error?: { code: string; message: string } }>;
  stopRunner?: (processId: string) => Promise<{ ok: boolean; error?: { code: string; message: string } }>;
  getLogs?: (processId: string) => Promise<{ ok: boolean; data?: LogEntry[]; error?: { code: string; message: string } }>;
  getStatus?: (processId: string) => Promise<{ ok: boolean; data?: RunnerProcess; error?: { code: string; message: string } }>;
  listProcesses?: () => Promise<{ ok: boolean; data?: RunnerProcess[]; error?: { code: string; message: string } }>;

  // Project service methods
  createProject?: (input: { name: string; repoPath: string; defaultBranch: string; worktreeRoot: string; workflowTemplateId?: string }) => Promise<{ ok: boolean; data?: Project; error?: { code: string; message: string } }>;
  importProject?: (path: string, options?: { name?: string; sourceType?: 'claude-code' | 'codex' | 'generic' | 'mixed' | 'ai-briefing'; detectSettings?: boolean }) => Promise<{ ok: boolean; data?: Project; error?: { code: string; message: string } }>;
  getProject?: (id: string) => Promise<{ ok: boolean; data?: Project; error?: { code: string; message: string } }>;
  listProjects?: () => Promise<{ ok: boolean; data?: Project[]; error?: { code: string; message: string } }>;
  updateProject?: (id: string, input: Partial<Project>) => Promise<{ ok: boolean; data?: Project; error?: { code: string; message: string } }>;
  deleteProject?: (id: string) => Promise<{ ok: boolean; error?: { code: string; message: string } }>;

  // Workflow service methods
  createWorkflowRun?: (projectId: string, templateId: string) => Promise<{ ok: boolean; data?: { runId: string }; error?: { code: string; message: string } }>;
  pauseWorkflowRun?: (runId: string) => Promise<{ ok: boolean; error?: { code: string; message: string } }>;
  resumeWorkflowRun?: (runId: string) => Promise<{ ok: boolean; error?: { code: string; message: string } }>;
  cancelWorkflowRun?: (runId: string) => Promise<{ ok: boolean; error?: { code: string; message: string } }>;
  getWorkflowRunStatus?: (runId: string) => Promise<{ ok: boolean; data?: WorkflowRun; error?: { code: string; message: string } }>;

  // Git service methods (additional)
  getGitStatus?: (repoPath: string) => Promise<{ ok: boolean; data?: { branch: string; ahead: number; behind: number; staged: number; unstaged: number; untracked: number; isClean: boolean }; error?: { code: string; message: string } }>;
  getGitBranches?: (repoPath: string) => Promise<{ ok: boolean; data?: string[]; error?: { code: string; message: string } }>;
  getGitWorktrees?: (repoPath: string) => Promise<{ ok: boolean; data?: { path: string; branch: string; commitSha: string; isMainWorktree: boolean }[]; error?: { code: string; message: string } }>;

  // Memory service methods
  createMemory?: (input: { kind: MemoryKind; scope: MemoryScope; projectId: string; roleId?: string | null; taskId?: string | null; title: string; body: string }) => Promise<{ ok: boolean; data?: Memory; error?: { code: string; message: string } }>;
  updateMemory?: (id: string, input: { title?: string; body?: string; scope?: MemoryScope }) => Promise<{ ok: boolean; data?: Memory; error?: { code: string; message: string } }>;
  deleteMemory?: (id: string) => Promise<{ ok: boolean; error?: { code: string; message: string } }>;
  listMemories?: (projectId: string) => Promise<{ ok: boolean; data?: Memory[]; error?: { code: string; message: string } }>;
  searchMemories?: (keyword: string, projectId?: string) => Promise<{ ok: boolean; data?: Memory[]; error?: { code: string; message: string } }>;

  // Settings service methods
  getSettings?: () => Promise<{ ok: boolean; data?: AppSettings; error?: { code: string; message: string } }>;
  saveSettings?: (settings: Partial<AppSettings>) => Promise<{ ok: boolean; data?: AppSettings; error?: { code: string; message: string } }>;
  saveModelProviders?: (data: { providers: any[]; aiAssistantModel?: any }) => Promise<{ ok: boolean; error?: { code: string; message: string } }>;

  // AI Assistant service methods
  getAiAssistantConfig?: () => Promise<{ ok: boolean; data?: { systemPrompt: string }; error?: { code: string; message: string } }>;
  saveAiAssistantConfig?: (data: { systemPrompt: string }) => Promise<{ ok: boolean; error?: { code: string; message: string } }>;
}

/**
 * 创建本地工程服务实例
 */
export function createLocalServices(config: Partial<AdapterConfig> = {}): LocalEngineeringServices {
  const defaultConfig: AdapterConfig = {
    enableMock: typeof window !== 'undefined', // 浏览器环境默认 mock
    defaultTimeout: 30000,
    projectRoot: config.projectRoot ?? process.cwd(),
  };

  const finalConfig = { ...defaultConfig, ...config };

  const fileStore = new FileStoreAdapter(finalConfig);

  return {
    git: new GitAdapter(finalConfig),
    fileStore,
    processRunner: new ProcessRunnerAdapter(finalConfig),
    llm: new LlmAdapter(finalConfig),
    repositories: {
      project: new ProjectRepository(fileStore),
      memory: new MemoryRepository(fileStore),
      workflow: new WorkflowRepository(fileStore),
      role: new RoleRepository(fileStore),
      task: new TaskRepository(fileStore),
      agentRun: new AgentRunRepository(fileStore),
    },
  };
}

// 导出类型
export type { LocalResult, LocalError, LocalGitStatus, WorktreeInfo, RunnerProcess } from '../../types/localEngineering';
