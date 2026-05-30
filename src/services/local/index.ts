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
export { ProjectRepository, MemoryRepository, WorkflowRepository } from './repositories';

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
import { ProjectRepository, MemoryRepository, WorkflowRepository } from './repositories';
import type { AdapterConfig } from '../../types/localEngineering';

export interface LocalEngineeringServices {
  git: GitAdapter;
  fileStore: FileStoreAdapter;
  processRunner: ProcessRunnerAdapter;
  repositories: {
    project: ProjectRepository;
    memory: MemoryRepository;
    workflow: WorkflowRepository;
  };
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
    repositories: {
      project: new ProjectRepository(fileStore),
      memory: new MemoryRepository(fileStore),
      workflow: new WorkflowRepository(fileStore),
    },
  };
}

// 导出类型
export type { LocalResult, LocalError, LocalGitStatus, WorktreeInfo, RunnerProcess } from '../../types/localEngineering';
