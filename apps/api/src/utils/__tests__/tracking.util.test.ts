import { describe, it, expect } from 'vitest';
import {
  truncateIP,
  hashIP,
  sanitizeReferrer,
  sanitizeUserAgent,
  isBot,
  generateVisitorKey,
  generateDedupeKey,
  getDedupeWindow
} from '../tracking.util.js';

describe('TrackingUtil', () => {
  describe('truncateIP', () => {
    it('should truncate IPv4 to /24', () => {
      expect(truncateIP('192.168.1.100')).toBe('192.168.1.0');
      expect(truncateIP('10.0.0.5')).toBe('10.0.0.0');
    });

    it('should truncate IPv6 to /64', () => {
      expect(truncateIP('2001:0db8:85a3:0000:0000:8a2e:0370:7334'))
        .toBe('2001:0db8:85a3:0000::');
    });

    it('should handle IPv6-mapped IPv4', () => {
      expect(truncateIP('::ffff:192.168.1.100')).toBe('192.168.1.0');
    });
  });

  describe('hashIP', () => {
    it('should generate consistent hash', () => {
      const hash1 = hashIP('192.168.1.100', 'Mozilla/5.0');
      const hash2 = hashIP('192.168.1.100', 'Mozilla/5.0');
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different subnets', () => {
      const hash1 = hashIP('192.168.1.100', 'Mozilla/5.0');
      const hash2 = hashIP('192.168.2.100', 'Mozilla/5.0');
      expect(hash1).not.toBe(hash2);
    });

    it('should generate 64-character hex string', () => {
      const hash = hashIP('192.168.1.100', 'Mozilla/5.0');
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('sanitizeReferrer', () => {
    it('should remove sensitive query params', () => {
      const referrer = 'https://example.com?token=secret&foo=bar';
      const sanitized = sanitizeReferrer(referrer);
      expect(sanitized).not.toContain('token');
      expect(sanitized).toContain('foo=bar');
    });

    it('should truncate to 200 chars', () => {
      const longUrl = 'https://example.com?' + 'a'.repeat(300);
      const sanitized = sanitizeReferrer(longUrl);
      expect(sanitized!.length).toBeLessThanOrEqual(200);
    });

    it('should return null for invalid URLs', () => {
      expect(sanitizeReferrer('not-a-url')).toBeNull();
      expect(sanitizeReferrer('')).toBeNull();
      expect(sanitizeReferrer(undefined)).toBeNull();
    });

    it('should remove multiple sensitive params', () => {
      const referrer = 'https://example.com?token=abc&api_key=xyz&password=123&foo=bar';
      const sanitized = sanitizeReferrer(referrer);
      expect(sanitized).not.toContain('token');
      expect(sanitized).not.toContain('api_key');
      expect(sanitized).not.toContain('password');
      expect(sanitized).toContain('foo=bar');
    });
  });

  describe('sanitizeUserAgent', () => {
    it('should truncate to 160 chars', () => {
      const longUA = 'Mozilla/5.0 ' + 'a'.repeat(200);
      const sanitized = sanitizeUserAgent(longUA);
      expect(sanitized!.length).toBe(160);
    });

    it('should return null for empty input', () => {
      expect(sanitizeUserAgent('')).toBeNull();
      expect(sanitizeUserAgent(undefined)).toBeNull();
    });

    it('should preserve short user agents', () => {
      const ua = 'Mozilla/5.0';
      expect(sanitizeUserAgent(ua)).toBe(ua);
    });
  });

  describe('isBot', () => {
    it('should detect common bots', () => {
      expect(isBot('Googlebot/2.1')).toBe(true);
      expect(isBot('Mozilla/5.0 (compatible; bingbot/2.0)')).toBe(true);
      expect(isBot('facebookexternalhit/1.1')).toBe(true);
      expect(isBot('WhatsApp/2.0')).toBe(true);
      expect(isBot('TelegramBot (like TwitterBot)')).toBe(true);
    });

    it('should not detect regular browsers', () => {
      expect(isBot('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe(false);
      expect(isBot('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)')).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isBot(undefined)).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isBot('GOOGLEBOT/2.1')).toBe(true);
      expect(isBot('BingBot/2.0')).toBe(true);
    });
  });

  describe('generateVisitorKey', () => {
    it('should prioritize visitorId', () => {
      expect(generateVisitorKey('visitor123', 'hash456')).toBe('visitor123');
    });

    it('should fallback to ipHash', () => {
      expect(generateVisitorKey(null, 'hash456')).toBe('hash456');
    });

    it('should fallback to anon', () => {
      expect(generateVisitorKey(null, null)).toBe('anon');
    });
  });

  describe('generateDedupeKey', () => {
    it('should generate correct dedupe key', () => {
      const key = generateDedupeKey('visitor123', 'PUBLIC_CTA_CLICK', 'card456');
      expect(key).toBe('visitor123:PUBLIC_CTA_CLICK:card456');
    });

    it('should handle null cardId', () => {
      const key = generateDedupeKey('visitor123', 'PUBLIC_PROFILE_VIEW', null);
      expect(key).toBe('visitor123:PUBLIC_PROFILE_VIEW:none');
    });
  });

  describe('getDedupeWindow', () => {
    it('should return correct windows', () => {
      expect(getDedupeWindow('PUBLIC_PROFILE_VIEW')).toBe(60);
      expect(getDedupeWindow('PUBLIC_CARD_VIEW')).toBe(30);
      expect(getDedupeWindow('PUBLIC_CTA_CLICK')).toBe(10);
      expect(getDedupeWindow('PUBLIC_CARD_CLICK')).toBe(30);
    });

    it('should return default for unknown type', () => {
      expect(getDedupeWindow('UNKNOWN')).toBe(30);
    });
  });
});
