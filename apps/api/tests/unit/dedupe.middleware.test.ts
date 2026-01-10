/**
 * Dedupe Middleware - Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  dedupeViewMiddleware,
  dedupeClickMiddleware,
  dedupeCardViewMiddleware,
  clearDedupeStore,
} from '../../src/middleware/dedupe.middleware.js';

function createMockRequest(options: {
  visitorId?: string;
  eventType?: string;
  cardId?: string;
  body?: any;
  params?: any;
}): Request {
  return {
    visitorId: options.visitorId,
    body: options.body || { eventType: options.eventType, cardId: options.cardId },
    params: options.params || {},
    query: {},
  } as Request;
}

function createMockResponse(): Response {
  return {} as Response;
}

describe('Dedupe Middleware', () => {
  beforeEach(() => {
    clearDedupeStore();
  });

  describe('dedupeViewMiddleware', () => {
    it('should allow first event', () => {
      const req = createMockRequest({
        visitorId: 'visitor-123',
        eventType: 'PUBLIC_PROFILE_VIEW',
      });
      const res = createMockResponse();
      const next = vi.fn();

      dedupeViewMiddleware(req, res, next);

      expect(req.isDuplicate).toBe(false);
      expect(next).toHaveBeenCalled();
    });

    it('should block duplicate event within window', () => {
      const req1 = createMockRequest({
        visitorId: 'visitor-123',
        eventType: 'PUBLIC_PROFILE_VIEW',
      });
      const req2 = createMockRequest({
        visitorId: 'visitor-123',
        eventType: 'PUBLIC_PROFILE_VIEW',
      });
      const res = createMockResponse();
      const next = vi.fn();

      // First request
      dedupeViewMiddleware(req1, res, next);
      expect(req1.isDuplicate).toBe(false);

      // Second request (duplicate)
      dedupeViewMiddleware(req2, res, next);
      expect(req2.isDuplicate).toBe(true);

      expect(next).toHaveBeenCalledTimes(2);
    });

    it('should track different visitors separately', () => {
      const req1 = createMockRequest({
        visitorId: 'visitor-123',
        eventType: 'PUBLIC_PROFILE_VIEW',
      });
      const req2 = createMockRequest({
        visitorId: 'visitor-456',
        eventType: 'PUBLIC_PROFILE_VIEW',
      });
      const res = createMockResponse();
      const next = vi.fn();

      dedupeViewMiddleware(req1, res, next);
      dedupeViewMiddleware(req2, res, next);

      expect(req1.isDuplicate).toBe(false);
      expect(req2.isDuplicate).toBe(false);
    });

    it('should track different event types separately', () => {
      const req1 = createMockRequest({
        visitorId: 'visitor-123',
        eventType: 'PUBLIC_PROFILE_VIEW',
      });
      const req2 = createMockRequest({
        visitorId: 'visitor-123',
        eventType: 'PUBLIC_CARD_VIEW',
      });
      const res = createMockResponse();
      const next = vi.fn();

      dedupeViewMiddleware(req1, res, next);
      dedupeViewMiddleware(req2, res, next);

      expect(req1.isDuplicate).toBe(false);
      expect(req2.isDuplicate).toBe(false);
    });

    it('should track different cards separately', () => {
      const req1 = createMockRequest({
        visitorId: 'visitor-123',
        eventType: 'PUBLIC_CARD_VIEW',
        cardId: 'card-1',
      });
      const req2 = createMockRequest({
        visitorId: 'visitor-123',
        eventType: 'PUBLIC_CARD_VIEW',
        cardId: 'card-2',
      });
      const res = createMockResponse();
      const next = vi.fn();

      dedupeViewMiddleware(req1, res, next);
      dedupeViewMiddleware(req2, res, next);

      expect(req1.isDuplicate).toBe(false);
      expect(req2.isDuplicate).toBe(false);
    });

    it('should set dedupeKey on request', () => {
      const req = createMockRequest({
        visitorId: 'visitor-123',
        eventType: 'PUBLIC_PROFILE_VIEW',
      });
      const res = createMockResponse();
      const next = vi.fn();

      dedupeViewMiddleware(req, res, next);

      expect(req.dedupeKey).toBeDefined();
      expect(typeof req.dedupeKey).toBe('string');
    });
  });

  describe('dedupeClickMiddleware', () => {
    it('should allow first click', () => {
      const req = createMockRequest({
        visitorId: 'visitor-123',
        eventType: 'PUBLIC_CTA_CLICK',
        cardId: 'card-1',
      });
      const res = createMockResponse();
      const next = vi.fn();

      dedupeClickMiddleware(req, res, next);

      expect(req.isDuplicate).toBe(false);
      expect(next).toHaveBeenCalled();
    });

    it('should block duplicate click', () => {
      const req1 = createMockRequest({
        visitorId: 'visitor-123',
        eventType: 'PUBLIC_CTA_CLICK',
        cardId: 'card-1',
      });
      const req2 = createMockRequest({
        visitorId: 'visitor-123',
        eventType: 'PUBLIC_CTA_CLICK',
        cardId: 'card-1',
      });
      const res = createMockResponse();
      const next = vi.fn();

      dedupeClickMiddleware(req1, res, next);
      dedupeClickMiddleware(req2, res, next);

      expect(req1.isDuplicate).toBe(false);
      expect(req2.isDuplicate).toBe(true);
    });
  });

  describe('dedupeCardViewMiddleware', () => {
    it('should work for card views', () => {
      const req = createMockRequest({
        visitorId: 'visitor-123',
        eventType: 'PUBLIC_CARD_VIEW',
        cardId: 'card-1',
      });
      const res = createMockResponse();
      const next = vi.fn();

      dedupeCardViewMiddleware(req, res, next);

      expect(req.isDuplicate).toBe(false);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should handle missing visitorId', () => {
      const req = createMockRequest({
        eventType: 'PUBLIC_PROFILE_VIEW',
      });
      const res = createMockResponse();
      const next = vi.fn();

      dedupeViewMiddleware(req, res, next);

      expect(req.isDuplicate).toBe(false);
      expect(next).toHaveBeenCalled();
    });

    it('should handle missing eventType', () => {
      const req = createMockRequest({
        visitorId: 'visitor-123',
      });
      const res = createMockResponse();
      const next = vi.fn();

      dedupeViewMiddleware(req, res, next);

      expect(req.isDuplicate).toBe(false);
      expect(next).toHaveBeenCalled();
    });
  });
});
