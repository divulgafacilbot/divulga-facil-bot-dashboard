import type { User, ApiError, LoginHistoryResponse, LoginStats } from '@/types';
import { HttpMethod, ApiEndpoint, ApiErrorCode, UserRole } from './common-enums';

const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
const API_BASE_URL = configuredBaseUrl || 'http://localhost:4000';

console.log('🔧 API Configuration:', {
  configuredBaseUrl,
  API_BASE_URL,
  isClient: typeof window !== 'undefined',
});

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
  const fullUrl = `${API_BASE_URL}${endpoint}`;
  console.log('📡 API Request:', {
    endpoint,
    fullUrl,
    method: options.method || 'GET',
    hasBody: !!options.body,
  });

  const res = await fetch(fullUrl, {
    ...options,
    credentials: 'include', // Important for cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  console.log('📥 API Response:', {
    endpoint,
    status: res.status,
    statusText: res.statusText,
    ok: res.ok,
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

// Mock credentials for demo access
const MOCK_CREDENTIALS = {
  email: 'teste@divulgafacil.com.br',
  password: 'Divulga123',
};

const MOCK_USER: User = {
  id: 'mock-user-id',
  email: 'teste@divulgafacil.com.br',
  role: UserRole.USER,
  emailVerified: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const api = {
  auth: {
    register: (email: string, password: string) =>
      fetchAPI<{ message: string; warning?: string }>(ApiEndpoint.AUTH_REGISTER, {
        method: HttpMethod.POST,
        body: JSON.stringify({ email, password }),
      }),

    login: async (email: string, password: string, rememberMe: boolean = false): Promise<{ user: User }> => {
      // Check for mock credentials (trim to avoid whitespace issues)
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedPassword = password.trim();

      if (trimmedEmail === MOCK_CREDENTIALS.email.toLowerCase() && trimmedPassword === MOCK_CREDENTIALS.password) {
        console.log('🎭 Mock login successful');
        // Store mock session in both localStorage and sessionStorage for reliability
        if (typeof window !== 'undefined') {
          const mockUserStr = JSON.stringify(MOCK_USER);
          localStorage.setItem('mockSession', 'true');
          localStorage.setItem('mockUser', mockUserStr);
          sessionStorage.setItem('mockSession', 'true');
          sessionStorage.setItem('mockUser', mockUserStr);

          // Verify storage
          const stored = localStorage.getItem('mockSession');
          console.log('🎭 Mock session stored:', {
            localStorage: !!stored,
            sessionStorage: !!sessionStorage.getItem('mockSession')
          });
        }
        console.log('🎭 Mock user data:', MOCK_USER);
        return { user: MOCK_USER };
      }

      // Otherwise, proceed with normal API call
      return fetchAPI<{ user: User }>(ApiEndpoint.AUTH_LOGIN, {
        method: HttpMethod.POST,
        body: JSON.stringify({ email, password, rememberMe }),
      });
    },

    logout: async (): Promise<{ message: string }> => {
      // Clear mock session if active
      if (typeof window !== 'undefined') {
        const isMockSession = localStorage.getItem('mockSession') || sessionStorage.getItem('mockSession');
        if (isMockSession) {
          console.log('🎭 Mock logout');
          localStorage.removeItem('mockSession');
          localStorage.removeItem('mockUser');
          sessionStorage.removeItem('mockSession');
          sessionStorage.removeItem('mockUser');
          return { message: 'Logout realizado com sucesso' };
        }
      }

      // Otherwise, proceed with normal API call
      return fetchAPI<{ message: string }>(ApiEndpoint.AUTH_LOGOUT, {
        method: HttpMethod.POST,
      });
    },

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
    getMe: async (): Promise<User> => {
      // Check for mock session in both storages
      if (typeof window !== 'undefined') {
        const isMockSessionLocal = localStorage.getItem('mockSession');
        const mockUserStrLocal = localStorage.getItem('mockUser');
        const isMockSessionSession = sessionStorage.getItem('mockSession');
        const mockUserStrSession = sessionStorage.getItem('mockUser');

        console.log('🔍 Checking for mock session:', {
          localStorage: !!isMockSessionLocal,
          sessionStorage: !!isMockSessionSession,
          mockUserExists: !!mockUserStrLocal || !!mockUserStrSession,
        });

        // Try localStorage first
        if (mockUserStrLocal) {
          console.log('🎭 Mock user found in localStorage, parsing...');
          try {
            const user = JSON.parse(mockUserStrLocal) as User;
            console.log('✅ Mock user parsed successfully:', user);
            alert('✅ Mock session ativa! Carregando dashboard...');
            return user;
          } catch (e) {
            console.error('❌ Error parsing mock user from localStorage:', e);
          }
        }

        // Fallback to sessionStorage
        if (mockUserStrSession) {
          console.log('🎭 Mock user found in sessionStorage, parsing...');
          try {
            const user = JSON.parse(mockUserStrSession) as User;
            console.log('✅ Mock user parsed successfully:', user);
            alert('✅ Mock session ativa! Carregando dashboard...');
            return user;
          } catch (e) {
            console.error('❌ Error parsing mock user from sessionStorage:', e);
          }
        }

        console.log('❌ No mock session found, calling API');
        alert('❌ Nenhuma sessão mock encontrada, tentando API...');
      }

      // Otherwise, proceed with normal API call
      return fetchAPI<User>(ApiEndpoint.USER_ME);
    },
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
