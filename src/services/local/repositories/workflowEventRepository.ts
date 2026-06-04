import type { LocalResult } from '../../../types/localEngineering';
import type { WorkflowEvent } from '../../../domain/workflowEvent';

/**
 * WorkflowEvent Repository
 *
 * 内存存储，负责 WorkflowEvent 的持久化操作
 */
const events = new Map<string, WorkflowEvent>();

/**
 * 保存事件
 */
export async function saveEvent(event: WorkflowEvent): Promise<LocalResult<WorkflowEvent>> {
  events.set(event.id, event);

  return {
    ok: true,
    data: event,
    diagnostics: [`事件已保存: ${event.id}`],
  };
}

/**
 * 按任务 ID 获取事件
 */
export async function getEventsByTask(taskId: string): Promise<LocalResult<WorkflowEvent[]>> {
  const result = Array.from(events.values()).filter(e => e.sourceTaskId === taskId);

  return {
    ok: true,
    data: result,
  };
}

/**
 * 按工作流 ID 获取事件
 */
export async function getEventsByWorkflow(workflowId: string): Promise<LocalResult<WorkflowEvent[]>> {
  const result = Array.from(events.values()).filter(e => e.workflowId === workflowId);

  return {
    ok: true,
    data: result,
  };
}

/**
 * 获取所有事件
 */
export async function getAllEvents(): Promise<LocalResult<WorkflowEvent[]>> {
  return {
    ok: true,
    data: Array.from(events.values()),
  };
}

/**
 * 按 ID 加载单个事件
 */
export async function getEventById(eventId: string): Promise<LocalResult<WorkflowEvent>> {
  const event = events.get(eventId);

  if (!event) {
    return {
      ok: false,
      error: {
        code: 'EVENT_NOT_FOUND',
        message: `事件不存在: ${eventId}`,
        recoverable: false,
      },
    };
  }

  return {
    ok: true,
    data: event,
  };
}

/**
 * 清空所有事件（仅用于测试）
 */
export function clear(): void {
  events.clear();
}
