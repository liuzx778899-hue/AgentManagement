import { describe, it, expect, beforeEach } from 'vitest';
import { ProcessRunnerAdapter } from '../../../../services/local/adapters/processRunnerAdapter';
import type { AdapterConfig } from '../../../../types/localEngineering';

describe('ProcessRunnerAdapter', () => {
  let adapter: ProcessRunnerAdapter;
  const config: AdapterConfig = {
    enableMock: true,
    defaultTimeout: 30000,
    projectRoot: process.cwd(),
  };

  beforeEach(() => {
    adapter = new ProcessRunnerAdapter(config);
  });

  it('should start a mock process', async () => {
    const result = await adapter.start({
      runnerId: 'test-runner',
      command: 'echo',
      args: ['hello'],
      cwd: process.cwd(),
    });

    expect(result.ok).toBe(true);
    expect(result.data?.state).toBe('running');
  });

  it('should stop a mock process', async () => {
    const startResult = await adapter.start({
      runnerId: 'test-runner',
      command: 'sleep',
      args: ['10'],
      cwd: process.cwd(),
    });

    expect(startResult.ok).toBe(true);
    const processId = startResult.data!.id;

    const stopResult = await adapter.stop(processId);
    expect(stopResult.ok).toBe(true);
    expect(stopResult.data?.state).toBe('stopped');
  });

  it('should get process logs', async () => {
    const startResult = await adapter.start({
      runnerId: 'test-runner',
      command: 'echo',
      args: ['hello'],
      cwd: process.cwd(),
    });

    const processId = startResult.data!.id;
    const logsResult = await adapter.getLogs(processId);

    expect(logsResult.ok).toBe(true);
    expect(Array.isArray(logsResult.data)).toBe(true);
  });

  it('should list running processes', async () => {
    await adapter.start({
      runnerId: 'runner-1',
      command: 'sleep',
      args: ['10'],
      cwd: process.cwd(),
    });

    const result = await adapter.listProcesses();

    expect(result.ok).toBe(true);
    expect(result.data?.length).toBeGreaterThan(0);
  });

  it('should return error for non-existent process', async () => {
    const result = await adapter.getLogs('non-existent-id');

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('DIRECTORY_NOT_FOUND');
  });

  it('should cleanup stopped processes', async () => {
    const startResult = await adapter.start({
      runnerId: 'test-runner',
      command: 'echo',
      args: ['test'],
      cwd: process.cwd(),
    });

    const processId = startResult.data!.id;
    await adapter.stop(processId);

    await adapter.cleanup();

    const result = await adapter.getStatus(processId);
    expect(result.ok).toBe(false);
  });
});
