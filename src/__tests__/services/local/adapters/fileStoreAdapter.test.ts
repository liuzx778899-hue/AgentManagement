import { describe, it, expect, beforeEach } from 'vitest';
import { FileStoreAdapter } from '../../../../services/local/adapters/fileStoreAdapter';
import type { AdapterConfig } from '../../../../types/localEngineering';

describe('FileStoreAdapter', () => {
  let adapter: FileStoreAdapter;
  const config: AdapterConfig = {
    enableMock: true,
    defaultTimeout: 30000,
    projectRoot: process.cwd(),
  };

  beforeEach(() => {
    adapter = new FileStoreAdapter(config);
  });

  it('should read JSON file in mock mode', async () => {
    const mockData = { test: 'value' };
    adapter.setMockData('test.json', mockData);

    const result = await adapter.readJson<{ test: string }>('test.json');

    expect(result.ok).toBe(true);
    expect(result.data?.test).toBe('value');
  });

  it('should write JSON file in mock mode', async () => {
    const result = await adapter.writeJson('test.json', { foo: 'bar' });

    expect(result.ok).toBe(true);
  });

  it('should check file existence', async () => {
    adapter.setMockData('exists.json', { data: 'test' });

    const result = await adapter.exists('exists.json');

    expect(result.ok).toBe(true);
    expect(result.data).toBe(true);
  });

  it('should return error for non-allowed path in real mode', async () => {
    const realAdapter = new FileStoreAdapter({
      ...config,
      enableMock: false,
    });

    const result = await realAdapter.readJson('/etc/passwd');

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('PERMISSION_DENIED');
  });

  it('should read text file in mock mode', async () => {
    adapter.setMockData('test.md', '# Test Content');

    const result = await adapter.readText('test.md');

    expect(result.ok).toBe(true);
    expect(result.data).toBe('# Test Content');
  });

  it('should write text file in mock mode', async () => {
    const result = await adapter.writeText('output.md', '# Output');

    expect(result.ok).toBe(true);
  });
});
