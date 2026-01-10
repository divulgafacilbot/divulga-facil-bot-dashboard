/**
 * API Client
 *
 * Centralized HTTP client for API calls with fetch
 */

const getBaseUrl = () =>
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

interface ApiResponse<T = unknown> {
  data: T;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api${endpoint}`;

  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Request failed with status ${response.status}`);
  }

  const data = await response.json();
  return { data };
}

export const apiClient = {
  async get<T = unknown>(endpoint: string): Promise<ApiResponse<T>> {
    return request<T>(endpoint, { method: 'GET' });
  },

  async post<T = unknown>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  async patch<T = unknown>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  async delete<T = unknown>(endpoint: string): Promise<ApiResponse<T>> {
    return request<T>(endpoint, { method: 'DELETE' });
  },
};
