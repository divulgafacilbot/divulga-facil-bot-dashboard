import { jobLockService } from './job-lock.service.js';
import { EventProcessorService } from '../billing/event-processor.service.js';
import { AuditService, AuditAction } from '../audit/audit.service.js';

export interface EventProcessorResult {
  processedCount: number;
  errorCount: number;
  duration: number;
}

export class EventProcessorJob {
  private readonly JOB_NAME = 'event-processor';
  // Fixed UUID for this job (used in audit logs, which require UUID entity_id)
  private readonly JOB_UUID = '00000000-0000-0000-0000-000000000001';
  private readonly LOCK_MINUTES = 5;

  /**
   * Execute event processor job with lock and idempotency
   * @param limit Maximum events to process (default: 100)
   */
  async execute(limit: number = 100): Promise<EventProcessorResult> {
    const startTime = Date.now();
    console.log('[EventProcessorJob] Starting job...');

    // Try to acquire lock
    const lockResult = await jobLockService.acquireLock(this.JOB_NAME, this.LOCK_MINUTES);

    if (!lockResult.acquired) {
      const msg = `Job already running (locked until ${lockResult.lockedUntil})`;
      console.log(`[EventProcessorJob] ${msg}`);
      throw new Error(msg);
    }

    const result: EventProcessorResult = {
      processedCount: 0,
      errorCount: 0,
      duration: 0,
    };

    try {
      // Process pending events
      const processed = await EventProcessorService.processPendingEvents(limit);
      result.processedCount = processed;

      const duration = Date.now() - startTime;
      result.duration = duration;

      console.log('[EventProcessorJob] Job completed:', {
        processedCount: processed,
        duration,
      });

      // Log audit
      await AuditService.logAction({
        action: AuditAction.JOB_EXECUTED,
        entity_type: 'job',
        entity_id: this.JOB_UUID,
        metadata: {
          jobName: this.JOB_NAME,
          processedCount: processed,
          duration,
        },
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errorCount++;

      console.error('[EventProcessorJob] Job failed:', errorMessage);

      await AuditService.logAction({
        action: AuditAction.JOB_FAILED,
        entity_type: 'job',
        entity_id: this.JOB_UUID,
        metadata: { jobName: this.JOB_NAME, error: errorMessage },
      });

      throw error;
    } finally {
      // Always release lock
      await jobLockService.releaseLock(this.JOB_NAME);
    }
  }
}

export const eventProcessorJob = new EventProcessorJob();
