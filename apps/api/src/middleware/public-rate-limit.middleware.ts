/**
 * Public Rate Limit Middleware - Feature 7
 *
 * In-memory rate limiting for public routes.
 * Simpler than Redis-based rate limiting in rate-limit.middleware.ts.
 */

import { Request, Response, NextFunction } from 'express';
import { RATE_LIMITS } from '../constants/tracking-config.js';
import { getIPFromRequest } from '../utils/ip-hash.utils.js';

// In-memory store for rate limiting
// Key: IP or visitorId, Value: { count, resetAt }
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Create rate limiter middleware
 *
 * @param windowMs - Time window in milliseconds
 * @param max - Maximum requests in window
 * @param keyGenerator - Function to generate key from request
 * @param message - Error message when limit exceeded
 */
function createRateLimiter(
  windowMs: number,
  max: number,
  keyGenerator: (req: Request) => string,
  message: string
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator(req);
    const now = Date.now();
    const resetAt = now + windowMs;

    // Get or create entry
    let entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetAt) {
      // New window or expired entry
      entry = { count: 1, resetAt };
      rateLimitStore.set(key, entry);
      next();
      return;
    }

    // Increment count
    entry.count++;

    if (entry.count > max) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);

      res.setHeader('Retry-After', retryAfter.toString());
      res.setHeader('X-RateLimit-Limit', max.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', entry.resetAt.toString());

      res.status(429).json({
        error: message,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter,
      });
      return;
    }

    // Set rate limit headers
    const remaining = max - entry.count;
    res.setHeader('X-RateLimit-Limit', max.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', entry.resetAt.toString());

    next();
  };
}

/**
 * Rate limiter for page views (5/min per IP)
 */
export const pageViewRateLimit = createRateLimiter(
  RATE_LIMITS.PAGE_VIEWS.windowMs,
  RATE_LIMITS.PAGE_VIEWS.max,
  (req) => `view:${getIPFromRequest(req)}`,
  RATE_LIMITS.PAGE_VIEWS.message
);

/**
 * Rate limiter for CTA clicks (10/min per visitorId)
 */
export const ctaClickRateLimit = createRateLimiter(
  RATE_LIMITS.CTA_CLICKS.windowMs,
  RATE_LIMITS.CTA_CLICKS.max,
  (req) => `click:${req.visitorId || getIPFromRequest(req)}`,
  RATE_LIMITS.CTA_CLICKS.message
);

/**
 * Rate limiter for event tracking (30/min per visitor)
 */
export const eventTrackingRateLimit = createRateLimiter(
  RATE_LIMITS.EVENTS.windowMs,
  RATE_LIMITS.EVENTS.max,
  (req) => `event:${req.visitorId || getIPFromRequest(req)}`,
  RATE_LIMITS.EVENTS.message
);

/**
 * General rate limiter for public routes (100/min per IP)
 */
export const generalPublicRateLimit = createRateLimiter(
  RATE_LIMITS.PUBLIC_GENERAL.windowMs,
  RATE_LIMITS.PUBLIC_GENERAL.max,
  (req) => `general:${getIPFromRequest(req)}`,
  RATE_LIMITS.PUBLIC_GENERAL.message
);

/**
 * Get rate limiter by type
 */
export function publicRateLimitMiddleware(type: 'PAGE_VIEWS' | 'CTA_CLICKS' | 'CARD_VIEWS' | 'EVENTS') {
  switch (type) {
    case 'PAGE_VIEWS':
      return pageViewRateLimit;
    case 'CTA_CLICKS':
      return ctaClickRateLimit;
    case 'CARD_VIEWS':
      return pageViewRateLimit; // Use same limit as page views
    case 'EVENTS':
      return eventTrackingRateLimit;
    default:
      return generalPublicRateLimit;
  }
}

/**
 * Get rate limit statistics (for monitoring)
 */
export function getRateLimitStats(): {
  totalKeys: number;
  storeSize: number;
} {
  return {
    totalKeys: rateLimitStore.size,
    storeSize: rateLimitStore.size,
  };
}

/**
 * Clear rate limit store (for testing)
 */
export function clearRateLimitStore(): void {
  rateLimitStore.clear();
}
