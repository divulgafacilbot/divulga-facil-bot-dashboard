import cron from 'node-cron';
import type { ScheduledTask } from 'node-cron';
import { housekeepingService } from './housekeeping.service.js';
import { eventProcessorJob } from './event-processor.job.js';
import { reconciliationJob } from './reconciliation.job.js';
import { getNextRunTime, formatBrt } from '../../utils/time.js';
import { TIME_CONSTANTS } from '../../constants/time.constants.js';

export class SchedulerService {
  private housekeepingTask: ScheduledTask | null = null;
  private eventProcessorTask: ScheduledTask | null = null;
  private reconciliationTask: ScheduledTask | null = null;

  /**
   * Inicia scheduler in-process
   */
  start(): void {
    const enabled = process.env.ENABLE_INPROCESS_SCHEDULER !== 'false';

    if (!enabled) {
      console.log('[Scheduler] In-process scheduler disabled via env');
      return;
    }

    this.setupHousekeepingJob();
    this.setupEventProcessorJob();
    this.setupReconciliationJob();
  }

  /**
   * Setup housekeeping job - daily at 06:15 BRT
   */
  private setupHousekeepingJob(): void {
    const { HOUSEKEEPING_RUN_HOUR, HOUSEKEEPING_RUN_MINUTE } = TIME_CONSTANTS;
    const cronExpression = `${HOUSEKEEPING_RUN_MINUTE} ${HOUSEKEEPING_RUN_HOUR} * * *`;

    console.log(`[Scheduler] Setting up housekeeping cron: ${cronExpression} (BRT)`);

    this.housekeepingTask = cron.schedule(
      cronExpression,
      async () => {
        console.log('[Scheduler] Triggering housekeeping job...');
        try {
          await housekeepingService.execute();
        } catch (error) {
          console.error('[Scheduler] Housekeeping failed:', error);
        }
      },
      {
        timezone: 'America/Sao_Paulo',
      }
    );

    const nextRun = getNextRunTime(HOUSEKEEPING_RUN_HOUR, HOUSEKEEPING_RUN_MINUTE);
    console.log(`[Scheduler] Housekeeping next run: ${formatBrt(nextRun)}`);
  }

  /**
   * Setup event processor job - every 5 minutes
   * Processes pending Kiwify webhook events
   */
  private setupEventProcessorJob(): void {
    const cronExpression = '*/5 * * * *'; // Every 5 minutes

    console.log(`[Scheduler] Setting up event processor cron: ${cronExpression}`);

    this.eventProcessorTask = cron.schedule(
      cronExpression,
      async () => {
        console.log('[Scheduler] Triggering event processor job...');
        try {
          await eventProcessorJob.execute();
        } catch (error) {
          console.error('[Scheduler] Event processor failed:', error);
        }
      },
      {
        timezone: 'America/Sao_Paulo',
      }
    );

    console.log('[Scheduler] Event processor scheduled every 5 minutes');
  }

  /**
   * Setup reconciliation job - daily at 07:00 BRT
   * Detects discrepancies between Kiwify events and payments
   */
  private setupReconciliationJob(): void {
    const cronExpression = '0 7 * * *'; // Daily at 07:00

    console.log(`[Scheduler] Setting up reconciliation cron: ${cronExpression} (BRT)`);

    this.reconciliationTask = cron.schedule(
      cronExpression,
      async () => {
        console.log('[Scheduler] Triggering reconciliation job...');
        try {
          await reconciliationJob.execute();
        } catch (error) {
          console.error('[Scheduler] Reconciliation failed:', error);
        }
      },
      {
        timezone: 'America/Sao_Paulo',
      }
    );

    console.log('[Scheduler] Reconciliation scheduled daily at 07:00 BRT');
  }

  /**
   * Para scheduler
   */
  stop(): void {
    if (this.housekeepingTask) {
      this.housekeepingTask.stop();
      this.housekeepingTask = null;
    }

    if (this.eventProcessorTask) {
      this.eventProcessorTask.stop();
      this.eventProcessorTask = null;
    }

    if (this.reconciliationTask) {
      this.reconciliationTask.stop();
      this.reconciliationTask = null;
    }

    console.log('[Scheduler] All jobs stopped');
  }
}

export const schedulerService = new SchedulerService();
