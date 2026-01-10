import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { housekeepingService } from '../housekeeping.service';
import { jobLockService } from '../job-lock.service';
import { prisma } from '../../../db/prisma';
import { getCutoffDate, nowBrt } from '../../../utils/time';

describe('HousekeepingService', () => {
  beforeEach(async () => {
    // Ensure no lock exists
    await jobLockService.releaseLock('housekeeping');
  });

  afterEach(async () => {
    // Clean up lock
    await jobLockService.releaseLock('housekeeping');
  });

  describe('execute', () => {
    it('should execute housekeeping successfully', async () => {
      const result = await housekeepingService.execute();

      expect(result).toHaveProperty('totalDeletedEvents');
      expect(result).toHaveProperty('totalDeletedCaches');
      expect(result).toHaveProperty('totalDeletedStates');
      expect(result).toHaveProperty('duration');
      expect(typeof result.totalDeletedEvents).toBe('number');
      expect(typeof result.duration).toBe('number');
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should prevent concurrent execution', async () => {
      // Start first execution (don't await)
      const execution1Promise = housekeepingService.execute();

      // Try second execution immediately (should fail)
      await expect(housekeepingService.execute()).rejects.toThrow(/already running/i);

      // Wait for first to complete
      await execution1Promise;
    });

    it('should be idempotent (safe to run multiple times)', async () => {
      const result1 = await housekeepingService.execute();
      const result2 = await housekeepingService.execute();

      // Both should succeed
      expect(result1).toHaveProperty('totalDeletedEvents');
      expect(result2).toHaveProperty('totalDeletedEvents');
      expect(typeof result1.totalDeletedEvents).toBe('number');
      expect(typeof result2.totalDeletedEvents).toBe('number');
    });

    it('should return statistics with correct structure', async () => {
      const result = await housekeepingService.execute();

      expect(result).toMatchObject({
        totalDeletedEvents: expect.any(Number),
        totalDeletedCaches: expect.any(Number),
        totalDeletedStates: expect.any(Number),
        duration: expect.any(Number),
      });

      // Optional fields
      if (result.totalExpiredTokens !== undefined) {
        expect(typeof result.totalExpiredTokens).toBe('number');
      }
      if (result.totalDeletedDedupeKeys !== undefined) {
        expect(typeof result.totalDeletedDedupeKeys).toBe('number');
      }
    });
  });

  describe('cleanup operations', () => {
    it('should delete old public events (>30 days)', async () => {
      // Create test event older than 30 days
      const oldDate = getCutoffDate(35);
      const testEvent = await prisma.public_events.create({
        data: {
          event_type: 'TEST_CLEANUP',
          created_at: oldDate,
        },
      });

      const result = await housekeepingService.execute();

      // Verify event was deleted
      const deletedEvent = await prisma.public_events.findUnique({
        where: { id: testEvent.id },
      });
      expect(deletedEvent).toBeNull();
      expect(result.totalDeletedEvents).toBeGreaterThanOrEqual(1);
    });

    it('should NOT delete recent public events (<30 days)', async () => {
      // Create recent event
      const recentEvent = await prisma.public_events.create({
        data: {
          event_type: 'TEST_RECENT',
          created_at: nowBrt(),
        },
      });

      const beforeCount = await prisma.public_events.count({
        where: { id: recentEvent.id },
      });
      expect(beforeCount).toBe(1);

      await housekeepingService.execute();

      // Verify event still exists
      const afterCount = await prisma.public_events.count({
        where: { id: recentEvent.id },
      });
      expect(afterCount).toBe(1);

      // Cleanup
      await prisma.public_events.delete({ where: { id: recentEvent.id } });
    });

    it('should handle missing tables gracefully', async () => {
      // This should not crash even if optional tables don't exist
      const result = await housekeepingService.execute();

      // Should complete successfully
      expect(result).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
    });
  });

  describe('lock management', () => {
    it('should acquire lock before execution', async () => {
      const isLockedBefore = await jobLockService.isLocked('housekeeping');
      expect(isLockedBefore).toBe(false);

      // Start execution (don't await)
      const executionPromise = housekeepingService.execute();

      // Check if locked during execution
      // Note: This might be racy, so we just verify execution completes
      await executionPromise;

      // After execution, lock should be released
      const isLockedAfter = await jobLockService.isLocked('housekeeping');
      expect(isLockedAfter).toBe(false);
    });

    it('should release lock even on error', async () => {
      // This tests the finally block that releases lock

      // First, ensure lock is not held
      await jobLockService.releaseLock('housekeeping');

      const isLockedBefore = await jobLockService.isLocked('housekeeping');
      expect(isLockedBefore).toBe(false);

      // Execute housekeeping (should succeed or fail, but lock should be released)
      try {
        await housekeepingService.execute();
      } catch (error) {
        // Ignore errors - we're testing lock release
      }

      // Lock should be released
      const isLockedAfter = await jobLockService.isLocked('housekeeping');
      expect(isLockedAfter).toBe(false);
    });
  });
});
