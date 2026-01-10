/**
 * User-Agent Sanitization Utilities - Feature 7
 *
 * Sanitize, validate, and analyze user-agent strings.
 * Detects bots and headless browsers for tracking filtering.
 */

import { BOT_PATTERNS, TRACKING_CONFIG } from '../constants/tracking-config.js';

/**
 * Sanitize user-agent string
 *
 * - Truncates to max length (160 chars)
 * - Removes potential PII patterns
 * - Handles null/undefined safely
 *
 * @param userAgent - Raw user-agent string
 * @returns Sanitized user-agent or null
 */
export function sanitizeUserAgent(userAgent: string | undefined): string | null {
  if (!userAgent || typeof userAgent !== 'string' || userAgent.trim() === '') {
    return null;
  }

  // Truncate to max length
  let sanitized = userAgent.substring(0, TRACKING_CONFIG.USER_AGENT_MAX_LENGTH);

  // Remove potential PII patterns (email addresses, phone numbers)
  sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[email]');
  sanitized = sanitized.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[phone]');

  return sanitized.trim();
}

/**
 * Check if user-agent matches bot patterns
 *
 * @param userAgent - User-agent string to check
 * @returns True if bot detected
 */
export function isBotUserAgent(userAgent: string | undefined): boolean {
  if (!userAgent || typeof userAgent !== 'string') {
    return false;
  }

  return BOT_PATTERNS.some((pattern) => pattern.test(userAgent));
}

/**
 * Detect headless browsers (Puppeteer, Playwright, Selenium)
 *
 * Headless browsers are often used for scraping and automation.
 * They should be filtered from analytics.
 *
 * @param userAgent - User-agent string to check
 * @returns True if headless browser detected
 */
export function detectHeadless(userAgent: string | undefined): boolean {
  if (!userAgent || typeof userAgent !== 'string') {
    return false;
  }

  const headlessPatterns = [
    /headless/i,
    /phantomjs/i,
    /selenium/i,
    /webdriver/i,
    /puppeteer/i,
    /playwright/i,
    /chrome.*headless/i,
    /firefox.*headless/i,
  ];

  return headlessPatterns.some((pattern) => pattern.test(userAgent));
}

/**
 * Parse user-agent to extract browser info
 *
 * Simple extraction for analytics purposes.
 * Not a full parser like ua-parser-js.
 *
 * @param userAgent - User-agent string
 * @returns Browser info object
 */
export function parseUserAgent(userAgent: string | undefined): {
  browser: string;
  platform: string;
  isMobile: boolean;
  isBot: boolean;
  isHeadless: boolean;
} {
  if (!userAgent) {
    return {
      browser: 'Unknown',
      platform: 'Unknown',
      isMobile: false,
      isBot: false,
      isHeadless: false,
    };
  }

  // Detect browser
  let browser = 'Unknown';
  if (/edg/i.test(userAgent)) {
    browser = 'Edge';
  } else if (/chrome/i.test(userAgent) && !/edg/i.test(userAgent)) {
    browser = 'Chrome';
  } else if (/firefox/i.test(userAgent)) {
    browser = 'Firefox';
  } else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) {
    browser = 'Safari';
  } else if (/opera|opr/i.test(userAgent)) {
    browser = 'Opera';
  }

  // Detect platform
  let platform = 'Unknown';
  if (/windows/i.test(userAgent)) {
    platform = 'Windows';
  } else if (/mac os x/i.test(userAgent)) {
    platform = 'MacOS';
  } else if (/linux/i.test(userAgent)) {
    platform = 'Linux';
  } else if (/android/i.test(userAgent)) {
    platform = 'Android';
  } else if (/iphone|ipad|ipod/i.test(userAgent)) {
    platform = 'iOS';
  }

  // Detect mobile
  const isMobile = /mobile|android|iphone|ipad|ipod/i.test(userAgent);

  // Detect bot and headless
  const isBot = isBotUserAgent(userAgent);
  const isHeadless = detectHeadless(userAgent);

  return {
    browser,
    platform,
    isMobile,
    isBot,
    isHeadless,
  };
}

/**
 * Check if user-agent should be tracked
 *
 * Returns false if:
 * - Bot detected (unless TRACK_BOTS=true)
 * - Headless browser detected
 * - Invalid/missing user-agent
 *
 * @param userAgent - User-agent string
 * @returns True if should track
 */
export function shouldTrackUserAgent(userAgent: string | undefined): boolean {
  if (!userAgent) {
    // No user-agent = suspicious, don't track
    return false;
  }

  // Never track headless browsers
  if (detectHeadless(userAgent)) {
    return false;
  }

  // Track bots only if explicitly enabled
  if (isBotUserAgent(userAgent) && !TRACKING_CONFIG.TRACK_BOTS) {
    return false;
  }

  return true;
}
