import cron from 'node-cron';
import type { ScheduledTask } from 'node-cron';
import { housekeepingService } from './housekeeping.service';
import { getNextRunTime, formatBrt } from '../../utils/time';
import { TIME_CONSTANTS } from '../../constants/time.constants';

export class SchedulerService {
  private task: ScheduledTask | null = null;

  /**
   * Inicia scheduler in-process
   */
  start(): void {
    const enabled = process.env.ENABLE_INPROCESS_SCHEDULER !== 'false';

    if (!enabled) {
      console.log('[Scheduler] In-process scheduler disabled via env');
      return;
    }

    // Agenda para 06:15 BRT diariamente
    const { HOUSEKEEPING_RUN_HOUR, HOUSEKEEPING_RUN_MINUTE } = TIME_CONSTANTS;

    // Cron expression: minuto hora * * *
    const cronExpression = `${HOUSEKEEPING_RUN_MINUTE} ${HOUSEKEEPING_RUN_HOUR} * * *`;

    console.log(`[Scheduler] Setting up cron: ${cronExpression} (BRT)`);

    this.task = cron.schedule(
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
    console.log(`[Scheduler] Next run scheduled for: ${formatBrt(nextRun)}`);
  }

  /**
   * Para scheduler
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      console.log('[Scheduler] Stopped');
    }
  }
}

export const schedulerService = new SchedulerService();
