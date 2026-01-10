/**
 * Bot Filter Middleware - Unit Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { botFilterMiddleware } from '../../src/middleware/bot-filter.middleware.js';

function createMockRequest(userAgent?: string): Request {
  return {
    headers: {
      'user-agent': userAgent,
    },
  } as Request;
}

function createMockResponse(): Response {
  return {} as Response;
}

describe('Bot Filter Middleware', () => {
  it('should set isBot=true for bot user-agents', () => {
    const req = createMockRequest('Googlebot/2.1');
    const res = createMockResponse();
    const next = vi.fn();

    botFilterMiddleware(req, res, next);

    expect(req.isBot).toBe(true);
    expect(next).toHaveBeenCalled();
  });

  it('should set isBot=false for normal browsers', () => {
    const req = createMockRequest('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0');
    const res = createMockResponse();
    const next = vi.fn();

    botFilterMiddleware(req, res, next);

    expect(req.isBot).toBe(false);
    expect(next).toHaveBeenCalled();
  });

  it('should set isHeadless=true for headless browsers', () => {
    const req = createMockRequest('HeadlessChrome/91.0');
    const res = createMockResponse();
    const next = vi.fn();

    botFilterMiddleware(req, res, next);

    expect(req.isHeadless).toBe(true);
    expect(next).toHaveBeenCalled();
  });

  it('should always call next()', () => {
    const req = createMockRequest('Googlebot/2.1');
    const res = createMockResponse();
    const next = vi.fn();

    botFilterMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should handle missing user-agent', () => {
    const req = createMockRequest(undefined);
    const res = createMockResponse();
    const next = vi.fn();

    botFilterMiddleware(req, res, next);

    expect(req.isBot).toBe(false);
    expect(req.isHeadless).toBe(false);
    expect(next).toHaveBeenCalled();
  });
});
