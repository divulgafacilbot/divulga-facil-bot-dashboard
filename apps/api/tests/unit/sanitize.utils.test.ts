/**
 * Data Sanitization Utilities - Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeReferrer,
  sanitizeUTM,
  sanitizeSlug,
  sanitizeEmail,
  sanitizeURL,
  sanitizeText,
  sanitizeCardSlug,
  escapeRegex,
  sanitizeMetadata,
} from '../../src/utils/sanitize.utils.js';

describe('Sanitize Utils', () => {
  describe('sanitizeReferrer', () => {
    it('should sanitize valid URL', () => {
      const ref = 'https://example.com/path?query=value';
      const sanitized = sanitizeReferrer(ref);

      expect(sanitized).toBe(ref);
    });

    it('should remove sensitive query params', () => {
      const ref = 'https://example.com/?token=secret&utm_source=google';
      const sanitized = sanitizeReferrer(ref);

      expect(sanitized).not.toContain('token=secret');
      expect(sanitized).toContain('utm_source=google');
    });

    it('should return null for invalid URL', () => {
      expect(sanitizeReferrer('not-a-url')).toBeNull();
      expect(sanitizeReferrer('')).toBeNull();
      expect(sanitizeReferrer(undefined)).toBeNull();
    });

    it('should truncate long URLs', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(300);
      const sanitized = sanitizeReferrer(longUrl);

      expect(sanitized).toHaveLength(200);
    });
  });

  describe('sanitizeUTM', () => {
    it('should preserve valid UTM values', () => {
      expect(sanitizeUTM('google')).toBe('google');
      expect(sanitizeUTM('facebook-ads')).toBe('facebook-ads');
      expect(sanitizeUTM('email_campaign')).toBe('email_campaign');
    });

    it('should remove SQL injection patterns', () => {
      const malicious = "'; DROP TABLE users; --";
      const sanitized = sanitizeUTM(malicious);

      expect(sanitized).not.toContain("'");
      expect(sanitized).not.toContain(';');
      expect(sanitized).not.toContain('--');
    });

    it('should remove XSS patterns', () => {
      const xss = '<script>alert("xss")</script>';
      const sanitized = sanitizeUTM(xss);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');
    });

    it('should truncate to 100 chars', () => {
      const long = 'a'.repeat(150);
      const sanitized = sanitizeUTM(long);

      expect(sanitized).toHaveLength(100);
    });

    it('should return null for empty/invalid input', () => {
      expect(sanitizeUTM('')).toBeNull();
      expect(sanitizeUTM('   ')).toBeNull();
      expect(sanitizeUTM(undefined)).toBeNull();
    });
  });

  describe('sanitizeSlug', () => {
    it('should preserve valid slugs', () => {
      expect(sanitizeSlug('my-page')).toBe('my-page');
      expect(sanitizeSlug('user123')).toBe('user123');
      expect(sanitizeSlug('best-products-2024')).toBe('best-products-2024');
    });

    it('should convert to lowercase', () => {
      expect(sanitizeSlug('MyPage')).toBe('mypage');
      expect(sanitizeSlug('UPPERCASE')).toBe('uppercase');
    });

    it('should remove special characters', () => {
      expect(sanitizeSlug('my@page!')).toBe('mypage');
      expect(sanitizeSlug('user_name')).toBe('username');
    });

    it('should remove leading/trailing hyphens', () => {
      expect(sanitizeSlug('-my-page-')).toBe('my-page');
      expect(sanitizeSlug('---slug---')).toBe('slug');
    });

    it('should replace multiple hyphens with single', () => {
      expect(sanitizeSlug('my---page')).toBe('my-page');
    });

    it('should return null for reserved words', () => {
      expect(sanitizeSlug('admin')).toBeNull();
      expect(sanitizeSlug('api')).toBeNull();
      expect(sanitizeSlug('auth')).toBeNull();
    });

    it('should return null for too short slugs', () => {
      expect(sanitizeSlug('ab')).toBeNull();
      expect(sanitizeSlug('a')).toBeNull();
    });

    it('should return null for too long slugs', () => {
      const longSlug = 'a'.repeat(50);
      expect(sanitizeSlug(longSlug)).toBeNull();
    });
  });

  describe('sanitizeEmail', () => {
    it('should preserve valid emails', () => {
      expect(sanitizeEmail('user@example.com')).toBe('user@example.com');
      expect(sanitizeEmail('test.user+tag@domain.co.uk')).toBe('test.user+tag@domain.co.uk');
    });

    it('should convert to lowercase', () => {
      expect(sanitizeEmail('User@Example.COM')).toBe('user@example.com');
    });

    it('should return null for invalid emails', () => {
      expect(sanitizeEmail('not-an-email')).toBeNull();
      expect(sanitizeEmail('missing@domain')).toBeNull();
      expect(sanitizeEmail('@domain.com')).toBeNull();
      expect(sanitizeEmail('user@')).toBeNull();
    });

    it('should truncate to 255 chars', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      const sanitized = sanitizeEmail(longEmail);

      expect(sanitized).toHaveLength(255);
    });
  });

  describe('sanitizeURL', () => {
    it('should preserve valid URLs', () => {
      const url = 'https://example.com/path';
      expect(sanitizeURL(url)).toBe(url + '/');
    });

    it('should allow only http/https', () => {
      expect(sanitizeURL('ftp://example.com')).toBeNull();
      expect(sanitizeURL('javascript:alert(1)')).toBeNull();
      expect(sanitizeURL('data:text/html,<script>')).toBeNull();
    });

    it('should return null for invalid URLs', () => {
      expect(sanitizeURL('not-a-url')).toBeNull();
      expect(sanitizeURL('')).toBeNull();
      expect(sanitizeURL(undefined)).toBeNull();
    });

    it('should truncate to max length', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2000);
      const sanitized = sanitizeURL(longUrl, 1000);

      expect(sanitized!.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('sanitizeText', () => {
    it('should preserve valid text', () => {
      const text = 'This is a valid text';
      expect(sanitizeText(text, 100)).toBe(text);
    });

    it('should remove HTML tags', () => {
      const html = 'Text with <b>bold</b> and <a href="#">link</a>';
      const sanitized = sanitizeText(html, 100);

      expect(sanitized).toBe('Text with bold and link');
    });

    it('should remove XSS patterns', () => {
      const xss = 'Text <script>alert("xss")</script>';
      const sanitized = sanitizeText(xss, 100);

      expect(sanitized).not.toContain('<script>');
    });

    it('should normalize whitespace', () => {
      const text = 'Text    with     spaces';
      const sanitized = sanitizeText(text, 100);

      expect(sanitized).toBe('Text with spaces');
    });

    it('should truncate to max length', () => {
      const long = 'a'.repeat(200);
      const sanitized = sanitizeText(long, 50);

      expect(sanitized).toHaveLength(50);
    });

    it('should return null for empty text', () => {
      expect(sanitizeText('', 100)).toBeNull();
      expect(sanitizeText('   ', 100)).toBeNull();
      expect(sanitizeText(undefined, 100)).toBeNull();
    });
  });

  describe('sanitizeCardSlug', () => {
    it('should preserve valid card slugs', () => {
      expect(sanitizeCardSlug('my-card')).toBe('my-card');
      expect(sanitizeCardSlug('card_123')).toBe('card_123');
    });

    it('should allow underscores', () => {
      expect(sanitizeCardSlug('my_card_slug')).toBe('my_card_slug');
    });

    it('should remove special characters', () => {
      expect(sanitizeCardSlug('card@123!')).toBe('card123');
    });

    it('should return null for too short/long slugs', () => {
      expect(sanitizeCardSlug('ab')).toBeNull();
      const longSlug = 'a'.repeat(100);
      expect(sanitizeCardSlug(longSlug)).toBeNull();
    });
  });

  describe('escapeRegex', () => {
    it('should escape regex special characters', () => {
      expect(escapeRegex('.*+?^${}()|[]\\')) toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');
    });

    it('should preserve normal characters', () => {
      expect(escapeRegex('abc123')).toBe('abc123');
    });
  });

  describe('sanitizeMetadata', () => {
    it('should preserve valid metadata', () => {
      const meta = { key: 'value', number: 123 };
      const sanitized = sanitizeMetadata(meta);

      expect(sanitized).toEqual(meta);
    });

    it('should remove sensitive keys', () => {
      const meta = { key: 'value', password: 'secret', token: 'abc' };
      const sanitized = sanitizeMetadata(meta);

      expect(sanitized).toHaveProperty('key');
      expect(sanitized).not.toHaveProperty('password');
      expect(sanitized).not.toHaveProperty('token');
    });

    it('should truncate string values', () => {
      const meta = { text: 'a'.repeat(1000) };
      const sanitized = sanitizeMetadata(meta);

      expect(sanitized!.text.length).toBeLessThanOrEqual(500);
    });

    it('should limit array size', () => {
      const meta = { array: Array(200).fill('item') };
      const sanitized = sanitizeMetadata(meta);

      expect(sanitized!.array.length).toBeLessThanOrEqual(100);
    });

    it('should limit object depth', () => {
      const deep = { l1: { l2: { l3: { l4: { l5: 'deep' } } } } };
      const sanitized = sanitizeMetadata(deep, 3);

      expect(sanitized!.l1.l2.l3).toBe('[max depth exceeded]');
    });

    it('should return null for invalid input', () => {
      expect(sanitizeMetadata(null)).toBeNull();
      expect(sanitizeMetadata('string' as any)).toBeNull();
      expect(sanitizeMetadata(123 as any)).toBeNull();
    });
  });
});
