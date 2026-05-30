/**
 * Base HTTP client for API calls
 */

const API_BASE = 'http://localhost:3001/api';

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
let abortController: AbortController | null = null;

export async function checkServerAvailable(): Promise<boolean> {
  if (serverAvailable !== null) return serverAvailable;

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
    const response = await fetch('http://localhost:3001/api/health', {
      method: 'GET',
      signal: abortController.signal,
    });
    clearTimeout(timeoutId);
    serverAvailable = response.ok;
    return serverAvailable;
  } catch {
    clearTimeout(timeoutId);
    serverAvailable = false;
    return false;
  }
}

export function resetServerAvailability(): void {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  serverAvailable = null;
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
