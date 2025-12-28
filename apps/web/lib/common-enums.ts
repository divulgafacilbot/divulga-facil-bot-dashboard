/**
 * Common Enums
 *
 * Centralized enums for the application to ensure type safety
 * and prevent magic strings throughout the codebase.
 */

/**
 * User roles in the system
 */
export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

/**
 * HTTP methods for API requests
 */
export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
}

/**
 * API error codes
 */
export enum ApiErrorCode {
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}

/**
 * Component loading/status states
 */
export enum ComponentStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error',
}

/**
 * Button variants for styling
 */
export enum ButtonVariant {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  GHOST = 'ghost',
  DANGER = 'danger',
}

/**
 * Authentication-related routes
 */
export enum AuthRoute {
  LOGIN = '/login',
  REGISTER = '/register',
  FORGOT_PASSWORD = '/forgot-password',
  RESET_PASSWORD = '/reset-password',
  VERIFY_EMAIL = '/verify-email',
}

/**
 * Dashboard routes
 */
export enum DashboardRoute {
  HOME = '/dashboard',
  BOTS = '/dashboard/bots',
  TEMPLATES = '/dashboard/templates',
  BILLING = '/dashboard/billing',
  SETTINGS = '/dashboard/settings',
}

/**
 * API endpoints
 */
export enum ApiEndpoint {
  // Auth endpoints
  AUTH_REGISTER = '/api/auth/register',
  AUTH_LOGIN = '/api/auth/login',
  AUTH_LOGOUT = '/api/auth/logout',
  AUTH_FORGOT_PASSWORD = '/api/auth/forgot-password',
  AUTH_RESET_PASSWORD = '/api/auth/reset-password',
  AUTH_VERIFY_EMAIL = '/api/auth/verify-email',
  AUTH_RESEND_VERIFICATION = '/api/auth/resend-verification',
  AUTH_REFRESH = '/api/auth/refresh',

  // User endpoints
  USER_ME = '/api/me',
  USER_CHANGE_PASSWORD = '/api/me/change-password',
  USER_REVOKE_SESSIONS = '/api/me/revoke-sessions',
  USER_LOGIN_HISTORY = '/api/me/login-history',
  USER_LOGIN_STATS = '/api/me/login-stats',
}

/**
 * Local storage keys
 */
export enum StorageKey {
  AUTH_TOKEN = 'auth_token',
  REFRESH_TOKEN = 'refresh_token',
  USER_PREFERENCES = 'user_preferences',
  THEME = 'theme',
}

/**
 * Toast/notification types
 */
export enum NotificationType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}
