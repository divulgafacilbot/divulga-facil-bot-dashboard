/**
 * Bot Filter Middleware - Feature 7
 *
 * Detects and filters bot traffic to prevent analytics inflation.
 * Sets `req.isBot` flag for downstream processing.
 */

import { Request, Response, NextFunction } from 'express';
import { isBotUserAgent, detectHeadless } from '../utils/user-agent.utils.js';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      isBot?: boolean;
      isHeadless?: boolean;
    }
  }
}

/**
 * Bot Filter Middleware
 *
 * Analyzes User-Agent to detect bots and headless browsers.
 * Sets flags on request object for tracking decisions.
 *
 * Does NOT block requests - only marks them for filtering later.
 */
export function botFilterMiddleware(req: Request, res: Response, next: NextFunction): void {
  const userAgent = req.headers['user-agent'];

  // Detect bots
  req.isBot = isBotUserAgent(userAgent);

  // Detect headless browsers
  req.isHeadless = detectHeadless(userAgent);

  // Log bot detection (optional, for monitoring)
  if (req.isBot || req.isHeadless) {
    const type = req.isHeadless ? 'headless' : 'bot';
    console.log(`[BotFilter] Detected ${type}: ${userAgent?.substring(0, 100)}`);
  }

  // Always continue - don't block bots
  next();
}
