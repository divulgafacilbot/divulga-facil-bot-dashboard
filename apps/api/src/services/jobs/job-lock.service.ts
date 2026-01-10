import { prisma } from '../../db/prisma';
import { nowBrt } from '../../utils/time';

export interface AcquireLockResult {
  acquired: boolean;
  lockedBy?: string;
  lockedUntil?: Date;
}

export class JobLockService {
  /**
   * Tenta adquirir lock para um job
   * @param jobName Nome do job
   * @param lockMinutes Minutos de duração do lock
   * @returns true se adquirido, false se já locked
   */
  async acquireLock(
    jobName: string,
    lockMinutes: number = 10
  ): Promise<AcquireLockResult> {
    const now = nowBrt();
    const lockedUntil = new Date(now.getTime() + lockMinutes * 60 * 1000);
    const lockedBy = `${process.env.RAILWAY_REPLICA_ID || 'local'}-${process.pid}`;

    try {
      // Tenta buscar lock existente
      const existingLock = await prisma.job_locks.findUnique({
        where: { job_name: jobName },
      });

      // Se lock existe e ainda está válido
      if (existingLock && existingLock.locked_until > now) {
        console.log(`[JobLock] Job "${jobName}" already locked until ${existingLock.locked_until}`);
        return {
          acquired: false,
          lockedBy: existingLock.locked_by || undefined,
          lockedUntil: existingLock.locked_until,
        };
      }

      // Adquire lock (cria ou atualiza)
      await prisma.job_locks.upsert({
        where: { job_name: jobName },
        create: {
          job_name: jobName,
          locked_until: lockedUntil,
          locked_by: lockedBy,
        },
        update: {
          locked_until: lockedUntil,
          locked_by: lockedBy,
          updated_at: now,
        },
      });

      console.log(`[JobLock] Lock acquired for "${jobName}" until ${lockedUntil}`);
      return { acquired: true };
    } catch (error) {
      console.error(`[JobLock] Error acquiring lock for "${jobName}":`, error);
      return { acquired: false };
    }
  }

  /**
   * Libera lock de um job
   */
  async releaseLock(jobName: string): Promise<void> {
    try {
      const now = nowBrt();

      await prisma.job_locks.update({
        where: { job_name: jobName },
        data: {
          locked_until: now, // Expira imediatamente
          updated_at: now,
        },
      });

      console.log(`[JobLock] Lock released for "${jobName}"`);
    } catch (error) {
      console.error(`[JobLock] Error releasing lock for "${jobName}":`, error);
    }
  }

  /**
   * Verifica se um job está locked
   */
  async isLocked(jobName: string): Promise<boolean> {
    const now = nowBrt();

    const lock = await prisma.job_locks.findUnique({
      where: { job_name: jobName },
    });

    return lock !== null && lock.locked_until > now;
  }
}

export const jobLockService = new JobLockService();
