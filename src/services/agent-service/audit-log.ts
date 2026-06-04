/**
 * Audit Log Service - 审计日志管理
 *
 * Issue: #33
 */

import type { AuditEntry } from '../../domain/task';

// 内存存储
const auditEntries = new Map<string, AuditEntry>();

/**
 * 记录审计日志
 */
export function logAudit(entry: Omit<AuditEntry, 'id' | 'timestamp'>): AuditEntry {
  const id = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const record: AuditEntry = {
    ...entry,
    id,
    timestamp: new Date().toISOString(),
  };
  auditEntries.set(id, record);
  return record;
}

/**
 * 获取资源的审计日志
 */
export function getResourceAudit(resourceId: string): AuditEntry[] {
  return Array.from(auditEntries.values())
    .filter(e => e.resourceId === resourceId)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

/**
 * 获取所有审计日志
 */
export function getAllAudit(): AuditEntry[] {
  return Array.from(auditEntries.values())
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}