import { describe, it, expect } from 'vitest';
import { normalizeSlug, validateSlug } from '../slug.util.js';

describe('SlugUtil', () => {
  describe('normalizeSlug', () => {
    it('should normalize basic email local part', () => {
      expect(normalizeSlug('john.doe')).toBe('john-doe');
      expect(normalizeSlug('jane_smith')).toBe('jane-smith');
    });

    it('should remove accents', () => {
      expect(normalizeSlug('joão')).toBe('joao');
      expect(normalizeSlug('josé')).toBe('jose');
    });

    it('should handle reserved words', () => {
      expect(normalizeSlug('admin')).toBe('u-admin');
      expect(normalizeSlug('api')).toBe('u-api');
    });

    it('should handle too short slugs', () => {
      const slug = normalizeSlug('ab');
      expect(slug).toMatch(/^user-[a-z0-9]{6}$/);
    });

    it('should collapse multiple hyphens', () => {
      expect(normalizeSlug('john---doe')).toBe('john-doe');
    });

    it('should truncate to max 24 chars', () => {
      const longSlug = normalizeSlug('averylongemailaddressthatshouldbetruncated');
      expect(longSlug.length).toBeLessThanOrEqual(24);
    });

    it('should generate user-<random> for empty input', () => {
      const slug = normalizeSlug('');
      expect(slug).toMatch(/^user-[a-z0-9]{6}$/);
    });

    it('should trim leading and trailing hyphens', () => {
      expect(normalizeSlug('-john-doe-')).toBe('john-doe');
    });
  });

  describe('validateSlug', () => {
    it('should validate correct slugs', () => {
      expect(validateSlug('john-doe')).toBe(true);
      expect(validateSlug('user123')).toBe(true);
    });

    it('should reject invalid slugs', () => {
      expect(validateSlug('ab')).toBe(false);           // Too short
      expect(validateSlug('a'.repeat(31))).toBe(false); // Too long
      expect(validateSlug('-john')).toBe(false);        // Leading hyphen
      expect(validateSlug('john-')).toBe(false);        // Trailing hyphen
      expect(validateSlug('john_doe')).toBe(false);     // Underscore not allowed
      expect(validateSlug('John-Doe')).toBe(false);     // Uppercase not allowed
    });

    it('should reject empty or null slugs', () => {
      expect(validateSlug('')).toBe(false);
      expect(validateSlug(null as any)).toBe(false);
      expect(validateSlug(undefined as any)).toBe(false);
    });
  });
});
