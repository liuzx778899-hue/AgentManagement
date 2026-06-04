/**
 * Event Log Service - 事件日志管理
 *
 * Issue: #33
 */

import type { EventLog } from '../../domain/task';

// 内存存储
const eventLogs = new Map<string, EventLog>();

/**
 * 记录事件
 */
export function logEvent(event: Omit<EventLog, 'id' | 'timestamp'>): EventLog {
  const id = `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const entry: EventLog = {
    ...event,
    id,
    timestamp: new Date().toISOString(),
  };
  eventLogs.set(id, entry);
  return entry;
}

/**
 * 获取任务的所有事件
 */
export function getTaskEvents(taskId: string): EventLog[] {
  return Array.from(eventLogs.values())
    .filter(e => e.taskId === taskId)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

/**
 * 获取运行的所有事件
 */
export function getRunEvents(runId: string): EventLog[] {
  return Array.from(eventLogs.values())
    .filter(e => e.runId === runId)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

/**
 * 获取所有事件
 */
export function getAllEvents(): EventLog[] {
  return Array.from(eventLogs.values())
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}