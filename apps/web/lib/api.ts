import type { User, ApiError, LoginHistoryResponse, LoginStats } from '@/types';
import { HttpMethod, ApiEndpoint, ApiErrorCode } from './common-enums';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

let isRefreshing = false;

class ApiErrorWithCode extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'ApiErrorWithCode';
    this.code = code;
  }
}

async function fetchAPI<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: 'include', // Important for cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  // Try to parse JSON response
  let data: unknown;
  try {
    data = await res.json();
  } catch (parseError) {
    // If JSON parsing fails, provide user-friendly error
    if (!res.ok) {
      if (res.status === 429) {
        throw new ApiErrorWithCode(
          'Muitas tentativas. Por favor, aguarde alguns minutos e tente novamente.',
          ApiErrorCode.RATE_LIMIT_EXCEEDED
        );
      }
      throw new ApiErrorWithCode(
        'Erro de comunicação com o servidor. Tente novamente.',
        'PARSE_ERROR'
      );
    }
    // If response was OK but not JSON, throw generic error
    throw new Error('Resposta inválida do servidor.');
  }

  // Auto-refresh JWT on 401 (except for refresh endpoint itself)
  if (!res.ok && res.status === 401 && endpoint !== '/auth/refresh' && !isRefreshing) {
    try {
      isRefreshing = true;
      // Try to refresh the token
      await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      isRefreshing = false;

      // Retry original request
      const retryRes = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      let retryData: unknown;
      try {
        retryData = await retryRes.json();
      } catch (retryParseError) {
        throw new Error('Erro ao processar resposta do servidor.');
      }

      if (!retryRes.ok) {
        const apiError = retryData as ApiError;
        throw new ApiErrorWithCode(
          apiError.error || 'Falha na requisição da API',
          apiError.code
        );
      }

      return retryData as T;
    } catch (refreshError) {
      isRefreshing = false;
      // Refresh failed, redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('Sessão expirada. Faça login novamente.');
    }
  }

  if (!res.ok) {
    const apiError = data as ApiError;
    throw new ApiErrorWithCode(apiError.error || 'Falha na requisição da API', apiError.code);
  }

  return data as T;
}

export const api = {
  auth: {
    register: (email: string, password: string) =>
      fetchAPI<{ message: string; warning?: string }>(ApiEndpoint.AUTH_REGISTER, {
        method: HttpMethod.POST,
        body: JSON.stringify({ email, password }),
      }),

    login: (email: string, password: string, rememberMe: boolean = false) =>
      fetchAPI<{ user: User }>(ApiEndpoint.AUTH_LOGIN, {
        method: HttpMethod.POST,
        body: JSON.stringify({ email, password, rememberMe }),
      }),

    logout: () =>
      fetchAPI<{ message: string }>(ApiEndpoint.AUTH_LOGOUT, {
        method: HttpMethod.POST,
      }),

    forgotPassword: (email: string) =>
      fetchAPI<{ message: string }>(ApiEndpoint.AUTH_FORGOT_PASSWORD, {
        method: HttpMethod.POST,
        body: JSON.stringify({ email }),
      }),

    resetPassword: (token: string, newPassword: string) =>
      fetchAPI<{ message: string }>(ApiEndpoint.AUTH_RESET_PASSWORD, {
        method: HttpMethod.POST,
        body: JSON.stringify({ token, newPassword }),
      }),

    verifyEmail: (token: string) =>
      fetchAPI<{ message: string }>(ApiEndpoint.AUTH_VERIFY_EMAIL, {
        method: HttpMethod.POST,
        body: JSON.stringify({ token }),
      }),

    resendVerification: (email: string) =>
      fetchAPI<{ message: string }>(ApiEndpoint.AUTH_RESEND_VERIFICATION, {
        method: HttpMethod.POST,
        body: JSON.stringify({ email }),
      }),

    refreshToken: () =>
      fetchAPI<{ message: string }>(ApiEndpoint.AUTH_REFRESH, {
        method: HttpMethod.POST,
      }),
  },

  user: {
    getMe: () => fetchAPI<User>(ApiEndpoint.USER_ME),
    changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) =>
      fetchAPI<{ message: string }>(ApiEndpoint.USER_CHANGE_PASSWORD, {
        method: HttpMethod.POST,
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      }),
    revokeAllSessions: () =>
      fetchAPI<{ message: string }>(ApiEndpoint.USER_REVOKE_SESSIONS, {
        method: HttpMethod.POST,
      }),
    getLoginHistory: (limit: number = 20) =>
      fetchAPI<LoginHistoryResponse>(`${ApiEndpoint.USER_LOGIN_HISTORY}?limit=${limit}`),
    getLoginStats: () => fetchAPI<LoginStats>(ApiEndpoint.USER_LOGIN_STATS),
    deleteAccount: () =>
      fetchAPI<{ message: string }>(ApiEndpoint.USER_ME, {
        method: HttpMethod.DELETE,
      }),
  },
};
