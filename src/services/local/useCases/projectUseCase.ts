import type { Project } from '../../../domain/project';
import type { LocalResult } from '../../../types/localEngineering';
import type { ProjectRepository } from '../repositories/projectRepository';
import type { GitAdapter } from '../adapters/gitAdapter';

/**
 * 项目创建配置
 */
export interface CreateProjectConfig {
  name: string;
  repoPath: string;
  defaultBranch?: string;
  worktreeRoot?: string;
  scope?: 'personal' | 'team';
  workflowTemplateId?: string;
  settings?: Partial<Project['settings']>;
}

/**
 * 项目导入配置
 */
export interface ImportProjectConfig {
  name: string;
  repoPath: string;
  sourceType?: 'claude-code' | 'codex' | 'generic' | 'mixed' | 'ai-briefing';
  detectSettings?: boolean;
}

/**
 * 项目更新配置
 */
export interface UpdateProjectConfig {
  id: string;
  name?: string;
  settings?: Partial<Project['settings']>;
  workflowTemplateId?: string;
  roleOverrides?: Record<string, string>;
  projectMarkdown?: string;
  workflowOverrides?: string;
  status?: 'running' | 'waiting' | 'completed' | 'paused';
  progress?: number;
}

/**
 * 生成项目 ID
 */
function generateProjectId(): string {
  return `proj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 默认项目设置
 */
function getDefaultSettings(): Project['settings'] {
  return {
    installCommand: 'npm install',
    testCommand: 'npm test',
    buildCommand: 'npm run build',
    previewCommand: 'npm run preview',
    detectedStack: '',
    riskSummary: '',
  };
}

/**
 * 创建新项目
 */
export async function createProject(
  projectRepository: ProjectRepository,
  config: CreateProjectConfig
): Promise<LocalResult<Project>> {
  const {
    name,
    repoPath,
    defaultBranch = 'main',
    worktreeRoot,
    scope = 'personal',
    workflowTemplateId = 'default',
    settings,
  } = config;

  // 验证必填字段
  if (!name || !repoPath) {
    return {
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: '项目名称和仓库路径为必填项',
        recoverable: false,
      },
    };
  }

  const now = new Date().toISOString();
  const projectId = generateProjectId();

  const project: Project = {
    id: projectId,
    name,
    repoPath,
    defaultBranch,
    worktreeRoot: worktreeRoot || `${repoPath}/.worktrees`,
    scope,
    desktopIntegrationStatus: 'deferred',
    permissions: {
      permissionLevel: 'owner',
    },
    settings: {
      ...getDefaultSettings(),
      ...settings,
    },
    workflowTemplateId,
    createdAt: now,
    updatedAt: now,
  };

  const result = await projectRepository.save(project);

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
    };
  }

  return {
    ok: true,
    data: project,
    diagnostics: [`项目已创建: ${name} (${projectId})`, `路径: ${repoPath}`],
  };
}

/**
 * 导入现有项目
 */
export async function importProject(
  projectRepository: ProjectRepository,
  gitAdapter: GitAdapter,
  config: ImportProjectConfig
): Promise<LocalResult<Project>> {
  const { name, repoPath, sourceType = 'generic', detectSettings = true } = config;

  // 验证必填字段
  if (!name || !repoPath) {
    return {
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: '项目名称和仓库路径为必填项',
        recoverable: false,
      },
    };
  }

  // 检查仓库路径是否存在并获取 Git 信息
  const gitStatusResult = await gitAdapter.getStatus(repoPath);
  if (!gitStatusResult.ok) {
    return {
      ok: false,
      error: {
        code: 'DIRECTORY_NOT_FOUND',
        message: `无法访问仓库路径: ${repoPath}`,
        cause: gitStatusResult.error?.message,
        recoverable: true,
      },
    };
  }

  const gitStatus = gitStatusResult.data!;
  const now = new Date().toISOString();
  const projectId = generateProjectId();

  // 检测技术栈（简化版本，实际应该更智能）
  let detectedStack = '';
  let installCommand = 'npm install';
  let testCommand = 'npm test';
  let buildCommand = 'npm run build';
  let previewCommand = 'npm run preview';

  if (detectSettings) {
    // 基于项目源类型推断
    if (sourceType === 'claude-code') {
      detectedStack = 'claude-code';
    } else if (sourceType === 'codex') {
      detectedStack = 'codex';
      installCommand = 'pip install -r requirements.txt';
      testCommand = 'pytest';
      buildCommand = 'python setup.py build';
      previewCommand = '';
    }
  }

  const project: Project = {
    id: projectId,
    name,
    repoPath,
    defaultBranch: gitStatus.branch || 'main',
    worktreeRoot: `${repoPath}/.worktrees`,
    scope: 'personal',
    desktopIntegrationStatus: 'deferred',
    permissions: {
      permissionLevel: 'owner',
    },
    settings: {
      installCommand,
      testCommand,
      buildCommand,
      previewCommand,
      detectedStack,
      riskSummary: '',
    },
    workflowTemplateId: 'default',
    sourceType,
    phase: 'imported',
    healthScore: 100,
    riskLevel: 'low',
    createdAt: now,
    updatedAt: now,
  };

  const result = await projectRepository.save(project);

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
    };
  }

  return {
    ok: true,
    data: project,
    diagnostics: [
      `项目已导入: ${name} (${projectId})`,
      `路径: ${repoPath}`,
      `分支: ${gitStatus.branch}`,
      `源类型: ${sourceType}`,
    ],
  };
}

/**
 * 更新项目
 */
export async function updateProject(
  projectRepository: ProjectRepository,
  config: UpdateProjectConfig
): Promise<LocalResult<Project>> {
  const { id, ...updates } = config;

  if (!id) {
    return {
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: '项目 ID 为必填项',
        recoverable: false,
      },
    };
  }

  // 检查项目是否存在
  const existingResult = await projectRepository.load(id);
  if (!existingResult.ok) {
    return {
      ok: false,
      error: {
        code: 'DIRECTORY_NOT_FOUND',
        message: `项目不存在: ${id}`,
        cause: existingResult.error?.message,
        recoverable: true,
      },
    };
  }

  const existingProject = existingResult.data!;

  // 合并更新 - 确保settings正确合并
  const updatedProject: Project = {
    ...existingProject,
    ...updates,
    settings: updates.settings
      ? { ...existingProject.settings, ...updates.settings }
      : existingProject.settings,
    updatedAt: new Date().toISOString(),
  };

  const result = await projectRepository.save(updatedProject);

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
    };
  }

  return {
    ok: true,
    data: updatedProject,
    diagnostics: [`项目已更新: ${updatedProject.name} (${id})`],
  };
}

/**
 * 删除项目
 */
export async function deleteProject(
  projectRepository: ProjectRepository,
  projectId: string
): Promise<LocalResult<void>> {
  if (!projectId) {
    return {
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: '项目 ID 为必填项',
        recoverable: false,
      },
    };
  }

  // 检查项目是否存在
  const existingResult = await projectRepository.load(projectId);
  if (!existingResult.ok) {
    return {
      ok: false,
      error: {
        code: 'DIRECTORY_NOT_FOUND',
        message: `项目不存在: ${projectId}`,
        cause: existingResult.error?.message,
        recoverable: true,
      },
    };
  }

  const result = await projectRepository.delete(projectId);

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
    };
  }

  return {
    ok: true,
    data: undefined,
    diagnostics: [`项目已删除: ${projectId}`],
  };
}

/**
 * 列出所有项目
 */
export async function listProjects(
  projectRepository: ProjectRepository,
  filter?: {
    scope?: 'personal' | 'team';
    status?: 'running' | 'waiting' | 'completed' | 'paused';
    sourceType?: 'claude-code' | 'codex' | 'generic' | 'mixed' | 'ai-briefing';
  }
): Promise<LocalResult<Project[]>> {
  const result = await projectRepository.listAll();

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
    };
  }

  let projects = result.data!;

  // 应用过滤条件
  if (filter) {
    if (filter.scope) {
      projects = projects.filter(p => p.scope === filter.scope);
    }
    if (filter.status) {
      projects = projects.filter(p => p.status === filter.status);
    }
    if (filter.sourceType) {
      projects = projects.filter(p => p.sourceType === filter.sourceType);
    }
  }

  // 按更新时间降序排序
  projects.sort((a, b) => {
    const dateA = new Date(a.updatedAt).getTime();
    const dateB = new Date(b.updatedAt).getTime();
    return dateB - dateA;
  });

  return {
    ok: true,
    data: projects,
    diagnostics: [`找到 ${projects.length} 个项目`],
  };
}

/**
 * 获取单个项目详情
 */
export async function getProject(
  projectRepository: ProjectRepository,
  projectId: string
): Promise<LocalResult<Project>> {
  if (!projectId) {
    return {
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: '项目 ID 为必填项',
        recoverable: false,
      },
    };
  }

  const result = await projectRepository.load(projectId);

  if (!result.ok) {
    return {
      ok: false,
      error: {
        code: 'DIRECTORY_NOT_FOUND',
        message: `项目不存在: ${projectId}`,
        cause: result.error?.message,
        recoverable: true,
      },
    };
  }

  return {
    ok: true,
    data: result.data!,
  };
}
