import { Request, Response } from 'express';
import { housekeepingService } from '../../services/jobs/housekeeping.service.js';
import { jobLockService } from '../../services/jobs/job-lock.service.js';

/**
 * POST /internal/jobs/housekeeping
 *
 * Executa job de housekeeping manualmente (via Railway cron ou manual)
 */
export async function runHousekeeping(req: Request, res: Response): Promise<void> {
  try {
    const result = await housekeepingService.execute();

    res.status(200).json({
      success: true,
      message: 'Housekeeping job completed successfully',
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    // Se job já está rodando (locked), retornar 409 Conflict
    if (message.includes('already running')) {
      res.status(409).json({
        success: false,
        error: 'Job already running',
        message,
      });
      return;
    }

    console.error('[JobsController] Housekeeping error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to execute housekeeping job',
    });
  }
}

/**
 * GET /internal/jobs/lock-status/:jobName
 *
 * Verifica status de lock de um job
 */
export async function getLockStatus(req: Request, res: Response): Promise<void> {
  const { jobName } = req.params;

  try {
    const isLocked = await jobLockService.isLocked(jobName);

    res.status(200).json({
      success: true,
      data: {
        jobName,
        isLocked,
      },
    });
  } catch (error) {
    console.error('[JobsController] Get lock status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get lock status',
    });
  }
}

/**
 * DELETE /internal/jobs/lock/:jobName
 *
 * Força liberação de lock (usar apenas para recovery)
 */
export async function releaseLock(req: Request, res: Response): Promise<void> {
  const { jobName } = req.params;

  try {
    await jobLockService.releaseLock(jobName);

    res.status(200).json({
      success: true,
      message: `Lock released for job: ${jobName}`,
    });
  } catch (error) {
    console.error('[JobsController] Release lock error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to release lock',
    });
  }
}
