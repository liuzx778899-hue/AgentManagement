import { describe, it, expect, beforeEach } from 'vitest';
import { ProjectRepository, MemoryRepository, WorkflowRepository } from '../../../../services/local/repositories';
import { FileStoreAdapter } from '../../../../services/local/adapters/fileStoreAdapter';
import type { AdapterConfig } from '../../../../types/localEngineering';

describe('Repositories', () => {
  let fileStore: FileStoreAdapter;
  const config: AdapterConfig = {
    enableMock: true,
    defaultTimeout: 30000,
    projectRoot: process.cwd(),
  };

  beforeEach(() => {
    fileStore = new FileStoreAdapter(config);
  });

  describe('ProjectRepository', () => {
    let projectRepo: ProjectRepository;

    beforeEach(() => {
      projectRepo = new ProjectRepository(fileStore, '.agentmanagement');
    });

    it('should save and load project config', async () => {
      const project = {
        id: 'proj-001',
        name: '测试项目',
        version: '1.0',
        persistedAt: new Date().toISOString(),
      };

      const saveResult = await projectRepo.save(project as any);
      expect(saveResult.ok).toBe(true);

      fileStore.setMockData('.agentmanagement/projects/proj-001.json', project);

      const loadResult = await projectRepo.load('proj-001');
      expect(loadResult.ok).toBe(true);
      expect(loadResult.data?.name).toBe('测试项目');
    });

    it('should list all projects', async () => {
      fileStore.setMockData('.agentmanagement/projects/index.json', [
        { id: 'proj-001', name: 'Project 1', version: '1.0' },
        { id: 'proj-002', name: 'Project 2', version: '1.0' },
      ]);

      const result = await projectRepo.listAll();
      expect(result.ok).toBe(true);
      expect(result.data?.length).toBeGreaterThanOrEqual(2);
    });

    it('should delete project config', async () => {
      const project = {
        id: 'proj-to-delete',
        name: '待删除项目',
        version: '1.0',
        persistedAt: new Date().toISOString(),
      };

      await projectRepo.save(project as any);
      const deleteResult = await projectRepo.delete('proj-to-delete');
      expect(deleteResult.ok).toBe(true);
    });
  });

  describe('MemoryRepository', () => {
    let memoryRepo: MemoryRepository;

    beforeEach(() => {
      memoryRepo = new MemoryRepository(fileStore, '.agentmanagement');
    });

    it('should save and load memory', async () => {
      const memory = {
        id: 'mem-001',
        title: '重要决策',
        type: 'decision',
        content: '采用 TypeScript 作为主要开发语言',
        version: '1.0',
        createdAt: '2026-05-30',
        updatedAt: '2026-05-30',
        persistedAt: new Date().toISOString(),
      };

      const saveResult = await memoryRepo.save(memory as any);
      expect(saveResult.ok).toBe(true);

      fileStore.setMockData('.agentmanagement/memory/mem-001.json', memory);

      const loadResult = await memoryRepo.load('mem-001');
      expect(loadResult.ok).toBe(true);
      expect(loadResult.data?.title).toBe('重要决策');
    });

    it('should list memories by project', async () => {
      fileStore.setMockData('.agentmanagement/memory/by-project/proj-001.json', [
        { id: 'mem-002', title: '项目记忆', type: 'experience', projectId: 'proj-001' },
      ]);

      const result = await memoryRepo.listByProject('proj-001');
      expect(result.ok).toBe(true);
      expect(result.data?.length).toBeGreaterThanOrEqual(1);
    });

    it('should list memories by role', async () => {
      fileStore.setMockData('.agentmanagement/memory/by-role/role-fe.json', [
        { id: 'mem-003', title: '角色记忆', type: 'prompt', roleId: 'role-fe' },
      ]);

      const result = await memoryRepo.listByRole('role-fe');
      expect(result.ok).toBe(true);
      expect(result.data?.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('WorkflowRepository', () => {
    let workflowRepo: WorkflowRepository;

    beforeEach(() => {
      workflowRepo = new WorkflowRepository(fileStore, '.agentmanagement');
    });

    it('should save and load workflow', async () => {
      const workflow = {
        id: 'wf-001',
        name: '开发流程',
        version: '1.0',
        steps: [
          { id: 'step-1', name: '需求分析', order: 1 },
          { id: 'step-2', name: '开发', order: 2 },
        ],
        status: 'active',
        createdAt: '2026-05-30',
        updatedAt: '2026-05-30',
        persistedAt: new Date().toISOString(),
      };

      const saveResult = await workflowRepo.save(workflow as any);
      expect(saveResult.ok).toBe(true);

      fileStore.setMockData('.agentmanagement/workflows/wf-001.json', workflow);

      const loadResult = await workflowRepo.load('wf-001');
      expect(loadResult.ok).toBe(true);
      expect(loadResult.data?.name).toBe('开发流程');
    });

    it('should list active workflows', async () => {
      fileStore.setMockData('.agentmanagement/workflows/index.json', [
        { id: 'wf-active', name: 'Active', status: 'active' },
        { id: 'wf-archived', name: 'Archived', status: 'archived' },
      ]);

      const result = await workflowRepo.listActive();
      expect(result.ok).toBe(true);
      expect(result.data?.every(w => w.status === 'active')).toBe(true);
    });
  });
});