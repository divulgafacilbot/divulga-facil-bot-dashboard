import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { listCampaigns, downloadCampaignZip } from '../../controllers/user/campaigns.controller.js';

const router = Router();

// Apply authentication to all routes
router.use(requireAuth);

/**
 * GET /user/campaigns
 * List all campaigns for authenticated user
 */
router.get('/', listCampaigns);

/**
 * GET /user/campaigns/:id/download
 * Download campaign ZIP for authenticated user
 */
router.get('/:id/download', downloadCampaignZip);

export default router;
