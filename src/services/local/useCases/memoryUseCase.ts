import type { MemoryRepository } from '../repositories/memoryRepository';
import type { LocalResult } from '../../../types/localEngineering';
import type { Memory, MemoryKind, MemoryScope } from '../../../domain/memory';
import { randomUUID } from 'crypto';

/**
 * 创建记忆输入
 */
export interface CreateMemoryInput {
  kind: MemoryKind;
  scope: MemoryScope;
  projectId: string;
  roleId?: string | null;
  taskId?: string | null;
  title: string;
  body: string;
}

/**
 * 更新记忆输入
 */
export interface UpdateMemoryInput {
  title?: string;
  body?: string;
  scope?: MemoryScope;
}

/**
 * 列出记忆（可按项目过滤）
 */
export async function listMemories(
  repository: MemoryRepository,
  projectId?: string
): Promise<LocalResult<Memory[]>> {
  if (projectId) {
    return repository.listByProject(projectId);
  }
  return repository.listAll();
}

/**
 * 获取单个记忆
 */
export async function getMemory(
  repository: MemoryRepository,
  memoryId: string
): Promise<LocalResult<Memory>> {
  return repository.load(memoryId);
}

/**
 * 创建记忆
 */
export async function createMemory(
  repository: MemoryRepository,
  input: CreateMemoryInput
): Promise<LocalResult<Memory>> {
  const now = new Date().toISOString();
  const memory: Memory = {
    id: randomUUID(),
    kind: input.kind,
    scope: input.scope,
    projectId: input.projectId,
    roleId: input.roleId ?? null,
    taskId: input.taskId ?? null,
    title: input.title,
    content: input.body,
    body: input.body,
    status: 'pending_confirmation',
    citation: [],
    createdAt: now,
    updatedAt: now,
  };

  return repository.save(memory);
}

/**
 * 更新记忆
 */
export async function updateMemory(
  repository: MemoryRepository,
  memoryId: string,
  input: UpdateMemoryInput
): Promise<LocalResult<Memory>> {
  return repository.update({
    id: memoryId,
    ...input,
  });
}

/**
 * 删除记忆
 */
export async function deleteMemory(
  repository: MemoryRepository,
  memoryId: string
): Promise<LocalResult<void>> {
  return repository.delete(memoryId);
}

/**
 * 搜索记忆
 */
export async function searchMemories(
  repository: MemoryRepository,
  keyword: string,
  projectId?: string
): Promise<LocalResult<Memory[]>> {
  let listResult: LocalResult<Memory[]>;

  if (projectId) {
    listResult = await repository.listByProject(projectId);
  } else {
    listResult = await repository.listAll();
  }

  if (!listResult.ok) {
    return listResult;
  }

  const keywordLower = keyword.toLowerCase();
  const filtered = (listResult.data as Memory[]).filter(
    (m) =>
      m.title?.toLowerCase().includes(keywordLower) ||
      m.content?.toLowerCase().includes(keywordLower) ||
      m.body?.toLowerCase().includes(keywordLower)
  );

  return {
    ok: true,
    data: filtered,
  };
}
