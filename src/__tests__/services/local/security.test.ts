import { describe, it, expect, beforeEach } from 'vitest';
import {
  sanitizeLog,
  validatePath,
  isCommandAllowed,
  confirmHighRiskOperation,
  AuditLogger,
} from '../../../services/local/security';

describe('Security', () => {
  describe('sanitizeLog', () => {
    it('should remove API keys', () => {
      const input = 'Using API key sk-1234567890abcdefghijklmnopqrstuv for authentication';
      const result = sanitizeLog(input);

      expect(result).not.toContain('sk-1234567890abcdefghijklmnopqrstuv');
      expect(result).toContain('[REDACTED-API-KEY]');
    });

    it('should remove tokens', () => {
      const input = 'Token: ghp_xxxxxxxxxxxxxxxxxxxx';
      const result = sanitizeLog(input);

      expect(result).not.toContain('ghp_xxxxxxxxxxxxxxxxxxxx');
    });

    it('should remove passwords', () => {
      const input = 'password=mypassword123';
      const result = sanitizeLog(input);

      expect(result).not.toContain('mypassword123');
    });

    it('should keep safe content', () => {
      const input = 'Running npm install in /project/path';
      const result = sanitizeLog(input);

      expect(result).toContain('npm install');
      expect(result).toContain('/project/path');
    });
  });

  describe('validatePath', () => {
    it('should allow paths within allowed directory', () => {
      const result = validatePath('/project/src/file.ts', '/project');

      expect(result.valid).toBe(true);
    });

    it('should reject paths outside allowed directory', () => {
      const result = validatePath('/etc/passwd', '/project');

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('不在允许范围内');
    });

    it('should reject path traversal attempts', () => {
      const result = validatePath('/project/../etc/passwd', '/project');

      expect(result.valid).toBe(false);
    });

    it('should normalize paths', () => {
      const result = validatePath('/project/./src/file.ts', '/project');

      expect(result.valid).toBe(true);
    });
  });

  describe('isCommandAllowed', () => {
    it('should allow whitelisted commands', () => {
      expect(isCommandAllowed('npm')).toBe(true);
      expect(isCommandAllowed('git')).toBe(true);
      expect(isCommandAllowed('node')).toBe(true);
    });

    it('should reject non-whitelisted commands', () => {
      expect(isCommandAllowed('rm')).toBe(false);
      expect(isCommandAllowed('sudo')).toBe(false);
      expect(isCommandAllowed('format')).toBe(false);
    });

    it('should handle command with path', () => {
      expect(isCommandAllowed('/usr/bin/npm')).toBe(true);
      expect(isCommandAllowed('C:\\Program Files\\nodejs\\npm.exe')).toBe(true);
    });
  });

  describe('confirmHighRiskOperation', () => {
    it('should identify high-risk operations', () => {
      const operations = [
        { type: 'delete-worktree', target: '.worktrees/issue-1' },
        { type: 'push', target: 'origin/main' },
        { type: 'execute-shell', target: 'npm run build' },
        { type: 'overwrite-file', target: '/project/config.json' },
      ];

      for (const op of operations) {
        const result = confirmHighRiskOperation(op);
        expect(result.highRisk).toBe(true);
        expect(result.confirmationRequired).toBe(true);
      }
    });

    it('should identify low-risk operations', () => {
      const operations = [
        { type: 'read-file', target: '/project/src/file.ts' },
        { type: 'git-status', target: '/project' },
        { type: 'list-issues', target: 'owner/repo' },
      ];

      for (const op of operations) {
        const result = confirmHighRiskOperation(op);
        expect(result.highRisk).toBe(false);
        expect(result.confirmationRequired).toBe(false);
      }
    });
  });

  describe('AuditLogger', () => {
    let logger: AuditLogger;

    beforeEach(() => {
      logger = new AuditLogger();
    });

    it('should log operation', async () => {
      await logger.log({
        type: 'execute-command',
        operation: 'npm install',
        target: '/project',
        user: 'test-user',
        result: 'success',
        timestamp: new Date().toISOString(),
      });

      const logs = await logger.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].operation).toBe('npm install');
    });

    it('should sanitize sensitive data in logs', async () => {
      await logger.log({
        type: 'api-call',
        operation: 'anthropic',
        target: 'model',
        user: 'test-user',
        result: 'success',
        details: { apiKey: 'sk-secret-key' },
        timestamp: new Date().toISOString(),
      });

      const logs = await logger.getLogs();
      expect(logs[0].details).not.toContain('sk-secret-key');
    });

    it('should filter logs by type', async () => {
      await logger.log({
        type: 'execute-command',
        operation: 'npm install',
        target: '/project',
        user: 'test-user',
        result: 'success',
        timestamp: new Date().toISOString(),
      });

      await logger.log({
        type: 'git-operation',
        operation: 'git push',
        target: 'origin/main',
        user: 'test-user',
        result: 'success',
        timestamp: new Date().toISOString(),
      });

      const commandLogs = await logger.getLogs({ type: 'execute-command' });
      expect(commandLogs.length).toBe(1);
      expect(commandLogs[0].type).toBe('execute-command');
    });

    it('should filter logs by time range', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 3600000);

      await logger.log({
        type: 'test',
        operation: 'op1',
        target: 'target1',
        user: 'user',
        result: 'success',
        timestamp: now.toISOString(),
      });

      await logger.log({
        type: 'test',
        operation: 'op2',
        target: 'target2',
        user: 'user',
        result: 'success',
        timestamp: oneHourAgo.toISOString(),
      });

      const recentLogs = await logger.getLogs({
        startTime: oneHourAgo.toISOString(),
      });

      expect(recentLogs.length).toBe(2);
    });
  });
});