import type { Task } from '../../../domain/task';
import type { WorkflowTemplate } from '../../../domain/workflow';
import { getPrimaryAssignment, isLegacyWorkflowStep, migrateWorkflowStep } from '../../../domain/workflow';
import type { LocalResult } from '../../../types/localEngineering';
import type { TaskRepository } from '../repositories/taskRepository';
import type { WorkflowRepository } from '../repositories/workflowRepository';

/**
 * 创建任务配置
 */
export interface CreateTaskConfig {
  projectId: string;
  goal: string;
  workflowTemplateId: string;
  acceptanceCriteria?: string[];
  roleAssignment?: Record<string, string>;
  capabilityAuthorization?: string[];
  launchStrategy?: 'worktree' | 'direct';
  status?: 'draft' | 'queued' | 'running' | 'gate' | 'done' | 'failed';
}

/**
 * 从工作流创建任务配置
 */
export interface CreateTasksFromWorkflowConfig {
  projectId: string;
  workflowTemplateId: string;
}

/**
 * 更新任务配置
 */
export interface UpdateTaskConfig {
  id: string;
  goal?: string;
  acceptanceCriteria?: string[];
  roleAssignment?: Record<string, string>;
  capabilityAuthorization?: string[];
  launchStrategy?: 'worktree' | 'direct';
  status?: 'draft' | 'queued' | 'running' | 'gate' | 'done' | 'failed';
  activeRunId?: string | null;
}

/**
 * 生成任务 ID
 */
function generateTaskId(): string {
  return `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 创建单个任务
 */
export async function createTask(
  taskRepository: TaskRepository,
  config: CreateTaskConfig
): Promise<LocalResult<Task>> {
  const {
    projectId,
    goal,
    workflowTemplateId,
    acceptanceCriteria = [],
    roleAssignment = {},
    capabilityAuthorization = [],
    launchStrategy = 'direct',
    status = 'queued',
  } = config;

  // 验证必填字段
  if (!projectId || !goal || !workflowTemplateId) {
    return {
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'projectId、goal 和 workflowTemplateId 为必填项',
        recoverable: false,
      },
    };
  }

  const now = new Date().toISOString();
  const taskId = generateTaskId();

  const task: Task = {
    id: taskId,
    projectId,
    goal,
    acceptanceCriteria,
    workflowTemplateId,
    roleAssignment,
    capabilityAuthorization,
    launchStrategy,
    status,
    activeRunId: null,
    createdAt: now,
    updatedAt: now,
  };

  const result = await taskRepository.save(task);

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
    };
  }

  return {
    ok: true,
    data: task,
    diagnostics: [`任务已创建: ${goal} (${taskId})`],
  };
}

/**
 * 根据工作流模板创建初始任务
 *
 * 关键逻辑：
 * 1. 加载工作流模板
 * 2. 为每个 assignment 创建一个 Task（注意：assignment 是执行单元，不是 step）
 * 3. 第一个 assignment 状态为 "running"，其余为 "queued"
 * 4. 批量保存所有任务
 * 5. 动态优先级：P0 对应第一个 step，P1 对应第二个 step，以此类推
 */
export async function createTasksFromWorkflow(
  taskRepository: TaskRepository,
  workflowRepository: WorkflowRepository,
  config: CreateTasksFromWorkflowConfig
): Promise<LocalResult<Task[]>> {
  const { projectId, workflowTemplateId } = config;

  // 验证必填字段
  if (!projectId || !workflowTemplateId) {
    return {
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'projectId 和 workflowTemplateId 为必填项',
        recoverable: false,
      },
    };
  }

  // 加载工作流模板
  const templateResult = await workflowRepository.load(workflowTemplateId);

  if (!templateResult.ok) {
    return {
      ok: false,
      error: {
        code: 'WORKFLOW_NOT_FOUND',
        message: `工作流模板不存在: ${workflowTemplateId}`,
        cause: templateResult.error?.message,
        recoverable: true,
      },
    };
  }

  const template = templateResult.data!;
  const now = new Date().toISOString();

  // 为每个 assignment 创建任务
  // 展平 steps -> assignments 映射，保留 step index 用于优先级
  const assignmentsWithPriority: Array<{
    assignment: import('../../../domain/workflow').WorkflowAssignment;
    step: import('../../../domain/workflow').WorkflowStep;
    stepIndex: number;
  }> = [];

  template.steps.forEach((step, stepIndex) => {
    // 确保使用迁移后的格式（包含 assignments）
    const migratedStep = isLegacyWorkflowStep(step) ? migrateWorkflowStep(step) : step;

    if (migratedStep.assignments && migratedStep.assignments.length > 0) {
      migratedStep.assignments.forEach((assignment) => {
        assignmentsWithPriority.push({
          assignment,
          step: migratedStep,
          stepIndex,
        });
      });
    }
  });

  // 创建 Task ID 映射，用于设置依赖关系
  const assignmentIdToTaskId = new Map<string, string>();
  assignmentsWithPriority.forEach(({ assignment }) => {
    assignmentIdToTaskId.set(assignment.id, generateTaskId());
  });

  // 为每个 assignment 创建任务
  const tasks: Task[] = assignmentsWithPriority.map(({ assignment, step, stepIndex }, index) => {
    const taskId = assignmentIdToTaskId.get(assignment.id)!;

    // 动态优先级：P0, P1, P2...
    const priority = `P${stepIndex}` as import('../../../domain/task').TaskPriority;

    // 转换依赖关系：assignmentId -> taskId
    const dependsOnTaskIds = assignment.dependsOnAssignmentIds
      .map(aId => assignmentIdToTaskId.get(aId))
      .filter((id): id is string => id !== undefined);

    const notifyTaskIds = assignment.notifyAssignmentIds
      .map(aId => assignmentIdToTaskId.get(aId))
      .filter((id): id is string => id !== undefined);

    return {
      id: taskId,
      projectId,
      goal: assignment.taskGoal || step.name,
      acceptanceCriteria: assignment.acceptanceCriteria || [],
      workflowTemplateId,
      workflowStepId: step.id,
      assignmentId: assignment.id,
      roleId: assignment.roleId,
      runnerId: assignment.runnerId,
      modelProviderId: assignment.modelProviderId,
      modelName: assignment.modelName,
      priority,
      dependsOnTaskIds,
      notifyTaskIds,
      roleAssignment: { [step.id]: assignment.roleId },
      capabilityAuthorization: assignment.capabilityAuthorization || [],
      launchStrategy: 'direct',
      // 第一个任务状态为 running，其余为 queued
      status: index === 0 ? 'running' : 'queued',
      activeRunId: null,
      createdAt: now,
      updatedAt: now,
    };
  });

  // 批量保存任务
  const saveResult = await taskRepository.saveBatch(tasks);

  if (!saveResult.ok) {
    return {
      ok: false,
      error: saveResult.error,
    };
  }

  return {
    ok: true,
    data: tasks,
    diagnostics: [
      `已根据工作流 "${template.name}" 创建 ${tasks.length} 个任务`,
      `第一个任务 "${tasks[0]?.goal}" 状态为 running`,
    ],
  };
}

/**
 * 更新任务
 */
export async function updateTask(
  taskRepository: TaskRepository,
  config: UpdateTaskConfig
): Promise<LocalResult<Task>> {
  const { id, ...updates } = config;

  if (!id) {
    return {
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: '任务 ID 为必填项',
        recoverable: false,
      },
    };
  }

  // 加载现有任务
  const existingResult = await taskRepository.load(id);

  if (!existingResult.ok) {
    return {
      ok: false,
      error: {
        code: 'TASK_NOT_FOUND',
        message: `任务不存在: ${id}`,
        cause: existingResult.error?.message,
        recoverable: true,
      },
    };
  }

  const existingTask = existingResult.data!;

  // 合并更新
  const updatedTask: Task = {
    ...existingTask,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  const result = await taskRepository.save(updatedTask);

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
    };
  }

  return {
    ok: true,
    data: updatedTask,
    diagnostics: [`任务已更新: ${updatedTask.goal} (${id})`],
  };
}

/**
 * 删除任务
 */
export async function deleteTask(
  taskRepository: TaskRepository,
  taskId: string
): Promise<LocalResult<void>> {
  if (!taskId) {
    return {
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: '任务 ID 为必填项',
        recoverable: false,
      },
    };
  }

  // 检查任务是否存在
  const existingResult = await taskRepository.load(taskId);

  if (!existingResult.ok) {
    return {
      ok: false,
      error: {
        code: 'TASK_NOT_FOUND',
        message: `任务不存在: ${taskId}`,
        cause: existingResult.error?.message,
        recoverable: true,
      },
    };
  }

  const result = await taskRepository.delete(taskId);

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
    };
  }

  return {
    ok: true,
    data: undefined,
    diagnostics: [`任务已删除: ${taskId}`],
  };
}

/**
 * 列出所有任务
 */
export async function listTasks(
  taskRepository: TaskRepository
): Promise<LocalResult<Task[]>> {
  const result = await taskRepository.listAll();

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
    };
  }

  // 按创建时间排序
  const tasks = result.data!.sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateB - dateA;
  });

  return {
    ok: true,
    data: tasks,
    diagnostics: [`找到 ${tasks.length} 个任务`],
  };
}

/**
 * 按项目列出任务
 */
export async function listTasksByProject(
  taskRepository: TaskRepository,
  projectId: string
): Promise<LocalResult<Task[]>> {
  if (!projectId) {
    return {
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'projectId 为必填项',
        recoverable: false,
      },
    };
  }

  const result = await taskRepository.listByProject(projectId);

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
    };
  }

  // 按步骤顺序排序（根据 roleAssignment 中的 step id）
  const tasks = result.data!;

  return {
    ok: true,
    data: tasks,
    diagnostics: [`找到 ${tasks.length} 个项目任务`],
  };
}