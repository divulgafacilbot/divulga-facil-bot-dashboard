/**
 * Deduplication Middleware - Feature 7
 *
 * Prevents duplicate event tracking within time windows.
 * Uses in-memory store with TTL + database persistence.
 */

import { Request, Response, NextFunction } from 'express';
import { DEDUPE_WINDOWS } from '../constants/tracking-config.js';
import { prisma } from '../db/prisma.js';
import crypto from 'crypto';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      isDuplicate?: boolean;
      dedupeKey?: string;
    }
  }
}

// In-memory store for deduplication
// Key: dedupe key, Value: expiresAt timestamp
const dedupeStore = new Map<string, number>();

// Cleanup expired entries every 2 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, expiresAt] of dedupeStore.entries()) {
    if (now > expiresAt) {
      dedupeStore.delete(key);
    }
  }
}, 2 * 60 * 1000);

/**
 * Generate dedupe key
 *
 * Format: <visitorId>:<eventType>:<cardId>
 */
function generateDedupeKey(
  visitorId: string,
  eventType: string,
  cardId?: string
): string {
  const components = [visitorId, eventType, cardId || 'none'];
  return crypto.createHash('sha256').update(components.join(':')).digest('hex');
}

/**
 * Check database for existing dedupe entry
 */
async function checkDatabaseDedupe(dedupeKey: string): Promise<Date | null> {
  try {
    const entry = await prisma.public_event_dedupe.findUnique({
      where: { dedupe_key: dedupeKey },
    });
    return entry?.expires_at || null;
  } catch (error) {
    console.error('[Dedupe] Database check error:', error);
    return null;
  }
}

/**
 * Persist dedupe entry to database
 */
async function persistDedupe(dedupeKey: string, expiresAt: Date): Promise<void> {
  try {
    await prisma.public_event_dedupe.upsert({
      where: { dedupe_key: dedupeKey },
      create: {
        dedupe_key: dedupeKey,
        expires_at: expiresAt,
      },
      update: {
        expires_at: expiresAt,
      },
    });
  } catch (error) {
    console.error('[Dedupe] Database persist error:', error);
  }
}

/**
 * Create dedupe middleware
 *
 * @param windowSeconds - Deduplication window in seconds
 */
function createDedupeMiddleware(windowSeconds: number) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const visitorId = req.visitorId || 'anonymous';
    const eventType = (req.body?.eventType || req.query?.eventType || 'UNKNOWN') as string;
    const cardId = (req.body?.cardId || req.params?.cardSlug) as string | undefined;

    // Generate dedupe key
    const dedupeKey = generateDedupeKey(visitorId, eventType, cardId);
    req.dedupeKey = dedupeKey;

    const now = Date.now();

    // 1. Check in-memory cache first (fast path)
    const existingExpiry = dedupeStore.get(dedupeKey);
    if (existingExpiry && now < existingExpiry) {
      req.isDuplicate = true;
      console.log(`[Dedupe] Duplicate event blocked (memory): ${eventType} for visitor ${visitorId.substring(0, 8)}`);
      next();
      return;
    }

    // 2. Check database (for cross-instance reliability)
    const dbExpiry = await checkDatabaseDedupe(dedupeKey);
    if (dbExpiry && now < dbExpiry.getTime()) {
      // Found in database, also update memory cache
      dedupeStore.set(dedupeKey, dbExpiry.getTime());
      req.isDuplicate = true;
      console.log(`[Dedupe] Duplicate event blocked (database): ${eventType} for visitor ${visitorId.substring(0, 8)}`);
      next();
      return;
    }

    // 3. Not a duplicate - record it in both stores
    const expiresAt = now + windowSeconds * 1000;
    const expiresAtDate = new Date(expiresAt);

    // Update in-memory cache
    dedupeStore.set(dedupeKey, expiresAt);

    // Persist to database (non-blocking)
    persistDedupe(dedupeKey, expiresAtDate).catch((err) => {
      console.error('[Dedupe] Background persist failed:', err);
    });

    req.isDuplicate = false;
    next();
  };
}

/**
 * Dedupe middleware for page views (60 second window)
 */
export const dedupeViewMiddleware = createDedupeMiddleware(DEDUPE_WINDOWS.PROFILE_VIEW);

/**
 * Dedupe middleware for CTA clicks (10 second window)
 */
export const dedupeClickMiddleware = createDedupeMiddleware(DEDUPE_WINDOWS.CTA_CLICK);

/**
 * Dedupe middleware for card views (30 second window)
 */
export const dedupeCardViewMiddleware = createDedupeMiddleware(DEDUPE_WINDOWS.CARD_VIEW);

/**
 * Generic dedupe middleware (uses default window)
 */
export const dedupeMiddleware = dedupeViewMiddleware;

/**
 * Get dedupe statistics (for monitoring)
 */
export function getDedupeStats(): {
  totalKeys: number;
  storeSize: number;
} {
  return {
    totalKeys: dedupeStore.size,
    storeSize: dedupeStore.size,
  };
}

/**
 * Clear dedupe store (for testing)
 */
export function clearDedupeStore(): void {
  dedupeStore.clear();
}
