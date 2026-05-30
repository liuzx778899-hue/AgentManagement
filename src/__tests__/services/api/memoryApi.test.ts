/**
 * Tests for Memory API client
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { memoryApi } from '../../../services/api/memoryApi';
import * as client from '../../../services/api/client';

// Mock the client module
vi.mock('../../../services/api/client', () => ({
  apiCall: vi.fn(),
  checkServerAvailable: vi.fn(),
  resetServerAvailability: vi.fn(),
}));

describe('Memory API', () => {
  const mockApiCall = vi.mocked(client.apiCall);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockMemory = {
    id: 'mem-1',
    kind: 'project' as const,
    scope: 'project' as const,
    projectId: 'proj-1',
    roleId: null,
    taskId: null,
    title: 'Test Memory',
    body: 'Test content',
    citation: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  describe('list', () => {
    it('should call GET /memory with projectId', async () => {
      mockApiCall.mockResolvedValueOnce({ ok: true, data: [mockMemory] });

      const result = await memoryApi.list('proj-1');

      expect(mockApiCall).toHaveBeenCalledWith('GET', '/memory?projectId=proj-1');
      expect(result).toEqual({ ok: true, data: [mockMemory] });
    });
  });

  describe('create', () => {
    it('should call POST /memory with input', async () => {
      const input = {
        kind: 'project' as const,
        scope: 'project' as const,
        projectId: 'proj-1',
        title: 'New Memory',
        body: 'Content',
      };
      mockApiCall.mockResolvedValueOnce({ ok: true, data: mockMemory });

      const result = await memoryApi.create(input);

      expect(mockApiCall).toHaveBeenCalledWith('POST', '/memory', input);
      expect(result).toEqual({ ok: true, data: mockMemory });
    });
  });

  describe('update', () => {
    it('should call PUT /memory/:id with input', async () => {
      const input = { title: 'Updated Title' };
      mockApiCall.mockResolvedValueOnce({ ok: true, data: mockMemory });

      const result = await memoryApi.update('mem-1', input);

      expect(mockApiCall).toHaveBeenCalledWith('PUT', '/memory/mem-1', input);
      expect(result).toEqual({ ok: true, data: mockMemory });
    });
  });

  describe('delete', () => {
    it('should call DELETE /memory/:id', async () => {
      mockApiCall.mockResolvedValueOnce({ ok: true });

      const result = await memoryApi.delete('mem-1');

      expect(mockApiCall).toHaveBeenCalledWith('DELETE', '/memory/mem-1');
      expect(result).toEqual({ ok: true });
    });
  });

  describe('search', () => {
    it('should call GET /memory/search with keyword', async () => {
      mockApiCall.mockResolvedValueOnce({ ok: true, data: [mockMemory] });

      const result = await memoryApi.search('test');

      expect(mockApiCall).toHaveBeenCalledWith(
        'GET',
        '/memory/search?keyword=test'
      );
      expect(result).toEqual({ ok: true, data: [mockMemory] });
    });

    it('should include projectId when provided', async () => {
      mockApiCall.mockResolvedValueOnce({ ok: true, data: [mockMemory] });

      const result = await memoryApi.search('test', 'proj-1');

      expect(mockApiCall).toHaveBeenCalledWith(
        'GET',
        '/memory/search?keyword=test&projectId=proj-1'
      );
    });

    it('should encode special characters in keyword', async () => {
      mockApiCall.mockResolvedValueOnce({ ok: true, data: [] });

      await memoryApi.search('test query with spaces');

      expect(mockApiCall).toHaveBeenCalledWith(
        'GET',
        '/memory/search?keyword=test%20query%20with%20spaces'
      );
    });
  });
});