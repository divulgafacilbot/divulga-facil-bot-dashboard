/**
 * Visitor ID Middleware - Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { visitorIdMiddleware } from '../../src/middleware/visitor-id.middleware.js';
import { generateVisitorId, isValidVisitorId } from '../../src/utils/visitor-id.utils.js';

function createMockRequest(cookies?: Record<string, string>): Request {
  return {
    cookies: cookies || {},
    headers: {},
  } as Request;
}

function createMockResponse(): Response {
  const res: any = {
    cookie: vi.fn(),
  };
  return res as Response;
}

describe('Visitor ID Middleware', () => {
  it('should attach visitor ID to request', () => {
    const req = createMockRequest();
    const res = createMockResponse();
    const next = vi.fn();

    visitorIdMiddleware(req, res, next);

    expect(req.visitorId).toBeDefined();
    expect(isValidVisitorId(req.visitorId)).toBe(true);
    expect(next).toHaveBeenCalled();
  });

  it('should reuse existing visitor ID from cookie', () => {
    const existingId = generateVisitorId();
    const req = createMockRequest({ df_vid: existingId });
    const res = createMockResponse();
    const next = vi.fn();

    visitorIdMiddleware(req, res, next);

    expect(req.visitorId).toBe(existingId);
    expect(next).toHaveBeenCalled();
  });

  it('should generate new visitor ID if none exists', () => {
    const req = createMockRequest();
    const res = createMockResponse();
    const next = vi.fn();

    visitorIdMiddleware(req, res, next);

    expect(req.visitorId).toBeDefined();
    expect(isValidVisitorId(req.visitorId)).toBe(true);
    expect(res.cookie).toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('should always call next()', () => {
    const req = createMockRequest();
    const res = createMockResponse();
    const next = vi.fn();

    visitorIdMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
