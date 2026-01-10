import rateLimit, { type Options } from 'express-rate-limit';
import type { Request, Response } from 'express';

// Helper to get IP key (handles IPv6 properly)
const getIpKey = (req: Request): string => {
  const ip = req.ip || 'anon';
  // Normalize IPv6 to /64 prefix to prevent bypass
  if (ip.includes(':')) {
    const parts = ip.split(':').slice(0, 4);
    return parts.join(':');
  }
  return ip;
};

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
  skip: () => process.env.NODE_ENV !== 'production',
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

// Public Marketplace Rate Limiters (with Redis for distributed systems)
import Redis from 'ioredis';
import RedisStore, { type SendCommandFn } from 'rate-limit-redis';

const redisEnabled = process.env.REDIS_ENABLED === 'true';
const redis = redisEnabled ? new Redis(process.env.REDIS_URL || 'redis://localhost:6379') : null;

// Helper to create Redis store only when Redis is enabled
const createRedisStore = (prefix: string) => {
  if (!redis) return undefined;
  return new RedisStore({
    sendCommand: ((...args: string[]) => redis.call(args[0], ...args.slice(1))) as SendCommandFn,
    prefix
  });
};

// CTA clicks: 20 req/min per visitor
export const ctaRateLimit = rateLimit({
  store: createRedisStore('rl:cta:'),
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  keyGenerator: (req) => {
    return req.cookies?.df_vid || getIpKey(req);
  },
  handler: (req, res) => {
    res.status(204).send(); // Fail silently
  },
  skip: (req) => {
    // Skip for bots (they're filtered anyway)
    const ua = req.headers['user-agent'] || '';
    return /bot|crawler|spider/i.test(ua);
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, ip: false }
});

// Events: 30 req/min per visitor
export const eventsRateLimit = rateLimit({
  store: createRedisStore('rl:events:'),
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => {
    return req.body?.visitorId || req.cookies?.df_vid || getIpKey(req);
  },
  handler: (req, res) => {
    res.status(204).send(); // Fail silently
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, ip: false }
});

// General public routes: 100 req/min per IP
export const publicRateLimit = rateLimit({
  store: createRedisStore('rl:public:'),
  windowMs: 60 * 1000,
  max: 100,
  keyGenerator: (req) => getIpKey(req),
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many requests' });
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, ip: false }
});
