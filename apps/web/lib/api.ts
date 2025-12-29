import type { User, ApiError, LoginHistoryResponse, LoginStats } from '@/types';
import { HttpMethod, ApiEndpoint, ApiErrorCode, UserRole } from './common-enums';

const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
const API_BASE_URL = configuredBaseUrl || 'http://localhost:4000';

// Detect if we're in production mode (for mock login)
const isProduction = process.env.NODE_ENV === 'production';

console.log('🔧 API Configuration:', {
  configuredBaseUrl,
  API_BASE_URL,
  isProduction,
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
      console.log('🔍 LOGIN DEBUG:', {
        isProduction,
        nodeEnv: process.env.NODE_ENV,
        hasWindow: typeof window !== 'undefined'
      });

      // PRODUCTION MODE: Only allow mock login
      if (isProduction) {
        const trimmedEmail = email.trim().toLowerCase();
        const trimmedPassword = password.trim();

        console.log('🏭 Production mode: Validating credentials...');
        console.log('🏭 Email matches:', trimmedEmail === MOCK_CREDENTIALS.email.toLowerCase());
        console.log('🏭 Password matches:', trimmedPassword === MOCK_CREDENTIALS.password);

        if (trimmedEmail === MOCK_CREDENTIALS.email.toLowerCase() && trimmedPassword === MOCK_CREDENTIALS.password) {
          console.log('✅ Production mode: Credentials valid!');

          if (typeof window !== 'undefined') {
            console.log('✅ Setting prodAuth in sessionStorage...');
            sessionStorage.setItem('prodAuth', 'true');
            const verify = sessionStorage.getItem('prodAuth');
            console.log('✅ Verified prodAuth:', verify);
          } else {
            console.error('❌ Window is undefined!');
          }

          console.log('✅ Returning mock user:', MOCK_USER.email);
          return { user: MOCK_USER };
        } else {
          console.log('❌ Production mode: Invalid credentials');
          console.log('❌ Expected:', MOCK_CREDENTIALS.email, '/', MOCK_CREDENTIALS.password);
          console.log('❌ Received:', trimmedEmail, '/', trimmedPassword);
          throw new ApiErrorWithCode(
            'Credenciais inválidas. Use: teste@divulgafacil.com.br / Divulga123',
            ApiErrorCode.INVALID_CREDENTIALS
          );
        }
      }

      // DEVELOPMENT MODE: Use real API
      console.log('🔧 Development mode: Calling API...');
      return fetchAPI<{ user: User }>(ApiEndpoint.AUTH_LOGIN, {
        method: HttpMethod.POST,
        body: JSON.stringify({ email, password, rememberMe }),
      });
    },

    logout: async (): Promise<{ message: string }> => {
      // PRODUCTION MODE: Clear session
      if (isProduction) {
        console.log('🏭 Production mode: Logout');
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('prodAuth');
        }
        return { message: 'Logout realizado com sucesso' };
      }

      // DEVELOPMENT MODE: Use real API
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
      console.log('🔍 GET_ME DEBUG:', {
        isProduction,
        nodeEnv: process.env.NODE_ENV,
        hasWindow: typeof window !== 'undefined'
      });

      // PRODUCTION MODE: Check session and return mock user
      if (isProduction) {
        console.log('🏭 Production mode: Checking session...');

        if (typeof window !== 'undefined') {
          const prodAuth = sessionStorage.getItem('prodAuth');
          console.log('🏭 SessionStorage prodAuth value:', prodAuth);
          console.log('🏭 Is authenticated:', prodAuth === 'true');

          if (prodAuth === 'true') {
            console.log('✅ Production mode: Returning mock user:', MOCK_USER.email);
            return MOCK_USER;
          } else {
            console.log('❌ Production mode: Not authenticated (prodAuth is not "true")');
            console.log('❌ Throwing UNAUTHORIZED error');
            throw new ApiErrorWithCode('Não autenticado', ApiErrorCode.UNAUTHORIZED);
          }
        } else {
          console.error('❌ Window is undefined in getMe!');
          throw new ApiErrorWithCode('Não autenticado', ApiErrorCode.UNAUTHORIZED);
        }
      }

      // DEVELOPMENT MODE: Use real API
      console.log('🔧 Development mode: Calling API...');
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
