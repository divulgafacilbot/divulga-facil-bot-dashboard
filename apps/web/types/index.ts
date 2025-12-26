import { UserRole } from '@/lib/common-enums';

// User types
export interface User {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

// API Error types
export interface ApiError {
  error: string;
  details?: unknown;
  code?: string;
}

// Auth types
export interface LoginResponse {
  user: User;
}

export interface RegisterResponse {
  message: string;
  warning?: string;
}

export interface LogoutResponse {
  message: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export interface VerifyEmailResponse {
  message: string;
}

export interface ResendVerificationResponse {
  message: string;
}

export interface RefreshTokenResponse {
  message: string;
}

// Login History types
export interface LoginHistoryEntry {
  id: string;
  email: string;
  ipAddress: string | null;
  userAgent: string | null;
  success: boolean;
  failureReason: string | null;
  loginAt: string;
  deviceInfo: {
    browser?: string;
    os?: string;
    device?: string;
  } | null;
}

export interface LoginHistoryResponse {
  history: LoginHistoryEntry[];
}

export interface LoginStats {
  total: number;
  successful: number;
  failed: number;
}
