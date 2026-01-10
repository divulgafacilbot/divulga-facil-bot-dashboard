/**
 * Visitor ID Utilities - Feature 7
 *
 * Privacy-preserving visitor identification using UUIDs stored in cookies.
 * Falls back to header if cookies are not available.
 */

import { Request, Response } from 'express';
import { randomUUID, UUID } from 'crypto';
import { VISITOR_ID_CONFIG } from '../constants/tracking-config.js';

/**
 * Generate a new visitor ID (UUID v4)
 */
export function generateVisitorId(): string {
  return randomUUID();
}

/**
 * Validate if a string is a valid visitor ID (UUID format)
 */
export function isValidVisitorId(id: string | undefined): id is string {
  if (!id || typeof id !== 'string') {
    return false;
  }

  // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  return uuidPattern.test(id);
}

/**
 * Get or create visitor ID from request
 *
 * Priority:
 * 1. Cookie (df_vid)
 * 2. Header (X-Visitor-ID)
 * 3. Generate new UUID
 *
 * Sets cookie in response if new ID is generated or if cookie is missing.
 *
 * @param req - Express request
 * @param res - Express response
 * @returns Visitor ID (UUID)
 */
export function getOrCreateVisitorId(req: Request, res: Response): string {
  let visitorId: string | undefined;

  // Priority 1: Check cookie
  if (req.cookies && req.cookies[VISITOR_ID_CONFIG.COOKIE_NAME]) {
    const cookieValue = req.cookies[VISITOR_ID_CONFIG.COOKIE_NAME];
    if (isValidVisitorId(cookieValue)) {
      visitorId = cookieValue;
    }
  }

  // Priority 2: Check header (fallback for environments without cookies)
  if (!visitorId && req.headers[VISITOR_ID_CONFIG.HEADER_NAME.toLowerCase()]) {
    const headerValue = req.headers[VISITOR_ID_CONFIG.HEADER_NAME.toLowerCase()] as string;
    if (isValidVisitorId(headerValue)) {
      visitorId = headerValue;
    }
  }

  // Priority 3: Generate new ID
  if (!visitorId) {
    visitorId = generateVisitorId();
  }

  // Set cookie if not already present or if newly generated
  if (!req.cookies || !req.cookies[VISITOR_ID_CONFIG.COOKIE_NAME]) {
    setVisitorIdCookie(res, visitorId);
  }

  return visitorId;
}

/**
 * Set visitor ID cookie in response
 *
 * @param res - Express response
 * @param visitorId - Visitor ID to set
 */
export function setVisitorIdCookie(res: Response, visitorId: string): void {
  if (!isValidVisitorId(visitorId)) {
    throw new Error('Invalid visitor ID format');
  }

  res.cookie(VISITOR_ID_CONFIG.COOKIE_NAME, visitorId, {
    httpOnly: VISITOR_ID_CONFIG.COOKIE_OPTIONS.httpOnly,
    secure: VISITOR_ID_CONFIG.COOKIE_OPTIONS.secure,
    sameSite: VISITOR_ID_CONFIG.COOKIE_OPTIONS.sameSite,
    maxAge: VISITOR_ID_CONFIG.COOKIE_OPTIONS.maxAge,
    path: VISITOR_ID_CONFIG.COOKIE_OPTIONS.path,
  });
}

/**
 * Clear visitor ID cookie
 *
 * @param res - Express response
 */
export function clearVisitorIdCookie(res: Response): void {
  res.clearCookie(VISITOR_ID_CONFIG.COOKIE_NAME, {
    path: VISITOR_ID_CONFIG.COOKIE_OPTIONS.path,
  });
}

/**
 * Extract visitor ID from request without creating a new one
 * Returns null if no valid visitor ID found
 *
 * @param req - Express request
 * @returns Visitor ID or null
 */
export function getVisitorIdFromRequest(req: Request): string | null {
  // Check cookie
  if (req.cookies && req.cookies[VISITOR_ID_CONFIG.COOKIE_NAME]) {
    const cookieValue = req.cookies[VISITOR_ID_CONFIG.COOKIE_NAME];
    if (isValidVisitorId(cookieValue)) {
      return cookieValue;
    }
  }

  // Check header
  if (req.headers[VISITOR_ID_CONFIG.HEADER_NAME.toLowerCase()]) {
    const headerValue = req.headers[VISITOR_ID_CONFIG.HEADER_NAME.toLowerCase()] as string;
    if (isValidVisitorId(headerValue)) {
      return headerValue;
    }
  }

  return null;
}
