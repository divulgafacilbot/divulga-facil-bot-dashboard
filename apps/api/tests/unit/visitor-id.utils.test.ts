/**
 * Visitor ID Utilities - Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import {
  generateVisitorId,
  isValidVisitorId,
  getOrCreateVisitorId,
  setVisitorIdCookie,
  clearVisitorIdCookie,
  getVisitorIdFromRequest,
} from '../../src/utils/visitor-id.utils.js';
import { VISITOR_ID_CONFIG } from '../../src/constants/tracking-config.js';

// Mock Request and Response
function createMockRequest(cookies?: Record<string, string>, headers?: Record<string, string>): Request {
  return {
    cookies: cookies || {},
    headers: headers || {},
  } as Request;
}

function createMockResponse(): Response {
  const res: any = {
    cookie: (name: string, value: string, options: any) => {
      res.cookieName = name;
      res.cookieValue = value;
      res.cookieOptions = options;
      return res;
    },
    clearCookie: (name: string, options: any) => {
      res.clearedCookie = name;
      res.clearOptions = options;
      return res;
    },
  };
  return res as Response;
}

describe('Visitor ID Utils', () => {
  describe('generateVisitorId', () => {
    it('should generate a valid UUID v4', () => {
      const visitorId = generateVisitorId();

      expect(visitorId).toBeTruthy();
      expect(typeof visitorId).toBe('string');
      expect(visitorId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('should generate unique IDs', () => {
      const id1 = generateVisitorId();
      const id2 = generateVisitorId();

      expect(id1).not.toBe(id2);
    });
  });

  describe('isValidVisitorId', () => {
    it('should return true for valid UUID v4', () => {
      const validUuid = '123e4567-e89b-42d3-a456-426614174000';
      expect(isValidVisitorId(validUuid)).toBe(true);
    });

    it('should return true for generated visitor ID', () => {
      const generatedId = generateVisitorId();
      expect(isValidVisitorId(generatedId)).toBe(true);
    });

    it('should return false for invalid formats', () => {
      expect(isValidVisitorId('not-a-uuid')).toBe(false);
      expect(isValidVisitorId('123')).toBe(false);
      expect(isValidVisitorId('')).toBe(false);
      expect(isValidVisitorId('123e4567-e89b-12d3-a456-426614174000')).toBe(false); // Not v4 (wrong version digit)
    });

    it('should return false for undefined', () => {
      expect(isValidVisitorId(undefined)).toBe(false);
    });

    it('should return false for non-string values', () => {
      expect(isValidVisitorId(123 as any)).toBe(false);
      expect(isValidVisitorId({} as any)).toBe(false);
      expect(isValidVisitorId(null as any)).toBe(false);
    });
  });

  describe('getOrCreateVisitorId', () => {
    it('should return existing visitor ID from cookie', () => {
      const existingId = generateVisitorId();
      const req = createMockRequest({ [VISITOR_ID_CONFIG.COOKIE_NAME]: existingId });
      const res = createMockResponse();

      const visitorId = getOrCreateVisitorId(req, res);

      expect(visitorId).toBe(existingId);
    });

    it('should return visitor ID from header if cookie not present', () => {
      const existingId = generateVisitorId();
      const req = createMockRequest(
        {},
        { [VISITOR_ID_CONFIG.HEADER_NAME.toLowerCase()]: existingId }
      );
      const res = createMockResponse();

      const visitorId = getOrCreateVisitorId(req, res);

      expect(visitorId).toBe(existingId);
    });

    it('should generate new visitor ID if none exists', () => {
      const req = createMockRequest();
      const res = createMockResponse();

      const visitorId = getOrCreateVisitorId(req, res);

      expect(isValidVisitorId(visitorId)).toBe(true);
    });

    it('should set cookie when generating new visitor ID', () => {
      const req = createMockRequest();
      const res = createMockResponse();

      const visitorId = getOrCreateVisitorId(req, res);

      expect((res as any).cookieName).toBe(VISITOR_ID_CONFIG.COOKIE_NAME);
      expect((res as any).cookieValue).toBe(visitorId);
      expect((res as any).cookieOptions.httpOnly).toBe(true);
    });

    it('should set cookie if cookie is missing but header exists', () => {
      const existingId = generateVisitorId();
      const req = createMockRequest(
        undefined,
        { [VISITOR_ID_CONFIG.HEADER_NAME.toLowerCase()]: existingId }
      );
      const res = createMockResponse();

      const visitorId = getOrCreateVisitorId(req, res);

      expect((res as any).cookieName).toBe(VISITOR_ID_CONFIG.COOKIE_NAME);
      expect((res as any).cookieValue).toBe(existingId);
    });

    it('should ignore invalid cookie value and generate new ID', () => {
      const req = createMockRequest({ [VISITOR_ID_CONFIG.COOKIE_NAME]: 'invalid-uuid' });
      const res = createMockResponse();

      const visitorId = getOrCreateVisitorId(req, res);

      expect(isValidVisitorId(visitorId)).toBe(true);
      expect(visitorId).not.toBe('invalid-uuid');
    });

    it('should ignore invalid header value and generate new ID', () => {
      const req = createMockRequest(
        {},
        { [VISITOR_ID_CONFIG.HEADER_NAME.toLowerCase()]: 'invalid-uuid' }
      );
      const res = createMockResponse();

      const visitorId = getOrCreateVisitorId(req, res);

      expect(isValidVisitorId(visitorId)).toBe(true);
      expect(visitorId).not.toBe('invalid-uuid');
    });
  });

  describe('setVisitorIdCookie', () => {
    it('should set cookie with correct options', () => {
      const res = createMockResponse();
      const visitorId = generateVisitorId();

      setVisitorIdCookie(res, visitorId);

      expect((res as any).cookieName).toBe(VISITOR_ID_CONFIG.COOKIE_NAME);
      expect((res as any).cookieValue).toBe(visitorId);
      expect((res as any).cookieOptions).toMatchObject({
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 365 * 24 * 60 * 60 * 1000,
        path: '/',
      });
    });

    it('should throw error for invalid visitor ID', () => {
      const res = createMockResponse();

      expect(() => setVisitorIdCookie(res, 'invalid-uuid')).toThrow(
        'Invalid visitor ID format'
      );
    });
  });

  describe('clearVisitorIdCookie', () => {
    it('should clear the visitor ID cookie', () => {
      const res = createMockResponse();

      clearVisitorIdCookie(res);

      expect((res as any).clearedCookie).toBe(VISITOR_ID_CONFIG.COOKIE_NAME);
      expect((res as any).clearOptions.path).toBe('/');
    });
  });

  describe('getVisitorIdFromRequest', () => {
    it('should return visitor ID from cookie', () => {
      const existingId = generateVisitorId();
      const req = createMockRequest({ [VISITOR_ID_CONFIG.COOKIE_NAME]: existingId });

      const visitorId = getVisitorIdFromRequest(req);

      expect(visitorId).toBe(existingId);
    });

    it('should return visitor ID from header', () => {
      const existingId = generateVisitorId();
      const req = createMockRequest(
        {},
        { [VISITOR_ID_CONFIG.HEADER_NAME.toLowerCase()]: existingId }
      );

      const visitorId = getVisitorIdFromRequest(req);

      expect(visitorId).toBe(existingId);
    });

    it('should return null if no valid visitor ID found', () => {
      const req = createMockRequest();

      const visitorId = getVisitorIdFromRequest(req);

      expect(visitorId).toBeNull();
    });

    it('should return null for invalid cookie value', () => {
      const req = createMockRequest({ [VISITOR_ID_CONFIG.COOKIE_NAME]: 'invalid-uuid' });

      const visitorId = getVisitorIdFromRequest(req);

      expect(visitorId).toBeNull();
    });

    it('should prioritize cookie over header', () => {
      const cookieId = generateVisitorId();
      const headerId = generateVisitorId();
      const req = createMockRequest(
        { [VISITOR_ID_CONFIG.COOKIE_NAME]: cookieId },
        { [VISITOR_ID_CONFIG.HEADER_NAME.toLowerCase()]: headerId }
      );

      const visitorId = getVisitorIdFromRequest(req);

      expect(visitorId).toBe(cookieId);
      expect(visitorId).not.toBe(headerId);
    });
  });
});
