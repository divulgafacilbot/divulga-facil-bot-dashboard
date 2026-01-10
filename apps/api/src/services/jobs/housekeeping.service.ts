import { prisma } from '../../db/prisma';
import { nowBrt, getCutoffDate } from '../../utils/time';
import { jobLockService } from './job-lock.service';
import { TIME_CONSTANTS } from '../../constants/time.constants';

export interface HousekeepingResult {
  totalDeletedEvents: number;
  totalDeletedCaches: number;
  totalDeletedStates: number;
  totalExpiredTokens?: number;
  totalDeletedDedupeKeys?: number;
  duration: number;
}

export class HousekeepingService {
  private readonly JOB_NAME = 'housekeeping';
  private readonly LOCK_MINUTES = TIME_CONSTANTS.HOUSEKEEPING_LOCK_MINUTES;

  /**
   * Executa housekeeping com lock e idempotência
   */
  async execute(): Promise<HousekeepingResult> {
    const startTime = Date.now();
    console.log('[Housekeeping] Starting job...');

    // Tenta adquirir lock
    const lockResult = await jobLockService.acquireLock(this.JOB_NAME, this.LOCK_MINUTES);

    if (!lockResult.acquired) {
      const msg = `Job already running (locked until ${lockResult.lockedUntil})`;
      console.log(`[Housekeeping] ${msg}`);
      throw new Error(msg);
    }

    try {
      // Executa limpezas
      const result = await this.performCleanup();

      const duration = Date.now() - startTime;
      console.log('[Housekeeping] Job completed:', {
        ...result,
        duration,
      });

      return {
        ...result,
        duration,
      };
    } finally {
      // Sempre libera lock
      await jobLockService.releaseLock(this.JOB_NAME);
    }
  }

  /**
   * Executa todas as operações de limpeza
   */
  private async performCleanup(): Promise<Omit<HousekeepingResult, 'duration'>> {
    const now = nowBrt();
    const cutoff30d = getCutoffDate(TIME_CONSTANTS.TTL_DAYS);
    const cutoff45d = getCutoffDate(TIME_CONSTANTS.TTL_DAYS_EXTENDED);

    console.log('[Housekeeping] Cutoffs:', {
      cutoff30d: cutoff30d.toISOString(),
      cutoff45d: cutoff45d.toISOString(),
    });

    const result = {
      totalDeletedEvents: 0,
      totalDeletedCaches: 0,
      totalDeletedStates: 0,
      totalExpiredTokens: 0,
      totalDeletedDedupeKeys: 0,
    };

    // 1. Limpeza de eventos públicos (TTL 30d)
    try {
      const deletedEvents = await prisma.public_events.deleteMany({
        where: {
          created_at: { lt: cutoff30d },
        },
      });
      result.totalDeletedEvents = deletedEvents.count;
      console.log(`[Housekeeping] Deleted ${deletedEvents.count} old public events`);
    } catch (error) {
      console.error('[Housekeeping] Error deleting public events:', error);
    }

    // 2. Limpeza de caches (if table exists)
    try {
      // This table might not exist yet - handle gracefully
      const deletedCaches = await (prisma as any).suggestion_cache?.deleteMany?.({
        where: {
          expires_at: { lt: now },
        },
      });
      result.totalDeletedCaches = deletedCaches?.count || 0;
      console.log(`[Housekeeping] Deleted ${deletedCaches?.count || 0} expired caches`);
    } catch (error) {
      console.log('[Housekeeping] Skipping cache cleanup (table may not exist)');
    }

    // 3. Limpeza de estados auxiliares (if table exists)
    try {
      const deletedStates = await (prisma as any).user_button_click_state?.deleteMany?.({
        where: {
          updated_at: { lt: cutoff45d },
        },
      });
      result.totalDeletedStates = deletedStates?.count || 0;
      console.log(`[Housekeeping] Deleted ${deletedStates?.count || 0} old click states`);
    } catch (error) {
      console.log('[Housekeeping] Skipping click states (table may not exist)');
    }

    // 4. Tokens promocionais expirados (if table exists)
    try {
      const expiredTokens = await (prisma as any).promotional_tokens?.updateMany?.({
        where: {
          expires_at: { lt: now },
          status: { not: 'EXPIRED' },
        },
        data: {
          status: 'EXPIRED',
        },
      });
      result.totalExpiredTokens = expiredTokens?.count || 0;
      console.log(`[Housekeeping] Marked ${expiredTokens?.count || 0} tokens as expired`);
    } catch (error) {
      console.log('[Housekeeping] Skipping promotional tokens (table may not exist)');
    }

    // 5. Limpeza de dedupe keys (if table exists)
    try {
      const deletedDedupeKeys = await (prisma as any).public_event_dedupe?.deleteMany?.({
        where: {
          expires_at: { lt: now },
        },
      });
      result.totalDeletedDedupeKeys = deletedDedupeKeys?.count || 0;
      console.log(`[Housekeeping] Deleted ${deletedDedupeKeys?.count || 0} expired dedupe keys`);
    } catch (error) {
      console.log('[Housekeeping] Skipping dedupe keys (table may not exist or using Redis TTL)');
    }

    return result;
  }
}

export const housekeepingService = new HousekeepingService();
