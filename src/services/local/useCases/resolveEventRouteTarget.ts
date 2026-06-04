/**
 * resolveEventRouteTarget - 解析事件路由目标
 *
 * 根据事件触发器和 Assignments 的路由规则，确定目标 Assignment 或 Task
 * Issue: #27 #28
 */

import type {
  WorkflowAssignment,
  WorkflowEventTrigger,
  WorkflowEventRouteAction,
  WorkflowEventRoute,
} from '../../../domain/workflowAssignment';
import type { WorkflowEventRouteResult } from '../../../domain/workflowEvent';
import type { Task } from '../../../domain/task';

/**
 * 依赖状态上下文 - 用于判断 dependsOnTaskIds 是否满足
 */
export interface DependencyContext {
  /** 已完成的 Task IDs */
  completedTaskIds: Set<string>;
  /** 所有相关 Tasks */
  tasks: Task[];
}

/**
 * 解析单个路由规则
 *
 * @param trigger - 事件触发器
 * @param route - 路由规则
 * @param sourceAssignmentId - 源 Assignment ID
 * @param depCtx - 依赖上下文
 */
export function resolveEventRouteTarget(
  trigger: WorkflowEventTrigger,
  route: WorkflowEventRoute,
  sourceAssignmentId: string,
  depCtx: DependencyContext
): WorkflowEventRouteResult | null {
  // 只有 trigger 匹配时才处理
  if (route.trigger !== trigger) {
    return null;
  }

  const result: WorkflowEventRouteResult = {
    routeId: `${sourceAssignmentId}-${trigger}-${route.action}`,
    action: route.action,
    targetAssignmentId: route.targetAssignmentId,
    targetRoleId: route.targetRoleId,
    status: 'pending',
  };

  switch (route.action) {
    case 'create_task':
      result.message = `为 assignment ${route.targetAssignmentId ?? '(new)'} 创建新任务`;
      break;

    case 'unblock_task': {
      // 检查依赖是否满足
      if (route.targetAssignmentId) {
        const depTask = depCtx.tasks.find(
          t => t.roleAssignment && Object.values(t.roleAssignment).includes(route.targetAssignmentId!)
        );
        if (depTask && depTask.status === 'queued') {
          result.targetTaskId = depTask.id;
          result.message = `解除任务 ${depTask.id} 的阻塞`;
        } else if (depTask) {
          result.targetTaskId = depTask.id;
          result.message = `任务 ${depTask.id} 当前状态为 ${depTask.status}，无需解除阻塞`;
          result.status = 'completed';
        } else {
          result.message = `未找到 assignment ${route.targetAssignmentId} 对应的任务`;
          result.status = 'failed';
        }
      }
      break;
    }

    case 'notify':
      result.message = `通知角色 ${route.targetRoleId ?? 'all'}`;
      break;

    case 'request_gate':
      result.message = `请求 Gate 审查`;
      if (route.targetAssignmentId) {
        result.targetAssignmentId = route.targetAssignmentId;
      }
      break;

    case 'reassign_task':
      result.message = `重新分配任务到角色 ${route.targetRoleId ?? 'unknown'}`;
      if (route.targetAssignmentId) {
        result.targetAssignmentId = route.targetAssignmentId;
      }
      break;

    case 'fail_task':
      result.message = `标记任务为失败`;
      if (route.targetAssignmentId) {
        const failTask = depCtx.tasks.find(
          t => t.roleAssignment && Object.values(t.roleAssignment).includes(route.targetAssignmentId!)
        );
        if (failTask) {
          result.targetTaskId = failTask.id;
        }
      }
      break;
  }

  return result;
}

/**
 * 处理 handoff_requested 触发器
 *
 * handoff 事件将任务从当前 assignment 移交给目标 assignment
 */
export function resolveHandoffTarget(
  sourceAssignmentId: string,
  targetAssignmentId: string | undefined,
  targetRoleId: string | undefined,
  assignments: WorkflowAssignment[]
): WorkflowEventRouteResult | null {
  if (!targetAssignmentId && !targetRoleId) {
    return {
      routeId: `${sourceAssignmentId}-handoff-no-target`,
      action: 'reassign_task',
      status: 'failed',
      message: 'handoff_requested 缺少目标 assignment 或角色',
    };
  }

  // 如果指定了目标 assignment，验证它存在
  if (targetAssignmentId) {
    const target = assignments.find(a => a.id === targetAssignmentId);
    if (!target) {
      return {
        routeId: `${sourceAssignmentId}-handoff-${targetAssignmentId}`,
        action: 'reassign_task',
        targetAssignmentId,
        status: 'failed',
        message: `目标 assignment ${targetAssignmentId} 不存在`,
      };
    }
  }

  return {
    routeId: `${sourceAssignmentId}-handoff-${targetAssignmentId ?? targetRoleId}`,
    action: 'reassign_task',
    targetAssignmentId,
    targetRoleId,
    status: 'pending',
    message: `移交任务到 ${targetAssignmentId ?? `角色 ${targetRoleId}`}`,
  };
}

/**
 * 从所有 Assignments 的路由规则中收集匹配的路由结果
 *
 * @param trigger - 事件触发器
 * @param sourceAssignmentId - 源 Assignment
 * @param allAssignments - 所有 Assignments
 * @param depCtx - 依赖上下文
 * @returns 匹配的路由结果列表
 */
export function resolveAllRoutes(
  trigger: WorkflowEventTrigger,
  sourceAssignmentId: string | undefined,
  allAssignments: WorkflowAssignment[],
  depCtx: DependencyContext
): WorkflowEventRouteResult[] {
  const results: WorkflowEventRouteResult[] = [];

  for (const assignment of allAssignments) {
    for (const route of assignment.eventRoutes) {
      // handoff_requested 特殊处理
      if (trigger === 'handoff_requested' && route.trigger === 'handoff_requested') {
        // 只有源 assignment 的 handoff 路由才处理
        if (assignment.id === sourceAssignmentId) {
          const handoffResult = resolveHandoffTarget(
            sourceAssignmentId!,
            route.targetAssignmentId,
            route.targetRoleId,
            allAssignments
          );
          if (handoffResult) {
            results.push(handoffResult);
          }
        }
        continue;
      }

      // 一般路由解析
      const resolved = resolveEventRouteTarget(
        trigger,
        route,
        assignment.id,
        depCtx
      );
      if (resolved) {
        results.push(resolved);
      }
    }
  }

  return results;
}
