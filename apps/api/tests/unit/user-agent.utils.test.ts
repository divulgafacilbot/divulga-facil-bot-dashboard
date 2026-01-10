/**
 * User-Agent Utilities - Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeUserAgent,
  isBotUserAgent,
  detectHeadless,
  parseUserAgent,
  shouldTrackUserAgent,
} from '../../src/utils/user-agent.utils.js';

describe('User-Agent Utils', () => {
  describe('sanitizeUserAgent', () => {
    it('should truncate to 160 characters', () => {
      const longUA = 'a'.repeat(200);
      const sanitized = sanitizeUserAgent(longUA);

      expect(sanitized).toHaveLength(160);
    });

    it('should return null for empty string', () => {
      expect(sanitizeUserAgent('')).toBeNull();
      expect(sanitizeUserAgent('   ')).toBeNull();
    });

    it('should return null for undefined', () => {
      expect(sanitizeUserAgent(undefined)).toBeNull();
    });

    it('should remove email addresses', () => {
      const ua = 'Mozilla/5.0 (email: test@example.com)';
      const sanitized = sanitizeUserAgent(ua);

      expect(sanitized).not.toContain('test@example.com');
      expect(sanitized).toContain('[email]');
    });

    it('should remove phone numbers', () => {
      const ua = 'Mozilla/5.0 (phone: 555-123-4567)';
      const sanitized = sanitizeUserAgent(ua);

      expect(sanitized).toContain('[phone]');
    });

    it('should preserve valid user-agent strings', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124';
      const sanitized = sanitizeUserAgent(ua);

      expect(sanitized).toBe(ua);
    });
  });

  describe('isBotUserAgent', () => {
    it('should detect Googlebot', () => {
      const ua = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
      expect(isBotUserAgent(ua)).toBe(true);
    });

    it('should detect generic bot pattern', () => {
      expect(isBotUserAgent('SomeBot/1.0')).toBe(true);
      expect(isBotUserAgent('WebCrawler/1.0')).toBe(true);
      expect(isBotUserAgent('Spider/1.0')).toBe(true);
    });

    it('should not detect normal browsers as bots', () => {
      const chromeUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0';
      const firefoxUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/89.0';

      expect(isBotUserAgent(chromeUA)).toBe(false);
      expect(isBotUserAgent(firefoxUA)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isBotUserAgent(undefined)).toBe(false);
    });
  });

  describe('detectHeadless', () => {
    it('should detect HeadlessChrome', () => {
      const ua = 'Mozilla/5.0 (X11; Linux x86_64) Chrome/91.0.4472.124 HeadlessChrome';
      expect(detectHeadless(ua)).toBe(true);
    });

    it('should detect Puppeteer', () => {
      const ua = 'Mozilla/5.0 (X11; Linux x86_64) Chrome/91.0 Puppeteer/10.0.0';
      expect(detectHeadless(ua)).toBe(true);
    });

    it('should detect Playwright', () => {
      const ua = 'Mozilla/5.0 (X11; Linux x86_64) Playwright/1.12.0';
      expect(detectHeadless(ua)).toBe(true);
    });

    it('should detect Selenium', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Selenium/3.141.0';
      expect(detectHeadless(ua)).toBe(true);
    });

    it('should not detect normal browsers', () => {
      const chromeUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0';
      expect(detectHeadless(chromeUA)).toBe(false);
    });
  });

  describe('parseUserAgent', () => {
    it('should parse Chrome user-agent', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124';
      const parsed = parseUserAgent(ua);

      expect(parsed.browser).toBe('Chrome');
      expect(parsed.platform).toBe('Windows');
      expect(parsed.isMobile).toBe(false);
      expect(parsed.isBot).toBe(false);
    });

    it('should parse Firefox user-agent', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/89.0';
      const parsed = parseUserAgent(ua);

      expect(parsed.browser).toBe('Firefox');
      expect(parsed.platform).toBe('Windows');
    });

    it('should detect mobile devices', () => {
      const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) Safari/604.1';
      const parsed = parseUserAgent(ua);

      expect(parsed.isMobile).toBe(true);
      expect(parsed.platform).toBe('iOS');
    });

    it('should detect bots', () => {
      const ua = 'Googlebot/2.1';
      const parsed = parseUserAgent(ua);

      expect(parsed.isBot).toBe(true);
    });

    it('should detect headless browsers', () => {
      const ua = 'Mozilla/5.0 HeadlessChrome/91.0';
      const parsed = parseUserAgent(ua);

      expect(parsed.isHeadless).toBe(true);
    });

    it('should handle undefined gracefully', () => {
      const parsed = parseUserAgent(undefined);

      expect(parsed.browser).toBe('Unknown');
      expect(parsed.platform).toBe('Unknown');
      expect(parsed.isMobile).toBe(false);
      expect(parsed.isBot).toBe(false);
      expect(parsed.isHeadless).toBe(false);
    });
  });

  describe('shouldTrackUserAgent', () => {
    it('should track normal browsers', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0';
      expect(shouldTrackUserAgent(ua)).toBe(true);
    });

    it('should not track bots by default', () => {
      const ua = 'Googlebot/2.1';
      expect(shouldTrackUserAgent(ua)).toBe(false);
    });

    it('should never track headless browsers', () => {
      const ua = 'HeadlessChrome/91.0';
      expect(shouldTrackUserAgent(ua)).toBe(false);
    });

    it('should not track missing user-agent', () => {
      expect(shouldTrackUserAgent(undefined)).toBe(false);
      expect(shouldTrackUserAgent('')).toBe(false);
    });
  });
});
