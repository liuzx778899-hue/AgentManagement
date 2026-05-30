import type { AdapterConfig } from '../types/localEngineering';

/**
 * 本地工程服务配置
 */
export const localEngineeringConfig: Partial<AdapterConfig> = {
  enableMock: false, // 默认使用真实命令
  defaultTimeout: 30000,
};

/**
 * 获取当前项目根目录
 */
export function getProjectRoot(): string {
  // 在浏览器中返回空或 mock
  if (typeof window !== 'undefined') {
    return '';
  }
  return process.cwd();
}