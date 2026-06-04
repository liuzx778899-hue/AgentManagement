/**
 * Agent Service Route Integration Tests
 *
 * 测试 Agent Service API 在真实 Express app 中的挂载和可访问性
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import { createRouter } from '../../../server/routes/index';

describe('Agent Service Route Integration', () => {
  let app: express.Application;
  let server: Server;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api', createRouter());
    server = app.listen(0); // 随机端口
  });

  afterAll(() => {
    server.close();
  });

  describe('GET /api/v1/health', () => {
    it('should return healthy status', async () => {
      const response = await fetch(`http://localhost:${(server.address() as any).port}/api/v1/health`);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('healthy');
    });
  });

  describe('POST /api/v1/tasks', () => {
    it('should create a task', async () => {
      const response = await fetch(`http://localhost:${(server.address() as any).port}/api/v1/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: 'test-project',
          goal: 'Test task goal',
        }),
      });
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(data.data.projectId).toBe('test-project');
      expect(data.data.goal).toBe('Test task goal');
      expect(data.data.status).toBe('queued');
    });
  });

  describe('GET /api/v1/tasks', () => {
    it('should list tasks', async () => {
      const response = await fetch(`http://localhost:${(server.address() as any).port}/api/v1/tasks`);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('should filter tasks by status', async () => {
      const response = await fetch(
        `http://localhost:${(server.address() as any).port}/api/v1/tasks?status=queued`
      );
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.ok).toBe(true);
      // 所有返回的任务应该都是 queued 状态
      for (const task of data.data) {
        expect(task.status).toBe('queued');
      }
    });
  });

  describe('Task lifecycle', () => {
    let taskId: string;

    it('should create, start, and get task', async () => {
      // Create task
      const createResponse = await fetch(
        `http://localhost:${(server.address() as any).port}/api/v1/tasks`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: 'lifecycle-test',
            goal: 'Lifecycle test task',
          }),
        }
      );
      expect(createResponse.status).toBe(201);
      const createData = await createResponse.json();
      taskId = createData.data.id;

      // Get task
      const getResponse = await fetch(
        `http://localhost:${(server.address() as any).port}/api/v1/tasks/${taskId}`
      );
      expect(getResponse.status).toBe(200);
      const getData = await getResponse.json();
      expect(getData.data.id).toBe(taskId);
      expect(getData.data.status).toBe('queued');
    });

    it('should get task logs', async () => {
      const response = await fetch(
        `http://localhost:${(server.address() as any).port}/api/v1/tasks/${taskId}/logs`
      );
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(Array.isArray(data.logs)).toBe(true);
    });

    it('should get task events', async () => {
      const response = await fetch(
        `http://localhost:${(server.address() as any).port}/api/v1/tasks/${taskId}/events`
      );
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(Array.isArray(data.events)).toBe(true);
    });
  });

  describe('GET /api/v1/statistics', () => {
    it('should return statistics', async () => {
      const response = await fetch(
        `http://localhost:${(server.address() as any).port}/api/v1/statistics`
      );
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(typeof data.data.tasks.total).toBe('number');
      expect(typeof data.data.runs.total).toBe('number');
      expect(typeof data.data.runs.active).toBe('number');
      expect(typeof data.data.runs.completed).toBe('number');
    });
  });
});
