/**
 * Tracking Configuration - Feature 7
 *
 * Centralized configuration for tracking, rate limiting, and anti-inflation.
 */

// ============================================================
// VISITOR ID CONFIGURATION
// ============================================================

export const VISITOR_ID_CONFIG = {
  /**
   * Cookie name for storing visitor ID
   */
  COOKIE_NAME: 'df_vid',

  /**
   * Cookie options
   */
  COOKIE_OPTIONS: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year in milliseconds
    path: '/',
  },

  /**
   * Header name for visitor ID (fallback if cookie not available)
   */
  HEADER_NAME: 'X-Visitor-ID',
} as const;

// ============================================================
// RATE LIMITS
// ============================================================

/**
 * Rate limiting configuration
 * Format: { windowMs, max }
 */
export const RATE_LIMITS = {
  /**
   * Page views: 5 per minute per IP
   * Conservative to prevent inflation
   */
  PAGE_VIEWS: {
    windowMs: 60 * 1000, // 1 minute
    max: 5,
    message: 'Too many page views. Please try again later.',
  },

  /**
   * CTA clicks: 10 per minute per visitor
   * Allows legitimate rapid clicks (e.g., user exploring products)
   */
  CTA_CLICKS: {
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    message: 'Too many clicks. Please slow down.',
  },

  /**
   * Event tracking: 30 per minute per visitor
   * Covers profile views, card views, and other client-side events
   */
  EVENTS: {
    windowMs: 60 * 1000, // 1 minute
    max: 30,
    message: 'Too many events tracked.',
  },

  /**
   * General public routes: 100 per minute per IP
   * For API calls that don't require strict limiting
   */
  PUBLIC_GENERAL: {
    windowMs: 60 * 1000, // 1 minute
    max: 100,
    message: 'Too many requests.',
  },
} as const;

// ============================================================
// DEDUPLICATION WINDOWS
// ============================================================

/**
 * Deduplication time windows (in seconds)
 * Prevents double-counting events within the specified time
 */
export const DEDUPE_WINDOWS = {
  /**
   * Profile view: 60 seconds
   * User viewing same profile multiple times in quick succession = 1 view
   */
  PROFILE_VIEW: 60, // 60 seconds

  /**
   * Card view: 30 seconds
   * User viewing same card multiple times = 1 view
   */
  CARD_VIEW: 30, // 30 seconds

  /**
   * CTA click: 10 seconds
   * Prevents accidental double-clicks
   */
  CTA_CLICK: 10, // 10 seconds

  /**
   * Card click: 10 seconds
   * Same as CTA click
   */
  CARD_CLICK: 10, // 10 seconds
} as const;

// ============================================================
// BOT DETECTION PATTERNS
// ============================================================

/**
 * Comprehensive list of bot user-agent patterns
 * Used for filtering bot traffic from analytics
 */
export const BOT_PATTERNS = [
  // Search engine bots
  /googlebot/i,
  /bingbot/i,
  /yahoo.*slurp/i,
  /duckduckbot/i,
  /baiduspider/i,
  /yandexbot/i,
  /sogou/i,
  /exabot/i,

  // Social media bots
  /facebookexternalhit/i,
  /twitterbot/i,
  /linkedinbot/i,
  /pinterestbot/i,
  /slackbot/i,
  /telegrambot/i,
  /whatsapp/i,
  /discordbot/i,
  /redditbot/i,

  // Generic patterns
  /bot/i,
  /crawler/i,
  /spider/i,
  /scraper/i,
  /fetch/i,
  /monitor/i,
  /checker/i,

  // Headless browsers
  /headless/i,
  /phantomjs/i,
  /selenium/i,
  /webdriver/i,
  /puppeteer/i,
  /playwright/i,

  // Feed readers
  /feed/i,
  /rss/i,
  /atom/i,

  // Archivers
  /wget/i,
  /curl/i,
  /httpie/i,
  /python-requests/i,
  /axios/i,
  /node-fetch/i,

  // Validators
  /validator/i,
  /checker/i,
  /lighthouse/i,
  /pagespeed/i,

  // Other known bots
  /ahrefsbot/i,
  /semrushbot/i,
  /dotbot/i,
  /mj12bot/i,
  /archive.org_bot/i,
] as const;

// ============================================================
// PUBLIC PAGE CONFIGURATION
// ============================================================

/**
 * Public page validation rules
 */
export const PUBLIC_PAGE_CONFIG = {
  /**
   * Slug validation
   */
  SLUG: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 30,
    PATTERN: /^[a-z0-9-]+$/,
    RESERVED: ['admin', 'api', 'auth', 'public', 'static', 'assets', 'r'] as string[],
  },

  /**
   * Bio limits
   */
  BIO: {
    MAX_LENGTH: 500,
  },

  /**
   * Display name limits
   */
  DISPLAY_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
  },

  /**
   * Card limits
   */
  CARD: {
    TITLE_MAX_LENGTH: 200,
    DESCRIPTION_MAX_LENGTH: 1000,
    COUPON_MAX_LENGTH: 100,
    SLUG_MIN_LENGTH: 3,
    SLUG_MAX_LENGTH: 50,
  },
} as const;

// ============================================================
// TRACKING CONFIGURATION
// ============================================================

/**
 * General tracking settings
 */
export const TRACKING_CONFIG = {
  /**
   * TTL for public events (30 days)
   * After this, events are deleted by housekeeping job
   */
  EVENT_TTL_DAYS: 30,

  /**
   * TTL for dedupe entries (matches longest dedupe window)
   */
  DEDUPE_TTL_SECONDS: Math.max(...Object.values(DEDUPE_WINDOWS)),

  /**
   * IP hash salt (loaded from environment)
   */
  IP_HASH_SALT: process.env.IP_HASH_SALT || '',

  /**
   * Whether to track bots (usually false)
   */
  TRACK_BOTS: process.env.TRACK_BOTS === 'true',

  /**
   * User-agent max length for storage
   */
  USER_AGENT_MAX_LENGTH: 160,

  /**
   * Referrer max length for storage
   */
  REFERRER_MAX_LENGTH: 200,

  /**
   * Visitor ID max length
   */
  VISITOR_ID_MAX_LENGTH: 50,

  /**
   * IP hash length (SHA-256 = 64 chars)
   */
  IP_HASH_LENGTH: 64,
} as const;

// ============================================================
// ANALYTICS CONFIGURATION
// ============================================================

/**
 * Default date ranges for analytics
 */
export const ANALYTICS_CONFIG = {
  DEFAULT_DAYS: 30,
  MAX_DAYS: 90,
  MIN_DAYS: 1,
} as const;

// ============================================================
// VALIDATION FUNCTIONS
// ============================================================

/**
 * Validate public slug format
 */
export function isValidPublicSlug(slug: string): boolean {
  if (slug.length < PUBLIC_PAGE_CONFIG.SLUG.MIN_LENGTH) return false;
  if (slug.length > PUBLIC_PAGE_CONFIG.SLUG.MAX_LENGTH) return false;
  if (!PUBLIC_PAGE_CONFIG.SLUG.PATTERN.test(slug)) return false;
  if (PUBLIC_PAGE_CONFIG.SLUG.RESERVED.includes(slug)) return false;
  return true;
}

/**
 * Validate card slug format
 */
export function isValidCardSlug(slug: string): boolean {
  if (slug.length < PUBLIC_PAGE_CONFIG.CARD.SLUG_MIN_LENGTH) return false;
  if (slug.length > PUBLIC_PAGE_CONFIG.CARD.SLUG_MAX_LENGTH) return false;
  // Same pattern as public slug
  return PUBLIC_PAGE_CONFIG.SLUG.PATTERN.test(slug);
}

/**
 * Check if user agent matches bot patterns
 */
export function isBotUserAgent(userAgent: string | undefined): boolean {
  if (!userAgent) return false;
  return BOT_PATTERNS.some((pattern) => pattern.test(userAgent));
}

/**
 * Get dedupe window for event type
 */
export function getDedupeWindow(eventType: string): number {
  const windows: Record<string, number> = {
    PUBLIC_PROFILE_VIEW: DEDUPE_WINDOWS.PROFILE_VIEW,
    PUBLIC_CARD_VIEW: DEDUPE_WINDOWS.CARD_VIEW,
    PUBLIC_CTA_CLICK: DEDUPE_WINDOWS.CTA_CLICK,
    PUBLIC_CARD_CLICK: DEDUPE_WINDOWS.CARD_CLICK,
  };

  return windows[eventType] || DEDUPE_WINDOWS.CARD_VIEW;
}

/**
 * Validate IP hash salt is configured
 * Throws error if not set in production
 */
export function validateTrackingConfig(): void {
  if (process.env.NODE_ENV === 'production') {
    if (!TRACKING_CONFIG.IP_HASH_SALT || TRACKING_CONFIG.IP_HASH_SALT.length < 32) {
      throw new Error(
        'IP_HASH_SALT must be set and at least 32 characters in production environment'
      );
    }
  }
}
