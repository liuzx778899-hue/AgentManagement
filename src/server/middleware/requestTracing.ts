/**
 * Request Tracing Middleware
 *
 * 解析并使用请求头：
 * - X-Request-Id: 请求追踪 ID
 * - X-Idempotency-Key: 幂等键（防止重复创建）
 * - X-Tenant-Id: 多租户隔离
 */

import { Request, Response, NextFunction } from 'express';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      idempotencyKey?: string;
      tenantId?: string;
    }
  }
}

/**
 * 生成请求 ID
 */
function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 请求追踪中间件
 *
 * 解析请求头并附加到 req 对象：
 * - req.requestId: 请求追踪 ID（自动生成或使用客户端提供的）
 * - req.idempotencyKey: 幂等键
 * - req.tenantId: 租户 ID
 */
export function requestTracing(req: Request, _res: Response, next: NextFunction): void {
  // 请求 ID：使用客户端提供的或生成新的
  req.requestId = (req.headers['x-request-id'] as string) || generateRequestId();

  // 幂等键：用于防止重复创建
  req.idempotencyKey = req.headers['x-idempotency-key'] as string | undefined;

  // 租户 ID：多租户隔离
  req.tenantId = req.headers['x-tenant-id'] as string | undefined;

  // 将请求 ID 添加到响应头，便于追踪
  _res.setHeader('X-Request-Id', req.requestId);

  next();
}

/**
 * 幂等性检查中间件（MVP 版本）
 *
 * 记录幂等键，后续可扩展为实际检查
 */
export function idempotencyCheck(req: Request, _res: Response, next: NextFunction): void {
  if (req.idempotencyKey) {
    // MVP: 仅记录日志
    console.log(`[Idempotency] Key: ${req.idempotencyKey}, Request: ${req.requestId}`);
    // TODO: 实现幂等性检查（使用 Redis 或内存存储）
    // 1. 检查 idempotencyKey 是否已处理
    // 2. 如果已处理，返回之前的响应
    // 3. 如果未处理，继续处理并存储结果
  }
  next();
}

/**
 * 租户隔离中间件
 *
 * 验证租户 ID 并附加到请求上下文
 */
export function tenantIsolation(req: Request, _res: Response, next: NextFunction): void {
  if (req.tenantId) {
    // MVP: 仅记录日志
    console.log(`[Tenant] ID: ${req.tenantId}, Request: ${req.requestId}`);
    // TODO: 实现租户隔离
    // 1. 验证租户 ID 有效性
    // 2. 附加租户上下文到服务层
    // 3. 在数据访问层自动过滤租户数据
  }
  next();
}