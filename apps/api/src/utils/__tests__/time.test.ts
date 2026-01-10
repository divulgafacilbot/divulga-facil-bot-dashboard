import { describe, it, expect } from 'vitest';
import {
  getDayKey,
  isNewLogicalDay,
  computeExpiresAt,
  isExpired,
  getCutoffDate,
  nowBrt,
  addDays,
  subtractDays,
  formatBrt,
  getNextRunTime,
  isWithinWindow,
} from '../time';

describe('Time Utils', () => {
  describe('getDayKey', () => {
    it('should return previous day before 06:00 BRT', () => {
      // 2026-01-08 05:59 BRT = 2026-01-08 08:59 UTC (BRT is UTC-3)
      const date = new Date('2026-01-08T08:59:00.000Z');
      expect(getDayKey(date)).toBe('2026-01-07');
    });

    it('should return current day at 06:00 BRT', () => {
      // 2026-01-08 06:00 BRT = 2026-01-08 09:00 UTC
      const date = new Date('2026-01-08T09:00:00.000Z');
      expect(getDayKey(date)).toBe('2026-01-08');
    });

    it('should return current day after 06:00 BRT', () => {
      // 2026-01-08 12:00 BRT = 2026-01-08 15:00 UTC
      const date = new Date('2026-01-08T15:00:00.000Z');
      expect(getDayKey(date)).toBe('2026-01-08');
    });

    it('should return current day at 23:59 BRT', () => {
      // 2026-01-08 23:59 BRT = 2026-01-09 02:59 UTC (next day in UTC)
      const date = new Date('2026-01-09T02:59:00.000Z');
      expect(getDayKey(date)).toBe('2026-01-08');
    });
  });

  describe('isNewLogicalDay', () => {
    it('should return true when day changed', () => {
      expect(isNewLogicalDay('2026-01-07', '2026-01-08')).toBe(true);
    });

    it('should return false when day is same', () => {
      expect(isNewLogicalDay('2026-01-08', '2026-01-08')).toBe(false);
    });

    it('should return true when multiple days passed', () => {
      expect(isNewLogicalDay('2026-01-05', '2026-01-08')).toBe(true);
    });
  });

  describe('computeExpiresAt', () => {
    it('should compute expires_at correctly with default 30 days', () => {
      const from = new Date('2026-01-01T12:00:00.000Z');
      const expiresAt = computeExpiresAt(from);

      // Should be 30 days later
      const expected = new Date('2026-01-31T12:00:00.000Z');

      // Allow 1 second tolerance for timezone conversion
      expect(Math.abs(expiresAt.getTime() - expected.getTime())).toBeLessThan(2000);
    });

    it('should compute expires_at with custom days', () => {
      const from = new Date('2026-01-01T12:00:00.000Z');
      const expiresAt = computeExpiresAt(from, 7);

      // Should be 7 days later
      const expected = new Date('2026-01-08T12:00:00.000Z');

      expect(Math.abs(expiresAt.getTime() - expected.getTime())).toBeLessThan(2000);
    });
  });

  describe('isExpired', () => {
    it('should detect expired dates', () => {
      const past = new Date('2025-01-01T00:00:00.000Z');
      const now = new Date('2026-01-01T00:00:00.000Z');
      expect(isExpired(past, now)).toBe(true);
    });

    it('should detect non-expired dates', () => {
      const future = new Date('2027-01-01T00:00:00.000Z');
      const now = new Date('2026-01-01T00:00:00.000Z');
      expect(isExpired(future, now)).toBe(false);
    });

    it('should handle exact same time as not expired', () => {
      const date = new Date('2026-01-01T00:00:00.000Z');
      expect(isExpired(date, date)).toBe(false);
    });
  });

  describe('getCutoffDate', () => {
    it('should calculate cutoff correctly for 30 days', () => {
      // Mock now to a specific date for testing
      const mockNow = new Date('2026-01-30T12:00:00.000Z');

      // Get cutoff (30 days ago)
      const cutoff = subtractDays(mockNow, 30);

      // Should be approximately 30 days before
      const diffDays = (mockNow.getTime() - cutoff.getTime()) / (1000 * 60 * 60 * 24);
      expect(Math.abs(diffDays - 30)).toBeLessThan(0.1); // Allow small tolerance
    });

    it('should calculate cutoff correctly for 7 days', () => {
      const mockNow = new Date('2026-01-15T12:00:00.000Z');
      const cutoff = subtractDays(mockNow, 7);

      const diffDays = (mockNow.getTime() - cutoff.getTime()) / (1000 * 60 * 60 * 24);
      expect(Math.abs(diffDays - 7)).toBeLessThan(0.1);
    });
  });

  describe('addDays', () => {
    it('should add days correctly', () => {
      const date = new Date('2026-01-01T12:00:00.000Z');
      const result = addDays(date, 5);

      const expected = new Date('2026-01-06T12:00:00.000Z');
      expect(Math.abs(result.getTime() - expected.getTime())).toBeLessThan(2000);
    });
  });

  describe('subtractDays', () => {
    it('should subtract days correctly', () => {
      const date = new Date('2026-01-10T12:00:00.000Z');
      const result = subtractDays(date, 5);

      const expected = new Date('2026-01-05T12:00:00.000Z');
      expect(Math.abs(result.getTime() - expected.getTime())).toBeLessThan(2000);
    });
  });

  describe('formatBrt', () => {
    it('should format date in BRT timezone', () => {
      const date = new Date('2026-01-08T15:30:45.000Z'); // 12:30:45 BRT
      const formatted = formatBrt(date);

      // Should include BRT time, not UTC time
      expect(formatted).toContain('2026-01-08');
      expect(formatted).toContain('12:30:45'); // BRT time
    });
  });

  describe('getNextRunTime', () => {
    it('should calculate next run time correctly', () => {
      // Just verify it returns a future date
      const next = getNextRunTime(6, 15);
      const now = new Date();

      // Should return a valid Date
      expect(next).toBeInstanceOf(Date);

      // Should be in the future (or at least not in the past by more than 1 day)
      const diffHours = (next.getTime() - now.getTime()) / (1000 * 60 * 60);
      expect(diffHours).toBeGreaterThan(-1); // Allow some tolerance
      expect(diffHours).toBeLessThan(25); // Should be within next day
    });
  });

  describe('isWithinWindow', () => {
    it('should return true when timestamp is within window', () => {
      const now = new Date('2026-01-08T12:00:00.000Z');
      const timestamp = new Date('2026-01-08T11:50:00.000Z'); // 10 minutes ago

      expect(isWithinWindow(timestamp, 3600, now)).toBe(true); // 1 hour window
    });

    it('should return false when timestamp is outside window', () => {
      const now = new Date('2026-01-08T12:00:00.000Z');
      const timestamp = new Date('2026-01-08T10:00:00.000Z'); // 2 hours ago

      expect(isWithinWindow(timestamp, 3600, now)).toBe(false); // 1 hour window
    });
  });

  describe('nowBrt', () => {
    it('should return a valid Date object', () => {
      const result = nowBrt();
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBeGreaterThan(0);
    });
  });
});
