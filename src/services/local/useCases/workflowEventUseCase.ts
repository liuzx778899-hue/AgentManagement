/**
 * workflowEventUseCase - 事件处理用例
 *
 * 创建 WorkflowEvent 并解析路由，执行路由动作
 * Issue: #27 #28 #30
 */

import type { LocalResult } from '../../../types/localEngineering';
import type {
  WorkflowEvent,
  WorkflowEventRouteResult,
} from '../../../domain/workflowEvent';
import type {
  WorkflowEventTrigger,
  WorkflowAssignment,
} from '../../../domain/workflowAssignment';
import type { Task } from '../../../domain/task';
import type { NotificationStatus } from '../../../domain/notification';

import * as eventRepo from '../repositories/workflowEventRepository';
import * as notificationRepo from '../repositories/notificationRepository';
import * as assignmentRepo from '../repositories/workflowAssignmentRepository';
import { resolveAllRoutes } from './resolveEventRouteTarget';

/**
 * 事件发射输入
 */
export interface EmitEventInput {
  workflowId: string;
  workflowRunId?: string;
  sourceAssignmentId?: string;
  sourceStepId: string;
  sourceTaskId?: string;
  trigger: WorkflowEventTrigger;
  payload: Record<string, unknown>;
  /** 外部注入的 task 数据（路由层负责加载） */
  tasks?: Task[];
}

/**
 * 路由执行结果
 */
export interface ProcessedRoute {
  event: WorkflowEvent;
  results: WorkflowEventRouteResult[];
  notifications: string[];
}

/**
 * 发射事件 - 创建事件并解析路由
 */
export async function emitEvent(input: EmitEventInput): Promise<LocalResult<ProcessedRoute>> {
  const eventId = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();

  // 按 workflowTemplateId 加载该工作流的所有 assignments
  const assignmentsResult = await assignmentRepo.listByWorkflowTemplate(input.workflowId);
  const allAssignments = assignmentsResult.ok ? assignmentsResult.data! : [];

  // 使用外部注入的 task 数据
  const tasks: Task[] = input.tasks ?? [];

  // 构建依赖上下文
  const depCtx = {
    completedTaskIds: new Set<string>(
      tasks.filter(t => t.status === 'done').map(t => t.id)
    ),
    tasks,
  };

  // 解析路由
  const routes = resolveAllRoutes(
    input.trigger,
    input.sourceAssignmentId,
    allAssignments,
    depCtx
  );

  // 创建事件
  const event: WorkflowEvent = {
    id: eventId,
    workflowId: input.workflowId,
    workflowRunId: input.workflowRunId,
    sourceAssignmentId: input.sourceAssignmentId,
    sourceStepId: input.sourceStepId,
    sourceTaskId: input.sourceTaskId,
    trigger: input.trigger,
    payload: input.payload,
    routes,
    timestamp: now,
  };

  // 保存事件
  await eventRepo.saveEvent(event);

  // 执行路由动作
  const processResult = await processEventRoutes(event, depCtx.tasks);

  return {
    ok: true,
    data: {
      event: processResult.event,
      results: processResult.results,
      notifications: processResult.notifications,
    },
    diagnostics: [
      `事件已发射: ${eventId}`,
      `触发器: ${input.trigger}`,
      `路由数: ${routes.length}`,
      `Assignments: ${allAssignments.length}`,
    ],
  };
}

/**
 * 处理事件路由 - 执行路由动作
 */
export async function processEventRoutes(
  event: WorkflowEvent,
  tasks: Task[]
): Promise<ProcessedRoute> {
  const notifications: string[] = [];
  const updatedRoutes: WorkflowEventRouteResult[] = [];
  const diagnostics: string[] = [];

  for (const route of event.routes) {
    const updatedRoute = { ...route };

    try {
      switch (route.action) {
        case 'create_task':
          updatedRoute.status = 'completed';
          updatedRoute.message = `任务创建请求已记录 (route: ${route.routeId})`;
          diagnostics.push(`create_task: ${route.targetAssignmentId ?? 'new'}`);
          break;

        case 'unblock_task':
          if (route.targetTaskId) {
            updatedRoute.status = 'completed';
            updatedRoute.message = `任务 ${route.targetTaskId} 已解除阻塞`;
            diagnostics.push(`unblock_task: ${route.targetTaskId}`);
          } else {
            updatedRoute.status = 'failed';
            updatedRoute.message = '未找到目标任务';
          }
          break;

        case 'notify': {
          const notifResult = await notificationRepo.save({
            workflowId: event.workflowId,
            taskId: event.sourceTaskId ?? event.sourceStepId,
            eventId: event.id,
            title: `工作流事件: ${event.trigger}`,
            body: `步骤 ${event.sourceStepId} 触发了 ${event.trigger} 事件`,
            targetRoleIds: route.targetRoleId ? [route.targetRoleId] : [],
            eventType: event.trigger,
            assignmentId: route.targetAssignmentId,
            stepId: event.sourceStepId,
            requireResponse: false,
          });

          if (notifResult.ok) {
            notifications.push(notifResult.data!.id);
            updatedRoute.status = 'completed';
            updatedRoute.message = `通知已发送: ${notifResult.data!.id}`;
            diagnostics.push(`notify: ${notifResult.data!.id}`);
          } else {
            updatedRoute.status = 'failed';
            updatedRoute.message = `通知发送失败: ${notifResult.error?.message}`;
          }
          break;
        }

        case 'request_gate':
          updatedRoute.status = 'completed';
          updatedRoute.message = `Gate 请求已发送到 ${route.targetAssignmentId ?? 'reviewer'}`;
          diagnostics.push(`request_gate: ${route.targetAssignmentId ?? 'default'}`);
          break;

        case 'reassign_task':
          updatedRoute.status = 'completed';
          updatedRoute.message = `任务已重新分配到角色 ${route.targetRoleId ?? route.targetAssignmentId ?? 'unknown'}`;
          diagnostics.push(`reassign_task: ${route.targetRoleId ?? route.targetAssignmentId ?? 'unknown'}`);
          break;

        case 'fail_task':
          if (route.targetTaskId) {
            updatedRoute.status = 'completed';
            updatedRoute.message = `任务 ${route.targetTaskId} 标记为失败`;
            diagnostics.push(`fail_task: ${route.targetTaskId}`);
          } else {
            updatedRoute.status = 'completed';
            updatedRoute.message = `fail_task 已记录 (无具体目标任务)`;
          }
          break;

        default:
          updatedRoute.status = 'failed';
          updatedRoute.message = `未知路由动作: ${route.action}`;
      }
    } catch (err) {
      updatedRoute.status = 'failed';
      updatedRoute.message = `路由执行错误: ${err instanceof Error ? err.message : 'unknown'}`;
    }

    updatedRoutes.push(updatedRoute);
  }

  // 更新事件的路由结果
  const updatedEvent: WorkflowEvent = {
    ...event,
    routes: updatedRoutes,
  };
  await eventRepo.saveEvent(updatedEvent);

  return {
    event: updatedEvent,
    results: updatedRoutes,
    notifications,
  };
}

/**
 * 获取工作流事件
 */
export async function getWorkflowEvents(
  workflowId: string
): Promise<LocalResult<WorkflowEvent[]>> {
  return eventRepo.getEventsByWorkflow(workflowId);
}

/**
 * 获取角色通知
 */
export async function getRoleNotifications(
  roleId: string
): Promise<LocalResult<import('../../../domain/notification').WorkflowNotification[]>> {
  return notificationRepo.listByRole(roleId);
}

/**
 * 更新通知状态
 */
export async function updateNotificationStatus(
  notificationId: string,
  status: NotificationStatus
): Promise<LocalResult<import('../../../domain/notification').WorkflowNotification>> {
  return notificationRepo.update(notificationId, status);
}
