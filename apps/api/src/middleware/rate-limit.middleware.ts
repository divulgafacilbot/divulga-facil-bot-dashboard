import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';

/**
 * Custom handler for rate limit errors
 * Returns RFC 7807-compliant JSON error response
 */
const rateLimitHandler = (message: string) => {
  return (req: Request, res: Response) => {
    res.status(429).json({
      error: message,
      code: 'RATE_LIMIT_EXCEEDED',
      details: {
        retryAfter: res.getHeader('Retry-After'),
      },
    });
  };
};

// Login: 5 attempts / 10 min
export const loginRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed login attempts
  handler: rateLimitHandler('Muitas tentativas de login. Tente novamente em 10 minutos.'),
});

// Forgot Password: 3 attempts / 1h
export const forgotPasswordRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Muitas tentativas de recuperação de senha. Tente novamente em 1 hora.'),
});

// Register: 3 accounts / 1h (per IP)
export const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Muitas contas criadas. Tente novamente em 1 hora.'),
});

// Reset Password: 5 attempts / 1h
export const resetPasswordRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Muitas tentativas de redefinição de senha. Tente novamente em 1 hora.'),
});

// Email verification: 10 attempts / 1h
export const emailVerificationRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Muitas tentativas de verificação. Tente novamente em 1 hora.'),
});
