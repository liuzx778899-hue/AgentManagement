/**
 * Workbench Event Integration
 *
 * Runner 完成后生成 WorkflowEvent 并进行路由
 *
 * 这个模块是 #28 Runner 集成和 #30 事件驱动的桥梁
 *
 * 注意：此模块需要 #28 合并后才能完整工作
 */
import type { AgentRun } from '../../../domain/task';
import type { WorkflowEvent, WorkflowEventRouteResult } from '../../../domain/workflowEvent';
import type { WorkflowEventRoute, WorkflowEventTrigger, WorkflowEventRouteAction } from '../../../domain/workflowAssignment';

/**
 * Runner 完成后的上下文
 */
export interface RunnerCompletionContext {
  agentRun: AgentRun;
  exitCode: number;
  logs: string[];
  artifacts?: string[];
  // 额外上下文（需要从其他地方获取）
  workflowId?: string;
  stepId?: string;
  projectId?: string;
}

/**
 * 根据 Runner 完成状态生成 WorkflowEvent
 *
 * @param context Runner 完成上下文
 * @returns 生成的 WorkflowEvent 或 null
 */
export function generateEventFromRunnerCompletion(
  context: RunnerCompletionContext
): WorkflowEvent | null {
  const { agentRun, exitCode, logs, artifacts, workflowId, stepId, projectId } = context;

  // 根据退出码决定触发类型
  let trigger: WorkflowEventTrigger;

  if (exitCode === 0) {
    trigger = 'task_completed';
  } else if (exitCode === 125) {
    // Gate requested (自定义退出码)
    trigger = 'gate_requested';
  } else {
    trigger = 'task_failed';
  }

  // 构建事件
  const event: WorkflowEvent = {
    id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    workflowId: workflowId || '',
    workflowRunId: agentRun.id,
    sourceStepId: stepId || agentRun.currentStepId,
    sourceTaskId: agentRun.taskId,
    trigger,
    payload: {
      exitCode,
      lastLogs: logs.slice(-10),
      artifacts,
      modelName: agentRun.modelName,
      duration: agentRun.finishedAt
        ? new Date(agentRun.finishedAt).getTime() - new Date(agentRun.startedAt).getTime()
        : 0,
      projectId,
      roleId: agentRun.roleId,
    },
    routes: [],
    timestamp: new Date().toISOString(),
  };

  return event;
}

/**
 * 执行事件路由
 *
 * @param event 生成的 WorkflowEvent
 * @param routes 可用的 eventRoutes（来自 WorkflowAssignment）
 * @returns 路由结果列表
 */
export function executeEventRoutes(
  event: WorkflowEvent,
  routes: WorkflowEventRoute[]
): WorkflowEventRouteResult[] {
  const results: WorkflowEventRouteResult[] = [];

  for (const route of routes) {
    // 检查触发条件是否匹配
    if (route.trigger === event.trigger) {
      results.push({
        routeId: undefined,
        action: route.action as WorkflowEventRouteAction,
        targetAssignmentId: route.targetAssignmentId,
        targetRoleId: route.targetRoleId,
        status: 'completed',
        message: `事件已路由到 ${route.targetRoleId || route.targetAssignmentId || '目标'}`,
      });
    }
  }

  return results;
}

/**
 * 创建通知
 *
 * @param event 源事件
 * @param routeResult 路由结果
 * @returns 通知数据
 */
export function createNotificationFromEvent(
  event: WorkflowEvent,
  routeResult: WorkflowEventRouteResult
): {
  id: string;
  projectId: string;
  taskId: string;
  roleId: string;
  type: string;
  title: string;
  message: string;
  status: 'pending' | 'delivered' | 'consumed' | 'resolved';
  createdAt: string;
} {
  const notificationTypeMap: Record<string, string> = {
    'task_completed': 'handoff',
    'task_failed': 'bug_report',
    'gate_requested': 'gate_request',
    'change_requested': 'change_request',
    'bug_reported': 'bug_report',
    'handoff_requested': 'handoff',
    'gate_passed': 'gate_result',
    'gate_failed': 'gate_result',
    'task_blocked': 'blockage',
  };

  const titleMap: Record<string, string> = {
    'task_completed': '任务完成',
    'task_failed': '任务失败',
    'gate_requested': 'Gate 决策请求',
    'change_requested': '变更请求',
    'bug_reported': 'BUG 报告',
    'handoff_requested': '工作交接',
    'gate_passed': 'Gate 通过',
    'gate_failed': 'Gate 失败',
    'task_blocked': '任务阻塞',
  };

  const trigger = event.trigger as string;
  const projectId = (event.payload.projectId as string) || '';
  const taskId = event.sourceTaskId || '';

  return {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    projectId,
    taskId,
    roleId: routeResult.targetRoleId || '',
    type: notificationTypeMap[trigger] || 'unknown',
    title: titleMap[trigger] || '事件通知',
    message: routeResult.message || '',
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
}
