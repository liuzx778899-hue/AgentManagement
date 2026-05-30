import { describe, it, expect, beforeEach } from 'vitest';
import { LlmAdapter } from '../../../../services/local/adapters/llmAdapter';
import type { AdapterConfig } from '../../../../types/localEngineering';

describe('LlmAdapter', () => {
  let adapter: LlmAdapter;
  const config: AdapterConfig = {
    enableMock: true,
    defaultTimeout: 60000, // LLM calls take longer
    projectRoot: process.cwd(),
  };

  beforeEach(() => {
    adapter = new LlmAdapter(config);
  });

  describe('complete', () => {
    it('should return mock response in mock mode', async () => {
      const result = await adapter.complete({
        messages: [
          { role: 'user', content: 'Hello' },
        ],
        model: 'claude-3-sonnet',
      });

      expect(result.ok).toBe(true);
      expect(result.data?.content).toBeDefined();
    });

    it('should handle system prompt', async () => {
      const result = await adapter.complete({
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hello' },
        ],
        model: 'claude-3-sonnet',
      });

      expect(result.ok).toBe(true);
    });

    it('should respect maxTokens', async () => {
      const result = await adapter.complete({
        messages: [{ role: 'user', content: 'Test' }],
        model: 'claude-3-sonnet',
        maxTokens: 100,
      });

      expect(result.ok).toBe(true);
    });
  });

  describe('validateModel', () => {
    it('should validate model in mock mode', async () => {
      const result = await adapter.validateModel('claude-3-sonnet');

      expect(result.ok).toBe(true);
      expect(result.data?.valid).toBe(true);
    });
  });

  describe('listModels', () => {
    it('should list available models', async () => {
      adapter.setMockData('models', [
        { id: 'claude-3-opus', name: 'Claude 3 Opus' },
        { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet' },
      ]);

      const result = await adapter.listModels('anthropic');

      expect(result.ok).toBe(true);
      expect(result.data?.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('countTokens', () => {
    it('should estimate token count', async () => {
      const result = await adapter.countTokens('This is a test message.');

      expect(result.ok).toBe(true);
      expect(result.data?.count).toBeGreaterThan(0);
    });
  });

  describe('validateApiKey', () => {
    it('should validate API key in mock mode', async () => {
      const result = await adapter.validateApiKey('anthropic', 'sk-test-key');

      expect(result.ok).toBe(true);
      expect(result.data?.valid).toBe(true);
    });
  });

  describe('streamComplete', () => {
    it('should return async iterator in mock mode', async () => {
      const result = await adapter.streamComplete({
        messages: [{ role: 'user', content: 'Test' }],
        model: 'claude-3-sonnet',
      });

      expect(result.ok).toBe(true);

      // Collect chunks
      const chunks: string[] = [];
      for await (const chunk of result.data!) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
    });
  });
});