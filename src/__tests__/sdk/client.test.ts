/**
 * SDK Client Tests
 *
 * Issue: #34 - Request headers support
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AgentManagementClient, createClient, AgentManagementError } from '../../sdk/client';

describe('AgentManagementClient', () => {
  let client: AgentManagementClient;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;

    client = createClient({
      baseUrl: 'http://localhost:3000',
      apiKey: 'test-api-key',
      tenantId: 'tenant-123',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create client with required config', () => {
      const c = createClient({ baseUrl: 'http://localhost:3000' });
      expect(c).toBeInstanceOf(AgentManagementClient);
    });

    it('should accept tenantId in config', () => {
      const c = createClient({
        baseUrl: 'http://localhost:3000',
        tenantId: 'tenant-456',
      });
      expect(c).toBeInstanceOf(AgentManagementClient);
    });

    it('should accept custom headers in config', () => {
      const c = createClient({
        baseUrl: 'http://localhost:3000',
        headers: { 'X-Custom-Header': 'custom-value' },
      });
      expect(c).toBeInstanceOf(AgentManagementClient);
    });
  });

  describe('request headers', () => {
    it('should send X-Request-Id header', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 'task-1' } }),
      });

      await client.tasks.get('task-1');

      const call = fetchMock.mock.calls[0];
      const headers = call[1].headers;

      expect(headers['X-Request-Id']).toBeDefined();
      expect(headers['X-Request-Id']).toMatch(/^req-\d+-[a-z0-9]+$/);
    });

    it('should send X-API-Key header when apiKey is provided', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 'task-1' } }),
      });

      await client.tasks.get('task-1');

      const call = fetchMock.mock.calls[0];
      const headers = call[1].headers;

      expect(headers['X-API-Key']).toBe('test-api-key');
    });

    it('should send X-Tenant-Id header when tenantId is provided', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 'task-1' } }),
      });

      await client.tasks.get('task-1');

      const call = fetchMock.mock.calls[0];
      const headers = call[1].headers;

      expect(headers['X-Tenant-Id']).toBe('tenant-123');
    });

    it('should send custom headers from config', async () => {
      const customClient = createClient({
        baseUrl: 'http://localhost:3000',
        headers: { 'X-Custom-Header': 'custom-value' },
      });

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 'task-1' } }),
      });

      await customClient.tasks.get('task-1');

      const call = fetchMock.mock.calls[0];
      const headers = call[1].headers;

      expect(headers['X-Custom-Header']).toBe('custom-value');
    });

    it('should use user-provided X-Request-Id if present in headers', async () => {
      const customClient = createClient({
        baseUrl: 'http://localhost:3000',
        headers: { 'X-Request-Id': 'custom-request-id' },
      });

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 'task-1' } }),
      });

      await customClient.tasks.get('task-1');

      const call = fetchMock.mock.calls[0];
      const headers = call[1].headers;

      expect(headers['X-Request-Id']).toBe('custom-request-id');
    });
  });

  describe('tasks.create with idempotencyKey', () => {
    it('should send X-Idempotency-Key header when idempotencyKey is provided', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            id: 'task-1',
            projectId: 'proj-1',
            goal: 'Test goal',
            acceptanceCriteria: [],
            status: 'queued',
            activeRunId: null,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        }),
      });

      await client.tasks.create(
        { projectId: 'proj-1', goal: 'Test goal' },
        { idempotencyKey: 'idem-key-123' }
      );

      const call = fetchMock.mock.calls[0];
      const headers = call[1].headers;

      expect(headers['X-Idempotency-Key']).toBe('idem-key-123');
    });

    it('should not send X-Idempotency-Key header when idempotencyKey is not provided', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            id: 'task-1',
            projectId: 'proj-1',
            goal: 'Test goal',
            acceptanceCriteria: [],
            status: 'queued',
            activeRunId: null,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        }),
      });

      await client.tasks.create({ projectId: 'proj-1', goal: 'Test goal' });

      const call = fetchMock.mock.calls[0];
      const headers = call[1].headers;

      expect(headers['X-Idempotency-Key']).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should throw AgentManagementError on non-ok response', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Task not found' }),
      });

      await expect(client.tasks.get('nonexistent')).rejects.toThrow(AgentManagementError);
    });

    it('should include error message from response', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Task not found' }),
      });

      await expect(client.tasks.get('nonexistent')).rejects.toThrow('Task not found');
    });

    it('should include status code in error', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal server error' }),
      });

      try {
        await client.tasks.get('task-1');
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as AgentManagementError).statusCode).toBe(500);
      }
    });
  });
});
