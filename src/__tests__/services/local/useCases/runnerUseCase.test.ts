import { describe, it, expect, beforeEach } from 'vitest';
import { startRunnerProcess, stopRunnerProcess, getProcessLogs } from '../../../../services/local/useCases/runnerUseCase';
import { ProcessRunnerAdapter } from '../../../../services/local/adapters/processRunnerAdapter';
import type { AdapterConfig } from '../../../../types/localEngineering';

describe('runnerUseCase', () => {
  let adapter: ProcessRunnerAdapter;
  const config: AdapterConfig = {
    enableMock: true,
    defaultTimeout: 30000,
    projectRoot: process.cwd(),
  };

  beforeEach(() => {
    adapter = new ProcessRunnerAdapter(config);
  });

  describe('startRunnerProcess', () => {
    it('should start a runner process', async () => {
      const result = await startRunnerProcess(adapter, {
        runnerId: 'runner-1',
        runnerKind: 'claude-code',
        command: 'claude',
        args: ['--help'],
        cwd: process.cwd(),
      });

      expect(result.ok).toBe(true);
      expect(result.data?.runnerId).toBe('runner-1');
      expect(result.data?.state).toBe('running');
    });

    it('should reject command not in whitelist', async () => {
      const realAdapter = new ProcessRunnerAdapter({ ...config, enableMock: false });

      const result = await startRunnerProcess(realAdapter, {
        runnerId: 'runner-2',
        runnerKind: 'custom',
        command: 'dangerous-command',
        args: [],
        cwd: process.cwd(),
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('PERMISSION_DENIED');
    });

    it('should set environment variables', async () => {
      const result = await startRunnerProcess(adapter, {
        runnerId: 'runner-3',
        runnerKind: 'codex-cli',
        command: 'codex',
        args: [],
        cwd: process.cwd(),
        env: { NODE_ENV: 'test' },
      });

      expect(result.ok).toBe(true);
    });
  });

  describe('stopRunnerProcess', () => {
    it('should stop a running process', async () => {
      const startResult = await startRunnerProcess(adapter, {
        runnerId: 'runner-1',
        runnerKind: 'claude-code',
        command: 'claude',
        args: [],
        cwd: process.cwd(),
      });

      const processId = startResult.data!.id;

      const result = await stopRunnerProcess(adapter, processId);

      expect(result.ok).toBe(true);
      expect(result.data?.state).toBe('stopped');
    });

    it('should return error for non-existent process', async () => {
      const result = await stopRunnerProcess(adapter, 'non-existent-id');

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('DIRECTORY_NOT_FOUND');
    });
  });

  describe('getProcessLogs', () => {
    it('should get logs for a process', async () => {
      const startResult = await startRunnerProcess(adapter, {
        runnerId: 'runner-1',
        runnerKind: 'claude-code',
        command: 'claude',
        args: [],
        cwd: process.cwd(),
      });

      const processId = startResult.data!.id;

      const result = await getProcessLogs(adapter, processId);

      expect(result.ok).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });
  });
});