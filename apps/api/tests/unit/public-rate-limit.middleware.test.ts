/**
 * Public Rate Limit Middleware - Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  pageViewRateLimit,
  ctaClickRateLimit,
  eventTrackingRateLimit,
  generalPublicRateLimit,
  clearRateLimitStore,
} from '../../src/middleware/public-rate-limit.middleware.js';

function createMockRequest(ip: string, visitorId?: string): Request {
  return {
    ip,
    visitorId,
    headers: {},
    socket: { remoteAddress: ip },
  } as any;
}

function createMockResponse(): Response {
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn(),
  };
  return res as Response;
}

describe('Public Rate Limit Middleware', () => {
  beforeEach(() => {
    clearRateLimitStore();
  });

  describe('pageViewRateLimit', () => {
    it('should allow requests under limit', () => {
      const req = createMockRequest('192.168.1.1');
      const res = createMockResponse();
      const next = vi.fn();

      // First 5 requests should pass
      for (let i = 0; i < 5; i++) {
        pageViewRateLimit(req, res, next);
      }

      expect(next).toHaveBeenCalledTimes(5);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should block requests over limit', () => {
      const req = createMockRequest('192.168.1.1');
      const res = createMockResponse();
      const next = vi.fn();

      // Exceed limit (5 allowed)
      for (let i = 0; i < 6; i++) {
        pageViewRateLimit(req, res, next);
      }

      expect(next).toHaveBeenCalledTimes(5);
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'RATE_LIMIT_EXCEEDED',
        })
      );
    });

    it('should set rate limit headers', () => {
      const req = createMockRequest('192.168.1.1');
      const res = createMockResponse();
      const next = vi.fn();

      pageViewRateLimit(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '5');
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(String));
    });

    it('should track different IPs separately', () => {
      const req1 = createMockRequest('192.168.1.1');
      const req2 = createMockRequest('192.168.1.2');
      const res1 = createMockResponse();
      const res2 = createMockResponse();
      const next = vi.fn();

      // Each IP gets its own limit
      for (let i = 0; i < 5; i++) {
        pageViewRateLimit(req1, res1, next);
        pageViewRateLimit(req2, res2, next);
      }

      expect(next).toHaveBeenCalledTimes(10);
    });
  });

  describe('ctaClickRateLimit', () => {
    it('should allow 10 requests per visitor', () => {
      const req = createMockRequest('192.168.1.1', 'visitor-123');
      const res = createMockResponse();
      const next = vi.fn();

      for (let i = 0; i < 10; i++) {
        ctaClickRateLimit(req, res, next);
      }

      expect(next).toHaveBeenCalledTimes(10);
    });

    it('should block 11th request', () => {
      const req = createMockRequest('192.168.1.1', 'visitor-123');
      const res = createMockResponse();
      const next = vi.fn();

      for (let i = 0; i < 11; i++) {
        ctaClickRateLimit(req, res, next);
      }

      expect(next).toHaveBeenCalledTimes(10);
      expect(res.status).toHaveBeenCalledWith(429);
    });

    it('should use visitorId if available', () => {
      const req1 = createMockRequest('192.168.1.1', 'visitor-123');
      const req2 = createMockRequest('192.168.1.2', 'visitor-123');
      const res = createMockResponse();
      const next = vi.fn();

      // Same visitorId from different IPs = same limit
      for (let i = 0; i < 10; i++) {
        ctaClickRateLimit(req1, res, next);
      }

      ctaClickRateLimit(req2, res, next);

      expect(next).toHaveBeenCalledTimes(10);
      expect(res.status).toHaveBeenCalledWith(429);
    });
  });

  describe('eventTrackingRateLimit', () => {
    it('should allow 30 requests per visitor', () => {
      const req = createMockRequest('192.168.1.1', 'visitor-123');
      const res = createMockResponse();
      const next = vi.fn();

      for (let i = 0; i < 30; i++) {
        eventTrackingRateLimit(req, res, next);
      }

      expect(next).toHaveBeenCalledTimes(30);
    });

    it('should block 31st request', () => {
      const req = createMockRequest('192.168.1.1', 'visitor-123');
      const res = createMockResponse();
      const next = vi.fn();

      for (let i = 0; i < 31; i++) {
        eventTrackingRateLimit(req, res, next);
      }

      expect(next).toHaveBeenCalledTimes(30);
      expect(res.status).toHaveBeenCalledWith(429);
    });
  });

  describe('generalPublicRateLimit', () => {
    it('should allow 100 requests per IP', () => {
      const req = createMockRequest('192.168.1.1');
      const res = createMockResponse();
      const next = vi.fn();

      for (let i = 0; i < 100; i++) {
        generalPublicRateLimit(req, res, next);
      }

      expect(next).toHaveBeenCalledTimes(100);
    });

    it('should block 101st request', () => {
      const req = createMockRequest('192.168.1.1');
      const res = createMockResponse();
      const next = vi.fn();

      for (let i = 0; i < 101; i++) {
        generalPublicRateLimit(req, res, next);
      }

      expect(next).toHaveBeenCalledTimes(100);
      expect(res.status).toHaveBeenCalledWith(429);
    });
  });
});
