/**
 * Base HTTP client for API calls
 */

// 在浏览器环境使用相对路径（通过 Vite 代理），服务端使用绝对路径
const API_BASE = typeof window !== 'undefined' ? '/api' : 'http://localhost:3001/api';

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    recoverable?: boolean;
  };
}

let serverAvailable: boolean | null = null;
let serverAvailableTime: number = 0;
const SERVER_CHECK_TTL = 30_000; // 30 秒后失效，允许重试
let abortController: AbortController | null = null;

export async function checkServerAvailable(): Promise<boolean> {
  // 缓存有效期内直接返回
  if (serverAvailable !== null && Date.now() - serverAvailableTime < SERVER_CHECK_TTL) {
    return serverAvailable;
  }

  // Cancel any previous pending request
  if (abortController) {
    abortController.abort();
  }
  abortController = new AbortController();

  // Create timeout that can be cancelled
  const timeoutId = setTimeout(() => {
    abortController?.abort();
  }, 2000);

  try {
    // 使用 API_BASE 而不是硬编码的 URL
    const response = await fetch(`${API_BASE}/health`, {
      method: 'GET',
      signal: abortController.signal,
    });
    clearTimeout(timeoutId);
    serverAvailable = response.ok;
    serverAvailableTime = Date.now();
    return serverAvailable;
  } catch {
    clearTimeout(timeoutId);
    serverAvailable = false;
    serverAvailableTime = Date.now();
    return false;
  }
}

export function resetServerAvailability(): void {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  serverAvailable = null;
  serverAvailableTime = 0;
}

export async function apiCall<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown
): Promise<ApiResponse<T>> {
  // Check server availability first
  const available = await checkServerAvailable();

  if (!available) {
    return {
      ok: false,
      error: {
        code: 'SERVER_UNAVAILABLE',
        message: 'Local API server not running. Start it with: npm run dev:server',
        recoverable: true,
      },
    };
  }

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();
    return data as ApiResponse<T>;
  } catch (error) {
    // 网络错误时重置缓存，下次调用会重试健康检查
    serverAvailable = null;
    return {
      ok: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network error',
        recoverable: true,
      },
    };
  }
}
