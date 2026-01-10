import { Router } from 'express';
import { requireInternalJobAuth } from '../../middleware/internal-job-auth.middleware.js';
import {
  runHousekeeping,
  getLockStatus,
  releaseLock,
} from '../../controllers/internal/jobs.controller.js';

const router = Router();

// Todas as rotas requerem autenticação via x-internal-job-secret
router.use(requireInternalJobAuth);

/**
 * POST /internal/jobs/housekeeping
 * Executa job de housekeeping
 */
router.post('/housekeeping', runHousekeeping);

/**
 * GET /internal/jobs/lock-status/:jobName
 * Verifica status de lock
 */
router.get('/lock-status/:jobName', getLockStatus);

/**
 * DELETE /internal/jobs/lock/:jobName
 * Força liberação de lock (recovery)
 */
router.delete('/lock/:jobName', releaseLock);

export default router;
