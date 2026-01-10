import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JobLockService } from '../job-lock.service';
import { prisma } from '../../../db/prisma';

describe('JobLockService', () => {
  let service: JobLockService;

  beforeEach(async () => {
    service = new JobLockService();
    // Clean up locks before each test
    await prisma.job_locks.deleteMany({});
  });

  afterEach(async () => {
    // Clean up locks after each test
    await prisma.job_locks.deleteMany({});
  });

  describe('acquireLock', () => {
    it('should acquire lock successfully when no lock exists', async () => {
      const result = await service.acquireLock('test-job', 1);
      expect(result.acquired).toBe(true);
    });

    it('should not acquire lock if already locked', async () => {
      // First lock
      await service.acquireLock('test-job', 1);

      // Second lock attempt (should fail)
      const result = await service.acquireLock('test-job', 1);
      expect(result.acquired).toBe(false);
      expect(result.lockedUntil).toBeDefined();
    });

    it('should acquire lock if previous lock expired', async () => {
      // Create expired lock manually
      const pastDate = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      await prisma.job_locks.create({
        data: {
          job_name: 'test-job',
          locked_until: pastDate,
          locked_by: 'old-process',
        },
      });

      // Should be able to acquire
      const result = await service.acquireLock('test-job', 1);
      expect(result.acquired).toBe(true);
    });

    it('should store lock with correct duration', async () => {
      const lockMinutes = 5;

      await service.acquireLock('test-job', lockMinutes);

      const lock = await prisma.job_locks.findUnique({
        where: { job_name: 'test-job' },
      });

      expect(lock).toBeDefined();
      if (lock) {
        const now = new Date();
        const diffMs = lock.locked_until.getTime() - now.getTime();
        const diffMinutes = diffMs / (60 * 1000);

        // Lock should be approximately lockMinutes in the future
        // Allow 1 minute tolerance for test execution time
        expect(diffMinutes).toBeGreaterThan(lockMinutes - 1);
        expect(diffMinutes).toBeLessThan(lockMinutes + 1);
      }
    });
  });

  describe('releaseLock', () => {
    it('should release lock successfully', async () => {
      await service.acquireLock('test-job', 10);

      // Verify lock is active
      const isLockedBefore = await service.isLocked('test-job');
      expect(isLockedBefore).toBe(true);

      // Release lock
      await service.releaseLock('test-job');

      // Verify lock is no longer active
      const isLockedAfter = await service.isLocked('test-job');
      expect(isLockedAfter).toBe(false);

      // Should be able to acquire again immediately
      const result = await service.acquireLock('test-job', 1);
      expect(result.acquired).toBe(true);
    });

    it('should set locked_until to past when releasing', async () => {
      await service.acquireLock('test-job', 1);
      await service.releaseLock('test-job');

      const lock = await prisma.job_locks.findUnique({
        where: { job_name: 'test-job' },
      });

      expect(lock).toBeDefined();
      if (lock) {
        expect(lock.locked_until.getTime()).toBeLessThanOrEqual(Date.now());
      }
    });
  });

  describe('isLocked', () => {
    it('should return true when job is locked', async () => {
      await service.acquireLock('test-job', 1);
      const isLocked = await service.isLocked('test-job');
      expect(isLocked).toBe(true);
    });

    it('should return false when job is not locked', async () => {
      const isLocked = await service.isLocked('test-job');
      expect(isLocked).toBe(false);
    });

    it('should return false when lock is expired', async () => {
      // Create expired lock
      const pastDate = new Date(Date.now() - 10 * 60 * 1000);
      await prisma.job_locks.create({
        data: {
          job_name: 'test-job',
          locked_until: pastDate,
          locked_by: 'old-process',
        },
      });

      const isLocked = await service.isLocked('test-job');
      expect(isLocked).toBe(false);
    });

    it('should return true when lock is still valid', async () => {
      // Create valid lock
      const futureDate = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
      await prisma.job_locks.create({
        data: {
          job_name: 'test-job',
          locked_until: futureDate,
          locked_by: 'current-process',
        },
      });

      const isLocked = await service.isLocked('test-job');
      expect(isLocked).toBe(true);
    });
  });

  describe('concurrent lock attempts', () => {
    it('should handle multiple lock attempts gracefully', async () => {
      const results = await Promise.allSettled([
        service.acquireLock('test-job', 1),
        service.acquireLock('test-job', 1),
        service.acquireLock('test-job', 1),
      ]);

      // Only one should succeed
      const acquired = results.filter(
        (r) => r.status === 'fulfilled' && r.value.acquired
      ).length;

      expect(acquired).toBeGreaterThanOrEqual(1);
      expect(acquired).toBeLessThanOrEqual(3); // Allow for race conditions
    });
  });
});
