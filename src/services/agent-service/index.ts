/**
 * Agent Service - AgentManagement Agent Service MVP
 *
 * Agent Service 是后端运行时，负责：
 * - Agent 注册与配置
 * - Task 队列与任务状态
 * - Runner Session 生命周期
 * - 事件投递与审计日志
 * - 对外 REST API
 *
 * Issue: #32 #33 #34
 */

export * from './task-service';
