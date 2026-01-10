/**
 * Data Sanitization Utilities - Feature 7
 *
 * Sanitize user inputs to prevent SQL injection, XSS, and other attacks.
 * Also ensures data fits within database constraints.
 */

import { TRACKING_CONFIG, PUBLIC_PAGE_CONFIG } from '../constants/tracking-config.js';

/**
 * Sanitize referrer URL
 *
 * - Validates URL format
 * - Removes sensitive query parameters
 * - Truncates to max length
 * - Returns null for invalid URLs
 *
 * @param referrer - Raw referrer string
 * @returns Sanitized referrer or null
 */
export function sanitizeReferrer(referrer: string | undefined): string | null {
  if (!referrer || referrer.trim() === '') {
    return null;
  }

  try {
    const url = new URL(referrer);

    // Remove sensitive query params
    const sensitiveParams = [
      'token',
      'api_key',
      'apikey',
      'password',
      'secret',
      'auth',
      'session',
      'jwt',
      'access_token',
      'refresh_token',
    ];
    sensitiveParams.forEach((param) => url.searchParams.delete(param));

    // Truncate to max length
    const sanitized = url.toString().substring(0, TRACKING_CONFIG.REFERRER_MAX_LENGTH);

    return sanitized;
  } catch (error) {
    // Invalid URL - return null
    return null;
  }
}

/**
 * Sanitize UTM parameter (source, medium, campaign)
 *
 * - Removes SQL injection patterns
 * - Removes XSS patterns
 * - Truncates to safe length (100 chars)
 * - Returns null for invalid input
 *
 * @param value - Raw UTM parameter value
 * @returns Sanitized value or null
 */
export function sanitizeUTM(value: string | undefined): string | null {
  if (!value || typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  let sanitized = value.trim();

  // Remove SQL injection patterns
  sanitized = sanitized.replace(/['";\\]/g, '');
  sanitized = sanitized.replace(/--/g, '');
  sanitized = sanitized.replace(/\/\*/g, '');
  sanitized = sanitized.replace(/\*\//g, '');

  // Remove XSS patterns
  sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '');
  sanitized = sanitized.replace(/<[^>]+>/g, '');
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');

  // Truncate to 100 chars
  sanitized = sanitized.substring(0, 100);

  // Return null if empty after sanitization
  if (sanitized.trim() === '') {
    return null;
  }

  return sanitized;
}

/**
 * Sanitize public slug (for URLs)
 *
 * - Lowercase only
 * - Alphanumeric + hyphens only
 * - No leading/trailing hyphens
 * - Checks against reserved words
 * - Validates length
 *
 * @param slug - Raw slug string
 * @returns Sanitized slug or null if invalid
 */
export function sanitizeSlug(slug: string | undefined): string | null {
  if (!slug || typeof slug !== 'string') {
    return null;
  }

  // Convert to lowercase
  let sanitized = slug.toLowerCase().trim();

  // Remove all non-alphanumeric except hyphens
  sanitized = sanitized.replace(/[^a-z0-9-]/g, '');

  // Remove leading/trailing hyphens
  sanitized = sanitized.replace(/^-+|-+$/g, '');

  // Replace multiple consecutive hyphens with single
  sanitized = sanitized.replace(/-+/g, '-');

  // Check length
  if (
    sanitized.length < PUBLIC_PAGE_CONFIG.SLUG.MIN_LENGTH ||
    sanitized.length > PUBLIC_PAGE_CONFIG.SLUG.MAX_LENGTH
  ) {
    return null;
  }

  // Check reserved words
  if (PUBLIC_PAGE_CONFIG.SLUG.RESERVED.includes(sanitized)) {
    return null;
  }

  return sanitized;
}

/**
 * Sanitize email address
 *
 * - Validates email format
 * - Converts to lowercase
 * - Truncates to 255 chars
 *
 * @param email - Raw email string
 * @returns Sanitized email or null if invalid
 */
export function sanitizeEmail(email: string | undefined): string | null {
  if (!email || typeof email !== 'string') {
    return null;
  }

  const sanitized = email.toLowerCase().trim();

  // Basic email validation regex
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

  if (!emailRegex.test(sanitized)) {
    return null;
  }

  // Truncate to 255 chars (database limit)
  return sanitized.substring(0, 255);
}

/**
 * Sanitize URL
 *
 * - Validates URL format
 * - Allows only http/https protocols
 * - Truncates to max length
 *
 * @param url - Raw URL string
 * @param maxLength - Maximum allowed length (default: 1000)
 * @returns Sanitized URL or null if invalid
 */
export function sanitizeURL(url: string | undefined, maxLength: number = 1000): string | null {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return null;
  }

  try {
    const parsed = new URL(url.trim());

    // Only allow http/https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }

    const sanitized = parsed.toString();

    // Truncate to max length
    return sanitized.substring(0, maxLength);
  } catch (error) {
    // Invalid URL
    return null;
  }
}

/**
 * Sanitize text field (bio, description, etc.)
 *
 * - Removes HTML tags
 * - Removes XSS patterns
 * - Trims whitespace
 * - Truncates to max length
 *
 * @param text - Raw text
 * @param maxLength - Maximum allowed length
 * @returns Sanitized text or null
 */
export function sanitizeText(text: string | undefined, maxLength: number): string | null {
  if (!text || typeof text !== 'string' || text.trim() === '') {
    return null;
  }

  let sanitized = text.trim();

  // Remove HTML tags
  sanitized = sanitized.replace(/<[^>]+>/g, '');

  // Remove XSS patterns
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');
  sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '');

  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ');

  // Truncate
  sanitized = sanitized.substring(0, maxLength);

  if (sanitized.trim() === '') {
    return null;
  }

  return sanitized;
}

/**
 * Sanitize card slug (more permissive than public slug)
 *
 * - Alphanumeric + hyphens + underscores
 * - Validates length
 *
 * @param slug - Raw card slug
 * @returns Sanitized slug or null
 */
export function sanitizeCardSlug(slug: string | undefined): string | null {
  if (!slug || typeof slug !== 'string') {
    return null;
  }

  let sanitized = slug.toLowerCase().trim();

  // Allow alphanumeric, hyphens, and underscores
  sanitized = sanitized.replace(/[^a-z0-9-_]/g, '');

  // Remove leading/trailing separators
  sanitized = sanitized.replace(/^[-_]+|[-_]+$/g, '');

  // Check length
  if (
    sanitized.length < PUBLIC_PAGE_CONFIG.CARD.SLUG_MIN_LENGTH ||
    sanitized.length > PUBLIC_PAGE_CONFIG.CARD.SLUG_MAX_LENGTH
  ) {
    return null;
  }

  return sanitized;
}

/**
 * Escape string for use in regex
 *
 * @param string - String to escape
 * @returns Escaped string
 */
export function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Sanitize JSON metadata
 *
 * - Ensures valid JSON
 * - Removes sensitive keys
 * - Truncates string values
 * - Limits object depth
 *
 * @param metadata - Raw metadata object
 * @param maxDepth - Maximum object depth (default: 3)
 * @returns Sanitized metadata or null
 */
export function sanitizeMetadata(
  metadata: any,
  maxDepth: number = 3
): Record<string, any> | null {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }

  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth'];

  function sanitizeObject(obj: any, depth: number): any {
    if (depth > maxDepth) {
      return '[max depth exceeded]';
    }

    if (Array.isArray(obj)) {
      return obj.slice(0, 100).map((item) => sanitizeObject(item, depth + 1));
    }

    if (obj === null || typeof obj !== 'object') {
      if (typeof obj === 'string') {
        return obj.substring(0, 500);
      }
      return obj;
    }

    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      // Skip sensitive keys
      if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
        continue;
      }

      sanitized[key] = sanitizeObject(value, depth + 1);
    }

    return sanitized;
  }

  try {
    return sanitizeObject(metadata, 0);
  } catch (error) {
    return null;
  }
}
