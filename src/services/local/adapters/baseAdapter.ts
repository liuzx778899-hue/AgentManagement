import type { LocalResult, LocalError, AdapterConfig, CommandConfig, CommandResult } from '../../../types/localEngineering';
import { spawn } from 'child_process';

/**
 * Adapter 基类，提供公共方法
 */
export abstract class BaseAdapter {
  protected config: AdapterConfig;
  protected mockData: Map<string, unknown> = new Map();

  constructor(config: AdapterConfig) {
    this.config = config;
  }

  /**
   * 创建成功结果
   */
  protected ok<T>(data: T, diagnostics?: string[]): LocalResult<T> {
    return { ok: true, data, diagnostics };
  }

  /**
   * 创建错误结果
   */
  protected err<T>(code: LocalError['code'], message: string, cause?: string, recoverable = false): LocalResult<T> {
    return {
      ok: false,
      error: { code, message, cause, recoverable },
    };
  }

  /**
   * 执行命令（带超时和错误处理）
   */
  protected async executeCommand(config: CommandConfig): Promise<CommandResult> {
    const { command, args, cwd, timeout = this.config.defaultTimeout, env } = config;

    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const proc = spawn(command, args, {
        cwd,
        env: { ...process.env, ...env },
        shell: true,
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      const timer = setTimeout(() => {
        proc.kill('SIGTERM');
        reject(new Error(`Command timeout after ${timeout}ms`));
      }, timeout);

      proc.on('close', (code) => {
        clearTimeout(timer);
        resolve({
          exitCode: code ?? 1,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          duration: Date.now() - startTime,
        });
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  /**
   * 设置 mock 数据
   */
  setMockData(key: string, value: unknown): void {
    this.mockData.set(key, value);
  }

  /**
   * 获取 mock 数据
   */
  getMockData<T>(key: string): T | undefined {
    return this.mockData.get(key) as T | undefined;
  }

  /**
   * 是否启用 mock
   */
  protected get isMockEnabled(): boolean {
    return this.config.enableMock;
  }
}