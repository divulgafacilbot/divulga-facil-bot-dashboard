import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/server';
import { prisma } from '../../src/db/prisma';
import { nowBrt, getDayKey, computeExpiresAt, isExpired, getCutoffDate } from '../../src/utils/time';
import { jobLockService } from '../../src/services/jobs/job-lock.service';
import { housekeepingService } from '../../src/services/jobs/housekeeping.service';

/**
 * Feature 5 - Time Infrastructure & TTL System
 *
 * Comprehensive integration tests for:
 * - Time utilities (BRT timezone, logical day, TTL)
 * - Job lock system (distributed locks)
 * - Housekeeping service (data cleanup)
 * - Internal API endpoints (job triggers)
 * - Scheduler integration
 */
describe('Feature 5 - Time Infrastructure & TTL System', () => {
  const TEST_SECRET = process.env.INTERNAL_JOBS_SECRET || 'test-secret';

  beforeAll(async () => {
    // Clean up test data
    await prisma.job_locks.deleteMany({});
  });

  afterAll(async () => {
    // Final cleanup
    await prisma.job_locks.deleteMany({});
  });

  describe('Time Utils - Core Functions', () => {
    describe('nowBrt()', () => {
      it('should return current time in BRT timezone', () => {
        const now = nowBrt();
        expect(now).toBeInstanceOf(Date);

        // Verify it's a valid date
        expect(isNaN(now.getTime())).toBe(false);
      });

      it('should return different values on subsequent calls', async () => {
        const time1 = nowBrt();
        await new Promise(resolve => setTimeout(resolve, 10));
        const time2 = nowBrt();

        expect(time2.getTime()).toBeGreaterThan(time1.getTime());
      });
    });

    describe('getDayKey()', () => {
      it('should return date string in YYYY-MM-DD format', () => {
        const dayKey = getDayKey(nowBrt());
        expect(dayKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });

      it('should handle logical day cutoff at 06:00 BRT', () => {
        // This test validates the 06:00 cutoff logic
        // Before 06:00 BRT should use previous day
        // After 06:00 BRT should use current day
        const testDate = new Date('2025-01-08T09:00:00.000Z'); // 06:00 BRT
        const dayKey = getDayKey(testDate);

        expect(dayKey).toBe('2025-01-08');
      });
    });

    describe('computeExpiresAt()', () => {
      it('should compute expiration correctly with seconds', () => {
        const now = nowBrt();
        const expiresAt = computeExpiresAt(3600); // 1 hour

        const diffSeconds = (expiresAt.getTime() - now.getTime()) / 1000;
        expect(diffSeconds).toBeGreaterThanOrEqual(3590);
        expect(diffSeconds).toBeLessThanOrEqual(3610);
      });

      it('should handle large TTL values', () => {
        const now = nowBrt();
        const expiresAt = computeExpiresAt(86400 * 30); // 30 days

        const diffDays = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        expect(diffDays).toBeGreaterThanOrEqual(29.9);
        expect(diffDays).toBeLessThanOrEqual(30.1);
      });
    });

    describe('isExpired()', () => {
      it('should detect expired dates', () => {
        const pastDate = new Date(Date.now() - 10000);
        expect(isExpired(pastDate)).toBe(true);
      });

      it('should detect non-expired dates', () => {
        const futureDate = new Date(Date.now() + 10000);
        expect(isExpired(futureDate)).toBe(false);
      });

      it('should handle edge case of exact current time', () => {
        const now = nowBrt();
        // Current time should be considered not expired
        expect(isExpired(now)).toBe(false);
      });
    });

    describe('getCutoffDate()', () => {
      it('should calculate cutoff for 30 days ago', () => {
        const now = nowBrt();
        const cutoff = getCutoffDate(30);

        const diffDays = (now.getTime() - cutoff.getTime()) / (1000 * 60 * 60 * 24);
        expect(diffDays).toBeGreaterThanOrEqual(29.9);
        expect(diffDays).toBeLessThanOrEqual(30.1);
      });

      it('should calculate cutoff for 7 days ago', () => {
        const now = nowBrt();
        const cutoff = getCutoffDate(7);

        const diffDays = (now.getTime() - cutoff.getTime()) / (1000 * 60 * 60 * 24);
        expect(diffDays).toBeGreaterThanOrEqual(6.9);
        expect(diffDays).toBeLessThanOrEqual(7.1);
      });
    });
  });

  describe('Job Lock System', () => {
    const TEST_JOB = 'test-housekeeping-integration';

    afterEach(async () => {
      // Release lock after each test
      await jobLockService.releaseLock(TEST_JOB);
    });

    describe('Lock Acquisition', () => {
      it('should acquire lock successfully when no lock exists', async () => {
        const result = await jobLockService.acquireLock(TEST_JOB, 1);
        expect(result.acquired).toBe(true);
      });

      it('should prevent concurrent lock acquisition', async () => {
        // First lock
        const result1 = await jobLockService.acquireLock(TEST_JOB, 1);
        expect(result1.acquired).toBe(true);

        // Second lock attempt (should fail)
        const result2 = await jobLockService.acquireLock(TEST_JOB, 1);
        expect(result2.acquired).toBe(false);
        expect(result2.lockedUntil).toBeDefined();
      });

      it('should allow lock after expiration', async () => {
        // Create expired lock manually
        const pastDate = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
        await prisma.job_locks.create({
          data: {
            job_name: TEST_JOB,
            locked_until: pastDate,
            locked_by: 'test-process',
          },
        });

        // Should be able to acquire
        const result = await jobLockService.acquireLock(TEST_JOB, 1);
        expect(result.acquired).toBe(true);
      });
    });

    describe('Lock Release', () => {
      it('should release lock successfully', async () => {
        await jobLockService.acquireLock(TEST_JOB, 10);

        const isLockedBefore = await jobLockService.isLocked(TEST_JOB);
        expect(isLockedBefore).toBe(true);

        await jobLockService.releaseLock(TEST_JOB);

        const isLockedAfter = await jobLockService.isLocked(TEST_JOB);
        expect(isLockedAfter).toBe(false);
      });

      it('should allow immediate re-acquisition after release', async () => {
        await jobLockService.acquireLock(TEST_JOB, 10);
        await jobLockService.releaseLock(TEST_JOB);

        const result = await jobLockService.acquireLock(TEST_JOB, 1);
        expect(result.acquired).toBe(true);
      });
    });

    describe('Lock Status', () => {
      it('should correctly report lock status', async () => {
        const isLockedBefore = await jobLockService.isLocked(TEST_JOB);
        expect(isLockedBefore).toBe(false);

        await jobLockService.acquireLock(TEST_JOB, 1);

        const isLockedAfter = await jobLockService.isLocked(TEST_JOB);
        expect(isLockedAfter).toBe(true);
      });
    });
  });

  describe('Housekeeping Service', () => {
    beforeEach(async () => {
      // Ensure no lock exists
      await jobLockService.releaseLock('housekeeping');
    });

    afterEach(async () => {
      // Clean up lock
      await jobLockService.releaseLock('housekeeping');
    });

    describe('Job Execution', () => {
      it('should execute housekeeping successfully', async () => {
        const result = await housekeepingService.execute();

        expect(result).toHaveProperty('totalDeletedEvents');
        expect(result).toHaveProperty('totalDeletedCaches');
        expect(result).toHaveProperty('totalDeletedStates');
        expect(result).toHaveProperty('duration');
        expect(typeof result.totalDeletedEvents).toBe('number');
        expect(typeof result.duration).toBe('number');
      });

      it('should prevent concurrent execution', async () => {
        // Start first execution (don't await)
        const execution1Promise = housekeepingService.execute();

        // Try second execution immediately
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
      });
    });

    describe('Data Cleanup', () => {
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
      });

      it('should NOT delete recent public events (<30 days)', async () => {
        // Create recent event
        const recentEvent = await prisma.public_events.create({
          data: {
            event_type: 'TEST_RECENT',
            created_at: nowBrt(),
          },
        });

        await housekeepingService.execute();

        // Verify event still exists
        const existingEvent = await prisma.public_events.findUnique({
          where: { id: recentEvent.id },
        });
        expect(existingEvent).not.toBeNull();

        // Cleanup
        await prisma.public_events.delete({ where: { id: recentEvent.id } });
      });
    });
  });

  describe('Internal API Endpoints', () => {
    beforeEach(async () => {
      await jobLockService.releaseLock('housekeeping');
    });

    afterEach(async () => {
      await jobLockService.releaseLock('housekeeping');
    });

    describe('POST /internal/jobs/housekeeping', () => {
      it('should reject requests without secret header', async () => {
        const res = await request(app)
          .post('/internal/jobs/housekeeping')
          .expect(403);

        expect(res.body).toHaveProperty('error');
        expect(res.body.message).toMatch(/invalid or missing/i);
      });

      it('should reject requests with invalid secret', async () => {
        const res = await request(app)
          .post('/internal/jobs/housekeeping')
          .set('x-internal-job-secret', 'wrong-secret')
          .expect(403);

        expect(res.body).toHaveProperty('error');
      });

      it('should execute housekeeping with valid secret', async () => {
        const res = await request(app)
          .post('/internal/jobs/housekeeping')
          .set('x-internal-job-secret', TEST_SECRET)
          .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('totalDeletedEvents');
        expect(res.body.data).toHaveProperty('totalDeletedCaches');
        expect(res.body.data).toHaveProperty('duration');
      });

      it('should return 409 when job is already running', async () => {
        // Acquire lock manually
        await jobLockService.acquireLock('housekeeping', 10);

        const res = await request(app)
          .post('/internal/jobs/housekeeping')
          .set('x-internal-job-secret', TEST_SECRET)
          .expect(409);

        expect(res.body.success).toBe(false);
        expect(res.body.error).toMatch(/already running/i);
      });
    });

    describe('GET /internal/jobs/lock-status/:jobName', () => {
      it('should return lock status for unlocked job', async () => {
        const res = await request(app)
          .get('/internal/jobs/lock-status/housekeeping')
          .set('x-internal-job-secret', TEST_SECRET)
          .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data.jobName).toBe('housekeeping');
        expect(res.body.data.isLocked).toBe(false);
      });

      it('should return lock status for locked job', async () => {
        await jobLockService.acquireLock('housekeeping', 10);

        const res = await request(app)
          .get('/internal/jobs/lock-status/housekeeping')
          .set('x-internal-job-secret', TEST_SECRET)
          .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data.isLocked).toBe(true);
      });
    });

    describe('DELETE /internal/jobs/lock/:jobName', () => {
      it('should force release lock', async () => {
        await jobLockService.acquireLock('housekeeping', 10);

        const res = await request(app)
          .delete('/internal/jobs/lock/housekeeping')
          .set('x-internal-job-secret', TEST_SECRET)
          .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.message).toMatch(/lock released/i);

        // Verify lock is released
        const isLocked = await jobLockService.isLocked('housekeeping');
        expect(isLocked).toBe(false);
      });
    });
  });

  describe('TTL & Expiration Integration', () => {
    it('should use consistent timezone across all operations', () => {
      const now1 = nowBrt();
      const dayKey1 = getDayKey(now1);
      const expiresAt = computeExpiresAt(3600);
      const cutoff = getCutoffDate(30);

      // All should be valid dates
      expect(now1).toBeInstanceOf(Date);
      expect(expiresAt).toBeInstanceOf(Date);
      expect(cutoff).toBeInstanceOf(Date);

      // DayKey should be valid format
      expect(dayKey1).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // Expiration should be in future
      expect(expiresAt.getTime()).toBeGreaterThan(now1.getTime());

      // Cutoff should be in past
      expect(cutoff.getTime()).toBeLessThan(now1.getTime());
    });

    it('should handle lazy expiration correctly', () => {
      const now = nowBrt();
      const expiredDate = new Date(now.getTime() - 1000);
      const validDate = new Date(now.getTime() + 1000);

      expect(isExpired(expiredDate)).toBe(true);
      expect(isExpired(validDate)).toBe(false);
    });
  });

  describe('Environment Configuration', () => {
    it('should have required environment variables', () => {
      expect(process.env.INTERNAL_JOBS_SECRET).toBeDefined();
      expect(process.env.INTERNAL_JOBS_SECRET).not.toBe('');

      // ENABLE_INPROCESS_SCHEDULER should be defined
      expect(process.env.ENABLE_INPROCESS_SCHEDULER).toBeDefined();
    });

    it('should use BRT timezone', () => {
      const now = nowBrt();
      const formatted = now.toISOString();

      // Should be a valid ISO string
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('Database Schema', () => {
    it('should have job_locks table with correct structure', async () => {
      const testLock = await prisma.job_locks.create({
        data: {
          job_name: 'test-schema-validation',
          locked_until: nowBrt(),
          locked_by: 'test',
        },
      });

      expect(testLock).toHaveProperty('id');
      expect(testLock).toHaveProperty('job_name');
      expect(testLock).toHaveProperty('locked_until');
      expect(testLock).toHaveProperty('locked_by');
      expect(testLock).toHaveProperty('created_at');
      expect(testLock).toHaveProperty('updated_at');

      // Cleanup
      await prisma.job_locks.delete({ where: { id: testLock.id } });
    });

    it('should enforce unique constraint on job_name', async () => {
      const jobName = 'unique-test-job';

      await prisma.job_locks.create({
        data: {
          job_name: jobName,
          locked_until: nowBrt(),
          locked_by: 'test',
        },
      });

      // Try to create duplicate
      await expect(
        prisma.job_locks.create({
          data: {
            job_name: jobName,
            locked_until: nowBrt(),
            locked_by: 'test2',
          },
        })
      ).rejects.toThrow();

      // Cleanup
      await prisma.job_locks.deleteMany({ where: { job_name: jobName } });
    });
  });
});
