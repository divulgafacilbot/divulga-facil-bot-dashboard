/**
 * Visitor ID Middleware - Feature 7
 *
 * Gets or creates visitor ID for tracking.
 * Sets cookie and attaches to request object.
 */

import { Request, Response, NextFunction } from 'express';
import { getOrCreateVisitorId } from '../utils/visitor-id.utils.js';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      visitorId?: string;
    }
  }
}

/**
 * Visitor ID Middleware
 *
 * Ensures every request has a visitor ID for tracking.
 * Creates new ID if none exists, sets cookie, attaches to request.
 */
export function visitorIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Get or create visitor ID
  const visitorId = getOrCreateVisitorId(req, res);

  // Attach to request for downstream use
  req.visitorId = visitorId;

  next();
}
