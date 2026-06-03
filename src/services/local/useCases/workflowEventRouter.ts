import type { WorkflowEventRoute, WorkflowEventTrigger } from '../../../domain/workflow';
import type { Task } from '../../../domain/task';
import type { LocalResult } from '../../../types/localEngineering';
import type { TaskRepository } from '../repositories/taskRepository';

/**
 * 工作流事件
 */
export interface WorkflowEvent {
  /** 事件类型 */
  type: WorkflowEventTrigger;
  /** 触发事件的任务 ID */
  sourceTaskId: string;
  /** 项目 ID */
  projectId: string;
  /** 关联的工作流模板 ID */
  workflowTemplateId: string;
  /** 时间戳 */
  timestamp: string;
  /** 事件数据 */
  data?: {
    severity?: 'low' | 'medium' | 'high' | 'critical';
    bugCategory?: 'frontend' | 'backend' | 'requirement' | 'test' | 'integration' | 'unknown';
    message?: string;
    [key: string]: unknown;
  };
}

/**
 * 事件路由执行结果
 */
export interface EventRouteResult {
  /** 路由 ID */
  routeId: string;
  /** 目标任务 ID */
  targetTaskId?: string;
  /** 执行的动作 */
  action: string;
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
}

/**
 * 执行单个事件路由
 *
 * 根据路由配置，对目标任务执行相应动作：
 * - notify: 记录通知（可扩展为实际通知机制）
 * - create_task: 创建新任务
 * - unblock_task: 将 waiting 状态的任务改为 queued
 * - request_gate: 触发 gate 请求
 * - reassign_task: 重新分配任务
 */
export async function executeEventRoute(
  taskRepository: TaskRepository,
  event: WorkflowEvent,
  route: WorkflowEventRoute,
  allTasks: Task[]
): Promise<LocalResult<EventRouteResult>> {
  // 先检查 action 是否有效
  const validActions = ['notify', 'create_task', 'unblock_task', 'request_gate', 'reassign_task'];
  if (!validActions.includes(route.action)) {
    return {
      ok: false,
      error: {
        code: 'UNKNOWN_ACTION',
        message: `未知的路由动作: ${route.action}`,
        recoverable: false,
      },
    };
  }

  // 检查条件过滤
  if (route.condition) {
    if (route.condition.severity && event.data?.severity !== route.condition.severity) {
      return {
        ok: true,
        data: {
          routeId: route.id,
          action: route.action,
          success: false,
          error: `严重级别不匹配: 需要 ${route.condition.severity}，实际 ${event.data?.severity}`,
        },
      };
    }

    if (route.condition.bugCategory && event.data?.bugCategory !== route.condition.bugCategory) {
      return {
        ok: true,
        data: {
          routeId: route.id,
          action: route.action,
          success: false,
          error: `Bug 分类不匹配: 需要 ${route.condition.bugCategory}，实际 ${event.data?.bugCategory}`,
        },
      };
    }
  }

  // 根据目标类型找到目标任务
  let targetTasks: Task[] = [];

  switch (route.target.type) {
    case 'assignment':
      // 目标是特定的 assignment，找到对应的 task
      targetTasks = allTasks.filter(t => t.assignmentId === route.target.id);
      break;

    case 'role':
      // 目标是特定角色，找到该角色的所有任务
      targetTasks = allTasks.filter(t => t.roleId === route.target.id);
      break;

    case 'project_owner':
      // 项目所有者 - 暂时记录通知
      // TODO: 实现项目所有者通知机制
      return {
        ok: true,
        data: {
          routeId: route.id,
          action: 'notify',
          success: true,
        },
        diagnostics: [`已通知项目所有者: 事件 ${event.type} 来自任务 ${event.sourceTaskId}`],
      };

    case 'manual_select':
      // 手动选择 - 需要人工干预
      return {
        ok: true,
        data: {
          routeId: route.id,
          action: 'manual_select',
          success: true,
        },
        diagnostics: [`事件 ${event.type} 需要手动选择处理方式`],
      };
  }

  if (targetTasks.length === 0 && route.action !== 'create_task') {
    return {
      ok: true,
      data: {
        routeId: route.id,
        action: route.action,
        success: false,
        error: `未找到目标任务: 目标类型 ${route.target.type}, ID ${route.target.id}`,
      },
    };
  }

  // 执行路由动作
  switch (route.action) {
    case 'notify':
      // 通知目标任务
      // TODO: 实现实际通知机制
      return {
        ok: true,
        data: {
          routeId: route.id,
          targetTaskId: targetTasks[0]?.id,
          action: 'notify',
          success: true,
        },
        diagnostics: targetTasks.map(t => `已通知任务 ${t.id}: ${t.goal}`),
      };

    case 'create_task':
      // 创建新任务 - 这需要更多上下文，暂时记录
      return {
        ok: true,
        data: {
          routeId: route.id,
          action: 'create_task',
          success: true,
        },
        diagnostics: [`事件 ${event.type} 触发创建新任务（需要额外配置）`],
      };

    case 'unblock_task':
      // 解除任务阻塞：将 waiting 状态的任务改为 queued
      const unblockResults: Task[] = [];
      const unblockErrors: string[] = [];

      for (const task of targetTasks) {
        if (task.status === 'queued') {
          // 已经在队列中，无需修改
          unblockResults.push(task);
          continue;
        }

        if (task.status !== 'draft') {
          // 只有 draft 状态可以转为 queued
          unblockErrors.push(`任务 ${task.id} 状态为 ${task.status}，无法解除阻塞`);
          continue;
        }

        // 更新任务状态为 queued
        const updatedTask: Task = {
          ...task,
          status: 'queued',
          updatedAt: new Date().toISOString(),
        };

        const saveResult = await taskRepository.save(updatedTask);
        if (saveResult.ok) {
          unblockResults.push(updatedTask);
        } else {
          unblockErrors.push(`任务 ${task.id} 更新失败: ${saveResult.error?.message}`);
        }
      }

      return {
        ok: unblockResults.length > 0,
        data: {
          routeId: route.id,
          targetTaskId: unblockResults[0]?.id,
          action: 'unblock_task',
          success: unblockResults.length > 0,
          error: unblockErrors.length > 0 ? unblockErrors.join('; ') : undefined,
        },
        diagnostics: unblockResults.length > 0
          ? [`已解除 ${unblockResults.length} 个任务的阻塞`]
          : undefined,
      };

    case 'request_gate':
      // 请求 gate - 将任务状态改为 gate
      const gateResults: Task[] = [];
      const gateErrors: string[] = [];

      for (const task of targetTasks) {
        if (task.status === 'gate') {
          gateResults.push(task);
          continue;
        }

        if (task.status !== 'running' && task.status !== 'queued') {
          gateErrors.push(`任务 ${task.id} 状态为 ${task.status}，无法请求 gate`);
          continue;
        }

        const updatedTask: Task = {
          ...task,
          status: 'gate',
          updatedAt: new Date().toISOString(),
        };

        const saveResult = await taskRepository.save(updatedTask);
        if (saveResult.ok) {
          gateResults.push(updatedTask);
        } else {
          gateErrors.push(`任务 ${task.id} 更新失败: ${saveResult.error?.message}`);
        }
      }

      return {
        ok: gateResults.length > 0,
        data: {
          routeId: route.id,
          targetTaskId: gateResults[0]?.id,
          action: 'request_gate',
          success: gateResults.length > 0,
          error: gateErrors.length > 0 ? gateErrors.join('; ') : undefined,
        },
        diagnostics: gateResults.length > 0
          ? [`已为 ${gateResults.length} 个任务请求 gate`]
          : undefined,
      };

    case 'reassign_task':
      // 重新分配任务 - 需要额外的分配信息
      return {
        ok: true,
        data: {
          routeId: route.id,
          action: 'reassign_task',
          success: true,
        },
        diagnostics: [`事件 ${event.type} 触发任务重新分配（需要额外配置）`],
      };

    default:
      return {
        ok: false,
        error: {
          code: 'UNKNOWN_ACTION',
          message: `未知的路由动作: ${(route as any).action}`,
          recoverable: false,
        },
      };
  }
}

/**
 * 检查任务的依赖是否全部满足
 *
 * @param task 要检查的任务
 * @param allTasks 项目中的所有任务
 * @returns 依赖是否满足
 */
function checkDependenciesMet(task: Task, allTasks: Task[]): boolean {
  if (!task.dependsOnTaskIds || task.dependsOnTaskIds.length === 0) {
    return true;
  }

  for (const depTaskId of task.dependsOnTaskIds) {
    const depTask = allTasks.find(t => t.id === depTaskId);
    if (!depTask || depTask.status !== 'done') {
      return false;
    }
  }

  return true;
}

/**
 * 处理事件路由
 *
 * 当事件触发时：
 * 1. 查找所有匹配的路由规则
 * 2. 执行每个路由
 * 3. 检查下游任务的依赖是否满足
 * 4. 如果满足，将下游任务从 waiting 改为 queued
 */
export async function processEventRoutes(
  taskRepository: TaskRepository,
  event: WorkflowEvent,
  eventRoutes: WorkflowEventRoute[]
): Promise<LocalResult<EventRouteResult[]>> {
  // 获取项目中的所有任务
  const listResult = await taskRepository.listByProject(event.projectId);

  if (!listResult.ok) {
    return {
      ok: false,
      error: listResult.error,
    };
  }

  const allTasks = listResult.data!;
  const results: EventRouteResult[] = [];

  // 过滤匹配当前事件类型的路由
  const matchingRoutes = eventRoutes.filter(route => route.on === event.type);

  // 执行每个匹配的路由
  for (const route of matchingRoutes) {
    const routeResult = await executeEventRoute(taskRepository, event, route, allTasks);
    if (routeResult.ok) {
      results.push(routeResult.data!);
    } else {
      results.push({
        routeId: route.id,
        action: route.action,
        success: false,
        error: routeResult.error?.message,
      });
    }
  }

  // 如果是 task_completed 事件，检查下游任务是否可以启动
  if (event.type === 'task_completed') {
    const sourceTask = allTasks.find(t => t.id === event.sourceTaskId);
    if (sourceTask) {
      // 找到所有依赖当前任务的任务
      const downstreamTasks = allTasks.filter(t =>
        t.dependsOnTaskIds?.includes(event.sourceTaskId)
      );

      for (const downstreamTask of downstreamTasks) {
        // 检查依赖是否全部满足
        if (checkDependenciesMet(downstreamTask, allTasks)) {
          // 将任务从 waiting/queued 改为 queued
          if (downstreamTask.status === 'draft' || downstreamTask.status === 'queued') {
            const updatedTask: Task = {
              ...downstreamTask,
              status: 'queued',
              updatedAt: new Date().toISOString(),
            };

            const saveResult = await taskRepository.save(updatedTask);
            if (saveResult.ok) {
              results.push({
                routeId: 'dependency-check',
                targetTaskId: downstreamTask.id,
                action: 'dependency_satisfied',
                success: true,
              });
            }
          }
        }
      }
    }
  }

  // 如果是 task_failed 事件，通知相关任务
  if (event.type === 'task_failed') {
    // 找到需要通知的任务（通过 notifyTaskIds）
    const sourceTask = allTasks.find(t => t.id === event.sourceTaskId);
    if (sourceTask && sourceTask.notifyTaskIds && sourceTask.notifyTaskIds.length > 0) {
      const notifyTasks = allTasks.filter(t =>
        sourceTask.notifyTaskIds!.includes(t.id)
      );

      // 记录通知
      for (const notifyTask of notifyTasks) {
        results.push({
          routeId: 'failure-notification',
          targetTaskId: notifyTask.id,
          action: 'notify',
          success: true,
        });
      }
    }
  }

  return {
    ok: true,
    data: results,
    diagnostics: [
      `处理事件 ${event.type}: 执行了 ${results.length} 个路由动作`,
    ],
  };
}

/**
 * 创建工作流事件
 */
export function createWorkflowEvent(
  type: WorkflowEventTrigger,
  sourceTaskId: string,
  projectId: string,
  workflowTemplateId: string,
  data?: WorkflowEvent['data']
): WorkflowEvent {
  return {
    type,
    sourceTaskId,
    projectId,
    workflowTemplateId,
    timestamp: new Date().toISOString(),
    data,
  };
}