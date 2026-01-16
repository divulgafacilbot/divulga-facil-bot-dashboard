import { jobLockService } from './job-lock.service.js';
import { ReconciliationService, DiscrepancyReport } from '../billing/reconciliation.service.js';
import { AuditService, AuditAction } from '../audit/audit.service.js';
import { TIME_CONSTANTS } from '../../constants/time.constants.js';

export interface ReconciliationJobResult {
  report: DiscrepancyReport;
  duration: number;
}

export class ReconciliationJob {
  private readonly JOB_NAME = 'reconciliation';
  private readonly LOCK_MINUTES = 15;
  private readonly DEFAULT_DAYS = 7;

  /**
   * Execute reconciliation job with lock and idempotency
   * Runs daily to detect discrepancies between Kiwify events and payments
   * @param days Number of days to look back (default: 7)
   */
  async execute(days: number = this.DEFAULT_DAYS): Promise<ReconciliationJobResult> {
    const startTime = Date.now();
    console.log('[ReconciliationJob] Starting job...');

    // Try to acquire lock
    const lockResult = await jobLockService.acquireLock(this.JOB_NAME, this.LOCK_MINUTES);

    if (!lockResult.acquired) {
      const msg = `Job already running (locked until ${lockResult.lockedUntil})`;
      console.log(`[ReconciliationJob] ${msg}`);
      throw new Error(msg);
    }

    try {
      // Run reconciliation
      const report = await ReconciliationService.detectDiscrepancies(days);

      const duration = Date.now() - startTime;

      console.log('[ReconciliationJob] Job completed:', {
        totalDiscrepancies: report.totalDiscrepancies,
        eventsWithoutPayments: report.eventsWithoutPayments.length,
        paymentsWithoutEvents: report.paymentsWithoutEvents.length,
        statusMismatches: report.statusMismatches.length,
        duration,
      });

      // Log audit
      await AuditService.logAction({
        action: AuditAction.JOB_EXECUTED,
        entity_type: 'job',
        entity_id: this.JOB_NAME,
        metadata: {
          totalDiscrepancies: report.totalDiscrepancies,
          periodDays: days,
          duration,
        },
      });

      // Alert if discrepancies found
      if (report.totalDiscrepancies > 0) {
        console.warn(`[ReconciliationJob] Found ${report.totalDiscrepancies} discrepancies!`);
        // TODO: Add notification service integration (email/Slack alert)
      }

      return { report, duration };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      console.error('[ReconciliationJob] Job failed:', errorMessage);

      await AuditService.logAction({
        action: AuditAction.JOB_FAILED,
        entity_type: 'job',
        entity_id: this.JOB_NAME,
        metadata: { error: errorMessage },
      });

      throw error;
    } finally {
      // Always release lock
      await jobLockService.releaseLock(this.JOB_NAME);
    }
  }
}

export const reconciliationJob = new ReconciliationJob();
