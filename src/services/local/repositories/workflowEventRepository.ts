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
