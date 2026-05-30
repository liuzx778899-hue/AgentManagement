import { resolve, normalize, relative } from 'path';

/**
 * 敏感数据正则表达式
 */
const SENSITIVE_PATTERNS = [
  // API Keys
  { pattern: /sk-[a-zA-Z0-9]{20,}/g, replacement: '[REDACTED-API-KEY]' },
  { pattern: /sk-ant-[a-zA-Z0-9-]{20,}/g, replacement: '[REDACTED-ANTHROPIC-KEY]' },
  { pattern: /ghp_[a-zA-Z0-9]{36}/g, replacement: '[REDACTED-GITHUB-TOKEN]' },
  { pattern: /gho_[a-zA-Z0-9]{36}/g, replacement: '[REDACTED-GITHUB-TOKEN]' },
  { pattern: /ghu_[a-zA-Z0-9]{36}/g, replacement: '[REDACTED-GITHUB-TOKEN]' },
  { pattern: /ghs_[a-zA-Z0-9]{36}/g, replacement: '[REDACTED-GITHUB-TOKEN]' },
  { pattern: /ghr_[a-zA-Z0-9]{36}/g, replacement: '[REDACTED-GITHUB-TOKEN]' },
  // OpenAI
  { pattern: /sk-[a-zA-Z0-9]{48}/g, replacement: '[REDACTED-OPENAI-KEY]' },
  // Passwords in URLs
  { pattern: /:([^:@]+)@/g, replacement: ':[REDACTED]@' },
  // Password in params
  { pattern: /(password|passwd|pwd|token|secret|key)\s*[=:]\s*['"]?[^'"\s]+['"]?/gi,
    replacement: '$1=[REDACTED]' },
  // Bearer tokens
  { pattern: /Bearer\s+[a-zA-Z0-9_-]+/gi, replacement: 'Bearer [REDACTED]' },
  // JWT tokens
  { pattern: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,
    replacement: '[REDACTED-JWT]' },
];

/**
 * 脱敏日志内容
 */
export function sanitizeLog(content: string): string {
  let sanitized = content;

  for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, replacement);
  }

  return sanitized;
}

/**
 * 路径验证结果
 */
export interface PathValidationResult {
  valid: boolean;
  reason?: string;
  resolvedPath?: string;
}

/**
 * 验证路径是否在允许范围内
 */
export function validatePath(
  targetPath: string,
  allowedRoot: string
): PathValidationResult {
  try {
    const normalizedTarget = normalize(resolve(targetPath));
    const normalizedRoot = normalize(resolve(allowedRoot));

    // 检查路径是否在允许目录内
    const relativePath = relative(normalizedRoot, normalizedTarget);

    if (relativePath.startsWith('..') || relativePath.startsWith('/')) {
      return {
        valid: false,
        reason: `路径 "${targetPath}" 不在允许范围内: ${allowedRoot}`,
      };
    }

    return {
      valid: true,
      resolvedPath: normalizedTarget,
    };
  } catch (error) {
    return {
      valid: false,
      reason: `无效路径: ${targetPath}`,
    };
  }
}

/**
 * 命令白名单
 */
const COMMAND_WHITELIST = new Set([
  // Node.js
  'npm',
  'npx',
  'node',
  'yarn',
  'pnpm',
  // Git
  'git',
  // Build tools
  'vite',
  'webpack',
  'tsc',
  'esbuild',
  // AI CLIs
  'claude',
  'codex',
  'cursor',
  'gemini',
  // Testing
  'vitest',
  'jest',
  // Others
  'ls',
  'cat',
  'echo',
  'pwd',
  'which',
]);

/**
 * 检查命令是否允许
 */
export function isCommandAllowed(command: string): boolean {
  // 提取命令名（去除路径）
  const cmdName = command.split(/[/\\]/).pop()?.toLowerCase() ?? command;

  // Windows: 去除 .exe 后缀
  const cmdWithoutExt = cmdName.replace(/\.exe$/i, '');

  return COMMAND_WHITELIST.has(cmdWithoutExt);
}

/**
 * 添加命令到白名单
 */
export function addToCommandWhitelist(command: string): void {
  COMMAND_WHITELIST.add(command.toLowerCase());
}

/**
 * 高风险操作类型
 */
const HIGH_RISK_OPERATIONS = new Set([
  'delete-worktree',
  'delete-branch',
  'force-push',
  'push',
  'execute-shell',
  'overwrite-file',
  'delete-file',
  'write-config',
  'reset-hard',
]);

/**
 * 操作风险评估结果
 */
export interface OperationRiskResult {
  highRisk: boolean;
  confirmationRequired: boolean;
  reason?: string;
}

/**
 * 评估操作风险
 */
export function confirmHighRiskOperation(operation: {
  type: string;
  target: string;
  details?: unknown;
}): OperationRiskResult {
  const { type, target } = operation;

  if (HIGH_RISK_OPERATIONS.has(type)) {
    return {
      highRisk: true,
      confirmationRequired: true,
      reason: `高风险操作: ${type} -> ${target}`,
    };
  }

  // 检查是否涉及敏感目标
  const sensitiveTargets = ['main', 'master', 'production', 'prod', '.env'];
  if (sensitiveTargets.some(t => target.toLowerCase().includes(t))) {
    return {
      highRisk: true,
      confirmationRequired: true,
      reason: `涉及敏感目标: ${target}`,
    };
  }

  return {
    highRisk: false,
    confirmationRequired: false,
  };
}

/**
 * 审计日志条目
 */
export interface AuditLogEntry {
  timestamp: string;
  type: string;
  operation: string;
  target: string;
  user: string;
  result: 'success' | 'failure' | 'pending';
  details?: unknown;
  error?: string;
}

/**
 * 审计日志查询选项
 */
export interface AuditLogQuery {
  type?: string;
  startTime?: string;
  endTime?: string;
  user?: string;
  result?: 'success' | 'failure' | 'pending';
}

/**
 * 审计日志记录器
 */
export class AuditLogger {
  private logs: AuditLogEntry[] = [];
  private maxLogs: number = 10000;

  /**
   * 记录操作日志
   */
  async log(entry: AuditLogEntry): Promise<void> {
    // 脱敏 details
    let sanitizedDetails = entry.details;
    if (typeof entry.details === 'string') {
      sanitizedDetails = sanitizeLog(entry.details);
    } else if (entry.details && typeof entry.details === 'object') {
      sanitizedDetails = JSON.parse(sanitizeLog(JSON.stringify(entry.details)));
    }

    const logEntry: AuditLogEntry = {
      ...entry,
      details: sanitizedDetails,
    };

    this.logs.push(logEntry);

    // 限制日志数量
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  /**
   * 获取日志
   */
  async getLogs(query?: AuditLogQuery): Promise<AuditLogEntry[]> {
    let filtered = [...this.logs];

    if (query?.type) {
      filtered = filtered.filter(l => l.type === query.type);
    }

    if (query?.user) {
      filtered = filtered.filter(l => l.user === query.user);
    }

    if (query?.result) {
      filtered = filtered.filter(l => l.result === query.result);
    }

    if (query?.startTime) {
      const start = new Date(query.startTime).getTime();
      filtered = filtered.filter(l => new Date(l.timestamp).getTime() >= start);
    }

    if (query?.endTime) {
      const end = new Date(query.endTime).getTime();
      filtered = filtered.filter(l => new Date(l.timestamp).getTime() <= end);
    }

    return filtered;
  }

  /**
   * 清除日志
   */
  async clear(): Promise<void> {
    this.logs = [];
  }

  /**
   * 导出日志
   */
  async export(): Promise<string> {
    return JSON.stringify(this.logs, null, 2);
  }
}

// 全局审计日志实例
export const auditLogger = new AuditLogger();
