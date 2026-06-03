/**
 * Audit Log Service - 审计日志服务
 *
 * Issue: #33
 */

import type {
  AuditEntry,
  AuditEventType,
  AuditResult,
  AuditSeverity,
  AuditActor,
  AuditResource,
  AuditChange,
  CreateAuditEntryRequest,
  AuditFilter,
  AuditLogConfig,
} from '../../../domain/audit';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Audit Log Service - 不可变操作与决策记录
 */
export class AuditLogService {
  private entries: Map<string, AuditEntry> = new Map();
  private auditLogPath?: string;
  private config: AuditLogConfig;

  constructor(config?: Partial<AuditLogConfig>) {
    this.config = {
      enabled: true,
      retentionDays: 90,
      storage: 'file',
      logSensitiveFields: false,
      sensitiveFields: ['password', 'apiKey', 'secret', 'token'],
      ...config,
    };

    if (this.config.storage === 'file' && this.config.filePath) {
      this.auditLogPath = this.config.filePath;
      this.ensureLogDirectory();
    }
  }

  /**
   * 记录审计条目
   */
  async log(request: CreateAuditEntryRequest): Promise<AuditEntry> {
    if (!this.config.enabled) {
      throw new Error('Audit logging is disabled');
    }

    const id = this.generateId();
    const now = request.timestamp || new Date().toISOString();

    // 脱敏处理
    const sanitizedRequest = this.sanitizeRequest(request);

    const entry: AuditEntry = {
      id,
      eventType: sanitizedRequest.eventType,
      timestamp: now,
      result: sanitizedRequest.result,
      severity: sanitizedRequest.severity || this.inferSeverity(sanitizedRequest),
      actor: sanitizedRequest.actor,
      resource: sanitizedRequest.resource,
      targetResource: sanitizedRequest.targetResource,
      changes: sanitizedRequest.changes,
      projectId: sanitizedRequest.projectId,
      taskId: sanitizedRequest.taskId,
      workflowInstanceId: sanitizedRequest.workflowInstanceId,
      agentRunId: sanitizedRequest.agentRunId,
      runnerSessionId: sanitizedRequest.runnerSessionId,
      description: sanitizedRequest.description,
      detail: sanitizedRequest.detail,
      error: sanitizedRequest.error,
      durationMs: sanitizedRequest.durationMs,
      requestId: sanitizedRequest.requestId,
      source: sanitizedRequest.source,
      clientInfo: sanitizedRequest.clientInfo,
      metadata: sanitizedRequest.metadata,
    };

    // 内存存储
    this.entries.set(id, entry);

    // 文件追加
    if (this.config.storage === 'file' && this.auditLogPath) {
      await this.appendToFile(entry);
    }

    return entry;
  }

  /**
   * 获取审计条目
   */
  get(id: string): AuditEntry | undefined {
    return this.entries.get(id);
  }

  /**
   * 查询审计条目
   */
  query(filter?: AuditFilter): AuditEntry[] {
    let entries = Array.from(this.entries.values());

    if (filter) {
      if (filter.eventType) {
        const types = Array.isArray(filter.eventType) ? filter.eventType : [filter.eventType];
        entries = entries.filter(e => types.includes(e.eventType));
      }
      if (filter.result) {
        const results = Array.isArray(filter.result) ? filter.result : [filter.result];
        entries = entries.filter(e => results.includes(e.result));
      }
      if (filter.severity) {
        const severities = Array.isArray(filter.severity) ? filter.severity : [filter.severity];
        entries = entries.filter(e => severities.includes(e.severity!));
      }
      if (filter.actorId) {
        entries = entries.filter(e => e.actor.id === filter.actorId);
      }
      if (filter.projectId) {
        entries = entries.filter(e => e.projectId === filter.projectId);
      }
      if (filter.taskId) {
        entries = entries.filter(e => e.taskId === filter.taskId);
      }
      if (filter.timestampAfter) {
        entries = entries.filter(e => e.timestamp >= filter.timestampAfter!);
      }
      if (filter.timestampBefore) {
        entries = entries.filter(e => e.timestamp <= filter.timestampBefore!);
      }
    }

    // 按时间倒序排列
    return entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  /**
   * 获取审计统计
   */
  getStatistics(): {
    total: number;
    byEventType: Record<string, number>;
    byResult: Record<string, number>;
    bySeverity: Record<string, number>;
    byActorType: Record<string, number>;
  } {
    const entries = Array.from(this.entries.values());
    const byEventType: Record<string, number> = {};
    const byResult: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const byActorType: Record<string, number> = {};

    for (const entry of entries) {
      byEventType[entry.eventType] = (byEventType[entry.eventType] || 0) + 1;
      byResult[entry.result] = (byResult[entry.result] || 0) + 1;
      bySeverity[entry.severity!] = (bySeverity[entry.severity!] || 0) + 1;
      byActorType[entry.actor.type] = (byActorType[entry.actor.type] || 0) + 1;
    }

    return {
      total: entries.length,
      byEventType,
      byResult,
      bySeverity,
      byActorType,
    };
  }

  /**
   * 清理过期审计条目
   */
  cleanupExpired(): number {
    const now = Date.now();
    const maxAgeMs = this.config.retentionDays * 24 * 60 * 60 * 1000;
    let cleaned = 0;

    for (const [id, entry] of this.entries) {
      const age = now - new Date(entry.timestamp).getTime();
      if (age > maxAgeMs) {
        this.entries.delete(id);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * 导出审计日志
   */
  async export(filter?: AuditFilter): Promise<string> {
    const entries = this.query(filter);
    return JSON.stringify(entries, null, 2);
  }

  /**
   * 脱敏处理
   */
  private sanitizeRequest(request: CreateAuditEntryRequest): CreateAuditEntryRequest {
    if (this.config.logSensitiveFields) {
      return request;
    }

    const sanitized = JSON.parse(JSON.stringify(request));

    // 递归脱敏敏感字段
    const sanitizeObject = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;

      for (const key of Object.keys(obj)) {
        if (this.config.sensitiveFields?.includes(key.toLowerCase())) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object') {
          sanitizeObject(obj[key]);
        }
      }
    };

    sanitizeObject(sanitized);
    return sanitized;
  }

  /**
   * 推断严重程度
   */
  private inferSeverity(request: CreateAuditEntryRequest): AuditSeverity {
    if (request.result === 'failure' || request.result === 'denied') {
      return 'error';
    }
    if (request.result === 'partial') {
      return 'warning';
    }
    if (request.eventType.startsWith('auth.') || request.eventType.startsWith('system.')) {
      return 'info';
    }
    return 'info';
  }

  /**
   * 追加到文件
   */
  private async appendToFile(entry: AuditEntry): Promise<void> {
    if (!this.auditLogPath) return;

    const line = JSON.stringify(entry) + '\n';
    await fs.promises.appendFile(this.auditLogPath, line, 'utf-8');
  }

  /**
   * 确保日志目录存在
   */
  private ensureLogDirectory(): void {
    if (!this.auditLogPath) return;

    const dir = path.dirname(this.auditLogPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// 单例实例
export const auditLogService = new AuditLogService();