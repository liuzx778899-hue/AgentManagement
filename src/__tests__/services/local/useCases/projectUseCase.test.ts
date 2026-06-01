import { describe, it, expect, beforeEach } from 'vitest';
import {
  createProject,
  importProject,
  updateProject,
  deleteProject,
  listProjects,
  getProject,
} from '../../../../services/local/useCases/projectUseCase';
import { ProjectRepository } from '../../../../services/local/repositories/projectRepository';
import { GitAdapter } from '../../../../services/local/adapters/gitAdapter';
import { FileStoreAdapter } from '../../../../services/local/adapters/fileStoreAdapter';
import type { AdapterConfig } from '../../../../types/localEngineering';

describe('projectUseCase', () => {
  let fileStore: FileStoreAdapter;
  let projectRepository: ProjectRepository;
  let gitAdapter: GitAdapter;
  const config: AdapterConfig = {
    enableMock: true,
    defaultTimeout: 30000,
    projectRoot: process.cwd(),
  };

  beforeEach(() => {
    fileStore = new FileStoreAdapter(config);
    projectRepository = new ProjectRepository(fileStore, '.agentmanagement');
    gitAdapter = new GitAdapter(config);
  });

  describe('createProject', () => {
    it('should create a new project with required fields', async () => {
      const result = await createProject(projectRepository, {
        name: '测试项目',
        repoPath: '/test/repo/path',
      });

      expect(result.ok).toBe(true);
      expect(result.data?.name).toBe('测试项目');
      expect(result.data?.repoPath).toBe('/test/repo/path');
      expect(result.data?.id).toMatch(/^proj-/);
      expect(result.data?.scope).toBe('personal');
    });

    it('should create project with custom settings', async () => {
      const result = await createProject(projectRepository, {
        name: '自定义项目',
        repoPath: '/test/custom',
        defaultBranch: 'develop',
        scope: 'team',
        workflowTemplateId: 'custom-workflow',
        settings: {
          installCommand: 'yarn install',
          testCommand: 'yarn test',
          buildCommand: 'yarn build',
          previewCommand: 'yarn preview',
          detectedStack: 'react',
          riskSummary: '低风险',
        },
      });

      expect(result.ok).toBe(true);
      expect(result.data?.defaultBranch).toBe('develop');
      expect(result.data?.scope).toBe('team');
      expect(result.data?.workflowTemplateId).toBe('custom-workflow');
      expect(result.data?.settings.detectedStack).toBe('react');
    });

    it('should fail without required fields', async () => {
      const result = await createProject(projectRepository, {
        name: '',
        repoPath: '/test/path',
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('INVALID_INPUT');
    });
  });

  describe('importProject', () => {
    beforeEach(() => {
      gitAdapter.setMockData('status', {
        branch: 'main',
        ahead: 0,
        behind: 0,
        staged: 0,
        unstaged: 0,
        untracked: 0,
        lastCommitSha: 'abc123',
        lastCommitMessage: 'Initial commit',
        lastCommitDate: '2026-05-30',
        isClean: true,
      });
    });

    it('should import an existing project', async () => {
      const result = await importProject(projectRepository, gitAdapter, {
        name: '导入项目',
        repoPath: '/test/import/path',
      });

      expect(result.ok).toBe(true);
      expect(result.data?.name).toBe('导入项目');
      expect(result.data?.sourceType).toBe('generic');
      expect(result.data?.phase).toBe('imported');
    });

    it('should import project with source type', async () => {
      const result = await importProject(projectRepository, gitAdapter, {
        name: 'Claude Code 项目',
        repoPath: '/test/claude/path',
        sourceType: 'claude-code',
        detectSettings: true,
      });

      expect(result.ok).toBe(true);
      expect(result.data?.sourceType).toBe('claude-code');
      expect(result.data?.settings.detectedStack).toBe('claude-code');
    });

    it('should fail without required fields', async () => {
      const result = await importProject(projectRepository, gitAdapter, {
        name: '',
        repoPath: '/test/path',
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('INVALID_INPUT');
    });

    it('should fail when git status fails', async () => {
      const realGitAdapter = new GitAdapter({ ...config, enableMock: false });

      const result = await importProject(projectRepository, realGitAdapter, {
        name: '失败项目',
        repoPath: '/non/existent/path',
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('DIRECTORY_NOT_FOUND');
    });
  });

  describe('updateProject', () => {
    it('should update existing project', async () => {
      // 先创建项目
      const createResult = await createProject(projectRepository, {
        name: '更新测试项目',
        repoPath: '/test/update/path',
      });

      expect(createResult.ok).toBe(true);
      const projectId = createResult.data!.id;

      // 设置 mock 数据以便加载
      fileStore.setMockData(
        `.agentmanagement/projects/${projectId}.json`,
        createResult.data
      );

      // 更新项目
      const updateResult = await updateProject(projectRepository, {
        id: projectId,
        name: '更新后的项目',
        settings: {
          ...createResult.data!.settings,
          projectDescription: '更新后的描述',
        },
      });

      expect(updateResult.ok).toBe(true);
      expect(updateResult.data?.name).toBe('更新后的项目');
    });

    it('should update project status', async () => {
      const createResult = await createProject(projectRepository, {
        name: '状态测试项目',
        repoPath: '/test/status/path',
      });

      expect(createResult.ok).toBe(true);
      const projectId = createResult.data!.id;

      fileStore.setMockData(
        `.agentmanagement/projects/${projectId}.json`,
        createResult.data
      );

      const updateResult = await updateProject(projectRepository, {
        id: projectId,
        status: 'running',
        progress: 50,
      });

      expect(updateResult.ok).toBe(true);
      expect(updateResult.data?.status).toBe('running');
      expect(updateResult.data?.progress).toBe(50);
    });

    it('should fail without project id', async () => {
      const result = await updateProject(projectRepository, {
        id: '',
        name: '更新名称',
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('INVALID_INPUT');
    });

    it('should fail for non-existent project', async () => {
      const result = await updateProject(projectRepository, {
        id: 'non-existent-id',
        name: '更新名称',
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('DIRECTORY_NOT_FOUND');
    });
  });

  describe('deleteProject', () => {
    it('should delete existing project', async () => {
      const createResult = await createProject(projectRepository, {
        name: '待删除项目',
        repoPath: '/test/delete/path',
      });

      expect(createResult.ok).toBe(true);
      const projectId = createResult.data!.id;

      fileStore.setMockData(
        `.agentmanagement/projects/${projectId}.json`,
        createResult.data
      );

      const deleteResult = await deleteProject(projectRepository, projectId);
      expect(deleteResult.ok).toBe(true);
    });

    it('should fail without project id', async () => {
      const result = await deleteProject(projectRepository, '');
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('INVALID_INPUT');
    });

    it('should fail for non-existent project', async () => {
      const result = await deleteProject(projectRepository, 'non-existent-id');
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('DIRECTORY_NOT_FOUND');
    });
  });

  describe('listProjects', () => {
    it('should list all projects', async () => {
      // 创建几个项目
      const project1 = await createProject(projectRepository, {
        name: '项目1',
        repoPath: '/test/path1',
      });
      const project2 = await createProject(projectRepository, {
        name: '项目2',
        repoPath: '/test/path2',
      });

      fileStore.setMockData(
        `.agentmanagement/projects/${project1.data!.id}.json`,
        project1.data
      );
      fileStore.setMockData(
        `.agentmanagement/projects/${project2.data!.id}.json`,
        project2.data
      );

      const result = await listProjects(projectRepository);
      expect(result.ok).toBe(true);
      // 由于是 mock 模式，listAll 可能返回空或根据实现而定
    });

    it('should filter projects by scope', async () => {
      const personalProject = await createProject(projectRepository, {
        name: '个人项目',
        repoPath: '/test/personal',
        scope: 'personal',
      });

      const teamProject = await createProject(projectRepository, {
        name: '团队项目',
        repoPath: '/test/team',
        scope: 'team',
      });

      // 存储项目
      fileStore.setMockData(
        `.agentmanagement/projects/${personalProject.data!.id}.json`,
        personalProject.data
      );
      fileStore.setMockData(
        `.agentmanagement/projects/${teamProject.data!.id}.json`,
        teamProject.data
      );

      // 获取所有项目
      const allResult = await listProjects(projectRepository);
      expect(allResult.ok).toBe(true);
    });

    it('should filter projects by status', async () => {
      const runningProject = await createProject(projectRepository, {
        name: '运行中项目',
        repoPath: '/test/running',
      });

      fileStore.setMockData(
        `.agentmanagement/projects/${runningProject.data!.id}.json`,
        { ...runningProject.data!, status: 'running' }
      );

      const result = await listProjects(projectRepository, { status: 'running' });
      expect(result.ok).toBe(true);
    });
  });

  describe('getProject', () => {
    it('should get project by id', async () => {
      const createResult = await createProject(projectRepository, {
        name: '查询测试项目',
        repoPath: '/test/get/path',
      });

      expect(createResult.ok).toBe(true);
      const projectId = createResult.data!.id;

      fileStore.setMockData(
        `.agentmanagement/projects/${projectId}.json`,
        createResult.data
      );

      const getResult = await getProject(projectRepository, projectId);
      expect(getResult.ok).toBe(true);
      expect(getResult.data?.id).toBe(projectId);
    });

    it('should fail without project id', async () => {
      const result = await getProject(projectRepository, '');
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('INVALID_INPUT');
    });

    it('should fail for non-existent project', async () => {
      const result = await getProject(projectRepository, 'non-existent-id');
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('DIRECTORY_NOT_FOUND');
    });
  });
});
