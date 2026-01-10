import crypto from 'crypto';

/**
 * Truncate IP address for privacy
 * IPv4: Keep first 3 octets (e.g., 192.168.1.0)
 * IPv6: Keep first 4 groups (e.g., 2001:0db8:85a3:0000::)
 */
export function truncateIP(ip: string): string {
  // Remove IPv6 prefix if present
  const cleanIp = ip.replace(/^::ffff:/, '');

  if (cleanIp.includes(':')) {
    // IPv6 - truncate to /64 (first 4 groups)
    const parts = cleanIp.split(':');
    return parts.slice(0, 4).join(':') + '::';
  } else {
    // IPv4 - truncate to /24 (first 3 octets)
    const parts = cleanIp.split('.');
    return parts.slice(0, 3).join('.') + '.0';
  }
}

/**
 * Generate IP hash for tracking (privacy-preserving)
 * Uses SHA256(truncatedIP + userAgent + salt)
 */
export function hashIP(ip: string, userAgent: string = ''): string {
  const salt = process.env.IP_HASH_SALT || 'default-salt-change-me';
  const truncated = truncateIP(ip);

  const hash = crypto
    .createHash('sha256')
    .update(truncated + userAgent + salt)
    .digest('hex');

  return hash;
}

/**
 * Sanitize referrer URL (remove sensitive params)
 */
export function sanitizeReferrer(referrer: string | undefined): string | null {
  if (!referrer || referrer.trim() === '') {
    return null;
  }

  try {
    const url = new URL(referrer);

    // Remove sensitive query params
    const sensitiveParams = ['token', 'api_key', 'password', 'secret', 'auth'];
    sensitiveParams.forEach(param => url.searchParams.delete(param));

    // Truncate to max 200 chars
    const sanitized = url.toString().substring(0, 200);

    return sanitized;
  } catch (error) {
    // Invalid URL
    return null;
  }
}

/**
 * Sanitize User-Agent (truncate to max 160 chars)
 */
export function sanitizeUserAgent(userAgent: string | undefined): string | null {
  if (!userAgent || userAgent.trim() === '') {
    return null;
  }

  return userAgent.substring(0, 160);
}

/**
 * Detect if User-Agent is a bot
 */
export function isBot(userAgent: string | undefined): boolean {
  if (!userAgent) {
    return false;
  }

  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /googlebot/i,
    /bingbot/i,
    /facebookexternalhit/i,
    /whatsapp/i,
    /telegram/i,
    /slackbot/i,
    /twitterbot/i,
    /linkedinbot/i,
    /discordbot/i,
    /baiduspider/i,
    /yandexbot/i
  ];

  return botPatterns.some(pattern => pattern.test(userAgent));
}

/**
 * Generate visitor key for rate limiting and deduplication
 * Priority: visitorId > ipHash > 'anon'
 */
export function generateVisitorKey(
  visitorId: string | null,
  ipHash: string | null
): string {
  return visitorId || ipHash || 'anon';
}

/**
 * Generate dedupe key
 * Format: <visitorKey>:<eventType>:<cardId>
 */
export function generateDedupeKey(
  visitorKey: string,
  eventType: string,
  cardId: string | null
): string {
  return `${visitorKey}:${eventType}:${cardId || 'none'}`;
}

/**
 * Get dedupe window (in seconds) for event type
 */
export function getDedupeWindow(eventType: string): number {
  const windows: Record<string, number> = {
    PUBLIC_PROFILE_VIEW: 60,
    PUBLIC_CARD_VIEW: 30,
    PUBLIC_CTA_CLICK: 10,
    PUBLIC_CARD_CLICK: 30
  };

  return windows[eventType] || 30;
}
