/**
 * IP Hash Utilities - Feature 7
 *
 * Privacy-preserving IP hashing with salt and truncation.
 * Never store raw IPs - always hash them first.
 */

import crypto from 'crypto';
import { Request } from 'express';
import { TRACKING_CONFIG } from '../constants/tracking-config.js';

/**
 * Truncate IP address for privacy
 *
 * IPv4: Keep first 3 octets (e.g., 192.168.1.0) - /24 network
 * IPv6: Keep first 4 groups (e.g., 2001:0db8:85a3:0000::) - /64 network
 *
 * This provides anonymization while maintaining enough information
 * for abuse detection and analytics.
 *
 * @param ip - IP address to truncate
 * @returns Truncated IP address
 */
export function truncateIP(ip: string): string {
  // Remove IPv6 prefix if present (::ffff:xxx.xxx.xxx.xxx)
  const cleanIp = ip.replace(/^::ffff:/, '');

  if (cleanIp.includes(':')) {
    // IPv6 - truncate to /64 (first 4 groups)
    const parts = cleanIp.split(':');
    return parts.slice(0, 4).join(':') + '::';
  } else {
    // IPv4 - truncate to /24 (first 3 octets)
    const parts = cleanIp.split('.');
    if (parts.length !== 4) {
      // Invalid IPv4, return as-is
      return cleanIp;
    }
    return parts.slice(0, 3).join('.') + '.0';
  }
}

/**
 * Generate IP hash for tracking (privacy-preserving)
 *
 * Uses SHA-256(truncatedIP + salt) to create a one-way hash.
 * The salt prevents rainbow table attacks.
 *
 * @param ip - IP address to hash
 * @param salt - Salt for hashing (from environment or config)
 * @returns SHA-256 hash (64 hex characters)
 */
export function hashIP(ip: string, salt?: string): string {
  const hashSalt = salt || TRACKING_CONFIG.IP_HASH_SALT || 'default-salt-change-me';
  const truncated = truncateIP(ip);

  const hash = crypto
    .createHash('sha256')
    .update(truncated + hashSalt)
    .digest('hex');

  return hash;
}

/**
 * Extract IP address from Express request
 *
 * Priority:
 * 1. X-Forwarded-For (first IP in chain) - for proxied requests
 * 2. X-Real-IP - alternative proxy header
 * 3. req.ip - Express built-in
 * 4. req.socket.remoteAddress - fallback
 * 5. '0.0.0.0' - ultimate fallback (should never happen)
 *
 * @param req - Express request
 * @returns IP address (raw, not hashed)
 */
export function getIPFromRequest(req: Request): string {
  // Priority 1: X-Forwarded-For (commonly used by proxies)
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    if (Array.isArray(xForwardedFor)) {
      // Multiple headers (rare), take first
      const firstHeader = xForwardedFor[0];
      const firstIp = firstHeader.split(',')[0].trim();
      if (firstIp) return firstIp;
    } else {
      // Single header (most common case)
      const firstIp = xForwardedFor.split(',')[0].trim();
      if (firstIp) return firstIp;
    }
  }

  // Priority 2: X-Real-IP (used by some proxies like nginx)
  const xRealIp = req.headers['x-real-ip'];
  if (xRealIp && typeof xRealIp === 'string') {
    return xRealIp.trim();
  }

  // Priority 3: Express req.ip
  if (req.ip) {
    return req.ip;
  }

  // Priority 4: Socket remote address
  if (req.socket && req.socket.remoteAddress) {
    return req.socket.remoteAddress;
  }

  // Fallback (should never happen in practice)
  return '0.0.0.0';
}

/**
 * Get hashed IP from request
 *
 * Convenience function that combines getIPFromRequest() and hashIP().
 * This is the recommended way to get an IP hash in most cases.
 *
 * @param req - Express request
 * @param salt - Optional salt (defaults to environment config)
 * @returns Hashed IP address
 */
export function getHashedIPFromRequest(req: Request, salt?: string): string {
  const rawIp = getIPFromRequest(req);
  return hashIP(rawIp, salt);
}

/**
 * Validate that IP hashing is properly configured
 *
 * Throws error if salt is not set in production or is too weak.
 */
export function validateIPHashConfig(): void {
  if (process.env.NODE_ENV === 'production') {
    const salt = TRACKING_CONFIG.IP_HASH_SALT;

    if (!salt) {
      throw new Error(
        'IP_HASH_SALT environment variable is required in production'
      );
    }

    if (salt === 'default-salt-change-me') {
      throw new Error(
        'IP_HASH_SALT must be changed from default value in production'
      );
    }

    if (salt.length < 32) {
      throw new Error(
        'IP_HASH_SALT must be at least 32 characters for security'
      );
    }
  }
}

/**
 * Generate a secure random salt for IP hashing
 *
 * Use this to generate a salt for your .env file.
 * Run once and store the result securely.
 *
 * @returns Random 64-character hex string
 */
export function generateSecureIPSalt(): string {
  return crypto.randomBytes(32).toString('hex');
}
